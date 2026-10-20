#!/usr/bin/env node
/**
 * Deterministic General Best-Practice Scanner for ServiceNow Fluent & Classic XML Apps.
 *
 * Baseline derived from ServiceNow Application Scanner (sn_remotescan) rules in
 * certification-scanner-plugin, refined to eliminate legacy regex false positives
 * (e.g., GlideElement/Map .get() calls, callback-based g_form.getReference(),
 * packaged sys_id references, and multi-line comments) and to support both
 * Fluent (.now.ts / .ts / .js) and Classic XML (update/ / metadata/ / dictionary/) apps.
 *
 * Usage:
 *   node scan_general_checks.mjs [app-directory] [--json]
 */

import fs from 'node:fs';
import path from 'node:path';

const PROHIBITED_EXTENDS = new Set([
  'incident',
  'problem',
  'change_request',
  'sc_req_item',
  'sc_task',
]);

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
const KNOWN_HASH_TEST_VECTORS = new Set([
  '900150983cd24fb0d6963f7d28e17f72', // MD5("abc")
  'd41d8cd98f00b204e9800998ecf8427e', // MD5("")
  '098f6bcd4621d373cade4e832627b4f6', // MD5("test")
  '5d41402abc4b2a76b9719d911017c592', // MD5("hello")
]);

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, result);
    } else if (entry.isFile() && !EXCLUDED_FILES.has(entry.name)) {
      result.push(full);
    }
  }
  return result;
}

function stripCommentsPreserveLines(code) {
  // Replace block and line comments with spaces while preserving newlines for exact line numbers
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length));
}

function extractXmlTagValues(xmlContent, tagName) {
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const results = [];
  let match;
  while ((match = re.exec(xmlContent)) !== null) {
    const before = xmlContent.slice(0, match.index);
    const startLine = before.split('\n').length;
    let inner = match[1];
    const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    if (cdata) inner = cdata[1];
    results.push({ value: inner, line: startLine, raw: match[0] });
  }
  return results;
}

function getXmlField(xmlContent, tagName) {
  const matches = extractXmlTagValues(xmlContent, tagName);
  return matches.length > 0 ? matches[0].value.trim() : '';
}

function detectAppMetadata(appDir, allFiles) {
  const nowConfigPath = path.join(appDir, 'now.config.json');
  const pkgJsonPath = path.join(appDir, 'package.json');
  let scope = '';
  let scopeId = '';
  let appName = path.basename(appDir);
  let hasFluent = false;
  let hasXml = false;
  const packagedSysIds = new Set();

  if (fs.existsSync(nowConfigPath)) {
    hasFluent = true;
    try {
      const cfg = JSON.parse(fs.readFileSync(nowConfigPath, 'utf8'));
      scope = cfg.scope || scope;
      scopeId = cfg.scopeId || scopeId;
      appName = cfg.name || appName;
    } catch {
      // ignore malformed now.config.json
    }
  }

  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkg.now?.scope && !scope) scope = pkg.now.scope;
      if (pkg.name && appName === path.basename(appDir)) appName = pkg.name;
    } catch {
      // ignore
    }
  }

  for (const file of allFiles) {
    if (file.endsWith('.now.ts')) hasFluent = true;
    if (file.endsWith('.xml')) {
      const rel = path.relative(appDir, file);
      if (
        rel.startsWith('update' + path.sep) ||
        rel.startsWith('metadata' + path.sep) ||
        rel.startsWith('unload') ||
        rel.includes(path.sep + 'update' + path.sep) ||
        rel.includes(path.sep + 'scope' + path.sep)
      ) {
        hasXml = true;
      }
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/<sys_id>([0-9a-f]{32})<\/sys_id>/gi)) {
        packagedSysIds.add(m[1].toLowerCase());
      }
      if (!scope) {
        const base = path.basename(file);
        if (base.startsWith('sys_app_') || base.startsWith('sys_store_app_')) {
          const s = getXmlField(content, 'scope');
          const n = getXmlField(content, 'name');
          const id = getXmlField(content, 'sys_id');
          if (s) scope = s;
          if (n) appName = n;
          if (id) scopeId = id;
        }
      }
      if (!scope) {
        const scopeAttr = content.match(/<sys_package[^>]*source="([^"]+)"/i);
        if (scopeAttr && scopeAttr[1] !== 'global') {
          scope = scopeAttr[1];
        }
      }
    }
  }

  if (scopeId) packagedSysIds.add(scopeId.toLowerCase());

  const appType =
    hasFluent && hasXml ? 'Hybrid' : hasFluent ? 'Fluent (now.config.json)' : 'Classic XML (update/)';

  return { appName, scope: scope || 'unknown_scope', scopeId, appType, packagedSysIds };
}

