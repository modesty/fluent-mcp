#!/usr/bin/env node
/**
 * Deterministic MSP Ready / Domain Separation Scanner for ServiceNow Fluent & Classic XML Apps.
 *
 * Evaluates the 10 MSP & Domain Separation checks across both Fluent
 * (.now.ts / .ts / .js) and Classic XML (update/ / metadata/ / dictionary/) apps.
 *
 * Usage:
 *   node scan_msp_checks.mjs [app-directory] [--json]
 */

import fs from 'node:fs';
import path from 'node:path';

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === '.now' ||
      entry.name === 'target' ||
      entry.name === '.test-build'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, result);
    } else if (entry.isFile()) {
      result.push(full);
    }
  }
  return result;
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

export function runMspScan(appDir) {
  const absDir = path.resolve(appDir);
  const allFiles = walkFiles(absDir);
  let scope = 'unknown_scope';
  let appName = path.basename(absDir);
  let hasFluent = false;
  let hasXml = false;

  const nowConfigPath = path.join(absDir, 'now.config.json');
  if (fs.existsSync(nowConfigPath)) {
    hasFluent = true;
    try {
      const cfg = JSON.parse(fs.readFileSync(nowConfigPath, 'utf8'));
      scope = cfg.scope || scope;
      appName = cfg.name || appName;
    } catch {
      // ignore
    }
  }

  const findings = [];
  let hasGetDefaultDomainPrivilege = false;
  let usesGetDefaultDomain = false;
  let hasDefaultDomainBr = false;
  let hasSetDomainBr = false;

  // Track tables and their columns/super_class
  // tableName -> { file, line, extendsTable, hasSysDomain, hasSysOverrides, isImportSet }
  const customTables = new Map();

  for (const file of allFiles) {
    const relFile = path.relative(absDir, file);

    if (file.endsWith('.now.ts') || file.endsWith('.ts') || file.endsWith('.js')) {
      if (file.endsWith('.now.ts')) hasFluent = true;
      const content = fs.readFileSync(file, 'utf8');

      if (/getDefaultDomain\b/.test(content)) {
        usesGetDefaultDomain = true;
      }

      // Check CrossScopePrivilege for getDefaultDomain
      for (const m of content.matchAll(/CrossScopePrivilege\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        if (/targetName\s*:\s*['"]getDefaultDomain['"]/.test(m[1])) {
          hasGetDefaultDomainPrivilege = true;
        }
      }

      // Check Table definitions in Fluent
      for (const m of content.matchAll(/Table\s*\(\s*\{([\s\S]*?)\n\}\s*\)/g)) {
        const body = m[1];
        const lineNum = content.slice(0, m.index).split('\n').length;
        const nameMatch = body.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
        const extendsMatch = body.match(/\bextends\s*:\s*['"]([^'"]+)['"]/);
        const tableName = nameMatch ? nameMatch[1] : '';
        const extendsTable = extendsMatch ? extendsMatch[1] : '';
        if (!tableName) continue;
        if (scope !== 'unknown_scope' && scope !== 'global' && !tableName.startsWith(scope + '_')) {
          continue; // OOB table augmentation, not a custom table
        }
        const isImportSet = extendsTable === 'sys_import_set_row';
        const hasSysDomain = /\bsys_domain\s*:/.test(body) || /DomainIdColumn\s*\(/.test(body);
        const hasSysOverrides = /\bsys_overrides\s*:/.test(body) || /OverrideColumn\s*\(/.test(body);
        customTables.set(tableName, {
          file: relFile,
          line: lineNum,
          extendsTable,
          hasSysDomain,
          hasSysOverrides,
          isImportSet,
        });
      }

      // Check BusinessRule definitions in Fluent
      for (const m of content.matchAll(/BusinessRule\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = content.slice(0, m.index).split('\n').length;
        if (/getDefaultDomain/.test(body) && /glide\.sys\.domain\.partitioning/.test(body)) {
          hasDefaultDomainBr = true;
        }
        if (/Domain\s*[-–]\s*Set\s*Domain/i.test(body) || /current\.sys_domain\s*=/.test(body)) {
          hasSetDomainBr = true;
        }
        if (/\bwhen\s*:\s*['"]async['"]/.test(body) && !/\bsys_domain\b/.test(body)) {
          findings.push({
            checkId: 'msp_async_br',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `Async BusinessRule does not reference or propagate 'sys_domain' for tenant isolation.`,
            fix: `Ensure async Business Rules explicitly account for domain separation when triggered by or operating on records.`,
          });
        }
      }

      // Check Transform Maps / ImportSet in Fluent
      for (const m of content.matchAll(/ImportSet\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        const lineNum = content.slice(0, m.index).split('\n').length;
        if (/\brunBusinessRules\s*:\s*false\b/.test(body)) {
          findings.push({
            checkId: 'msp_run_br_chkbox',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:${lineNum}`,
            issue: `ImportSet has 'runBusinessRules: false', bypassing target table domain validation Business Rules.`,
            fix: `Set 'runBusinessRules: true' on Transform Maps targeting domain-separated tables.`,
          });
        }
      }
    }

    if (file.endsWith('.xml')) {
      hasXml = true;
      const content = fs.readFileSync(file, 'utf8');

      if (!scope || scope === 'unknown_scope') {
        const s = getXmlField(content, 'scope');
        if (s && (path.basename(file).startsWith('sys_app_') || path.basename(file).startsWith('sys_store_app_'))) {
          scope = s;
        }
      }

      if (/getDefaultDomain\b/.test(content)) {
        usesGetDefaultDomain = true;
      }

      // 1. msp_getDefaultDomain_cross_scope in sys_scope_privilege
      if (content.includes('<sys_scope_privilege')) {
        const targetName = getXmlField(content, 'target_name');
        const status = getXmlField(content, 'status');
        if (targetName === 'getDefaultDomain' && status === 'allowed') {
          hasGetDefaultDomainPrivilege = true;
        }
      }

      // 2. br_sys_domain: check sys_domain on packaged metadata records
      for (const dom of extractXmlTagValues(content, 'sys_domain')) {
        const val = dom.value.trim();
        if (val !== '' && val !== 'global') {
          findings.push({
            checkId: 'br_sys_domain',
            priority: 'P1',
            impact: 'Medium',
            location: `${relFile}:${dom.line}`,
            issue: `Artifact packaged with non-global <sys_domain>${val}</sys_domain>.`,
            fix: `Set <sys_domain>global</sys_domain> so all tenant domains inherit the baseline configuration.`,
          });
        }
      }

      // 3. ui_action_sys_overrides: sys_overrides on sys_ui_action must be empty
      if (content.includes('<sys_ui_action')) {
        for (const ov of extractXmlTagValues(content, 'sys_overrides')) {
          if (ov.value.trim() !== '') {
            findings.push({
              checkId: 'ui_action_sys_overrides',
              priority: 'P1',
              impact: 'Medium',
              location: `${relFile}:${ov.line}`,
              issue: `UI Action has non-empty <sys_overrides>${ov.value.trim()}</sys_overrides>.`,
              fix: `Clear <sys_overrides/> on packaged UI Actions; use matching action_name on child tables to override.`,
            });
          }
        }
      }

      // 4. Track custom tables in sys_db_object
      if (content.includes('<sys_db_object')) {
        const name = getXmlField(content, 'name');
        const superMatches = extractXmlTagValues(content, 'super_class');
        const rawSuper = superMatches.length > 0 ? superMatches[0].raw : '';
        const displayMatch = rawSuper.match(/display_value="([^"]+)"/i);
        const extendsTable = (displayMatch ? displayMatch[1] : getXmlField(content, 'super_class')).toLowerCase();
        if (name) {
          const prev = customTables.get(name) || {
            file: relFile,
            line: 1,
            extendsTable: '',
            hasSysDomain: false,
            hasSysOverrides: false,
            isImportSet: false,
          };
          prev.file = relFile;
          prev.extendsTable = extendsTable || prev.extendsTable;
          prev.isImportSet = /import_set_row/i.test(prev.extendsTable);
          customTables.set(name, prev);
        }
      }

      // 5. Track sys_domain and sys_overrides columns in sys_dictionary
      if (content.includes('<sys_dictionary')) {
        for (const dm of extractXmlTagValues(content, 'sys_dictionary')) {
          const table = getXmlField(dm.value, 'name');
          const element = getXmlField(dm.value, 'element');
          if (!table) continue;
          const prev = customTables.get(table) || {
            file: relFile,
            line: dm.line,
            extendsTable: '',
            hasSysDomain: false,
            hasSysOverrides: false,
            isImportSet: false,
          };
          if (element === 'sys_domain') prev.hasSysDomain = true;
          if (element === 'sys_overrides') prev.hasSysOverrides = true;
          customTables.set(table, prev);
        }
      }

      // 6. Inspect sys_script (Business Rules) for default domain, set domain, and async BRs
      if (content.includes('<sys_script>') || content.includes('<sys_script ')) {
        const name = getXmlField(content, 'name');
        const when = getXmlField(content, 'when');
        const condition = getXmlField(content, 'condition');
        const script = getXmlField(content, 'script');

        if (/getDefaultDomain/.test(script) && /glide\.sys\.domain\.partitioning/.test(condition + ' ' + script)) {
          hasDefaultDomainBr = true;
        }
        if (/Domain\s*[-–]\s*Set\s*Domain/i.test(name) || /current\.sys_domain\s*=/.test(script)) {
          hasSetDomainBr = true;
        }
        if (when === 'async' && !/\bsys_domain\b/.test(script)) {
          findings.push({
            checkId: 'msp_async_br',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Async Business Rule '${name}' does not reference or propagate 'sys_domain'.`,
            fix: `Account for domain separation in async Business Rules, especially if triggered by non-domain-separated records.`,
          });
        }
      }

      // 7. Inspect sys_transform_map for run_business_rules
      if (content.includes('<sys_transform_map')) {
        const tmName = getXmlField(content, 'name');
        const runBr = getXmlField(content, 'run_business_rules');
        if (runBr === 'false' || runBr === '0') {
          findings.push({
            checkId: 'msp_run_br_chkbox',
            priority: 'P2',
            impact: 'Medium',
            location: `${relFile}:1`,
            issue: `Transform Map '${tmName}' has <run_business_rules>${runBr}</run_business_rules>.`,
            fix: `Enable <run_business_rules>true</run_business_rules> so target table domain validation Business Rules run during import.`,
          });
        }
      }
    }
  }

  // Evaluate table-level MSP checks across collected custom tables
  let hasDataTables = false;
  for (const [tableName, info] of customTables.entries()) {
    if (info.isImportSet) {
      findings.push({
        checkId: 'msp_Import_set_tables',
        priority: 'P1',
        impact: 'High',
        location: `${info.file}:${info.line}`,
        issue: `Import Set table '${tableName}' extends 'sys_import_set_row' (not domain-separated); verify its roles are restricted from tenants.`,
        fix: `Restrict '${tableName}' ACLs and modules to dedicated non-tenant integration/admin roles.`,
      });
      continue;
    }

    const extendsMetadata = /sys_metadata|application file/i.test(info.extendsTable);
    if (extendsMetadata) {
      if (!info.hasSysOverrides) {
        findings.push({
          checkId: 'msp_sys_overrides',
          priority: 'P2',
          impact: 'Medium',
          location: `${info.file}:${info.line}`,
          issue: `Metadata-extending table '${tableName}' is missing a 'sys_overrides' column for domain overrides.`,
          fix: `Add a 'sys_overrides' self-reference column to '${tableName}' if tenants can override process records.`,
        });
      }
    } else {
      hasDataTables = true;
      const inheritsDomainFromParent = /^(task|cmdb_ci|cmdb|core_company)\b/i.test(info.extendsTable);
      if (!info.hasSysDomain && !inheritsDomainFromParent) {
        findings.push({
          checkId: 'msp_sys_domain',
          priority: 'P1',
          impact: 'Medium',
          location: `${info.file}:${info.line}`,
          issue: `Custom table '${tableName}' does not define a 'sys_domain' (Domain ID) column.`,
          fix: `Add a 'sys_domain' column (DomainIdColumn) for tenant data isolation, or restrict the table strictly to the OOB 'admin' role if it stores instance-owner config.`,
        });
      }
    }
  }

  if ((hasDataTables || usesGetDefaultDomain) && !hasGetDefaultDomainPrivilege) {
    findings.push({
      checkId: 'msp_getDefaultDomain_cross_scope',
      priority: 'P0',
      impact: 'Critical',
      location: `CrossScopePrivilege`,
      issue: `Missing 'getDefaultDomain' cross-scope privilege (target_scope: 'global', target_type: 'scriptable').`,
      fix: `Add a CrossScopePrivilege (sys_scope_privilege) record for 'global.getDefaultDomain' with status 'allowed'.`,
    });
  }

  if (hasDataTables && !hasDefaultDomainBr) {
    findings.push({
      checkId: 'msp_defaut_domain_logic',
      priority: 'P2',
      impact: 'Medium',
      location: `BusinessRule`,
      issue: `No Business Rule found assigning records without a domain to global.getDefaultDomain() gated by glide.sys.domain.partitioning == 'true'.`,
      fix: `Add a before Business Rule conditioned on gs.getProperty('glide.sys.domain.partitioning') == 'true' that sets current.sys_domain = global.getDefaultDomain().`,
    });
  }

  if (hasDataTables && !hasSetDomainBr) {
    findings.push({
      checkId: 'msp_set_domain_br',
      priority: 'P2',
      impact: 'Medium',
      location: `BusinessRule`,
      issue: `No 'Domain - Set Domain' Business Rule detected for custom scoped data tables.`,
      fix: `Create a 'Domain - Set Domain' Business Rule to cascade/assign sys_domain on custom scoped tables.`,
    });
  }

  const appType =
    hasFluent && hasXml ? 'Hybrid' : hasFluent ? 'Fluent (now.config.json)' : 'Classic XML (update/)';

  return {
    appName,
    scope,
    appType,
    filesScanned: allFiles.length,
    customTablesFound: customTables.size,
    findingsCount: findings.length,
    findings,
  };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('--json');
  const targetDir = args.find((a) => !a.startsWith('-')) || process.cwd();
  const report = runMspScan(targetDir);

  if (jsonFlag) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`MSP / Domain Separation Scan: ${report.appName} (${report.scope})`);
    console.log(
      `App Type: ${report.appType} | Files Scanned: ${report.filesScanned} | Custom Tables: ${report.customTablesFound} | Findings: ${report.findingsCount}`
    );
    if (report.findings.length === 0) {
      console.log('No deterministic MSP / Domain Separation issues detected.');
    } else {
      for (const f of report.findings) {
        console.log(`\n[${f.priority}] ${f.checkId} (${f.impact}) @ ${f.location}`);
        console.log(`  Issue: ${f.issue}`);
        console.log(`  Fix:   ${f.fix}`);
      }
    }
  }
}
