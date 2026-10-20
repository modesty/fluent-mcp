#!/usr/bin/env node
/**
 * Deterministic Security Review Scanner for ServiceNow Fluent & Classic XML Apps.
 *
 * EvaluatesServiceNow security checks across both Fluent (.now.ts / .ts / .js / .html) and Classic XML
 * (update/ / metadata/ / unload.demo/ / dictionary/) applications.
 *
 * Usage:
 *   node scan_security_checks.mjs [app-directory] [--json]
 */

import fs from 'node:fs';
import path from 'node:path';

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

const NOBODY_ROLE_SYS_ID = 'b05926fa0a0a0aa7000130023e0bde98';
const PUBLIC_ROLE_SYS_ID = '940ba7020a0a0aa70065066690d815c6';
const GEN_AI_AGENT_ACL_TYPE = 'fc55e9f79f8222109570e67e8a0a1c34';
const GEN_AI_WORKFLOW_ACL_TYPE = 'd9eb25b39fc222109570e67e8a0a1c6a';
const GEN_AI_SKILL_ACL_TYPE = '0d986410ffdd2210c0e9ffffffffffc9';

const SENSITIVE_FIELD_RE =
  /(?:^|_)(?:password|passwd|pwd|secret|client_secret|api_key|apikey|access_token|refresh_token|auth_token|private_key|passphrase)(?:$|_)/i;

const SAFE_HTTP_NAMESPACE_RE =
  /^http:\/\/(?:localhost\b|127\.0\.0\.1\b|0\.0\.0\.0\b|schemas\.|www\.w3\.org\b|java\.sun\.com\b|apache\.org\b|xml\.org\b|example\.com\b)/i;

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

function stripCommentsPreserveLines(code) {
  return code.replace(
    /(['"`])(?:\\[\s\S]|(?!\1)[\s\S])*?\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (match, quote) => {
      if (quote) return match;
      return match.replace(/[^\n]/g, ' ');
    }
  );
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

function getXmlDisplayValue(xmlContent, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*\\bdisplay_value="([^"]*)"`, 'i');
  const m = xmlContent.match(re);
  return m ? m[1].trim() : '';
}

function detectAppMetadata(appDir, allFiles) {
  const nowConfigPath = path.join(appDir, 'now.config.json');
  const pkgJsonPath = path.join(appDir, 'package.json');
  let scope = '';
  let scopeId = '';
  let appName = path.basename(appDir);
  let hasFluent = false;
  let hasXml = false;

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
      if (pkg.now?.scope && !scope) {
        scope = typeof pkg.now.scope === 'string' ? pkg.now.scope : pkg.now.scope.name || '';
      }
      if (pkg.now?.scope?.id && !scopeId) {
        scopeId = pkg.now.scope.id;
      }
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
        rel.startsWith('dictionary' + path.sep) ||
        rel.includes(path.sep + 'update' + path.sep) ||
        rel.includes(path.sep + 'scope' + path.sep)
      ) {
        hasXml = true;
      }
      if (!scope) {
        const base = path.basename(file);
        if (base.startsWith('sys_app_') || base.startsWith('sys_store_app_')) {
          const content = fs.readFileSync(file, 'utf8');
          const s = getXmlField(content, 'scope');
          const n = getXmlField(content, 'name');
          const id = getXmlField(content, 'sys_id');
          if (s) scope = s;
          if (n) appName = n;
          if (id) scopeId = id;
        }
      }
      if (!scope) {
        const content = fs.readFileSync(file, 'utf8');
        const scopeAttr = content.match(/<sys_package[^>]*source="([^"]+)"/i);
        if (scopeAttr && scopeAttr[1] !== 'global') {
          scope = scopeAttr[1];
        }
      }
    }
  }

  const appType =
    hasFluent && hasXml ? 'Hybrid' : hasFluent ? 'Fluent (now.config.json)' : 'Classic XML (update/)';

  return { appName, scope: scope || 'unknown_scope', scopeId, appType };
}

function scanJellyContent({ content, relFile, baseLine, findings }) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = baseLine + i;

    if (/<g2?:no_escape\b/i.test(line) || /\bNOESC\s*:/i.test(line)) {
      findings.push({
        checkId: 'jelly_unescaped',
        priority: 'P1',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `Jelly template uses explicit unescaped output (<g:no_escape> or NOESC:), creating an XSS vector.`,
        fix: `Remove <g:no_escape> / NOESC: and escape Jelly variables with \${HTML:var} or \${JS:var}.`,
      });
      continue;
    }

    // Ignore server-side Jelly control/evaluation tags where ${...} is not rendered to HTML/JS output
    if (/^\s*<\/?(?:j2?:(?:if|when|otherwise|forEach|set|switch|case|choose)|g2?:(?:evaluate| ui_form))\b/i.test(line)) {
      continue;
    }

    if (/\$(?:\{|\[)(?!((?:js|html|(?:js,html)|(?:html,js)):|amp\b|sp\b|gs\.))/i.test(line)) {
      findings.push({
        checkId: 'jelly_unescaped',
        priority: 'P1',
        impact: 'Medium',
        location: `${relFile}:${lineNum}`,
        issue: `Unescaped Jelly expression detected ("${line.trim().slice(0, 80)}") without HTML: or JS: escaping.`,
        fix: `Escape Jelly expressions using \${HTML:var}, \${JS:var}, \$[HTML:var], or \$[JS:var].`,
      });
    }
  }
}

function scanHtmlAndExternalSources({ content, relFile, baseLine, findings }) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = baseLine + i;

    // external_sources: iframe, frame, frameset, embed, video[src], input[src], object[data]
    if (
      /<(?:iframe|frame|frameset|embed)\b/i.test(line) ||
      /<(?:video|input)\b[^>]*\bsrc\s*=/i.test(line) ||
      /<object\b[^>]*\bdata\s*=/i.test(line)
    ) {
      findings.push({
        checkId: 'external_sources',
        priority: 'P2',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `External source / frame tag detected ("${line.trim().slice(0, 80)}").`,
        fix: `Remove <iframe>/<frame>/<embed>/<object> tags unless approved by a certification security exception.`,
      });
    }

    // thirdparty_lib: <script src="...">
    if (/<script\b[^>]*\bsrc\s*=\s*['"][^'"]+['"]/i.test(line)) {
      findings.push({
        checkId: 'thirdparty_lib',
        priority: 'P2',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `External or third-party <script src="..."> tag detected ("${line.trim().slice(0, 80)}").`,
        fix: `Verify third-party library versions have no known CVEs and add Subresource Integrity (integrity + crossorigin) where applicable.`,
      });
    }
  }
}