function scanScriptContent({ code, relFile, baseLine, isClient, isServer, tableContext, findings, packagedSysIds, scope }) {
  const stripped = stripCommentsPreserveLines(code);
  const lines = stripped.split('\n');
  const rawLines = code.split('\n');

  // Track GlideRecord variable names declared in this script block
  const grVars = new Set(['current', 'previous']);
  for (const m of stripped.matchAll(/(?:(?:var|let|const)\s+)?([A-Za-z_$][\w$]*)\s*=\s*new\s+(?:global\.)?GlideRecord(?:Secure)?\s*\(/g)) {
    grVars.add(m[1]);
  }

  // 1. gr_as_variable_name: check if `gr` is used as a GlideRecord variable without function wrapping or re-declared
  const grDecls = [...stripped.matchAll(/(^|[^\w$])(var|let|const)?\s*\bgr\s*=\s*new\s+GlideRecord(?:Secure)?\s*\(/gm)];
  if (grDecls.length > 0) {
    const isWrappedInFunction = /\bfunction\b|=>/.test(stripped);
    for (const m of grDecls) {
      const lineOffset = stripped.slice(0, m.index).split('\n').length - 1;
      const hasDeclarator = Boolean(m[2]);
      if (!hasDeclarator || !isWrappedInFunction || grDecls.length > 1) {
        findings.push({
          checkId: 'gr_as_variable_name',
          priority: 'P2',
          impact: 'Medium',
          location: `${relFile}:${baseLine + lineOffset}`,
          issue: !hasDeclarator
            ? `Implicit global 'gr' GlideRecord variable without var/let/const can clobber outer scope variables.`
            : grDecls.length > 1
              ? `Variable name 'gr' is reused (${grDecls.length} times) for multiple GlideRecord instances in the same script.`
              : `Top-level unwrapped 'gr' GlideRecord variable name used instead of a function-scoped descriptive name.`,
          fix: `Wrap the script in a function, declare with const/let/var, and use a descriptive variable name (e.g., incidentGr).`,
        });
      }
    }
  }

  // 2. getRefRecord() without isValidRecord()
  for (const m of stripped.matchAll(/(?:(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*)?[\w$.]+\.getRefRecord\s*\(\s*\)/g)) {
    const lineOffset = stripped.slice(0, m.index).split('\n').length - 1;
    const varName = m[1];
    const windowAfter = stripped.slice(m.index, m.index + 400);
    const hasValidCheck = varName
      ? new RegExp(`\\b${varName}\\.isValidRecord\\s*\\(`).test(windowAfter)
      : /\.isValidRecord\s*\(/.test(windowAfter);
    if (!hasValidCheck) {
      findings.push({
        checkId: 'occurence_get_ref_record',
        priority: 'P2',
        impact: 'Medium',
        location: `${relFile}:${baseLine + lineOffset}`,
        issue: `getRefRecord() result is used without verifying .isValidRecord().`,
        fix: `Guard the returned GlideRecord with if (${varName || 'refGr'}.isValidRecord()) { ... } before accessing fields.`,
      });
    }
  }

  // 3. acl_script_no_gliderecord_aggregate (when in a Read ACL context)
  if (tableContext === 'sys_security_acl_read') {
    for (const m of stripped.matchAll(/\bnew\s+Glide(?:Record|RecordSecure|Aggregate)\s*\(/g)) {
      const lineOffset = stripped.slice(0, m.index).split('\n').length - 1;
      findings.push({
        checkId: 'acl_script_no_gliderecord_aggregate',
        priority: 'P2',
        impact: 'Medium',
        location: `${relFile}:${baseLine + lineOffset}`,
        issue: `Read ACL script queries the database using ${m[0].trim()}, which executes per row and degrades list/report performance.`,
        fix: `Replace GlideRecord/GlideAggregate in Read ACL scripts with role checks, SecurityAttribute, or declarative conditions.`,
      });
    }
  }

  // 4. wf_recursive: current.update() in workflow scripts
  if (tableContext === 'workflow_script') {
    for (const m of stripped.matchAll(/\bcurrent\.update\s*\(/g)) {
      const lineOffset = stripped.slice(0, m.index).split('\n').length - 1;
      findings.push({
        checkId: 'wf_recursive',
        priority: 'P2',
        impact: 'Medium',
        location: `${relFile}:${baseLine + lineOffset}`,
        issue: `Workflow script calls current.update(), which can trigger infinite loops on insert or double execution on update.`,
        fix: `Remove current.update() from the workflow script and use a Set Values activity or Flow update action.`,
      });
    }
  }

  // Line-by-line checks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rawLine = rawLines[i] ? rawLines[i].trim() : line.trim();
    const lineNum = baseLine + i;

    // 5. script_logs: gs.log (server) or console.log (client/server)
    if (isServer && /\bgs\.log\s*\(/.test(line) && scope !== 'global') {
      findings.push({
        checkId: 'script_logs',
        priority: 'P1',
        impact: 'Low',
        location: `${relFile}:${lineNum}`,
        issue: `Scoped server script calls gs.log() ("${rawLine.slice(0, 80)}"), which is disallowed in scoped apps and throws a runtime error.`,
        fix: `Replace gs.log() with gs.info(), gs.debug(), gs.warn(), or gs.error().`,
      });
    }
    if (/\bconsole\.log\s*\(/.test(line)) {
      findings.push({
        checkId: 'script_logs',
        priority: 'P3',
        impact: 'Low',
        location: `${relFile}:${lineNum}`,
        issue: `Script calls console.log() ("${rawLine.slice(0, 80)}").`,
        fix: isClient
          ? `Use jslog() instead of console.log() for client-side debugging, or remove debug logging.`
          : `Use gs.debug() / gs.info() instead of console.log().`,
      });
    }

    // 6. getXMLWait
    if (/\.getXMLWait\s*\(/.test(line)) {
      findings.push({
        checkId: 'getXMLWait',
        priority: 'P1',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `Synchronous .getXMLWait() call detected ("${rawLine.slice(0, 80)}"), which is unavailable in scoped applications.`,
        fix: `Replace getXMLWait() with asynchronous getXML(callback) or getXMLAnswer(callback).`,
      });
    }

    // 7. get_row_count
    if (/\.getRowCount\s*\(/.test(line)) {
      findings.push({
        checkId: 'get_row_count',
        priority: 'P2',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `GlideRecord.getRowCount() loads all matching records into memory ("${rawLine.slice(0, 80)}").`,
        fix: `Use GlideAggregate('COUNT'), gr.hasNext(), or a loop counter instead of getRowCount().`,
      });
    }

    // 8. GRcalls_on_sysapp
    if (/GlideRecord(?:Secure)?\s*\(\s*['"]sys_app['"]\s*\)/.test(line)) {
      findings.push({
        checkId: 'GRcalls_on_sysapp',
        priority: 'P2',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `Script queries 'sys_app' ("${rawLine.slice(0, 80)}"), which is empty for Store-installed apps on customer instances.`,
        fix: `Store metadata in system properties (gs.getProperty()) or query 'sys_store_app' / 'sys_scope' if needed.`,
      });
    }

    // 9. gr_on_system_tables (sys_email)
    if (/GlideRecord(?:Secure)?\s*\(\s*['"]sys_email['"]\s*\)/.test(line)) {
      findings.push({
        checkId: 'gr_on_system_tables',
        priority: 'P4',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `Direct GlideRecord query on restricted system table 'sys_email' ("${rawLine.slice(0, 80)}").`,
        fix: `Use EmailNotification (sysevent_email_action) or gs.eventQueue() instead of querying/mutating sys_email directly.`,
      });
    }

    // 10. get_reference in client scripts
    if (/\bg_form\.getReference\s*\(/.test(line)) {
      const hasCallback = /\bg_form\.getReference\s*\([^,]+,[^)]+\)/.test(line);
      findings.push({
        checkId: 'get_reference',
        priority: 'P2',
        impact: 'Low',
        location: `${relFile}:${lineNum}`,
        issue: hasCallback
          ? `g_form.getReference() retrieves the entire referenced record to the browser ("${rawLine.slice(0, 80)}").`
          : `Synchronous g_form.getReference() without callback blocks the browser thread and fetches the full record ("${rawLine.slice(0, 80)}").`,
        fix: `Use g_scratchpad or an asynchronous GlideAjax lookup returning only the needed fields.`,
      });
    }

    // 11. get_function: unguarded GlideRecord .get()
    for (const m of line.matchAll(/\b([A-Za-z_$][\w$]*)\.get\s*\(/g)) {
      const objName = m[1];
      if (!grVars.has(objName)) continue;
      const guardedOnLine =
        /\b(?:if|while)\s*\([^)]*\.get\s*\(/.test(line) ||
        /[=?:!&|]\s*[^;]*\.get\s*\(/.test(line) ||
        /\breturn\s+[^;]*\.get\s*\(/.test(line);
      if (!guardedOnLine) {
        findings.push({
          checkId: 'get_function',
          priority: 'P2',
          impact: 'Medium',
          location: `${relFile}:${lineNum}`,
          issue: `Unguarded ${objName}.get() call ("${rawLine.slice(0, 80)}"). Execution continues even if the record is not found.`,
          fix: `Wrap ${objName}.get(...) in an if (${objName}.get(...)) block before reading or updating fields.`,
        });
      }
    }

    // 12. hardcoded_data: 32-hex sys_id or hardcoded http(s) URL in executable scripts
    for (const m of line.matchAll(/['"]([0-9a-f]{32})['"]/gi)) {
      const sysId = m[1].toLowerCase();
      if (
        !packagedSysIds.has(sysId) &&
        !KNOWN_HASH_TEST_VECTORS.has(sysId) &&
        !/DYNAMIC/i.test(line)
      ) {
        findings.push({
          checkId: 'hardcoded_data',
          priority: 'P2',
          impact: 'Medium',
          location: `${relFile}:${lineNum}`,
          issue: `Hardcoded 32-character sys_id literal '${m[1]}' not found in packaged app records.`,
          fix: `Retrieve customer/environment sys_ids via system properties (gs.getProperty()) or query by unique name/code.`,
        });
      }
    }
    if (/['"]https?:\/\/(?!www\.w3\.org|schemas\.)[^'"]+['"]/i.test(line)) {
      findings.push({
        checkId: 'hardcoded_data',
        priority: 'P3',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `Hardcoded URL literal in script ("${rawLine.slice(0, 80)}").`,
        fix: `Store environment/endpoint URLs in a system property or Connection & Credential Alias.`,
      });
    }
  }
}

export function runGeneralScan(appDir) {
  const absDir = path.resolve(appDir);
  const allFiles = walkFiles(absDir);
  const meta = detectAppMetadata(absDir, allFiles);
  const findings = [];

  let hasAppMenu = false;
  let hasSupportModule = false;
  let writesCmdbCi = false;
  let registersDiscoverySource = false;
  const importSetTables = new Set();

  // First pass: collect Import Set tables and check discovery source registration
  for (const file of allFiles) {
    if (file.endsWith('.xml')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('<sys_db_object')) {
        const superClass = getXmlField(content, 'super_class');
        const name = getXmlField(content, 'name');
        if (/sys_import_set_row/i.test(superClass) && name) {
          importSetTables.add(name);
        }
      }
      if (/CMDBDataSourceUtil|discovery_source/i.test(content)) {
        registersDiscoverySource = true;
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      if (/CMDBDataSourceUtil|discovery_source/i.test(content)) {
        registersDiscoverySource = true;
      }
      for (const m of content.matchAll(/Table\s*\(\s*\{[\s\S]*?name\s*:\s*['"]([^'"]+)['"][\s\S]*?extends\s*:\s*['"]sys_import_set_row['"]/g)) {
        importSetTables.add(m[1]);
      }
    }
  }

  for (const file of allFiles) {
    const relFile = path.relative(absDir, file);

    // Inspect package.json / now.config.json for optional dependencies
    if (path.basename(file) === 'now.config.json' || path.basename(file) === 'package.json') {
      try {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (json.optionalDependencies && Object.keys(json.optionalDependencies).length > 0) {
          findings.push({
            checkId: 'optioanalDependenciesUsed',
            priority: 'P3',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Optional dependencies declared (${Object.keys(json.optionalDependencies).join(', ')}).`,
            fix: `Ensure all optional plugin/app references are guarded with GlidePluginManager.isActive() and documented.`,
          });
        }
      } catch {
        // ignore
      }
    }

    // Inspect Fluent .now.ts / .ts / .js files
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      const stripped = stripCommentsPreserveLines(content);

      // Check OOTB table extension in Fluent Table({...})
      for (const m of stripped.matchAll(/Table\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const extendsMatch = body.match(/\bextends\s*:\s*['"]([^'"]+)['"]/);
        const tableName = nameMatch ? nameMatch[1] : '';
        const extName = extendsMatch ? extendsMatch[1] : '';

        if (PROHIBITED_EXTENDS.has(extName)) {
          findings.push({
            checkId: 'ootb_table_extension',
            priority: 'P1',
            impact: 'Critical',
            location: `${relFile}:${lineNum}`,
            issue: `Table '${tableName}' extends prohibited OOTB ITSM table '${extName}'.`,
            fix: `Extend 'task' (or use a standalone table/reference) instead of extending '${extName}'.`,
          });
        }

        if (
          tableName &&
          meta.scope !== 'unknown_scope' &&
          meta.scope !== 'global' &&
          !tableName.startsWith(meta.scope + '_') &&
          !tableName.startsWith('u_')
        ) {
          findings.push({
            checkId: 'column_created_on_oob_table',
            priority: 'P2',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Table definition augments shared OOB table '${tableName}' with custom columns.`,
            fix: `Verify adding columns to '${tableName}' is justified, all columns use the '${meta.scope}_' prefix, and schema impact is documented.`,
          });
        }
      }

      // Check Role containsRoles in Fluent Role({...})
      for (const m of stripped.matchAll(/Role\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const containsMatch = body.match(/\bcontainsRoles\s*:\s*\[([\s\S]*?)\]/);
        if (containsMatch && meta.scope !== 'unknown_scope') {
          for (const rm of containsMatch[1].matchAll(/['"]([^'"]+)['"]/g)) {
            const roleName = rm[1];
            if (!roleName.startsWith(meta.scope + '.')) {
              findings.push({
                checkId: 'custom_role_on_oob_role',
                priority: 'P2',
                impact: 'Medium',
                location: `${relFile}:${lineNum}`,
                issue: `Custom Role contains out-of-scope / system role '${roleName}'.`,
                fix: `Remove system role '${roleName}' from containsRoles or document manual post-install assignment.`,
              });
            }
          }
        }
      }

      // Check ApplicationMenu for Contact Support module
      if (/\bApplicationMenu\s*\(/.test(stripped)) {
        hasAppMenu = true;
        if (/contact\s+support|support/i.test(content)) {
          hasSupportModule = true;
        }
      }

      // Check Read ACL scripts in Fluent Acl({...})
      for (const m of stripped.matchAll(/Acl\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        if (/\boperation\s*:\s*['"]read['"]/.test(body) && /\bscript\s*:/.test(body)) {
          const lineNum = stripped.slice(0, m.index).split('\n').length;
          if (/Glide(?:Record|RecordSecure|Aggregate)\b/.test(body)) {
            findings.push({
              checkId: 'acl_script_no_gliderecord_aggregate',
              priority: 'P2',
              impact: 'Medium',
              location: `${relFile}:${lineNum}`,
              issue: `Fluent Read ACL contains a GlideRecord or GlideAggregate query in its script.`,
              fix: `Avoid database queries in Read ACL scripts; use roles, securityAttribute, or condition instead.`,
            });
          }
        }
      }

      // Check ClientScript onChange for isLoading and client_side_operations
      for (const m of stripped.matchAll(/(?:Catalog)?ClientScript\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        if (/\btype\s*:\s*['"]onChange['"]/.test(body) && /\bscript\s*:/.test(body)) {
          if (!/\bisLoading\b/.test(body)) {
            findings.push({
              checkId: 'cs_best_practise',
              priority: 'P3',
              impact: 'Low',
              location: `${relFile}:${lineNum}`,
              issue: `onChange ClientScript does not check the 'isLoading' flag.`,
              fix: `Add 'if (isLoading || newValue === "") return;' at the start of the onChange script unless load-time execution is intentional.`,
            });
          }
        }
        if (/\bg_form\.set(?:Mandatory|ReadOnly|Disabled|Visible|Display)\s*\(/.test(body)) {
          findings.push({
            checkId: 'client_side_operations',
            priority: 'P3',
            impact: 'Low',
            location: `${relFile}:${lineNum}`,
            issue: `ClientScript uses imperative g_form field visibility/mandatory/read-only APIs.`,
            fix: `Consider using a declarative UiPolicy() instead of a ClientScript when no complex scripting is required.`,
          });
        }
      }

      // Check general script idioms in non-.now.ts JS/TS files or inline scripts
      const isClientFile = /client|sp_widget|ui_page|ui_script/i.test(relFile);
      scanScriptContent({
        code: content,
        relFile,
        baseLine: 1,
        isClient: isClientFile,
        isServer: !isClientFile,
        tableContext: 'fluent_source',
        findings,
        packagedSysIds: meta.packagedSysIds,
        scope: meta.scope,
      });
    }

    // Inspect HTML files for target="_blank" without rel="noopener noreferrer nofollow"
    if (file.endsWith('.html')) {
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/<a\b[^>]*target\s*=\s*['"]_blank['"][^>]*>/gi)) {
        const tag = m[0];
        if (!/rel\s*=\s*['"][^'"]*noopener/i.test(tag)) {
          const lineNum = content.slice(0, m.index).split('\n').length;
          findings.push({
            checkId: 'support_module',
            priority: 'P3',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `External anchor tag with target="_blank" is missing rel="noopener noreferrer nofollow".`,
            fix: `Add rel="noopener noreferrer nofollow" to the <a> tag to prevent tabnabbing.`,
          });
        }
      }
    }

    // Inspect Classic / Metadata XML files
    if (file.endsWith('.xml')) {
      const content = fs.readFileSync(file, 'utf8');

      // 1. ootb_table_extension in sys_db_object
      if (content.includes('<sys_db_object')) {
        const name = getXmlField(content, 'name');
        const superClassMatches = extractXmlTagValues(content, 'super_class');
        if (superClassMatches.length > 0) {
          const rawSuper = superClassMatches[0].raw;
          const displayMatch = rawSuper.match(/display_value="([^"]+)"/i);
          const superVal = (displayMatch ? displayMatch[1] : superClassMatches[0].value).trim().toLowerCase();
          for (const prohibited of PROHIBITED_EXTENDS) {
            if (superVal === prohibited || superVal.replace(/\s+/g, '_') === prohibited) {
              findings.push({
                checkId: 'ootb_table_extension',
                priority: 'P1',
                impact: 'Critical',
                location: `${relFile}:${superClassMatches[0].line}`,
                issue: `Table '${name}' extends prohibited OOTB table '${superVal}'.`,
                fix: `Extend 'task' (or use a standalone table) instead of '${superVal}'.`,
              });
            }
          }
        }
      }

      // 2. column_created_on_oob_table & tm_boolean_fields_check in sys_dictionary
      if (content.includes('<sys_dictionary')) {
        for (const dictMatch of extractXmlTagValues(content, 'sys_dictionary')) {
          const block = dictMatch.value;
          const table = getXmlField(block, 'name');
          const element = getXmlField(block, 'element');
          const internalType = getXmlField(block, 'internal_type');
          if (
            table &&
            element &&
            meta.scope !== 'unknown_scope' &&
            meta.scope !== 'global' &&
            !table.startsWith(meta.scope + '_') &&
            !table.startsWith('u_')
          ) {
            findings.push({
              checkId: 'column_created_on_oob_table',
              priority: 'P2',
              impact: 'High',
              location: `${relFile}:${dictMatch.line}`,
              issue: `Custom column '${element}' created on out-of-the-box table '${table}'.`,
              fix: `Prefer a scoped extension/companion table or document the shared-schema impact.`,
            });
          }
          if (table && importSetTables.has(table) && internalType === 'boolean') {
            findings.push({
              checkId: 'tm_boolean_fields_check',
              priority: 'P2',
              impact: 'Medium',
              location: `${relFile}:${dictMatch.line}`,
              issue: `Import Set table '${table}' has a boolean column '${element}', which defaults to false and can overwrite target records when omitted.`,
              fix: `Change '${element}' on the Import Set staging table to a string field and map it via transform script.`,
            });
          }
        }
      }

      // 3. custom_role_on_oob_role in sys_user_role_contains
      if (content.includes('<sys_user_role_contains')) {
        for (const rm of extractXmlTagValues(content, 'sys_user_role_contains')) {
          const role = getXmlField(rm.value, 'role');
          const containsMatches = extractXmlTagValues(rm.value, 'contains');
          if (containsMatches.length > 0) {
            const rawContains = containsMatches[0].raw;
            const displayMatch = rawContains.match(/display_value="([^"]+)"/i);
            const containedName = displayMatch ? displayMatch[1] : containsMatches[0].value.trim();
            if (
              meta.scope !== 'unknown_scope' &&
              meta.scope !== 'global' &&
              (!containedName || !containedName.startsWith(meta.scope + '.'))
            ) {
              findings.push({
                checkId: 'custom_role_on_oob_role',
                priority: 'P2',
                impact: 'Medium',
                location: `${relFile}:${rm.line}`,
                issue: `Custom role '${role}' contains system/out-of-scope role '${containedName || 'EMPTY'}'.`,
                fix: `Remove '${containedName || 'EMPTY'}' from sys_user_role_contains and document manual assignment if required.`,
              });
            }
          }
        }
      }

      // 4. scheduled_job_run_as in sysauto / sysauto_script / sysauto_report
      if (/<sysauto(?:_script|_report)?[\s>]/i.test(content)) {
        for (const runAs of extractXmlTagValues(content, 'run_as')) {
          if (runAs.value.trim() !== '') {
            findings.push({
              checkId: 'scheduled_job_run_as',
              priority: 'P2',
              impact: 'Low',
              location: `${relFile}:${runAs.line}`,
              issue: `Scheduled Job 'run_as' field is populated ('${runAs.value.trim()}'), which may reference a non-existent user on customer instances.`,
              fix: `Clear the <run_as/> field so the job runs as 'system' by default.`,
            });
          }
        }
      }

      // 5. default_dynamic_translation in sys_translator_configuration
      if (content.includes('<sys_translator_configuration')) {
        const defTrans = getXmlField(content, 'default_provider') || getXmlField(content, 'mark_as_default_for_translation');
        const active = getXmlField(content, 'active');
        if (defTrans === 'true' || active === 'true') {
          findings.push({
            checkId: 'default_dynamic_translation',
            priority: 'P2',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Dynamic Translation configuration is packaged with active='${active}' or default_provider='${defTrans}'.`,
            fix: `Set active, mark_as_default_for_translation, and mark_as_default_for_detection to false.`,
          });
        }
      }

      // 6. record_collection in pa_indicators
      if (content.includes('<pa_indicators')) {
        const collect = getXmlField(content, 'collect_records');
        if (collect === 'false' || collect === '0') {
          findings.push({
            checkId: 'record_collection',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `PA Indicator has <collect_records>false</collect_records>; criteria referencing this indicator require record collection.`,
            fix: `Enable <collect_records>true</collect_records> if referenced by indicator criteria.`,
          });
        }
      }

      // 7. homepage_order_read_role in sys_portal_page
      if (content.includes('<sys_portal_page')) {
        const orderStr = getXmlField(content, 'order');
        const readRoles = getXmlField(content, 'read_roles');
        const orderNum = orderStr ? parseInt(orderStr, 10) : 0;
        if (isNaN(orderNum) || orderNum < 3000 || !readRoles || readRoles === 'snc_internal') {
          findings.push({
            checkId: 'homepage_order_read_role',
            priority: 'P4',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Legacy Homepage (sys_portal_page) has order='${orderStr}' (< 3000) or read_roles='${readRoles}'.`,
            fix: `Set <order> >= 3000 and assign a scoped role to <read_roles>, or migrate to Next Experience Dashboards.`,
          });
        }
      }

      // 8. hr_shell_template in sn_hr_core_template
      if (content.includes('<sn_hr_core_template')) {
        const active = getXmlField(content, 'active');
        const tmpl = getXmlField(content, 'template');
        if (active === 'true' && !tmpl) {
          findings.push({
            checkId: 'hr_shell_template',
            priority: 'P4',
            impact: 'Low',
            location: `${relFile}:1`,
            issue: `Active HR Template has an empty <template/> field (shell template).`,
            fix: `Populate at least one field on the HR Template or deactivate it.`,
          });
        }
      }

      // 9. support_module tracking in sys_app_application / sys_app_module
      if (content.includes('<sys_app_application')) {
        hasAppMenu = true;
      }
      if (content.includes('<sys_app_module')) {
        const title = getXmlField(content, 'title') || getXmlField(content, 'name');
        if (/contact\s+support|support/i.test(title)) {
          hasSupportModule = true;
        }
      }

      // 10. XML Client Script onChange check (cs_best_practise & client_side_operations)
      if (content.includes('<sys_script_client') || content.includes('<catalog_script_client')) {
        const csType = getXmlField(content, 'type');
        const scripts = extractXmlTagValues(content, 'script');
        for (const s of scripts) {
          if (csType === 'onChange' && !/\bisLoading\b/.test(s.value)) {
            findings.push({
              checkId: 'cs_best_practise',
              priority: 'P3',
              impact: 'Low',
              location: `${relFile}:${s.line}`,
              issue: `onChange Client Script does not check the 'isLoading' flag.`,
              fix: `Add 'if (isLoading || newValue === "") return;' at the beginning of onChange().`,
            });
          }
          if (/\bg_form\.set(?:Mandatory|ReadOnly|Disabled|Visible|Display)\s*\(/.test(s.value)) {
            findings.push({
              checkId: 'client_side_operations',
              priority: 'P3',
              impact: 'Low',
              location: `${relFile}:${s.line}`,
              issue: `Client Script uses imperative g_form field visibility/mandatory/read-only calls.`,
              fix: `Prefer a declarative UI Policy over Client Script where possible.`,
            });
          }
        }
      }

      // 11. Scan embedded script fields inside XML records
      const isReadAcl =
        content.includes('<sys_security_acl') &&
        (getXmlField(content, 'operation') === 'read' || /display_value="read"/i.test(content));
      const isWorkflow = content.includes('<wf_workflow_version') || content.includes('<sys_variable_value');
      const isClientXml =
        content.includes('<sys_script_client') ||
        content.includes('<catalog_script_client') ||
        content.includes('<sys_ui_script');

      const scriptTags = [
        'script',
        'operation_script',
        'client_script',
        'processing_script',
        'script_true',
        'script_false',
        'source_script',
      ];
      for (const tag of scriptTags) {
        for (const entry of extractXmlTagValues(content, tag)) {
          if (!entry.value.trim()) continue;
          const tagIsClient = isClientXml || tag === 'client_script' || tag === 'script_true' || tag === 'script_false';
          scanScriptContent({
            code: entry.value,
            relFile,
            baseLine: entry.line,
            isClient: tagIsClient,
            isServer: !tagIsClient,
            tableContext: isReadAcl ? 'sys_security_acl_read' : isWorkflow ? 'workflow_script' : 'xml_script',
            findings,
            packagedSysIds: meta.packagedSysIds,
            scope: meta.scope,
          });
          if (/GlideRecord(?:Secure)?\s*\(\s*['"]cmdb_ci/i.test(entry.value) && /\.(?:insert|update)\s*\(/.test(entry.value)) {
            writesCmdbCi = true;
            findings.push({
              checkId: 'cross_scope_crud',
              priority: 'P2',
              impact: 'Medium',
              location: `${relFile}:${entry.line}`,
              issue: `Direct GlideRecord insert/update on cmdb_ci table detected instead of CMDB IRE API.`,
              fix: `Use sn_cmdb.IdentificationEngine.createOrUpdateCI() for CMDB CI creation and updates.`,
            });
          }
        }
      }
    }
  }

  if (hasAppMenu && !hasSupportModule) {
    findings.push({
      checkId: 'support_module',
      priority: 'P3',
      impact: 'Medium',
      location: `ApplicationMenu`,
      issue: `Application defines an Application Menu but does not include a 'Contact Support' module.`,
      fix: `Add a 'Contact Support' module under the Application Menu with support contact details.`,
    });
  }

  if (writesCmdbCi && !registersDiscoverySource) {
    findings.push({
      checkId: 'discovery_source_choice',
      priority: 'P2',
      impact: 'Medium',
      location: `CMDB Integration`,
      issue: `Application writes to cmdb_ci tables without registering a custom Discovery Source choice via CMDBDataSourceUtil.`,
      fix: `Register a scoped Discovery Source choice using new global.CMDBDataSourceUtil().addDataSource('<AppName>').`,
    });
  }

  return {
    appName: meta.appName,
    scope: meta.scope,
    appType: meta.appType,
    filesScanned: allFiles.length,
    findingsCount: findings.length,
    findings,
  };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('--json');
  const targetDir = args.find((a) => !a.startsWith('-')) || process.cwd();
  const report = runGeneralScan(targetDir);

  if (jsonFlag) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`General Best-Practice Scan: ${report.appName} (${report.scope})`);
    console.log(`App Type: ${report.appType} | Files Scanned: ${report.filesScanned} | Findings: ${report.findingsCount}`);
    if (report.findings.length === 0) {
      console.log('No deterministic general best-practice issues detected.');
    } else {
      for (const f of report.findings) {
        console.log(`\n[${f.priority}] ${f.checkId} (${f.impact}) @ ${f.location}`);
        console.log(`  Issue: ${f.issue}`);
        console.log(`  Fix:   ${f.fix}`);
      }
    }
  }
}
