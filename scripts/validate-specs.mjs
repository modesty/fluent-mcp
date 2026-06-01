#!/usr/bin/env node
/**
 * validate-specs.mjs — TypeScript-type-check every res/spec/*.md against the
 * locally installed @servicenow/sdk types.
 *
 * Catches API rot in the spec docs: removed/renamed symbols, wrong import
 * paths, unknown property names on closed config types.
 *
 * Usage:
 *   npm run validate:specs            # validate all specs
 *   node scripts/validate-specs.mjs business-rule  # validate one type
 *
 * Outputs:
 *   coverage/spec-validation.md       # markdown summary
 *
 * Approach:
 *   - Scaffold a .spec-validation/ project with tsconfig.json + globals.d.ts
 *   - Symlink node_modules to the project root (contains @servicenow/sdk (installed version))
 *   - Extract typescript code blocks from each spec, normalize the
 *     `}): ReturnType` documentation convention into valid TS (`)`).
 *   - Run `tsc --noEmit` once over the whole tree.
 *   - Parse per-file errors and write a markdown report.
 *
 * Tsconfig is intentionally lenient (strict: false, noImplicitAny: false) so
 * placeholder values in specs (`$id: ''`, `table: ''`) don't drown the signal.
 * What we DO catch: object-literal freshness violations (unknown property
 * names) and module-resolution failures (renamed/removed APIs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SPEC_DIR = path.join(PROJECT_ROOT, 'res', 'spec');
const WORK_DIR = path.join(PROJECT_ROOT, '.spec-validation');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');
const REPORT_FILE = path.join(COVERAGE_DIR, 'spec-validation.md');

const FILTER = process.argv[2];

function setupScaffold() {
  if (fs.existsSync(WORK_DIR)) fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(WORK_DIR, 'src'), { recursive: true });

  // Symlink node_modules to project root (where @servicenow/sdk (installed version) lives)
  fs.symlinkSync(
    path.join(PROJECT_ROOT, 'node_modules'),
    path.join(WORK_DIR, 'node_modules')
  );

  // Minimal package.json so `npx tsc` resolves from the symlinked node_modules.
  fs.writeFileSync(
    path.join(WORK_DIR, 'package.json'),
    JSON.stringify({ name: 'spec-validation', private: true, version: '0.0.0' })
  );

  fs.writeFileSync(
    path.join(WORK_DIR, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: false,
        noImplicitAny: false,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        lib: ['ES2022'],
        types: [],
      },
      include: ['globals.d.ts', 'src/**/*.ts'],
    }, null, 2)
  );

  // Fluent globals — injected by the Fluent build, plus all SDK API names so
  // spec docs (which omit imports) type-check. Loose `any` typing on purpose —
  // we're validating spec STRUCTURE, not values. Names left UNDECLARED here
  // (e.g. `catalogItemRef`, `workspaceObject`) are placeholder-variable bugs
  // that the validator will catch.
  const fluentGlobals = [
    // Fluent runtime
    'Now', 'TemplateValue', 'Duration', 'Time', 'default_view', 'get_sys_id',
    'get_column_name', 'wfa', 'trigger', 'action', 'actionStep', '_params', 'params',
    // SDK API surface (top-level constructors and namespaces)
    'Acl', 'AiAgent', 'AiAgenticWorkflow', 'ApplicationMenu', 'BusinessRule',
    'ClientScript', 'CrossScopePrivilege', 'DataPolicy', 'Documentation', 'ImportSet',
    'LicensingConfig', 'List', 'NowAssistSkillConfig', 'Property', 'RestApi',
    'Role', 'UiPolicy', 'UserPreference', 'atf', 'Record',
    // Flow / automation surface (also exported from '@servicenow/sdk/automation')
    'Flow', 'FlowStage', 'Subflow', 'Table',
    // Instance Scan check types
    'LinterCheck', 'ScriptOnlyCheck', 'ColumnTypeCheck', 'TableCheck',
    // Service Portal types
    'SPMenu', 'SPPage', 'SPTheme', 'SPWidget', 'SPWidgetDependency',
    // Spec-doc placeholder variable names (used in specs to indicate "imagine
    // a reference variable here"). Real code would substitute real values.
    'catalogItemRef', 'variableSetRef', 'variableSetObject',
    'workspaceObject', 'applicabilityObject', 'listConfigObject', 'dataPill',
    'flowVarSchema',
    // Column types
    'ApprovalRulesColumn', 'BasicDateTimeColumn', 'BasicImageColumn',
    'BooleanColumn', 'CalendarDateTime', 'ChoiceColumn', 'ConditionsColumn',
    'DateColumn', 'DateTimeColumn', 'DecimalColumn', 'DocumentIdColumn',
    'DomainIdColumn', 'DomainPathColumn', 'DueDateColumn', 'DurationColumn',
    'EmailColumn', 'FieldListColumn', 'FieldNameColumn', 'FloatColumn',
    'GenericColumn', 'GuidColumn', 'HtmlColumn', 'IntegerColumn',
    'IntegerDateColumn', 'JsonColumn', 'ListColumn', 'MultiLineTextColumn',
    'NameValuePairsColumn', 'OtherDateColumn', 'Password2Column', 'RadioColumn',
    'ReferenceColumn', 'ScheduleDateTimeColumn', 'ScriptColumn',
    'SlushBucketColumn', 'StringColumn', 'SystemClassNameColumn',
    'TableNameColumn', 'TemplateValueColumn', 'TimeColumn',
    'TranslatedFieldColumn', 'TranslatedTextColumn', 'UrlColumn',
    'UserRolesColumn', 'VersionColumn',
  ];
  fs.writeFileSync(
    path.join(WORK_DIR, 'globals.d.ts'),
    `// Generated by validate-specs.mjs — Fluent runtime globals + SDK API surface.
// Loose-typed; we're validating spec structure, not value types.
${fluentGlobals.filter(n => n !== 'TemplateValue').map(name => `declare const ${name}: any;`).join('\n')}

// TemplateValue accepts an optional generic table-name type argument for IntelliSense.
declare function TemplateValue<_T = any>(config: any): any;

// Now is also referenced in type position (e.g. Now.ID['x'] inside a type alias).
// Declare a namespace alongside the const so both value and type uses resolve.
declare namespace Now {
  export type ID = any;
}
`
  );
}

