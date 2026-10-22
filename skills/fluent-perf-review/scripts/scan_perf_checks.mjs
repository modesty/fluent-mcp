#!/usr/bin/env node
/**
 * Deterministic Performance Scanner for ServiceNow Fluent & Classic XML Apps.
 *
 * Evaluates the scriptable subset of the 18 ServiceNow Performance checks.
 * Ports the legacy performance-scanner rules and fixes their false positives/negatives: comments are
 * masked without touching string literals (no line-start-only comment detection, no skipped long
 * lines), recursion is keyed on `current.update()` instead of any `.update()`, the transform-map
 * Run script is only checked when `run_script` is true, `sys_id` dot-walks are limited to
 * GlideRecord roots on the server, and audit queries also cover GlideAggregate/GlideQuery.
 * Business Rule timing is resolved from Fluent `BusinessRule()` (including `Now.include()` and
 * imported server-module functions) and classic `sys_script` XML.
 *
 * Usage:
 *   node scan_perf_checks.mjs [app-directory] [--baseline <previous-version-dir>] [--json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.now',
  'target',
  '.test-build',
  'coverage',
  '.claude',
  '.mosey',
]);
const EXCLUDED_FILES = new Set([
  'gulpfile.js',
  'rollup.config.js',
  'rollup.config.mjs',
  'webpack.config.js',
  'vite.config.js',
  'vite.config.ts',
  'eslint.config.js',
  'jest.config.js',
]);
const SCRIPT_EXTS = new Set(['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx']);
const MARKUP_EXTS = new Set(['.html', '.xhtml', '.jelly']);
const MODULE_EXTS = ['.ts', '.js', '.mjs', '.cjs', '.tsx', '.jsx'];

const AUDIT_TABLE_RE = /^sys_audit/;
// Other large system tables named by performance policy PERF-1
const LARGE_SYSTEM_TABLES = new Set(['syslog', 'syslog_transaction', 'sys_email']);

// Classic sys_script.when values → Fluent BusinessRule `when` (sdk-build-plugins business-rule-plugin)
const XML_BR_WHEN = {
  before: 'before',
  after: 'after',
  async_always: 'async',
  async: 'async_deprecated',
  before_display: 'display',
};
const ASYNC_WHEN = new Set(['async', 'async_deprecated']);

// Fluent column constructor → sys_dictionary internal_type (sdk-build-plugins column-helper)
const COLUMN_API_TO_TYPE = {
  StringColumn: 'string',
  BooleanColumn: 'boolean',
  ChoiceColumn: 'choice',
  ConditionsColumn: 'conditions',
  OtherDateColumn: 'date',
  CalendarDateTimeColumn: 'calendar_date_time',
  BasicDateTimeColumn: 'datetime',
  DueDateColumn: 'due_date',
  DateColumn: 'glide_date',
  DateTimeColumn: 'glide_date_time',
  IntegerDateColumn: 'integer_date',
  ScheduleDateTimeColumn: 'schedule_date_time',
  DecimalColumn: 'decimal',
  DocumentIdColumn: 'document_id',
  DomainIdColumn: 'domain_id',
  DomainPathColumn: 'domain_path',
  FieldNameColumn: 'field_name',
  IntegerColumn: 'integer',
  RadioColumn: 'radio',
  ReferenceColumn: 'reference',
  ScriptColumn: 'script',
  SystemClassNameColumn: 'sys_class_name',
  TableNameColumn: 'table_name',
  TranslatedFieldColumn: 'translated_field',
  TranslatedTextColumn: 'translated_text',
  UserRolesColumn: 'user_roles',
  VersionColumn: 'version',
  ListColumn: 'glide_list',
  BasicImageColumn: 'image',
  GuidColumn: 'GUID',
  Password2Column: 'password2',
  JsonColumn: 'json',
  UrlColumn: 'url',
  EmailColumn: 'email',
  HtmlColumn: 'html',
  FloatColumn: 'float',
  DurationColumn: 'glide_duration',
  TimeColumn: 'glide_time',
  FieldListColumn: 'field_list',
  RecordsColumn: 'records',
  SlushBucketColumn: 'slushbucket',
  NameValuePairsColumn: 'name_values',
  ApprovalRulesColumn: 'approval_rules',
  MultiLineTextColumn: 'multi_two_lines',
  TemplateValueColumn: 'template_value',
  DayOfWeekColumn: 'day_of_week',
  DaysOfWeekColumn: 'days_of_week',
};

// Script-bearing fields per classic record table; unlisted tables fall back to a server-side <script>
const XML_SCRIPT_FIELDS = {
  sys_transform_entry: { source_script: 'server' },
  sys_ws_operation: { operation_script: 'server' },
  sys_ui_page: { html: 'jelly', client_script: 'client', processing_script: 'server' },
  sys_ui_macro: { xml: 'jelly' },
  sp_widget: { script: 'server', client_script: 'client' },
  sys_script_client: { script: 'client' },
  catalog_script_client: { script: 'client' },
  sys_ui_policy: { script_true: 'client', script_false: 'client' },
  sys_ui_script: { script: 'client' },
};

const CHECKS = {
  recursive_business_rule: {
    impact: 'Critical',
    fix: `Remove current.update() and set fields on 'current' directly in a before rule; the platform saves it.`,
  },
  AvoidCallingFlowAPIMethodsFromAsyncBR: {
    impact: 'High',
    fix: `Do not launch flows from an async Business Rule; use a record-triggered or scheduled flow in Workflow Studio.`,
  },
  wait_for_response: {
    impact: 'High',
    fix: `Remove waitForResponse(); set setEccCorrelator() and process the reply in an after-insert Business Rule on ecc_queue.`,
  },
  gr_on_sys_audit_table: {
    impact: 'High',
    fix: `Avoid the query; if unavoidable, filter on indexed fields (documentkey, tablename, bounded sys_created_on) and add setLimit().`,
  },
  br_insert: {
    impact: 'High',
    fix: `Remove current.insert(); move inserts into other tables to an after (or async) Business Rule.`,
  },
  before_transform_insert: {
    impact: 'High',
    fix: `Move inserts into reference/target tables to an onAfter transform script.`,
  },
  parse_xml_infinite_loop: {
    impact: 'High',
    fix: `Cap the loop (e.g. 'while (iter.hasNext() && count++ < MAX_NODES)'); use Data Stream actions for payloads over 10 MB.`,
  },
  sync_outbound_calls: {
    impact: 'Medium',
    fix: `Use executeAsync() and process the response asynchronously, or move the call to an async BR / Flow / IntegrationHub action.`,
  },
  set_property: {
    impact: 'Medium',
    fix: `Have admins set the property manually, or mark a frequently changing property ignoreCache: true.`,
  },
  jexl_ssi: {
    impact: 'Medium',
    fix: `Add jelly="true" to the evaluate tag and read Jelly variables as jelly.jvar_name instead of \${...} / $[...].`,
  },
  sys_id_dot_walk: {
    impact: 'Low',
    fix: `Read the reference value directly with getValue('<reference>') instead of dot-walking to sys_id.`,
  },
  glide_query_contains_operator: {
    impact: 'Low',
    fix: `Prefer =, IN, or STARTSWITH on indexed fields; otherwise narrow with indexed filters and setLimit().`,
  },
  dictionary_type_change: {
    impact: 'Critical',
    fix: `Restore the original type; add a new column with the new type and migrate data with a fix script.`,
  },
  log_verbosity_disable: {
    impact: 'High',
    fix: `Set verbose to false on the Robust Transform Map before packaging.`,
  },
  jdbc_import_use_lastrun: {
    impact: 'High',
    fix: `Set use_last_run_datetime to true and last_run_database_field to the source's last-modified column.`,
  },
  report_on_sys_audit: {
    impact: 'High',
    fix: `Remove the report; report on the application's own tables instead.`,
  },
  index_found: {
    impact: 'Medium',
    fix: `Remove the index if it is not required (unique indexes in particular) or justify it in the submission notes.`,
  },
};

const MANUAL_NOTES = {
  sys_direct_ws: `sys_direct_ws is manual: review integration code and design docs for Table API / direct SOAP writes (exempt: em_event).`,
  dictionary_type_change: `dictionary_type_change (Upgrade only) was not evaluated: rerun with --baseline <previous-version-dir>.`,
};

function finding(checkId, priority, location, issue, fix = CHECKS[checkId].fix) {
  return { checkId, priority, impact: CHECKS[checkId].impact, location, issue, fix };
}

// ---------------------------------------------------------------------------
// Text utilities (pure)
// ---------------------------------------------------------------------------

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, result);
    } else if (entry.isFile() && !EXCLUDED_FILES.has(entry.name)) {
      result.push(full);
    }
  }
  return result;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Maps a character offset to its 1-based line number via binary search over line starts. */