function scanScriptSecurity({
  code,
  relFile,
  baseLine,
  isClient,
  isServer,
  isMidScript,
  isUserFacingServer,
  isFixScript,
  scope,
  findings,
}) {
  const stripped = stripCommentsPreserveLines(code);
  const lines = stripped.split('\n');
  const rawLines = code.split('\n');

  const hasAclGuardInBlock =
    /\bGlideRecordSecure\b|\.(?:canRead|canWrite|canCreate|canDelete)\s*\(/.test(stripped);
  const readsUserInputInBlock =
    /\b(?:request\.(?:pathParams|queryParams|body)|this\.getParameter\s*\(|g_request\.getParameter\s*\(|RP\.getParameterValue\s*\(|input\.[A-Za-z_$])/.test(
      stripped
    );

  // Check postMessage listener without origin validation
  for (const m of stripped.matchAll(/\baddEventListener\s*\(\s*['"]message['"]/g)) {
    const lineOffset = stripped.slice(0, m.index).split('\n').length - 1;
    const windowAfter = stripped.slice(m.index, m.index + 500);
    if (!/\.origin\b/.test(windowAfter)) {
      findings.push({
        checkId: 'postmessage_security',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${baseLine + lineOffset}`,
        issue: `'message' event listener does not validate event.origin against an allowlist.`,
        fix: `Verify event.origin against an explicit trusted origin before processing the message payload.`,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rawLine = rawLines[i] || '';
    const lineNum = baseLine + i;

    // 1. sensitive_data_found in comments or code (KB0010073)
    if (
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/.test(rawLine) ||
      /\bJSESSIONID\s*=\s*[A-Za-z0-9]{10,}/i.test(rawLine) ||
      /(?:\/\/|\/\*|\*)\s*.*\b(?:password|passwd|api_key|client_secret|access_token)\s*[:=]\s*['"]?[A-Za-z0-9_!@#$%^&*-]{6,}/i.test(
        rawLine
      ) ||
      /\b(?:password|passwd|api_key|apikey|client_secret|access_token|private_key)\s*[:=]\s*['"](?!\s*['"])(?![$<{])[A-Za-z0-9_!@#$%^&*+=-]{8,}['"]/i.test(
        line
      ) ||
      /\bAuthorization['"]?\s*,\s*['"](?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{10,}['"]/i.test(line)
    ) {
      findings.push({
        checkId: 'sensitive_data_found',
        priority: 'P0',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `Potential hardcoded credential, token, private key, or secret in comment/code ("${rawLine.trim().slice(0, 70)}").`,
        fix: `Remove hardcoded secrets and sensitive comments; store credentials in Connections & Credentials (sys_alias) or blank password2 properties.`,
      });
    }

    // 2. senstive_data_exposed: writing secrets to g_scratchpad or logs
    if (
      /\bg_scratchpad\.[A-Za-z0-9_]*(?:password|secret|token|api_key|private_key)/i.test(line) ||
      /\bgs\.(?:info|debug|warn|error|log)\s*\([^)]*\b(?:password|secret|access_token|api_key|client_secret)\b/i.test(
        line
      )
    ) {
      findings.push({
        checkId: 'senstive_data_exposed',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `Sensitive credential/token variable is exposed to g_scratchpad or system logs ("${rawLine.trim().slice(0, 80)}").`,
        fix: `Never expose passwords, tokens, or secrets in g_scratchpad or log statements.`,
      });
    }

    // 3. Eval Used
    if (
      /(?<![.\w$])eval\s*\(|(?:\bwindow|\bglobalThis)\.eval\s*\(/.test(line) ||
      /\bnew\s+Function\s*\(/.test(line) ||
      /\bset(?:Timeout|Interval)\s*\(\s*['"`]/.test(line)
    ) {
      findings.push({
        checkId: 'Eval Used',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `Dynamic code evaluation (eval / new Function / string timer) detected ("${rawLine.trim().slice(0, 80)}").`,
        fix: `Remove eval() and dynamic code evaluation; use JSON.parse() or structured logic.`,
      });
    }

    // 4. si_restricted (Packages.* in server scripts, excluding MID Server Script Includes)
    if (isServer && !isMidScript && /\bPackages\.[A-Za-z_$]/.test(line)) {
      findings.push({
        checkId: 'si_restricted',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `Restricted Java Packages.* call in scoped server script ("${rawLine.trim().slice(0, 80)}").`,
        fix: `Replace Java Packages.* calls with supported Scoped Glide APIs.`,
      });
    }

    // 5. glidescopedevaluator
    if (/\bGlideScopedEvaluator\b/.test(line)) {
      findings.push({
        checkId: 'glidescopedevaluator',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `GlideScopedEvaluator usage detected ("${rawLine.trim().slice(0, 80)}").`,
        fix: `Verify the evaluated script field write ACL is restricted to admin, the script is never built via string concatenation, and never sourced from 3rd parties.`,
      });
    }

    // 6. dynamic_input_add_encoded_query
    if (/\.addEncodedQuery\s*\(/.test(line)) {
      const callMatch = stripped.slice(stripped.indexOf(line)).match(/\.addEncodedQuery\s*\(([\s\S]*?)\)\s*[;,\n]/);
      const argsText = callMatch ? callMatch[1].trim() : line.slice(line.indexOf('addEncodedQuery') + 15);
      const isStaticLiteral = /^['"][^'"]*['"]\s*(?:,\s*true\s*)?$/.test(argsText);
      const hasEscapeAndAcl =
        /escapeQueryTermSeparator\s*\(/.test(argsText) && /,\s*true\s*$/.test(argsText);
      if (!isStaticLiteral && !hasEscapeAndAcl) {
        findings.push({
          checkId: 'dynamic_input_add_encoded_query',
          priority: 'P0',
          impact: 'Medium',
          location: `${relFile}:${lineNum}`,
          issue: `Dynamic input passed to addEncodedQuery() without GlideStringUtil.escapeQueryTermSeparator() and enforceACL=true ("${rawLine.trim().slice(0, 80)}").`,
          fix: `Use gr.addQuery(field, operator, value), or wrap dynamic values in GlideStringUtil.escapeQueryTermSeparator(val) and pass true as the 2nd argument to addEncodedQuery(query, true).`,
        });
      }
    }

    // 7. wg_glidereccalls & idor in user-facing server scripts
    if (isUserFacingServer && /\bnew\s+GlideRecord\s*\(/.test(line)) {
      if (!hasAclGuardInBlock) {
        findings.push({
          checkId: 'wg_glidereccalls',
          priority: 'P2',
          impact: 'Medium',
          location: `${relFile}:${lineNum}`,
          issue: `Client/user-reachable script uses GlideRecord instead of GlideRecordSecure without explicit ACL checks ("${rawLine.trim().slice(0, 80)}").`,
          fix: `Use GlideRecordSecure or enforce canRead()/canWrite()/canCreate()/canDelete() checks.`,
        });
        if (readsUserInputInBlock) {
          findings.push({
            checkId: 'idor',
            priority: 'P0',
            impact: 'Critical',
            location: `${relFile}:${lineNum}`,
            issue: `Client-reachable script accepts user parameters and queries GlideRecord without ACL or ownership verification (IDOR risk).`,
            fix: `Validate record ownership and enforce ACLs using GlideRecordSecure or canRead()/canWrite() before accessing records by user-supplied IDs.`,
          });
        }
      }
    }

    // 8. fix_script: deleteRecord / deleteMultiple or out-of-scope CRUD
    if (isFixScript) {
      if (/\.(?:deleteRecord|deleteMultiple)\s*\(/.test(line)) {
        findings.push({
          checkId: 'fix_script',
          priority: 'P0',
          impact: 'Medium',
          location: `${relFile}:${lineNum}`,
          issue: `Fix Script performs record deletion ("${rawLine.trim().slice(0, 80)}"), which is disallowed in scoped apps.`,
          fix: `Remove deleteRecord() / deleteMultiple() calls from Fix Scripts.`,
        });
      }
      const grTableMatch = line.match(/\bnew\s+GlideRecord(?:Secure)?\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (
        grTableMatch &&
        scope !== 'unknown_scope' &&
        scope !== 'global' &&
        !grTableMatch[1].startsWith(scope + '_') &&
        /\.(?:insert|update|deleteRecord|deleteMultiple)\s*\(/.test(stripped)
      ) {
        findings.push({
          checkId: 'fix_script',
          priority: 'P0',
          impact: 'Medium',
          location: `${relFile}:${lineNum}`,
          issue: `Fix Script performs CRUD operations on out-of-scope table '${grTableMatch[1]}'.`,
          fix: `Remove out-of-scope table CRUD operations from Fix Scripts.`,
        });
      }
    }

    // 9. open_redirections
    if (
      /(?:\bwindow\.open\s*\(|\b(?:window|document|top|self)\.location(?:\.href|\s*=)|\baction\.setRedirectURL\s*\(|\bgs\.setRedirect\s*\()/.test(
        line
      ) &&
      !/\baction\.setRedirectURL\s*\(\s*current\s*\)/.test(line)
    ) {
      findings.push({
        checkId: 'open_redirections',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: `Redirect call detected ("${rawLine.trim().slice(0, 80)}"); verify redirect target is not controlled by unvalidated user/URL input.`,
        fix: `Validate redirect URLs against glide.security.url.whitelist or restrict redirects to trusted relative paths.`,
      });
    }

    // 10. postmessage_security
    if (/\.postMessage\s*\(/.test(line)) {
      const hasWildcardOrigin = /\.postMessage\s*\([^,]+,\s*['"]\*['"]/.test(line);
      findings.push({
        checkId: 'postmessage_security',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:${lineNum}`,
        issue: hasWildcardOrigin
          ? `postMessage() uses wildcard '*' targetOrigin ("${rawLine.trim().slice(0, 80)}").`
          : `postMessage() call detected ("${rawLine.trim().slice(0, 80)}"); verify targetOrigin and ensure no sensitive data is leaked.`,
        fix: `Specify an exact trusted targetOrigin in postMessage() and never transmit sensitive data.`,
      });
    }

    // 11. manual_security_review vectors (GlideEvaluator, setDisplayValue on password, GlideEncrypter, Math.random)
    if (/\b(?:GlideEvaluator|GlideScriptEvaluator|GlideFilter\.checkRecord|GlideController)\b/.test(line)) {
      findings.push({
        checkId: 'manual_security_review',
        priority: 'P0',
        impact: 'Critical',
        location: `${relFile}:${lineNum}`,
        issue: `High-risk evaluation API (${rawLine.trim().slice(0, 70)}) detected.`,
        fix: `Avoid GlideEvaluator/GlideScriptEvaluator/GlideController with user input; use safe structured logic.`,
      });
    }
    if (/\.setDisplayValue\s*\(\s*['"][^'"]*(?:password|secret|token)[^'"]*['"]/i.test(line)) {
      findings.push({
        checkId: 'manual_security_review',
        priority: 'P0',
        impact: 'Critical',
        location: `${relFile}:${lineNum}`,
        issue: `setDisplayValue() used on a password/secret field ("${rawLine.trim().slice(0, 70)}"), which stores the value in plaintext.`,
        fix: `Use setValue() instead of setDisplayValue() on password/password2 columns.`,
      });
    }
    if (/\bGlideEncrypter\b/.test(line)) {
      findings.push({
        checkId: 'manual_security_review',
        priority: 'P0',
        impact: 'Critical',
        location: `${relFile}:${lineNum}`,
        issue: `Deprecated GlideEncrypter (3DES) API used ("${rawLine.trim().slice(0, 70)}").`,
        fix: `Migrate from GlideEncrypter to Key Management Framework (KMF / CertificateEncryption).`,
      });
    }
    if (
      /\bMath\.random\s*\(\s*\)/.test(line) &&
      /\b(?:token|secret|password|passwd|pwd|nonce|key|salt|otp|pin|auth)\b/i.test(line)
    ) {
      findings.push({
        checkId: 'manual_security_review',
        priority: 'P0',
        impact: 'Critical',
        location: `${relFile}:${lineNum}`,
        issue: `Insecure Math.random() used for security-sensitive token/secret generation ("${rawLine.trim().slice(0, 70)}").`,
        fix: `Use GlideSecureRandomUtil.getSecureRandomString() instead of Math.random() (KB0010151).`,
      });
    }
  }
}

export function runSecurityScan(appDir) {
  const absDir = path.resolve(appDir);
  const allFiles = walkFiles(absDir);
  const meta = detectAppMetadata(absDir, allFiles);
  const findings = [];

  // Cross-file state for relational ACL and module checks
  // customTables: name -> { location }
  const customTables = new Map();
  // acls: sysId/id -> { sysId, type, typeName, operation, name, hasRole, hasControl, location }
  const acls = [];
  // aclRoles: aclSysId -> Set<roleNameOrSysId>
  const aclRolesByAclId = new Map();
  // uiActions: sysId -> { name, condition, hasRole, location }
  const uiActions = new Map();
  const uiActionRolesByActionId = new Set();
  // restDefs: sysId -> { name, enforceAcl, location }
  const restDefs = new Map();
  // restOps: list of { name, defId, reqAuth, reqAcl, enforceAcl, location }
  const restOps = [];
  // clientCallableScriptIncludes: list of { name, location }
  const ccsis = [];
  // clientCallableFlows: list of { name, location }
  const ccfsas = [];
  // uiPages: list of { name, endpoint, location }
  const uiPages = [];
  // processors: list of { name, path, roles, requireCsrf, script, location }
  const processors = [];
  // aiAgents: list of { name, internalName, hasInlineRoleOrAcl, location }
  const aiAgents = [];
  // aiUsecases: list of { name, internalName, hasInlineRoleOrAcl, location }
  const aiUsecases = [];
  // genAiSkills: list of { name, sysId, hasInlineRoleOrAcl, location }
  const genAiSkills = [];

  let hasAppMenu = false;
  let hasPrivacyPolicyModule = false;

  // Pass 1: Collect ACL role mappings, UI Action roles, and REST definitions from XML
  for (const file of allFiles) {
    if (!file.endsWith('.xml')) continue;
    const relFile = path.relative(absDir, file);
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('<sys_security_acl_role')) {
      const aclId = getXmlField(content, 'sys_security_acl');
      const roleVal = getXmlField(content, 'sys_user_role');
      const roleDisplay = getXmlDisplayValue(content, 'sys_user_role');
      if (aclId) {
        if (!aclRolesByAclId.has(aclId)) aclRolesByAclId.set(aclId, new Set());
        aclRolesByAclId.get(aclId).add(roleDisplay || roleVal);
      }
      if (
        roleVal === NOBODY_ROLE_SYS_ID ||
        roleVal === PUBLIC_ROLE_SYS_ID ||
        /^(?:nobody|public)$/i.test(roleDisplay) ||
        /^(?:nobody|public)$/i.test(roleVal)
      ) {
        findings.push({
          checkId: 'acl_with_nobody_or_public_role',
          priority: 'P0',
          impact: 'Critical',
          location: `${relFile}:1`,
          issue: `ACL role mapping assigns prohibited '${roleDisplay || roleVal}' role.`,
          fix: `Remove 'nobody' and 'public' roles from all ACLs; use scoped application roles.`,
        });
      }
    }

    if (content.includes('<sys_ui_action_role')) {
      const actionId = getXmlField(content, 'sys_ui_action');
      if (actionId) uiActionRolesByActionId.add(actionId);
    }

    if (content.includes('<sys_ws_definition')) {
      const sysId = getXmlField(content, 'sys_id');
      const name = getXmlField(content, 'name');
      const enforceAcl = getXmlField(content, 'enforce_acl');
      if (sysId) restDefs.set(sysId, { name, enforceAcl, location: `${relFile}:1` });
    }
  }

  // Pass 2: Inspect all files
  for (const file of allFiles) {
    const relFile = path.relative(absDir, file);
    const baseName = path.basename(file);

    // Check demo data directory / files
    if (
      relFile.startsWith('unload.demo' + path.sep) ||
      relFile.includes(path.sep + 'unload.demo' + path.sep)
    ) {
      const content = fs.readFileSync(file, 'utf8');
      const hasUserOrCred = /<sys_user[\s>]|<user_password|<password/i.test(content);
      findings.push({
        checkId: 'demo_data',
        priority: 'P1',
        impact: 'High',
        location: `${relFile}:1`,
        issue: hasUserOrCred
          ? `Demo data payload contains user or password records in unload.demo.`
          : `Demo data file packaged in unload.demo; confirm intentionality and absence of sensitive data.`,
        fix: `Remove unintended or sensitive demo data records from unload.demo before publishing.`,
      });
    }

    // Check Fluent (.now.ts / .ts / .js) files
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      const stripped = stripCommentsPreserveLines(content);

      // Table({...})
      for (const m of stripped.matchAll(/\bTable\s*\(\s*\{([\s\S]*?)\n\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const tableName = nameMatch ? nameMatch[1] : '';
        if (
          tableName &&
          (meta.scope === 'unknown_scope' || meta.scope === 'global' || tableName.startsWith(meta.scope + '_'))
        ) {
          customTables.set(tableName, { location: `${relFile}:${lineNum}` });
        }

        // Check ScriptColumn or columnType: 'script'
        if (/\bScriptColumn\s*\(|\bcolumnType\s*:\s*['"]script(?:_plain|_server)?['"]/.test(body)) {
          findings.push({
            checkId: 'script_type_column',
            priority: 'P0',
            impact: 'Critical',
            location: `${relFile}:${lineNum}`,
            issue: `Table '${tableName || 'unknown'}' defines a script-type column.`,
            fix: `Restrict write ACLs on script-type fields strictly to 'admin' users.`,
          });
        }

        // Check sensitive column of type StringColumn
        for (const colMatch of body.matchAll(/([A-Za-z0-9_]+)\s*:\s*StringColumn\s*\(/g)) {
          const colName = colMatch[1];
          if (SENSITIVE_FIELD_RE.test(colName)) {
            findings.push({
              checkId: 'sensitive_column_of_type_string',
              priority: 'P0',
              impact: 'Critical',
              location: `${relFile}:${lineNum}`,
              issue: `Sensitive column '${colName}' on table '${tableName || 'unknown'}' uses StringColumn instead of password2.`,
              fix: `Deactivate the string column and recreate '${colName}' with type 'password2'.`,
            });
          }
        }
      }

      // Property({...})
      for (const m of stripped.matchAll(/\bProperty\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const typeMatch = body.match(/\btype\s*:\s*['"]([^'"]+)['"]/);
        const valMatch = body.match(/\bvalue\s*:\s*['"]([^'"]+)['"]/);
        const propName = nameMatch ? nameMatch[1] : '';
        const propType = typeMatch ? typeMatch[1] : 'string';
        const propVal = valMatch ? valMatch[1] : '';

        if (/password/i.test(propType) && propVal !== '') {
          findings.push({
            checkId: 'password_properties',
            priority: 'P0',
            impact: 'Critical',
            location: `${relFile}:${lineNum}`,
            issue: `Password property '${propName}' has a non-blank default value.`,
            fix: `Set the value field to blank ('') on all password/password2 system properties.`,
          });
        } else if (!/password2/i.test(propType) && SENSITIVE_FIELD_RE.test(propName)) {
          findings.push({
            checkId: 'senstive_data_exposed',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Sensitive property '${propName}' uses type '${propType}' instead of 'password2'.`,
            fix: `Use type 'password2' for system properties that store sensitive credentials or secrets.`,
          });
        }
      }

      // Acl({...})
      for (const m of stripped.matchAll(/\bAcl\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const typeMatch = body.match(/\btype\s*:\s*['"]([^'"]+)['"]/);
        const opMatch = body.match(/\boperation\s*:\s*['"]([^'"]+)['"]/);
        const tableMatch = body.match(/\btable\s*:\s*['"]([^'"]+)['"]/);
        const fieldMatch = body.match(/\bfield\s*:\s*['"]([^'"]+)['"]/);
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const rolesMatch = body.match(/\broles\s*:\s*\[([\s\S]*?)\]/);

        const aclType = typeMatch ? typeMatch[1] : 'record';
        const op = opMatch ? opMatch[1] : '';
        const tbl = tableMatch ? tableMatch[1] : '';
        const fld = fieldMatch ? fieldMatch[1] : '';
        const nm = nameMatch ? nameMatch[1] : tbl;
        const rolesRaw = rolesMatch ? rolesMatch[1] : '';
        const hasRoles = Boolean(rolesRaw.trim());
        const hasControl =
          hasRoles ||
          /\b(?:condition|script|securityAttribute)\s*:/.test(body);

        if (/\b(?:nobody|public)\b/i.test(rolesRaw)) {
          findings.push({
            checkId: 'acl_with_nobody_or_public_role',
            priority: 'P0',
            impact: 'Critical',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent Acl() uses prohibited 'nobody' or 'public' role.`,
            fix: `Remove 'nobody' and 'public' roles from Acl() definitions.`,
          });
        }

        if (
          aclType === 'record' &&
          tbl &&
          meta.scope !== 'unknown_scope' &&
          meta.scope !== 'global' &&
          !tbl.startsWith(meta.scope + '_') &&
          !(fld && fld.startsWith(meta.scope + '_'))
        ) {
          findings.push({
            checkId: 'out_of_scope_acl',
            priority: 'P0',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent Acl() targets out-of-scope table '${tbl}'${fld ? '.' + fld : ''}.`,
            fix: `Remove ACLs created on out-of-scope tables.`,
          });
        }

        acls.push({
          sysId: nm,
          type: aclType,
          typeName: aclType,
          operation: op,
          name: fld && fld !== '*' ? `${tbl}.${fld}` : nm,
          hasRole: hasRoles,
          hasControl,
          location: `${relFile}:${lineNum}`,
        });
      }

      // ScriptInclude({ clientCallable: true })
      for (const m of stripped.matchAll(/\bScriptInclude\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        if (/\bclientCallable\s*:\s*true\b/.test(body)) {
          const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
          ccsis.push({
            name: nameMatch ? nameMatch[1] : 'ScriptInclude',
            location: `${relFile}:${lineNum}`,
          });
        }
      }

      // UiPage({...})
      for (const m of stripped.matchAll(/\bUiPage\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const epMatch = body.match(/\bendpoint\s*:\s*['"]([^'"]+)['"]/);
        const endpoint = epMatch ? epMatch[1] : '';
        if (endpoint) {
          uiPages.push({
            name: endpoint,
            endpoint: endpoint.replace(/\.do$/i, ''),
            location: `${relFile}:${lineNum}`,
          });
        }
        const htmlMatch = body.match(/\bhtml\s*:\s*(['"`])([\s\S]*?)\1/);
        if (htmlMatch) {
          scanHtmlAndExternalSources({
            content: htmlMatch[2],
            relFile,
            baseLine: lineNum,
            findings,
          });
        }
      }

      // UiAction({...})
      for (const m of stripped.matchAll(/\bUiAction\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const hasRoles = /\broles\s*:\s*\[\s*[^\]]+\]/.test(body);
        const hasCondition = /\bcondition\s*:\s*['"][^'"]+['"]/.test(body);
        if (!hasRoles && !hasCondition) {
          findings.push({
            checkId: 'ui_action_roles_condtions',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent UiAction '${nameMatch ? nameMatch[1] : 'unnamed'}' has neither roles nor a condition defined.`,
            fix: `Add required roles or a restrictive condition to the UiAction.`,
          });
        }
      }

      // RestApi({...})
      for (const m of stripped.matchAll(/\bRestApi\s*\(\s*\{([\s\S]*?)\n\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const apiName = nameMatch ? nameMatch[1] : 'RestApi';
        const hasApiAcl = /\benforceAcl\s*:\s*\[\s*[^\]]+\]/.test(body);
        const disablesAuth = /\brequiresAuthentication\s*:\s*false\b/.test(body);
        const disablesAcl = /\brequiresAclAuthorization\s*:\s*false\b/.test(body);
        if (disablesAuth || disablesAcl || !hasApiAcl) {
          findings.push({
            checkId: 'scripted_rest_acl_configuration',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent RestApi '${apiName}' has requiresAuthentication/requiresAclAuthorization disabled or empty enforceAcl.`,
            fix: `Ensure requiresAuthentication and requiresAclAuthorization are true and enforceAcl references a REST_Endpoint ACL with roles.`,
          });
        }
      }

      // SPPage({...}) & SPWidget({...})
      for (const m of stripped.matchAll(/\bSPPage\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const idMatch = body.match(/\bid\s*:\s*['"]([^'"]+)['"]/);
        const pageId = idMatch ? idMatch[1] : 'SPPage';
        if (/\bpublic\s*:\s*true\b/.test(body)) {
          findings.push({
            checkId: 'sp_public_page',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent SPPage '${pageId}' is marked public: true.`,
            fix: `Set public: false on Service Portal pages and protect them with roles.`,
          });
        }
        if (!/\broles\s*:\s*\[\s*[^\]]+\]/.test(body) && !/\broles\s*:\s*['"][^'"]+['"]/.test(body)) {
          findings.push({
            checkId: 'sp_page_role',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent SPPage '${pageId}' does not specify required roles.`,
            fix: `Protect the Service Portal page with scoped application roles.`,
          });
        }
      }

      for (const m of stripped.matchAll(/\bSPWidget\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const widgetName = nameMatch ? nameMatch[1] : 'SPWidget';
        if (/\bpublic\s*:\s*true\b/.test(body)) {
          findings.push({
            checkId: 'sp_widget_public',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent SPWidget '${widgetName}' is marked public: true.`,
            fix: `Set public: false on Service Portal widgets.`,
          });
        }
        if (!/\broles\s*:\s*\[\s*[^\]]+\]/.test(body) && !/\broles\s*:\s*['"][^'"]+['"]/.test(body)) {
          findings.push({
            checkId: 'sp_widget_role',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent SPWidget '${widgetName}' does not specify required roles.`,
            fix: `Protect the Service Portal widget with scoped application roles.`,
          });
        }
      }

      // AiAgent / AiAgenticWorkflow / NowAssistSkillConfig
      for (const m of stripped.matchAll(/\bAiAgent\s*\(\s*\{([\s\S]*?)\n\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const hasAclOrRole = /\b(?:acl|roleMap|roleList|dataAccess)\s*:/.test(body);
        if (!hasAclOrRole) {
          findings.push({
            checkId: 'acl_on_agentic_ai_partner',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent AiAgent '${nameMatch ? nameMatch[1] : 'AiAgent'}' does not define ACL or role restrictions (acl / dataAccess.roleMap).`,
            fix: `Configure ACL and least-privilege role restrictions on the AiAgent.`,
          });
        }
      }

      for (const m of stripped.matchAll(/\bAiAgenticWorkflow\s*\(\s*\{([\s\S]*?)\n\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const hasAclOrRole = /\b(?:acl|roleMap|roleList|dataAccess)\s*:/.test(body);
        if (!hasAclOrRole) {
          findings.push({
            checkId: 'acl_on_agentic_ai_usecase_partner',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent AiAgenticWorkflow '${nameMatch ? nameMatch[1] : 'AiAgenticWorkflow'}' does not define ACL or role restrictions.`,
            fix: `Configure ACL and least-privilege role restrictions on the AiAgenticWorkflow.`,
          });
        }
      }

      for (const m of stripped.matchAll(/\bNowAssistSkillConfig\s*\(\s*\{([\s\S]*?)\n\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const hasAclOrRole = /\b(?:acl|roleMap)\s*:/.test(body);
        if (!hasAclOrRole) {
          findings.push({
            checkId: 'acl_on_gen_ai_skill_partner',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Fluent NowAssistSkillConfig '${nameMatch ? nameMatch[1] : 'NowAssistSkillConfig'}' does not define ACL or roleMap restrictions.`,
            fix: `Configure ACL and least-privilege roleMap restrictions on the NowAssistSkillConfig.`,
          });
        }
      }

      // CrossScopePrivilege({...})
      for (const m of stripped.matchAll(/\bCrossScopePrivilege\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const targetScopeMatch = body.match(/\btargetScope\s*:\s*['"]([^'"]+)['"]/);
        const targetNameMatch = body.match(/\btargetName\s*:\s*['"]([^'"]+)['"]/);
        const targetScope = targetScopeMatch ? targetScopeMatch[1] : '';
        const targetName = targetNameMatch ? targetNameMatch[1] : '';
        if (targetScope && meta.scope !== 'unknown_scope' && targetScope === meta.scope) {
          findings.push({
            checkId: 'rca_target_scope_mismatch',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `CrossScopePrivilege targeting '${targetName}' sets targetScope to the app's own scope ('${targetScope}').`,
            fix: `Set targetScope to the target resource's actual owning scope.`,
          });
        }
      }

      // RestMessage http:// check
      for (const m of stripped.matchAll(/\bRestMessage\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        for (const urlMatch of body.matchAll(/['"](http:\/\/[^'"]+)['"]/gi)) {
          if (!SAFE_HTTP_NAMESPACE_RE.test(urlMatch[1])) {
            findings.push({
              checkId: 'manual_security_review',
              priority: 'P0',
              impact: 'Critical',
              location: `${relFile}:${lineNum}`,
              issue: `Unencrypted HTTP endpoint '${urlMatch[1]}' configured in RestMessage (KB0010088).`,
              fix: `Use https:// (SSL/TLS) for all external service communications.`,
            });
          }
        }
      }

      // Record({...}) for sys_public, sys_push_notif_app_install, sys_cors_rule, demo data
      for (const m of stripped.matchAll(/\bRecord\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        const tblMatch = body.match(/\btable\s*:\s*['"]([^'"]+)['"]/);
        const tbl = tblMatch ? tblMatch[1] : '';
        if (tbl === 'sys_public') {
          findings.push({
            checkId: 'public_pages',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Record() creates a public page entry in 'sys_public'.`,
            fix: `Remove sys_public records unless unauthenticated access is strictly required and justified.`,
          });
        } else if (tbl === 'sys_push_notif_app_install') {
          findings.push({
            checkId: 'push_notification_install',
            priority: 'P3',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Record() packages a 'sys_push_notif_app_install' record.`,
            fix: `Remove Push Notification Installation records from the application package.`,
          });
        } else if (tbl === 'sys_cors_rule') {
          if (/\bdomain\s*:\s*['"][^'"]*\*[^'"]*['"]/.test(body) || /\bdelete\s*:\s*(?:true|['"]true['"])/.test(body)) {
            findings.push({
              checkId: 'cors_rules',
              priority: 'P1',
              impact: 'High',
              location: `${relFile}:${lineNum}`,
              issue: `CORS rule contains wildcard '*' in domain or enables DELETE.`,
              fix: `Specify an exact FQDN without '*' in domain and disable DELETE unless required.`,
            });
          }
        }
        if (/\binstallMethod\s*:\s*['"]demo['"]/.test(body)) {
          findings.push({
            checkId: 'demo_data',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `Record() is configured with installMethod: 'demo'; verify demo data is intentional and free of secrets.`,
            fix: `Remove unintended or sensitive demo data records.`,
          });
        }
      }

      // ApplicationMenu({...}) privacy policy check
      if (/\bApplicationMenu\s*\(/.test(stripped)) {
        hasAppMenu = true;
        if (/app\s+privacy\s+policy|privacy\s+policy/i.test(content)) {
          hasPrivacyPolicyModule = true;
        }
      }

      // ScheduledScript({...}) outbound email/report check
      for (const m of stripped.matchAll(/\bScheduledScript\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = stripped.slice(0, m.index).split('\n').length;
        if (
          /\b(?:GlideEmailOutbound|eventQueue|RESTMessageV2)\b/.test(body) &&
          !/\bgetProperty\s*\(/.test(body)
        ) {
          findings.push({
            checkId: 'found_scheduled_email',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:${lineNum}`,
            issue: `ScheduledScript sends outbound email/events/REST calls without a customer opt-in property check.`,
            fix: `Gate scheduled outbound transmissions behind an opt-in system property controlled by the customer.`,
          });
        }
      }

      const isClientFile = /client|sp_widget|ui_page|ui_script/i.test(relFile);
      const isUserFacingFluent =
        /\b(?:RestApi|UiPage|SPWidget|UiAction)\s*\(/.test(stripped) ||
        /\bclientCallable\s*:\s*true\b/.test(stripped) ||
        /rest|ws_operation|ui_page|sp_widget|ui_action/i.test(relFile);

      scanScriptSecurity({
        code: content,
        relFile,
        baseLine: 1,
        isClient: isClientFile,
        isServer: !isClientFile,
        isMidScript: false,
        isUserFacingServer: isUserFacingFluent,
        isFixScript: /fix_script|sys_script_fix/i.test(relFile),
        scope: meta.scope,
        findings,
      });
    }

    // HTML files
    if (file.endsWith('.html')) {
      const content = fs.readFileSync(file, 'utf8');
      scanHtmlAndExternalSources({ content, relFile, baseLine: 1, findings });
      if (/<j2?:jelly\b|<g2?:evaluate\b/i.test(content)) {
        scanJellyContent({ content, relFile, baseLine: 1, findings });
      }
    }

    // Classic XML files
    if (file.endsWith('.xml')) {
      const content = fs.readFileSync(file, 'utf8');

      // 1. sys_db_object / dictionary custom tables & script/sensitive columns
      if (content.includes('<sys_db_object')) {
        const tableName = getXmlField(content, 'name');
        if (
          tableName &&
          (meta.scope === 'unknown_scope' || meta.scope === 'global' || tableName.startsWith(meta.scope + '_'))
        ) {
          customTables.set(tableName, { location: `${relFile}:1` });
        }
      }

      if (content.includes('<sys_dictionary') || relFile.startsWith('dictionary' + path.sep)) {
        for (const m of content.matchAll(/<(?:sys_dictionary|element)\b[^>]*>([\s\S]*?)<\/(?:sys_dictionary|element)>/gi)) {
          const block = m[0];
          const lineNum = content.slice(0, m.index).split('\n').length;
          const internalType =
            getXmlField(block, 'internal_type') ||
            (block.match(/\btype="([^"]+)"/i) ? block.match(/\btype="([^"]+)"/i)[1] : '');
          const element =
            getXmlField(block, 'element') ||
            (block.match(/\bname="([^"]+)"/i) ? block.match(/\bname="([^"]+)"/i)[1] : '');
          const tableName = getXmlField(block, 'name');

          if (internalType === 'collection' && (tableName || element)) {
            const tName = tableName || element;
            if (
              meta.scope === 'unknown_scope' ||
              meta.scope === 'global' ||
              tName.startsWith(meta.scope + '_')
            ) {
              customTables.set(tName, { location: `${relFile}:${lineNum}` });
            }
          }

          if (/^script(?:_plain|_server)?$/i.test(internalType)) {
            findings.push({
              checkId: 'script_type_column',
              priority: 'P0',
              impact: 'Critical',
              location: `${relFile}:${lineNum}`,
              issue: `Dictionary column '${element}' is of type '${internalType}' (script field).`,
              fix: `Secure write access on script-type fields strictly to 'admin' users.`,
            });
          }

          if (/^string$/i.test(internalType) && element && SENSITIVE_FIELD_RE.test(element)) {
            findings.push({
              checkId: 'sensitive_column_of_type_string',
              priority: 'P0',
              impact: 'Critical',
              location: `${relFile}:${lineNum}`,
              issue: `Sensitive column '${element}' uses 'string' type instead of 'password2'.`,
              fix: `Deactivate the existing 'string' field and create a new field of type 'password2'.`,
            });
          }
        }
      }

      // 2. sys_properties: password_properties & senstive_data_exposed
      if (content.includes('<sys_properties')) {
        const propName = getXmlField(content, 'name');
        const propType = getXmlField(content, 'type');
        const propVal = getXmlField(content, 'value');
        if (/password/i.test(propType) && propVal !== '') {
          findings.push({
            checkId: 'password_properties',
            priority: 'P0',
            impact: 'Critical',
            location: `${relFile}:1`,
            issue: `System property '${propName}' of type '${propType}' has a non-blank value.`,
            fix: `Clear the <value/> field to blank on all password/password2 system property records.`,
          });
        } else if (!/password2/i.test(propType) && SENSITIVE_FIELD_RE.test(propName)) {
          findings.push({
            checkId: 'senstive_data_exposed',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Sensitive system property '${propName}' uses type '${propType || 'string'}' instead of 'password2'.`,
            fix: `Store sensitive credentials in 'password2' system properties rather than clear-text properties.`,
          });
        }
      }

      // 3. sys_security_acl
      if (content.includes('<sys_security_acl>') || content.includes('<sys_security_acl ')) {
        const sysId = getXmlField(content, 'sys_id');
        const typeVal = getXmlField(content, 'type');
        const typeDisp = getXmlDisplayValue(content, 'type');
        const opVal = getXmlField(content, 'operation');
        const opDisp = getXmlDisplayValue(content, 'operation');
        const name = getXmlField(content, 'name');
        const condition = getXmlField(content, 'condition');
        const secAttr = getXmlField(content, 'security_attribute');
        const script = getXmlField(content, 'script');
        const rolesSet = aclRolesByAclId.get(sysId);
        const hasRole = Boolean(rolesSet && rolesSet.size > 0);
        const hasControl = Boolean(hasRole || condition || secAttr || script);

        const isRecordAcl =
          typeVal === 'record' || /^record$/i.test(typeDisp) || (!typeVal && !typeDisp);
        const op = (opDisp || opVal).toLowerCase();

        if (
          isRecordAcl &&
          name &&
          meta.scope !== 'unknown_scope' &&
          meta.scope !== 'global'
        ) {
          const [tblPart, fieldPart] = name.split('.');
          const isAppTable = tblPart.startsWith(meta.scope + '_');
          const isAppField = fieldPart && fieldPart.startsWith(meta.scope + '_');
          if (!isAppTable && !isAppField) {
            findings.push({
              checkId: 'out_of_scope_acl',
              priority: 'P0',
              impact: 'High',
              location: `${relFile}:1`,
              issue: `ACL '${name}' (${op || 'record'}) is created on out-of-scope table '${tblPart}'.`,
              fix: `Remove ACLs and ACL roles created on tables outside the application scope.`,
            });
          }
        }

        acls.push({
          sysId,
          type: typeVal,
          typeName: (typeDisp || typeVal).toLowerCase(),
          operation: op,
          name,
          hasRole,
          hasControl,
          location: `${relFile}:1`,
        });
      }

      // 4. sys_script_include (CCSI)
      if (content.includes('<sys_script_include')) {
        const clientCallable = getXmlField(content, 'client_callable');
        const name = getXmlField(content, 'name');
        if (clientCallable === 'true' || clientCallable === '1') {
          ccsis.push({ name, location: `${relFile}:1` });
        }
      }

      // 5. sys_hub_flow & sys_hub_action_type_definition (ccfsa_acl & found_scheduled_email)
      if (content.includes('<sys_hub_flow') || content.includes('<sys_hub_action_type_definition')) {
        const name = getXmlField(content, 'name');
        const clientCallable =
          getXmlField(content, 'callable_by_client_api') || getXmlField(content, 'client_callable');
        if (clientCallable === 'true' || clientCallable === '1') {
          ccfsas.push({ name, location: `${relFile}:1` });
        }
      }

      // 6. sn_aia_agent, sn_aia_usecase, sn_nowassist_skill_config
      if (content.includes('<sn_aia_agent')) {
        aiAgents.push({
          name: getXmlField(content, 'name'),
          internalName: getXmlField(content, 'internal_name'),
          location: `${relFile}:1`,
        });
      }
      if (content.includes('<sn_aia_usecase')) {
        aiUsecases.push({
          name: getXmlField(content, 'name'),
          internalName: getXmlField(content, 'internal_name'),
          location: `${relFile}:1`,
        });
      }
      if (content.includes('<sn_nowassist_skill_config')) {
        genAiSkills.push({
          name: getXmlField(content, 'name'),
          sysId: getXmlField(content, 'sys_id'),
          location: `${relFile}:1`,
        });
      }

      // 7. sys_ui_page
      if (content.includes('<sys_ui_page')) {
        const name = getXmlField(content, 'name');
        const endpoint = getXmlField(content, 'endpoint');
        const epClean = (endpoint || `${meta.scope}_${name}.do`).replace(/\.do$/i, '');
        uiPages.push({ name: name || epClean, endpoint: epClean, location: `${relFile}:1` });

        for (const htmlTag of extractXmlTagValues(content, 'html')) {
          scanHtmlAndExternalSources({
            content: htmlTag.value,
            relFile,
            baseLine: htmlTag.line,
            findings,
          });
          scanJellyContent({
            content: htmlTag.value,
            relFile,
            baseLine: htmlTag.line,
            findings,
          });
        }
      }

      // 8. sys_ui_macro
      if (content.includes('<sys_ui_macro')) {
        for (const xmlTag of extractXmlTagValues(content, 'xml')) {
          scanHtmlAndExternalSources({
            content: xmlTag.value,
            relFile,
            baseLine: xmlTag.line,
            findings,
          });
          scanJellyContent({
            content: xmlTag.value,
            relFile,
            baseLine: xmlTag.line,
            findings,
          });
        }
      }

      // 9. sys_processor
      if (content.includes('<sys_processor')) {
        const name = getXmlField(content, 'name');
        const procPath = getXmlField(content, 'path');
        const roles = getXmlField(content, 'roles');
        const requireCsrf = getXmlField(content, 'require_csrf');
        const script = getXmlField(content, 'script');
        processors.push({
          name,
          path: procPath,
          roles,
          requireCsrf,
          script,
          location: `${relFile}:1`,
        });
        if (requireCsrf === 'false' || requireCsrf === '0') {
          findings.push({
            checkId: 'processor_csrf',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Processor '${name}' has <require_csrf>${requireCsrf}</require_csrf>, leaving it vulnerable to CSRF.`,
            fix: `Set <require_csrf>true</require_csrf> on the Processor or migrate to a Scripted REST API.`,
          });
        }
        findings.push({
          checkId: 'procrossor_integration',
          priority: 'P2',
          impact: 'High',
          location: `${relFile}:1`,
          issue: `Legacy Processor '${name}' detected; verify it is not used as an inbound integration endpoint instead of a Scripted REST API.`,
          fix: `Migrate the Processor to a Scripted REST API, or enforce a dedicated 'Web service access only' integration user check via gs.getProperty().`,
        });
      }

      // 10. sys_cors_rule
      if (content.includes('<sys_cors_rule')) {
        const name = getXmlField(content, 'name');
        const domain = getXmlField(content, 'domain');
        const delFlag = getXmlField(content, 'delete');
        if (domain.includes('*') || delFlag === 'true' || delFlag === '1') {
          findings.push({
            checkId: 'cors_rules',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `CORS Rule '${name}' has wildcard '*' in domain ('${domain}') or delete='${delFlag}'.`,
            fix: `Use a specific FQDN without '*' in <domain> and set <delete>false</delete>.`,
          });
        }
      }

      // 11. sys_public
      if (content.includes('<sys_public')) {
        const page = getXmlField(content, 'page');
        findings.push({
          checkId: 'public_pages',
          priority: 'P2',
          impact: 'Medium',
          location: `${relFile}:1`,
          issue: `Public page record in sys_public exposes '${page}' without authentication.`,
          fix: `Remove the sys_public record and protect the page with roles unless public access is justified.`,
        });
      }

      // 12. sys_push_notif_app_install
      if (content.includes('<sys_push_notif_app_install')) {
        findings.push({
          checkId: 'push_notification_install',
          priority: 'P3',
          impact: 'Medium',
          location: `${relFile}:1`,
          issue: `'Push Notification Installations' (sys_push_notif_app_install) record is packaged in the application.`,
          fix: `Remove all sys_push_notif_app_install records from the application package.`,
        });
      }

      // 13. sp_page & sp_widget
      if (content.includes('<sp_page>') || content.includes('<sp_page ')) {
        const title = getXmlField(content, 'title') || getXmlField(content, 'id');
        const isPublic = getXmlField(content, 'public');
        const roles = getXmlField(content, 'roles');
        if (isPublic === 'true' || isPublic === '1') {
          findings.push({
            checkId: 'sp_public_page',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Service Portal Page '${title}' has <public>true</public>.`,
            fix: `Set <public>false</public> and protect the page with appropriate roles.`,
          });
        }
        if (!roles) {
          findings.push({
            checkId: 'sp_page_role',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Service Portal Page '${title}' has an empty <roles/> field.`,
            fix: `Protect the Service Portal page with appropriate scoped roles in <roles>.`,
          });
        }
      }

      if (content.includes('<sp_widget>') || content.includes('<sp_widget ')) {
        const name = getXmlField(content, 'name') || getXmlField(content, 'id');
        const isPublic = getXmlField(content, 'public');
        const roles = getXmlField(content, 'roles');
        if (isPublic === 'true' || isPublic === '1') {
          findings.push({
            checkId: 'sp_widget_public',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Service Portal Widget '${name}' has <public>true</public>.`,
            fix: `Set <public>false</public> on the Service Portal widget.`,
          });
        }
        if (!roles) {
          findings.push({
            checkId: 'sp_widget_role',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Service Portal Widget '${name}' has an empty <roles/> field.`,
            fix: `Protect the Service Portal widget with appropriate scoped roles in <roles>.`,
          });
        }
        for (const tmpl of extractXmlTagValues(content, 'template')) {
          scanHtmlAndExternalSources({
            content: tmpl.value,
            relFile,
            baseLine: tmpl.line,
            findings,
          });
        }
      }

      // 14. Mobile: sys_sg_applet_launcher, sys_sg_application, sys_sg_screen, sys_sg_button
      if (content.includes('<sys_sg_applet_launcher')) {
        const reqRoles = getXmlField(content, 'required_roles') || getXmlField(content, 'roles');
        if (!reqRoles) {
          findings.push({
            checkId: 'role_applet_launcher',
            priority: 'P1',
            impact: 'Critical',
            location: `${relFile}:1`,
            issue: `Mobile Applet Launcher '${baseName}' has an empty <required_roles/> field.`,
            fix: `Associate scoped roles in the <required_roles> field on the Applet Launcher.`,
          });
        }
      }

      if (content.includes('<sys_sg_application')) {
        const roles = getXmlField(content, 'roles');
        if (!roles) {
          findings.push({
            checkId: 'role_applet',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Mobile Application '${baseName}' (sys_sg_application) has an empty <roles/> field.`,
            fix: `Populate <roles> on the Mobile Application record.`,
          });
        }
      }

      if (content.includes('<sys_sg_screen')) {
        const rolesOverride = getXmlField(content, 'roles_override') || getXmlField(content, 'roles');
        if (!rolesOverride) {
          findings.push({
            checkId: 'role_applet',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Mobile Applet '${baseName}' (sys_sg_screen) has an empty <roles_override/> field.`,
            fix: `Populate <roles_override> with scoped roles on the Mobile Applet record.`,
          });
        }
      }

      if (content.includes('<sys_sg_button')) {
        const roles = getXmlField(content, 'roles');
        const cond = getXmlField(content, 'condition');
        if (!roles && !cond) {
          findings.push({
            checkId: 'mob_agent_functions_security',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Mobile Function '${baseName}' (sys_sg_button) has empty <roles/> and <condition/>.`,
            fix: `Restrict the Mobile Function by adding <roles> and/or a <condition>.`,
          });
        }
      }

      // 15. sys_ui_action
      if (content.includes('<sys_ui_action>') || content.includes('<sys_ui_action ')) {
        const sysId = getXmlField(content, 'sys_id');
        const name = getXmlField(content, 'name');
        const condition = getXmlField(content, 'condition');
        uiActions.set(sysId || baseName, {
          name: name || baseName,
          condition,
          hasRole: uiActionRolesByActionId.has(sysId),
          location: `${relFile}:1`,
        });
      }

      // 16. sys_ws_operation
      if (content.includes('<sys_ws_operation')) {
        restOps.push({
          name: getXmlField(content, 'name') || baseName,
          defId: getXmlField(content, 'web_service_definition'),
          reqAuth: getXmlField(content, 'requires_authentication'),
          reqAcl: getXmlField(content, 'requires_acl_authorization'),
          enforceAcl: getXmlField(content, 'enforce_acl'),
          location: `${relFile}:1`,
        });
      }

      // 17. sys_restricted_caller_access & sys_scope_privilege (rca_target_scope_mismatch)
      if (content.includes('<sys_restricted_caller_access')) {
        const sysScope = getXmlDisplayValue(content, 'sys_scope') || getXmlField(content, 'sys_scope');
        const targetScope = getXmlDisplayValue(content, 'target_scope') || getXmlField(content, 'target_scope');
        if (sysScope && targetScope && sysScope !== targetScope) {
          findings.push({
            checkId: 'rca_target_scope_mismatch',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Real RCA record (sys_restricted_caller_access) has sys_scope ('${sysScope}') not matching target_scope ('${targetScope}').`,
            fix: `Remove foreign-target sys_restricted_caller_access records from the source app and document manual admin approval in the Installation Guide.`,
          });
        }
      }

      if (content.includes('<sys_scope_privilege')) {
        const targetScope = getXmlDisplayValue(content, 'target_scope') || getXmlField(content, 'target_scope');
        const targetName = getXmlField(content, 'target_name');
        if (targetScope && meta.scope !== 'unknown_scope' && targetScope === meta.scope) {
          findings.push({
            checkId: 'rca_target_scope_mismatch',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Cross-scope privilege for '${targetName}' sets target_scope to the app's own scope ('${targetScope}').`,
            fix: `Set target_scope to the target artifact's actual owning scope.`,
          });
        }
      }

      // 18. Scheduled jobs/reports: found_scheduled_email
      if (
        /<(?:sysauto_report|sysauto_script|wf_workflow_schedule|sysauto)[\s>]/i.test(content)
      ) {
        const isReport = content.includes('<sysauto_report') || content.includes('<wf_workflow_schedule');
        const cond = getXmlField(content, 'condition');
        const script = getXmlField(content, 'script');
        const sendsOutbound =
          isReport || /\b(?:GlideEmailOutbound|eventQueue|RESTMessageV2)\b/.test(script);
        const hasOptInProperty = /\bgetProperty\s*\(/.test(cond) || /\bgetProperty\s*\(/.test(script);
        if (sendsOutbound && !hasOptInProperty) {
          findings.push({
            checkId: 'found_scheduled_email',
            priority: 'P1',
            impact: 'High',
            location: `${relFile}:1`,
            issue: `Scheduled report/job '${ getXmlField(content, 'name') || baseName }' executes without a conditional customer opt-in system property check.`,
            fix: `Make scheduled reports/jobs conditional on a customer-controlled system property (false by default).`,
          });
        }
      }

      // 19. sys_rest_message / sys_rest_message_fn http:// check
      if (content.includes('<sys_rest_message')) {
        const ep = getXmlField(content, 'rest_endpoint');
        if (/^http:\/\//i.test(ep) && !SAFE_HTTP_NAMESPACE_RE.test(ep)) {
          findings.push({
            checkId: 'manual_security_review',
            priority: 'P0',
            impact: 'Critical',
            location: `${relFile}:1`,
            issue: `REST Message endpoint '${ep}' uses unencrypted HTTP instead of HTTPS (KB0010088).`,
            fix: `Use https:// (SSL/TLS) for all external REST Message endpoints.`,
          });
        }
      }

      // 20. Application Menu & App Privacy Policy module tracking
      if (content.includes('<sys_app_application')) {
        hasAppMenu = true;
      }
      if (content.includes('<sys_app_module')) {
        const title = getXmlField(content, 'title') || getXmlField(content, 'name');
        if (/app\s+privacy\s+policy|privacy\s+policy/i.test(title)) {
          hasPrivacyPolicyModule = true;
        }
      }

      // 21. Scan script tags in XML
      const isMidScript = content.includes('<ecc_agent_script_include');
      const isFixScript = content.includes('<sys_script_fix');
      const isClientXml =
        content.includes('<sys_script_client') ||
        content.includes('<catalog_script_client') ||
        content.includes('<sys_ui_script');
      const isUserFacingXml =
        content.includes('<sys_ws_operation') ||
        content.includes('<sys_ui_page') ||
        content.includes('<sys_ui_macro') ||
        content.includes('<sp_widget') ||
        content.includes('<sys_ui_script') ||
        content.includes('<sys_ui_action') ||
        (content.includes('<sys_script_include') &&
          (getXmlField(content, 'client_callable') === 'true' ||
            getXmlField(content, 'client_callable') === '1'));

      if (content.includes('<sys_script_fix')) {
        findings.push({
          checkId: 'fix_script',
          priority: 'P0',
          impact: 'Medium',
          location: `${relFile}:1`,
          issue: `Fix Script '${getXmlField(content, 'name') || baseName}' detected; verify it does not delete records or perform CRUD on out-of-scope tables.`,
          fix: `Remove record deletions and out-of-scope CRUD operations from Fix Scripts.`,
        });
      }

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
          const tagIsClient =
            isClientXml || tag === 'client_script' || tag === 'script_true' || tag === 'script_false';
          if (content.includes('<sys_ui_script')) {
            scanHtmlAndExternalSources({
              content: entry.value,
              relFile,
              baseLine: entry.line,
              findings,
            });
          }
          scanScriptSecurity({
            code: entry.value,
            relFile,
            baseLine: entry.line,
            isClient: tagIsClient,
            isServer: !tagIsClient,
            isMidScript,
            isUserFacingServer: isUserFacingXml && !tagIsClient,
            isFixScript,
            scope: meta.scope,
            findings,
          });
        }
      }
    }
  }

  // Pass 3: Cross-artifact relational checks

  // 1. table_acl: every custom table needs create, read, write, delete record ACLs with roles
  const requiredCrud = ['create', 'read', 'write', 'delete'];
  for (const [tableName, info] of customTables.entries()) {
    const tableAcls = acls.filter(
      (a) =>
        (a.type === 'record' || a.typeName === 'record') &&
        a.name === tableName
    );
    const missingOps = [];
    const missingRoleOps = [];
    for (const op of requiredCrud) {
      const matching = tableAcls.filter((a) => a.operation === op);
      if (matching.length === 0) {
        missingOps.push(op);
      } else if (!matching.some((a) => a.hasRole || a.hasControl)) {
        missingRoleOps.push(op);
      }
    }
    if (missingOps.length > 0 || missingRoleOps.length > 0) {
      const parts = [];
      if (missingOps.length > 0) parts.push(`missing ACLs for [${missingOps.join(', ')}]`);
      if (missingRoleOps.length > 0) parts.push(`missing roles on ACLs for [${missingRoleOps.join(', ')}]`);
      findings.push({
        checkId: 'table_acl',
        priority: 'P1',
        impact: 'High',
        location: info.location,
        issue: `Custom table '${tableName}' has ${parts.join(' and ')}.`,
        fix: `Create table-level record ACLs with scoped roles for create, read, write, and delete operations on '${tableName}'.`,
      });
    }
  }

  // 2. ccsi_acl: every client-callable Script Include needs a client_callable_script_include execute ACL
  for (const ccsi of ccsis) {
    const matching = acls.filter(
      (a) =>
        (a.type === 'client_callable_script_include' ||
          a.typeName === 'client_callable_script_include') &&
        (a.name === ccsi.name || a.name.endsWith('.' + ccsi.name))
    );
    if (matching.length === 0 || !matching.some((a) => a.hasRole || a.hasControl)) {
      findings.push({
        checkId: 'ccsi_acl',
        priority: 'P1',
        impact: 'High',
        location: ccsi.location,
        issue: `Client-Callable Script Include '${ccsi.name}' is missing a 'client_callable_script_include' execute ACL with required roles.`,
        fix: `Create a 'client_callable_script_include' execute ACL with scoped roles for '${ccsi.name}' (and use GlideRecordSecure inside its functions).`,
      });
    }
  }

  // 3. ccfsa_acl: client-callable flows/subflows/actions need client_callable_flow_object execute ACL
  for (const ccfsa of ccfsas) {
    const matching = acls.filter(
      (a) =>
        a.type === 'client_callable_flow_object' ||
        a.typeName === 'client_callable_flow_object'
    );
    if (matching.length === 0 || !matching.some((a) => a.hasRole || a.hasControl)) {
      findings.push({
        checkId: 'ccfsa_acl',
        priority: 'P1',
        impact: 'High',
        location: ccfsa.location,
        issue: `Client-callable Flow/Subflow/Action '${ccfsa.name}' is missing a 'client_callable_flow_object' execute ACL with required roles.`,
        fix: `Add a 'client_callable_flow_object' ACL with 'execute' operation and required roles.`,
      });
    }
  }

  // 4. ui_page_acl: every UI Page needs a ui_page read ACL on endpoint without .do
  for (const page of uiPages) {
    const matching = acls.filter(
      (a) =>
        (a.type === 'ui_page' || a.typeName === 'ui_page') &&
        (a.name === page.endpoint || a.name === page.name)
    );
    if (matching.length === 0 || !matching.some((a) => a.hasRole || a.hasControl)) {
      findings.push({
        checkId: 'ui_page_acl',
        priority: 'P1',
        impact: 'High',
        location: page.location,
        issue: `UI Page '${page.name}' (endpoint '${page.endpoint}') is missing a 'ui_page' read ACL with required roles.`,
        fix: `Create a 'ui_page' read ACL targeting '${page.endpoint}' (without .do) and assign scoped roles.`,
      });
    }
  }

  // 5. processor_acl
  for (const proc of processors) {
    const matching = acls.filter(
      (a) =>
        (a.type === 'processor' || a.typeName === 'processor') &&
        (a.name === proc.name || a.name === proc.path)
    );
    if (!proc.roles && (matching.length === 0 || !matching.some((a) => a.hasRole || a.hasControl))) {
      findings.push({
        checkId: 'processor_acl',
        priority: 'P1',
        impact: 'High',
        location: proc.location,
        issue: `Processor '${proc.name}' is missing a 'processor' execute ACL with roles.`,
        fix: `Create an execute ACL for Processor '${proc.name}' and secure it with scoped roles.`,
      });
    }
  }

  // 6. acl_on_agentic_ai_partner, acl_on_agentic_ai_usecase_partner, acl_on_gen_ai_skill_partner
  for (const agent of aiAgents) {
    const matching = acls.filter(
      (a) =>
        (a.type === GEN_AI_AGENT_ACL_TYPE || a.typeName === 'gen_ai_agent') &&
        a.operation === 'execute' &&
        a.name === agent.internalName
    );
    if (matching.length === 0 || !matching.some((a) => a.hasControl)) {
      findings.push({
        checkId: 'acl_on_agentic_ai_partner',
        priority: 'P1',
        impact: 'High',
        location: agent.location,
        issue: `AI Agent '${agent.name}' is missing a configured 'gen_ai_agent' execute ACL for internal_name '${agent.internalName}'.`,
        fix: `Create a 'gen_ai_agent' execute ACL matching internal_name '${agent.internalName}' with least-privilege roles.`,
      });
    }
  }

  for (const uc of aiUsecases) {
    const matching = acls.filter(
      (a) =>
        (a.type === GEN_AI_WORKFLOW_ACL_TYPE || a.typeName === 'gen_ai_workflow') &&
        a.operation === 'execute' &&
        a.name === uc.internalName
    );
    if (matching.length === 0 || !matching.some((a) => a.hasControl)) {
      findings.push({
        checkId: 'acl_on_agentic_ai_usecase_partner',
        priority: 'P1',
        impact: 'High',
        location: uc.location,
        issue: `AI Use Case '${uc.name}' is missing a configured 'gen_ai_workflow' execute ACL for internal_name '${uc.internalName}'.`,
        fix: `Create a 'gen_ai_workflow' execute ACL matching internal_name '${uc.internalName}' with least-privilege roles.`,
      });
    }
  }

  for (const skill of genAiSkills) {
    const matching = acls.filter(
      (a) =>
        (a.type === GEN_AI_SKILL_ACL_TYPE || a.typeName === 'gen_ai_skill') &&
        a.operation === 'execute' &&
        skill.sysId &&
        a.name.endsWith(skill.sysId)
    );
    if (matching.length === 0 || !matching.some((a) => a.hasControl)) {
      findings.push({
        checkId: 'acl_on_gen_ai_skill_partner',
        priority: 'P1',
        impact: 'High',
        location: skill.location,
        issue: `Gen AI / NASK Skill '${skill.name}' is missing a configured 'gen_ai_skill' execute ACL ending with sys_id '${skill.sysId}'.`,
        fix: `Create a 'gen_ai_skill' execute ACL with least-privilege roles for NASK skill '${skill.name}'.`,
      });
    }
  }

  // 7. ui_action_roles_condtions (XML)
  for (const [, ua] of uiActions.entries()) {
    const hasRoleInCondition = /\bgs\.hasRole\s*\(|\bcan(?:Write|Read|Create|Delete)\s*\(/.test(ua.condition);
    if (!ua.hasRole && !ua.condition.trim() && !hasRoleInCondition) {
      findings.push({
        checkId: 'ui_action_roles_condtions',
        priority: 'P1',
        impact: 'High',
        location: ua.location,
        issue: `UI Action '${ua.name}' has an empty condition and no required roles (sys_ui_action_role).`,
        fix: `Add required roles (sys_ui_action_role) or a restrictive condition to UI Action '${ua.name}'.`,
      });
    }
  }

  // 8. scripted_rest_acl_configuration (XML)
  for (const op of restOps) {
    const authFalse = op.reqAuth === 'false' || op.reqAuth === '0';
    const aclFalse = op.reqAcl === 'false' || op.reqAcl === '0';
    const parentDef = restDefs.get(op.defId);
    const effectiveAclIds = (op.enforceAcl || (parentDef ? parentDef.enforceAcl : ''))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const missingRoleOnAcl =
      effectiveAclIds.length > 0 &&
      effectiveAclIds.some((id) => !aclRolesByAclId.has(id) || aclRolesByAclId.get(id).size === 0);

    if (authFalse || aclFalse || effectiveAclIds.length === 0 || missingRoleOnAcl) {
      findings.push({
        checkId: 'scripted_rest_acl_configuration',
        priority: 'P1',
        impact: 'High',
        location: op.location,
        issue: `Scripted REST Operation '${op.name}' has requires_authentication='${op.reqAuth}', requires_acl_authorization='${op.reqAcl}', or missing/unroled enforce_acl.`,
        fix: `Enable requires_authentication and requires_acl_authorization, and attach a REST_Endpoint ACL with roles in enforce_acl.`,
      });
    }
  }

  // 9. app_privacy_policy
  if (hasAppMenu && !hasPrivacyPolicyModule) {
    findings.push({
      checkId: 'app_privacy_policy',
      priority: 'P3',
      impact: 'Low',
      location: `ApplicationMenu`,
      issue: `Application defines an Application Menu but is missing an 'App Privacy Policy' module.`,
      fix: `Create a module named 'App Privacy Policy' under the Application Menu linking to the partner privacy policy URL or a scoped privacy UI Page (KB0030801).`,
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
  const report = runSecurityScan(targetDir);

  if (jsonFlag) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Security Review Scan: ${report.appName} (${report.scope})`);
    console.log(
      `App Type: ${report.appType} | Files Scanned: ${report.filesScanned} | Findings: ${report.findingsCount}`
    );
    if (report.findings.length === 0) {
      console.log('No deterministic security issues detected.');
    } else {
      for (const f of report.findings) {
        console.log(`\n[${f.priority}] ${f.checkId} (${f.impact}) @ ${f.location}`);
        console.log(`  Issue: ${f.issue}`);
        console.log(`  Fix:   ${f.fix}`);
      }
    }
  }
}