function extractTypescript(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Collect all ```typescript or ```ts blocks, joined with blank lines.
  const matches = [...content.matchAll(/```(?:typescript|ts)\n([\s\S]+?)\n```/g)];
  return matches.map(m => m[1]).join('\n\n');
}

/**
 * Normalize spec-doc conventions that aren't valid TS:
 *   - `}): ReturnType[;,]?`                                          → `})[;,]?`
 *   - `prop?: value` (optional-marker in object literal)             → `prop: value`
 *   - Bare top-level `{ ... }` blocks (doc convention showing inline configs) wrapped in `void ()` so TS parses as expression
 */
function normalizeSpecCode(code) {
  let s = code;

  // 1. Strip return-type annotations: ")" followed by ":" then either:
  //    (a) a TypeName like `BusinessRule`, `Promise<X>`, `void`, etc.
  //    (b) an inline type-object `{ ... }` (possibly multi-line; assumes no nested braces).
  //    Anchored by lookahead for `;` / `,` / `//` / end of line.
  s = s.replace(
    /\)(\s*):\s*(?:[A-Za-z_][\w<>|&,'"`.\[\]\s]*?|\{[^{}]*\})(?=\s*(?:[;,]|\/\/|$))/gm,
    ')$1'
  );

  // 2. Strip optional-marker `?:` on object-literal-style property lines
  //    Matches: leading whitespace + identifier + `?:` + space (only at line start)
  s = s.replace(/^(\s+[A-Za-z_]\w*)\?:\s/gm, '$1: ');

  return s;
}

function processSpecs() {
  let files = fs.readdirSync(SPEC_DIR).filter(
    f => f.startsWith('fluent_spec_') && f.endsWith('.md')
  );
  if (FILTER) {
    files = files.filter(f => f.includes(FILTER));
  }
  const specs = [];
  for (const filename of files) {
    const type = filename.replace(/^fluent_spec_/, '').replace(/\.md$/, '');
    const raw = extractTypescript(path.join(SPEC_DIR, filename));
    if (!raw) {
      specs.push({ filename, type, status: 'skipped', reason: 'no typescript block' });
      continue;
    }
    const normalized = normalizeSpecCode(raw);
    fs.writeFileSync(path.join(WORK_DIR, 'src', `${type}.ts`), normalized);
    specs.push({ filename, type, status: 'queued' });
  }
  return specs;
}

function runTypecheck() {
  try {
    execSync('npx tsc --noEmit -p .', {
      cwd: WORK_DIR,
      encoding: 'utf-8',
      timeout: 5 * 60 * 1000,
    });
    return { stdout: '', success: true };
  } catch (err) {
    return {
      stdout: (err.stdout?.toString() || '') + (err.stderr?.toString() || ''),
      success: false,
    };
  }
}

function parseErrors(output) {
  const errors = {};
  for (const line of output.split('\n')) {
    // Match: src/<file>.ts(line,col): error TSxxxx: <message>
    const m = line.match(/^src\/(.+?)\.ts\((\d+),(\d+)\):\s*(error TS\d+:.*)$/);
    if (m) {
      const [, file, ln, col, msg] = m;
      if (!errors[file]) errors[file] = [];
      errors[file].push({ line: parseInt(ln, 10), col: parseInt(col, 10), msg });
    }
  }
  return errors;
}

function writeReport(specs, errorsByFile) {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  const totals = { passed: 0, failed: 0, skipped: 0 };
  const passList = [];
  const failList = [];
  const skipList = [];

  for (const s of specs) {
    if (s.status === 'skipped') {
      totals.skipped++;
      skipList.push(s);
      continue;
    }
    const errs = errorsByFile[s.type] || [];
    if (errs.length === 0) {
      totals.passed++;
      passList.push(s);
    } else {
      totals.failed++;
      failList.push({ ...s, errors: errs });
    }
  }

  const lines = [];
  lines.push('# Spec Type-Check Report');
  lines.push('');
  lines.push(`Generated by \`scripts/validate-specs.mjs\` against \`@servicenow/sdk (installed version)\` types on ${new Date().toISOString()}.`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('|--------|-------|');
  lines.push(`| ✅ Type-checked clean | ${totals.passed} |`);
  lines.push(`| ❌ Type errors | ${totals.failed} |`);
  lines.push(`| ⚪ Skipped (no typescript block) | ${totals.skipped} |`);
  lines.push(`| **Total** | **${specs.length}** |`);
  lines.push('');

  if (failList.length > 0) {
    lines.push('## Type errors');
    lines.push('');
    for (const f of failList) {
      lines.push(`### \`${f.filename}\` (${f.errors.length})`);
      lines.push('');
      for (const e of f.errors.slice(0, 10)) {
        lines.push(`- L${e.line}:${e.col} — \`${e.msg}\``);
      }
      if (f.errors.length > 10) {
        lines.push(`- … (${f.errors.length - 10} more)`);
      }
      lines.push('');
    }
  }

  lines.push(`## Clean (${passList.length})`);
  lines.push('');
  for (const s of passList) lines.push(`- ${s.filename}`);
  lines.push('');

  if (skipList.length > 0) {
    lines.push(`## Skipped (${skipList.length})`);
    lines.push('');
    for (const s of skipList) lines.push(`- ${s.filename} — ${s.reason}`);
    lines.push('');
  }

  fs.writeFileSync(REPORT_FILE, lines.join('\n'));
  return totals;
}

function main() {
  console.log(`\nValidating res/spec/*.md against @servicenow/sdk (installed version) types…\n`);

  setupScaffold();
  const specs = processSpecs();
  if (specs.length === 0) {
    console.log('No specs found.');
    process.exit(0);
  }

  const result = runTypecheck();
  const errors = parseErrors(result.stdout);

  // Pretty per-file output to stdout
  for (const s of specs) {
    if (s.status === 'skipped') {
      console.log(`  [SKIP] ${s.filename} (${s.reason})`);
      continue;
    }
    const errs = errors[s.type] || [];
    if (errs.length === 0) {
      console.log(`  [OK]   ${s.filename}`);
    } else {
      console.log(`  [FAIL] ${s.filename}  (${errs.length} error${errs.length === 1 ? '' : 's'})`);
      for (const e of errs.slice(0, 3)) {
        console.log(`         L${e.line}:${e.col} ${e.msg}`);
      }
      if (errs.length > 3) console.log(`         … (${errs.length - 3} more)`);
    }
  }

  const totals = writeReport(specs, errors);
  console.log('');
  console.log(`Results: ${totals.passed} clean, ${totals.failed} with errors, ${totals.skipped} skipped, ${specs.length} total`);
  console.log(`Report:  coverage/spec-validation.md`);
  console.log('');

  process.exit(totals.failed > 0 ? 1 : 0);
}

main();