function lineLocator(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Blank out JS comments, keeping string literals, newlines, and offsets intact. */
function maskComments(code) {
  let out = '';
  let quote = null;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < code.length) out += code[++i];
      else if (ch === quote) quote = null;
      continue;
    }
    const next = code[i + 1];
    if (ch === '/' && (next === '/' || next === '*')) {
      const close = next === '/' ? code.indexOf('\n', i) : code.indexOf('*/', i + 2);
      const stop = close === -1 ? code.length : next === '/' ? close : close + 2;
      out += code.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop - 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    out += ch;
  }
  return out;
}

/** Index just past the bracket closing the one at `open` (string-aware), or -1. */
function matchBracket(code, open) {
  const closers = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  let quote = null;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (closers[ch]) stack.push(closers[ch]);
    else if (ch === ')' || ch === '}' || ch === ']') {
      if (stack.pop() !== ch) return -1;
      if (stack.length === 0) return i + 1;
    }
  }
  return -1;
}

/** Offset of the next top-level ',' (or `end`) from `start`, skipping nested brackets and strings. */
function valueEnd(code, start, end) {
  let quote = null;
  for (let i = start; i < end; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(' || ch === '{' || ch === '[') {
      const close = matchBracket(code, i);
      if (close === -1) return end;
      i = close - 1;
    } else if (ch === ',') return i;
  }
  return end;
}

const PROP_KEY_RE = /[\s,]*(?:(['"])([\w$-]+)\1|([A-Za-z_$][\w$]*))\s*:/y;

/** Top-level `key: value` entries of the object literal opening at `open`: Map<key, { text, start }>. */
function objectProps(code, open) {
  const close = matchBracket(code, open) - 1;
  const props = new Map();
  if (close < 0) return props;
  let i = open + 1;
  while (i < close) {
    PROP_KEY_RE.lastIndex = i;
    const m = PROP_KEY_RE.exec(code);
    const valueStart = m ? PROP_KEY_RE.lastIndex : i;
    const stop = valueEnd(code, valueStart, close);
    if (m && m.index === i) {
      const raw = code.slice(valueStart, stop);
      const lead = raw.length - raw.trimStart().length;
      props.set(m[2] ?? m[3], { text: raw.trim(), start: valueStart + lead });
    }
    i = stop + 1;
  }
  return props;
}

/** Object-literal elements of the array literal opening at `open`. */
function arrayObjects(code, open) {
  const close = matchBracket(code, open) - 1;
  const items = [];
  let i = open + 1;
  while (i < close) {
    while (i < close && /[\s,]/.test(code[i])) i++;
    if (code[i] === '{') items.push(objectProps(code, i));
    i = valueEnd(code, i, close) + 1;
  }
  return items;
}

/** Value of a string/boolean literal, or undefined for anything dynamic. */
function literalValue(prop) {
  if (!prop) return undefined;
  const t = prop.text;
  if (t === 'true' || t === 'false') return t === 'true';
  const s = /^(['"`])([\s\S]*)\1$/.exec(t);
  if (s && !(s[1] === '`' && s[2].includes('${'))) return s[2];
  return undefined;
}

const asString = (v) => (v === undefined ? '' : String(v));

const XML_ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
function decodeXml(s) {
  return s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e) =>
    e[0] === '#'
      ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      : XML_ENTITIES[e.toLowerCase()],
  );
}

/** First `<tag>` value in an XML fragment (CDATA unwrapped, entities decoded) with its offset. */
function xmlField(xml, tag) {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${tag}>)`).exec(xml);
  if (!m) return { value: '', index: -1 };
  const inner = m[1] ?? '';
  const index = m.index + m[0].indexOf('>') + 1;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(inner);
  return { value: cdata ? cdata[1] : decodeXml(inner), index: cdata ? index + inner.indexOf('<![CDATA[') + 9 : index };
}

/** Records of an update-set or unload XML file: `<table action="…">…</table>` blocks. */
function xmlRecords(content) {
  const records = [];
  for (const m of content.matchAll(/<([a-z][\w]*)\s+action="[A-Z_]+"[^>]*>/g)) {
    const bodyStart = m.index + m[0].length;
    const bodyEnd = content.indexOf(`</${m[1]}>`, bodyStart);
    if (bodyEnd !== -1) records.push({ table: m[1], body: content.slice(bodyStart, bodyEnd), offset: bodyStart });
  }
  return records;
}

// ---------------------------------------------------------------------------
// Script checks (pure): segment → findings
// ---------------------------------------------------------------------------

const FLOW_API_RE =
  /(?<![\w$])(?:sn_fd\s*\.\s*)?FlowAPI\s*\.\s*((?:start|execute)(?:Flow|Subflow|Action)(?:Quick)?|executeDataStreamAction|getRunner)\s*\(/g;
const QUERY_CTOR_RE =
  /\bnew\s+(?:global\.)?(GlideRecord(?:Secure)?|GlideAggregate|GlideQuery)\s*\(\s*(['"])(\w+)\2\s*\)|\bGlideQuery\s*\.\s*parse\s*\(\s*(['"])(\w+)\4/g;
const QUERY_FILTER = '(?:addQuery|addEncodedQuery|addActiveQuery|addNullQuery|addNotNullQuery|get|where|whereNull|whereNotNull)\\s*\\(';
const OPERATOR_CALL_RE =
  /\.\s*(addQuery|addOrCondition|where|orWhere)\s*\(\s*[^,()]+?,\s*(['"])(CONTAINS|DOES NOT CONTAIN|LIKE|NOT LIKE|ENDSWITH)\2/gi;
const ENCODED_QUERY_RE =
  /\.\s*addEncodedQuery\s*\(\s*(['"`])([^'"`]*)\1|\bGlideQuery\s*\.\s*parse\s*\(\s*(['"])\w+\3\s*,\s*(['"`])([^'"`]*)\4/g;
const ENCODED_WILDCARD_RE = /(?:^|\^(?:OR|NQ)?)[a-z0-9_.]+(NOT ?LIKE|LIKE|ENDSWITH)/;
const XML_STEP_RE = /\.\s*(?:getNextSibling|getFirstChild|getNextNode|getNextElement|getChildNodeIterator)\s*\(/;

/** Names assigned from `= <ctorRe>` anywhere in the script. */
function assignedVars(masked, rhs) {
  const re = new RegExp(`([A-Za-z_$][\\w$]*)\\s*=\\s*${rhs}`, 'g');
  return new Set([...masked.matchAll(re)].map((m) => m[1]));
}

function checkSetProperty(masked, loc, env, out) {
  for (const m of masked.matchAll(/\bgs\s*\.\s*setProperty\s*\(\s*(?:(['"])([^'"]+)\1)?/g)) {
    const name = m[2];
    if (name && env.ignoreCacheProps.has(name)) {
      out.push(
        finding(
          'set_property',
          'P4',
          loc(m.index),
          `gs.setProperty('${name}') targets a packaged property with ignore_cache=true (documented exemption).`,
          `Confirm '${name}' changes more than once a month and is read only from sys_properties.`,
        ),
      );
    } else {
      out.push(
        finding('set_property', 'P2', loc(m.index), `gs.setProperty(${name ? `'${name}'` : '…'}) flushes the system property cache on every call.`),
      );
    }
  }
}

function checkLargeTableQueries(masked, loc, out) {
  for (const m of masked.matchAll(QUERY_CTOR_RE)) {
    const table = m[3] ?? m[5];
    const isAudit = AUDIT_TABLE_RE.test(table);
    if (!isAudit && !LARGE_SYSTEM_TABLES.has(table)) continue;
    const api = m[1] ?? 'GlideQuery';
    // Filters belong to this query only: calls on its variable, or the chain right after the constructor
    const variable = /([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*$/.exec(masked.slice(Math.max(0, m.index - 120), m.index))?.[1];
    const chain = masked.slice(m.index + m[0].length).split(/[;\n]/, 1)[0];
    const filtered =
      Boolean(m[5]) ||
      new RegExp(`\\.\\s*${QUERY_FILTER}`).test(chain) ||
      (variable !== undefined && new RegExp(`(?<![\\w$.])${escapeRe(variable)}\\s*\\.\\s*${QUERY_FILTER}`).test(masked));
    out.push(
      finding(
        'gr_on_sys_audit_table',
        isAudit ? 'P1' : 'P2',
        loc(m.index),
        `${api} query on large system table '${table}'${isAudit ? '' : ' (policy PERF-1)'}${filtered ? '; verify every filter uses an indexed field.' : ' with no query filter.'}`,
      ),
    );
  }
}

function checkSysIdDotWalk(masked, loc, out) {
  const roots = new Set(['current', 'previous']);
  for (const v of assignedVars(masked, `new\\s+(?:global\\.)?GlideRecord(?:Secure)?\\s*\\(`)) roots.add(v);
  for (const v of assignedVars(masked, `[\\w$.]+\\.getRefRecord\\s*\\(\\s*\\)`)) roots.add(v);
  const rootAlt = [...roots].map(escapeRe).join('|');
  const re = new RegExp(`(?<![\\w$.])(${rootAlt})((?:\\s*\\.\\s*[A-Za-z_]\\w*)+?)\\s*\\.\\s*sys_id\\b`, 'g');
  for (const m of masked.matchAll(re)) {
    const walk = `${m[1]}${m[2].replace(/\s+/g, '')}.sys_id`;
    out.push(finding('sys_id_dot_walk', 'P3', loc(m.index), `'${walk}' dot-walks to sys_id, adding a query for the referenced record.`));
  }
  for (const m of masked.matchAll(/\.\s*get(?:Value|DisplayValue|Element)\s*\(\s*(['"])([\w.]+)\.sys_id\1\s*\)/g)) {
    out.push(finding('sys_id_dot_walk', 'P3', loc(m.index), `get…('${m[2]}.sys_id') dot-walks to sys_id instead of reading '${m[2]}'.`));
  }
}

function checkWildcardOperators(masked, loc, out) {
  for (const m of masked.matchAll(OPERATOR_CALL_RE)) {
    out.push(
      finding('glide_query_contains_operator', 'P3', loc(m.index), `${m[1]}() uses the leading-wildcard operator '${m[3]}', which cannot use an index.`),
    );
  }
  for (const m of masked.matchAll(ENCODED_QUERY_RE)) {
    const query = m[2] ?? m[5];
    const op = ENCODED_WILDCARD_RE.exec(query);
    if (op) {
      out.push(
        finding('glide_query_contains_operator', 'P3', loc(m.index), `Encoded query '${query.slice(0, 80)}' uses the leading-wildcard operator '${op[1]}'.`),
      );
    }
  }
}

function checkXmlLoops(masked, loc, out) {
  const iterators = assignedVars(masked, `[\\w$.()\\s]*?\\.\\s*getChildNodeIterator\\s*\\(\\s*\\)`);
  const iterates = (text) => [...iterators].some((v) => new RegExp(`\\b${escapeRe(v)}\\s*\\.\\s*(?:hasNext|next)\\s*\\(`).test(text));
  const stepsXml = (cond, body) =>
    cond.trim() === ''
      ? XML_STEP_RE.test(body) || iterates(body)
      : XML_STEP_RE.test(cond) ||
        iterates(cond) ||
        [...cond.matchAll(/[A-Za-z_$][\w$]*/g)].some((v) =>
          new RegExp(`\\b${escapeRe(v[0])}\\s*=\\s*[^;]*\\.\\s*(?:getNextSibling|getNextNode|getNextElement)\\s*\\(`).test(body),
        );
  const bounded = (cond, body) =>
    /[<>]/.test(cond.replace(/=>/g, '')) || /\bif\s*\([^)]*[<>][^)]*\)\s*\{?\s*(?:break|return|throw)\b/.test(body);

  for (const m of masked.matchAll(/\b(while|for)\s*\(/g)) {
    const parenOpen = m.index + m[0].length - 1;
    const parenClose = matchBracket(masked, parenOpen);
    if (parenClose === -1) continue;
    let cond = masked.slice(parenOpen + 1, parenClose - 1);
    if (m[1] === 'for') {
      const clauses = cond.split(';');
      if (clauses.length !== 3) continue; // for…of / for…in iterate a finite collection
      cond = clauses[1];
    }
    const braceAt = masked.slice(parenClose).search(/\S/) + parenClose;
    const body = masked[braceAt] === '{' ? masked.slice(braceAt, matchBracket(masked, braceAt)) : '';
    if (stepsXml(cond, body) && !bounded(cond, body)) {
      out.push(finding('parse_xml_infinite_loop', 'P1', loc(m.index), `XML node-parsing ${m[1]} loop has no iteration cap.`));
    }
  }
  for (const m of masked.matchAll(/\bgs\s*\.\s*xmlToJSON\s*\(/g)) {
    out.push(
      finding(
        'parse_xml_infinite_loop',
        'P3',
        loc(m.index),
        `gs.xmlToJSON() used for XML parsing (policy PERF-9: use XMLDocument2 for larger XML).`,
        `Parse large XML payloads with XMLDocument2 instead of gs.xmlToJSON().`,
      ),
    );
  }
}

function checkSyncOutbound(masked, loc, context, out) {
  const messages = assignedVars(masked, `new\\s+(?:sn_ws\\.)?(?:RESTMessageV2|SOAPMessageV2)\\s*\\(`);
  if (messages.size === 0) return;
  const alt = [...messages].map(escapeRe).join('|');
  const isAsyncBr = context.type === 'br' && ASYNC_WHEN.has(context.when);
  for (const m of masked.matchAll(new RegExp(`(?<![\\w$.])(${alt})\\s*\\.\\s*execute\\s*\\(\\s*\\)`, 'g'))) {
    out.push(
      finding(
        'sync_outbound_calls',
        isAsyncBr ? 'P4' : 'P2',
        loc(m.index),
        isAsyncBr
          ? `Synchronous ${m[1]}.execute() in an async Business Rule (already off the user transaction).`
          : `Synchronous ${m[1]}.execute() in ${context.label} blocks the user transaction for the network round-trip.`,
      ),
    );
  }
}

function checkBusinessRule(masked, loc, context, out) {
  const { when } = context;
  for (const m of masked.matchAll(/(?<![\w$.])current\s*\.\s*update\s*\(\s*\)/g)) {
    if (when === 'before') {
      out.push(finding('recursive_business_rule', 'P0', loc(m.index), `before Business Rule calls current.update(), re-running the Business Rule chain.`));
    } else {
      const guarded = /(?<![\w$.])current\s*\.\s*setWorkflow\s*\(\s*false\s*\)/.test(masked.slice(0, m.index));
      out.push(
        finding(
          'recursive_business_rule',
          guarded ? 'P3' : 'P1',
          loc(m.index),
          guarded
            ? `${when} Business Rule calls current.update() after setWorkflow(false); prefer setting the field in a before rule.`
            : `${when} Business Rule calls current.update() without setWorkflow(false), re-triggering Business Rules.`,
          `Move the field change into a before Business Rule; use setWorkflow(false) + update() only when that is impossible.`,
        ),
      );
    }
  }
  if (when === 'before') {
    for (const m of masked.matchAll(/(?:(?<![\w$.])([A-Za-z_$][\w$]*)\s*)?\.\s*insert\s*\(\s*\)/g)) {
      out.push(
        finding(
          'br_insert',
          'P1',
          loc(m.index),
          m[1] === 'current'
            ? `before Business Rule calls current.insert(), writing a duplicate record.`
            : `before Business Rule inserts a record (${m[1] ?? '…'}.insert()) before the triggering write is committed.`,
        ),
      );
    }
  }
  if (ASYNC_WHEN.has(when)) {
    for (const m of masked.matchAll(FLOW_API_RE)) {
      out.push(finding('AvoidCallingFlowAPIMethodsFromAsyncBR', 'P1', loc(m.index), `${when} Business Rule calls FlowAPI.${m[1]}().`));
    }
  }
}

/**
 * Scan one script segment. Context-free checks run when `contextFree` is set; Business Rule,
 * UI Action, and onBefore-transform checks run when the segment carries that context.
 */
function scanScript(seg, env) {
  const out = [];
  const masked = maskComments(seg.code);
  const lineAt = lineLocator(masked);
  const loc = (index) => `${seg.relFile}:${seg.baseLine + lineAt(index) - 1}`;
  const context = seg.context ?? {};

  if (seg.contextFree) {
    checkLargeTableQueries(masked, loc, out);
    if (seg.side !== 'client') {
      checkSetProperty(masked, loc, env, out);
      for (const m of masked.matchAll(/\.\s*waitForResponse\s*\(/g)) {
        out.push(finding('wait_for_response', 'P1', loc(m.index), `waitForResponse() blocks the thread on an asynchronous outbound call.`));
      }
      checkSysIdDotWalk(masked, loc, out);
      checkWildcardOperators(masked, loc, out);
      checkXmlLoops(masked, loc, out);
    }
  }
  if (context.type === 'br') checkBusinessRule(masked, loc, context, out);
  if (context.type === 'br' || context.type === 'ui_action') checkSyncOutbound(masked, loc, context, out);
  if (context.type === 'transform_before') {
    for (const m of masked.matchAll(/\.\s*insert\s*\(\s*\)/g)) {
      out.push(finding('before_transform_insert', 'P1', loc(m.index), `${context.label} calls .insert() before the target row is written.`));
    }
  }
  return out;
}

/** JEXL `${…}` / `$[…]` inside `<g:evaluate>` / `<g2:evaluate>` (body or expression attribute). */
function scanJelly(text, relFile, baseLine) {
  const out = [];
  if (!/<g2?:evaluate\b/.test(text)) return out;
  const masked = text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
  const lineAt = lineLocator(masked);
  for (const m of masked.matchAll(/<(g2?):evaluate\b([^>]*?)(\/?)>/g)) {
    const attrs = m[2];
    const closeAt = m[3] ? -1 : masked.indexOf(`</${m[1]}:evaluate>`, m.index);
    const body = closeAt === -1 ? '' : masked.slice(m.index + m[0].length, closeAt);
    const expression = /\bexpression\s*=\s*"([^"]*)"/.exec(attrs)?.[1] ?? '';
    if (/\$[{[]/.test(body) || /\$[{[]/.test(expression)) {
      out.push(
        finding('jexl_ssi', 'P2', `${relFile}:${baseLine + lineAt(m.index) - 1}`, `<${m[1]}:evaluate> embeds a JEXL expression, compiling a new script per evaluation.`),
      );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Record facts (pure accessors over XML fields or Fluent Record() data)
// ---------------------------------------------------------------------------

function emptyFacts() {
  return { ignoreCacheProps: new Set(), reports: [], transformers: [], dataSources: [], indexes: [], columns: new Map() };
}

/** Collect performance-relevant facts from one record; `get(field)` returns its string value. */
function collectRecordFacts(table, get, location, facts) {
  switch (table) {
    case 'sys_properties':
      if (get('ignore_cache') === 'true') facts.ignoreCacheProps.add(get('name'));
      break;
    case 'sys_report':
      facts.reports.push({ table: get('table'), title: get('title'), location });
      break;
    case 'sys_robust_import_set_transformer':
      facts.transformers.push({ name: get('name'), verbose: get('verbose'), location });
      break;
    case 'sys_data_source':
      facts.dataSources.push({
        name: get('name'),
        type: get('type'),
        useLastRun: get('use_last_run_datetime'),
        lastRunField: get('last_run_database_field'),
        location,
      });
      break;
    case 'sys_index':
      facts.indexes.push({
        table: get('logical_table_name'),
        columns: get('col_name_string'),
        unique: get('unique_index') === 'true',
        location,
      });
      break;
    case 'sys_dictionary': {
      const element = get('element');
      if (element && get('internal_type')) facts.columns.set(`${get('name')}.${element}`, { type: get('internal_type'), location });
      break;
    }
  }
}

function evaluateFacts(facts, scope) {
  const out = [];
  for (const r of facts.reports) {
    if (AUDIT_TABLE_RE.test(r.table)) {
      out.push(finding('report_on_sys_audit', 'P1', r.location, `Report '${r.title || 'untitled'}' runs against '${r.table}'.`));
    } else if (LARGE_SYSTEM_TABLES.has(r.table)) {
      out.push(finding('report_on_sys_audit', 'P2', r.location, `Report '${r.title || 'untitled'}' runs against large system table '${r.table}' (policy PERF-1).`));
    }
  }
  for (const t of facts.transformers) {
    if (t.verbose === 'true') {
      out.push(finding('log_verbosity_disable', 'P1', t.location, `Robust Transform Map '${t.name}' ships with verbose logging enabled.`));
    }
  }
  for (const d of facts.dataSources) {
    if (d.type !== 'JDBC') continue;
    if (d.useLastRun !== 'true') {
      out.push(finding('jdbc_import_use_lastrun', 'P1', d.location, `JDBC Data Source '${d.name}' re-imports every row (use_last_run_datetime is not true).`));
    } else if (!d.lastRunField) {
      out.push(finding('jdbc_import_use_lastrun', 'P1', d.location, `JDBC Data Source '${d.name}' enables use_last_run_datetime without a last_run_database_field.`));
    }
  }
  const seen = new Set();
  for (const ix of facts.indexes) {
    const key = `${ix.table}|${ix.columns.replace(/\s+/g, '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const outOfScope = scope !== 'unknown_scope' && scope !== 'global' && ix.table && !ix.table.startsWith(`${scope}_`);
    const kind = ix.unique ? 'Unique index' : 'Index';
    out.push(
      finding(
        'index_found',
        ix.unique || outOfScope ? 'P2' : 'P3',
        ix.location,
        `${kind} on '${ix.table}' (${ix.columns})${outOfScope ? ' targets an out-of-scope table' : ''}${ix.unique || outOfScope ? '.' : ' — review whether it is required.'}`,
      ),
    );
  }
  return out;
}

function compareColumnTypes(current, baseline) {
  const out = [];
  for (const [key, col] of current) {
    const before = baseline.get(key);
    if (before && before.type !== col.type) {
      out.push(finding('dictionary_type_change', 'P0', col.location, `Column '${key}' changed type from '${before.type}' to '${col.type}'.`));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fluent source resolution
// ---------------------------------------------------------------------------

function parseImports(masked) {
  const imports = new Map();
  for (const m of masked.matchAll(/\bimport\s+(?:type\s+)?([\w$\s{},*]+?)\s+from\s+(['"])([^'"]+)\2/g)) {
    const from = m[3];
    const clause = m[1];
    const named = /\{([^}]*)\}/.exec(clause);
    for (const part of named ? named[1].split(',') : []) {
      const [name, alias] = part.trim().split(/\s+as\s+/);
      if (name) imports.set((alias ?? name).trim(), { from, name: name.trim() });
    }
    const ns = /\*\s*as\s+([\w$]+)/.exec(clause);
    if (ns) imports.set(ns[1], { from, name: '*' });
    const def = /^\s*([\w$]+)\s*(?:,|$)/.exec(clause);
    if (def) imports.set(def[1], { from, name: 'default' });
  }
  return imports;
}

function resolveModule(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const stem = base.replace(/\.(?:m?js|cjs)$/, '');
  const candidates = [base, ...MODULE_EXTS.map((e) => stem + e), ...MODULE_EXTS.map((e) => path.join(base, `index${e}`))];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

/** Offsets of the function named `name` (declaration or const-assigned arrow/function), body included. */
function functionSpan(masked, name) {
  const id = escapeRe(name);
  const m = new RegExp(`\\bfunction\\s*\\*?\\s+${id}\\s*\\(|\\b(?:const|let|var)\\s+${id}\\b[^=]*=`).exec(masked);
  if (!m) return null;
  const paren = masked.indexOf('(', m.index + m[0].length - 1);
  const parenClose = paren === -1 ? -1 : matchBracket(masked, paren);
  const brace = parenClose === -1 ? -1 : masked.indexOf('{', parenClose);
  const end = brace === -1 ? -1 : matchBracket(masked, brace);
  return end === -1 ? null : { start: m.index, end };
}

/**
 * Resolve a Fluent `script:` value to the code that runs: an inline string or function,
 * `Now.include('<file>')`, or a function imported from a server module.
 */
function resolveScript(prop, src, ctx) {
  if (!prop) return null;
  const text = prop.text;
  const inline = (code, start) => ({ code, relFile: src.rel, baseLine: src.lineAt(start) });
  const literal = /^(['"`])([\s\S]*)\1$/.exec(text);
  if (literal) return inline(literal[2], prop.start);
  if (/^(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[\w$]+\s*=>)/.test(text)) return inline(text, prop.start);

  const include = /^Now\s*\.\s*include\s*\(\s*(['"`])([^'"`]+)\1\s*\)$/.exec(text);
  if (include) return fileSegment(path.resolve(path.dirname(src.file), include[2]), null, ctx);

  const ref = /^([A-Za-z_$][\w$]*)(?:\s*\.\s*([A-Za-z_$][\w$]*))?$/.exec(text);
  if (!ref) return null;
  const imp = src.imports.get(ref[1]);
  if (imp) {
    const file = resolveModule(src.file, imp.from);
    const exported = imp.name === '*' ? ref[2] : imp.name === 'default' ? null : imp.name;
    return file ? fileSegment(file, exported, ctx) : null;
  }
  const span = functionSpan(src.masked, ref[1]);
  return span ? inline(src.content.slice(span.start, span.end), span.start) : null;
}

function fileSegment(file, exportName, ctx) {
  const content = ctx.readText(file);
  if (content === null) return null;
  const relFile = path.relative(ctx.appDir, file);
  const span = exportName ? functionSpan(maskComments(content), exportName) : null;
  if (!span) return { code: content, relFile, baseLine: 1 };
  return { code: content.slice(span.start, span.end), relFile, baseLine: lineLocator(content)(span.start) };
}

const FLUENT_CALL_RE = /\b(BusinessRule|UiAction|ImportSet|Property|Record|Table)\s*\(\s*\{/g;

function scanFluentSource(src, ctx, facts) {
  const segments = [];
  const addSegment = (prop, context) => {
    const seg = resolveScript(prop, src, ctx);
    if (seg) segments.push({ ...seg, side: 'server', context });
  };
  const location = (index) => `${src.rel}:${src.lineAt(index)}`;

  for (const m of src.masked.matchAll(FLUENT_CALL_RE)) {
    const open = m.index + m[0].length - 1;
    const props = objectProps(src.masked, open);
    switch (m[1]) {
      case 'BusinessRule':
        if (literalValue(props.get('active')) !== false) {
          const when = asString(literalValue(props.get('when'))) || 'before';
          addSegment(props.get('script'), { type: 'br', when, label: `${when} Business Rule` });
        }
        break;
      case 'UiAction':
        addSegment(props.get('script'), { type: 'ui_action', label: 'a UI Action' });
        break;
      case 'ImportSet': {
        if (literalValue(props.get('runScript')) === true) {
          addSegment(props.get('script'), { type: 'transform_before', label: `ImportSet Run script (runScript: true)` });
        }
        const scripts = props.get('scripts');
        if (scripts?.text.startsWith('[')) {
          for (const s of arrayObjects(src.masked, scripts.start)) {
            if (literalValue(s.get('when')) === 'onBefore' && literalValue(s.get('active')) !== false) {
              addSegment(s.get('script'), { type: 'transform_before', label: 'onBefore transform script' });
            }
          }
        }
        break;
      }
      case 'Property':
        if (literalValue(props.get('ignoreCache')) === true) facts.ignoreCacheProps.add(asString(literalValue(props.get('name'))));
        break;
      case 'Record': {
        const table = literalValue(props.get('table'));
        const data = props.get('data');
        if (typeof table === 'string' && data?.text.startsWith('{')) {
          const fields = objectProps(src.masked, data.start);
          collectRecordFacts(table, (f) => asString(literalValue(fields.get(f))), location(m.index), facts);
        }
        break;
      }
      case 'Table':
        collectFluentTable(props, src, location(m.index), facts);
        break;
    }
  }
  return segments;
}

function collectFluentTable(props, src, location, facts) {
  const table = asString(literalValue(props.get('name')));
  if (!table) return;
  const index = props.get('index');
  if (index?.text.startsWith('[')) {
    for (const ix of arrayObjects(src.masked, index.start)) {
      const element = ix.get('element');
      const columns = element?.text.startsWith('[')
        ? [...element.text.matchAll(/(['"`])([\w.]+)\1/g)].map((c) => c[2]).join(',')
        : asString(literalValue(element));
      facts.indexes.push({ table, columns, unique: literalValue(ix.get('unique')) === true, location });
    }
  }
  const schema = props.get('schema');
  if (schema?.text.startsWith('{')) {
    for (const [column, value] of objectProps(src.masked, schema.start)) {
      const ctor = /^([A-Za-z]+Column)\s*\(/.exec(value.text)?.[1];
      if (!ctor) continue;
      const brace = src.masked.indexOf('{', value.start);
      const columnType =
        ctor === 'GenericColumn' && brace !== -1 ? asString(literalValue(objectProps(src.masked, brace).get('columnType'))) : '';
      facts.columns.set(`${table}.${column}`, { type: columnType || COLUMN_API_TO_TYPE[ctor] || ctor, location: `${src.rel}:${src.lineAt(value.start)}` });
    }
  }
}

// ---------------------------------------------------------------------------
// Classic XML
// ---------------------------------------------------------------------------

function scanXmlFile(content, rel, facts) {
  const segments = [];
  const findings = [];
  const lineAt = lineLocator(content);

  for (const rec of xmlRecords(content)) {
    const get = (f) => xmlField(rec.body, f).value.trim();
    const location = `${rel}:${lineAt(rec.offset)}`;
    collectRecordFacts(rec.table, get, location, facts);
    if (get('active') === 'false') continue;

    let context = {};
    if (rec.table === 'sys_script') {
      const when = XML_BR_WHEN[get('when')] ?? get('when');
      context = { type: 'br', when, label: `${when} Business Rule` };
    } else if (rec.table === 'sys_ui_action') {
      context = { type: 'ui_action', label: 'a UI Action' };
    } else if (rec.table === 'sys_transform_script' && get('when') === 'onBefore') {
      context = { type: 'transform_before', label: 'onBefore transform script' };
    } else if (rec.table === 'sys_transform_map' && get('run_script') === 'true') {
      context = { type: 'transform_before', label: 'Transform Map Run script (run_script=true)' };
    }

    const fields = XML_SCRIPT_FIELDS[rec.table] ?? { script: 'server' };
    for (const [field, side] of Object.entries(fields)) {
      const { value, index } = xmlField(rec.body, field);
      if (!value.trim()) continue;
      const baseLine = lineAt(rec.offset + index);
      if (side === 'jelly') {
        findings.push(...scanJelly(value, rel, baseLine));
      } else {
        segments.push({ code: value, relFile: rel, baseLine, side, contextFree: true, context });
      }
    }
  }

  // Bootstrap dictionary files: <element name="<table>" type="collection"> … <element name="<col>" type="…"/> … <index>
  for (const t of content.matchAll(/<element\s+[^>]*\bname="([\w]+)"[^>]*\btype="collection"[^>]*>([\s\S]*?)<\/element>\s*(?=<element\s[^>]*type="collection"|<\/database>|$)/g)) {
    const table = t[1];
    const body = t[2];
    const bodyOffset = t.index + t[0].indexOf('>') + 1;
    for (const c of body.matchAll(/<element\s+([^>]*)>/g)) {
      const name = /\bname="([\w]+)"/.exec(c[1])?.[1];
      const type = /\b(?:internal_)?type="([\w]+)"/.exec(c[1])?.[1];
      if (name && type && type !== 'collection') facts.columns.set(`${table}.${name}`, { type, location: `${rel}:${lineAt(bodyOffset + c.index)}` });
    }
    for (const ix of body.matchAll(/<index\b([^>]*)>([\s\S]*?)<\/index>/g)) {
      facts.indexes.push({
        table,
        columns: [...ix[2].matchAll(/\bname="([\w.]+)"/g)].map((e) => e[1]).join(','),
        unique: /\bunique="true"/.test(ix[1]),
        location: `${rel}:${lineAt(bodyOffset + ix.index)}`,
      });
    }
  }
  return { segments, findings };
}

// ---------------------------------------------------------------------------
// App metadata & orchestration (imperative shell)
// ---------------------------------------------------------------------------

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function detectAppMetadata(appDir, xmlSources) {
  const cfg = readJson(path.join(appDir, 'now.config.json'));
  const pkg = readJson(path.join(appDir, 'package.json'));
  let scope = cfg?.scope || pkg?.now?.scope || '';
  let appName = cfg?.name || pkg?.name || path.basename(appDir);
  let hasXml = false;

  for (const { rel, content } of xmlSources) {
    if (/^(?:update|metadata|unload|dictionary)/.test(rel) || rel.includes(`${path.sep}update${path.sep}`)) hasXml = true;
    if (scope) continue;
    const base = path.basename(rel);
    if (base.startsWith('sys_app_') || base.startsWith('sys_store_app_')) {
      scope = xmlField(content, 'scope').value.trim() || scope;
      appName = xmlField(content, 'name').value.trim() || appName;
    }
    const pkgSource = /<sys_package[^>]*source="([^"]+)"/i.exec(content)?.[1];
    if (!scope && pkgSource && pkgSource !== 'global') scope = pkgSource;
  }

  const hasFluent = Boolean(cfg);
  const appType = hasFluent && hasXml ? 'Hybrid' : hasFluent ? 'Fluent (now.config.json)' : 'Classic XML (update/)';
  return { appName, scope: scope || 'unknown_scope', appType };
}

function collectApp(appDir) {
  const files = walkFiles(appDir);
  const cache = new Map();
  const readText = (file) => {
    if (!cache.has(file)) {
      try {
        cache.set(file, fs.readFileSync(file, 'utf8'));
      } catch {
        cache.set(file, null);
      }
    }
    return cache.get(file);
  };
  const ctx = { appDir, readText };
  const facts = emptyFacts();
  const segments = [];
  const findings = [];
  const xmlSources = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(appDir, file);
    if (ext === '.xml') {
      const content = readText(file);
      xmlSources.push({ rel, content });
      const xml = scanXmlFile(content, rel, facts);
      segments.push(...xml.segments);
      findings.push(...xml.findings);
    } else if (SCRIPT_EXTS.has(ext)) {
      const content = readText(file);
      const masked = maskComments(content);
      const src = { file, rel, content, masked, lineAt: lineLocator(masked), imports: parseImports(masked) };
      const isClient = !rel.endsWith('.now.ts') && (/(?:^|[\\/._-])client(?:[\\/._-]|$)/i.test(rel) || /\.[jt]sx$/.test(ext));
      segments.push({ code: content, relFile: rel, baseLine: 1, side: isClient ? 'client' : 'server', contextFree: true });
      segments.push(...scanFluentSource(src, ctx, facts));
      findings.push(...scanJelly(content, rel, 1));
    } else if (MARKUP_EXTS.has(ext)) {
      findings.push(...scanJelly(readText(file), rel, 1));
    }
  }
  return { meta: detectAppMetadata(appDir, xmlSources), filesScanned: files.length, facts, segments, findings };
}

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };

export function runPerfScan(appDir, { baselineDir } = {}) {
  const app = collectApp(path.resolve(appDir));
  const env = { ignoreCacheProps: app.facts.ignoreCacheProps };
  const raw = [...app.findings, ...app.segments.flatMap((seg) => scanScript(seg, env)), ...evaluateFacts(app.facts, app.meta.scope)];
  const notes = [MANUAL_NOTES.sys_direct_ws];
  if (baselineDir) {
    raw.push(...compareColumnTypes(app.facts.columns, collectApp(path.resolve(baselineDir)).facts.columns));
  } else {
    notes.push(MANUAL_NOTES.dictionary_type_change);
  }

  const unique = new Map();
  for (const f of raw) {
    const key = `${f.checkId}|${f.location}|${f.issue}`;
    if (!unique.has(key)) unique.set(key, f);
  }
  const findings = [...unique.values()].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.location.localeCompare(b.location, undefined, { numeric: true }),
  );

  return {
    appName: app.meta.appName,
    scope: app.meta.scope,
    appType: app.meta.appType,
    filesScanned: app.filesScanned,
    findingsCount: findings.length,
    findings,
    notes,
  };
}

// CLI entry point
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('--json');
  const baselineAt = args.indexOf('--baseline');
  const baselineDir = baselineAt === -1 ? undefined : args[baselineAt + 1];
  if (baselineAt !== -1 && (!baselineDir || baselineDir.startsWith('-'))) {
    console.error('Error: --baseline requires a directory argument.');
    process.exit(2);
  }
  const targetDir = args.find((a, i) => !a.startsWith('-') && (baselineAt === -1 || i !== baselineAt + 1)) || process.cwd();
  const report = runPerfScan(targetDir, { baselineDir });

  if (jsonFlag) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Performance Scan: ${report.appName} (${report.scope})`);
    console.log(`App Type: ${report.appType} | Files Scanned: ${report.filesScanned} | Findings: ${report.findingsCount}`);
    if (report.findings.length === 0) {
      console.log('No deterministic performance issues detected.');
    } else {
      for (const f of report.findings) {
        console.log(`\n[${f.priority}] ${f.checkId} (${f.impact}) @ ${f.location}`);
        console.log(`  Issue: ${f.issue}`);
        console.log(`  Fix:   ${f.fix}`);
      }
    }
    for (const note of report.notes) console.log(`\nNote: ${note}`);
  }
}
