#!/usr/bin/env node
/**
 * validate-instructs.mjs — cross-check every res/instruct/*.md against the
 * SDK 4.7.1 documentation surface returned by `now-sdk explain`.
 *
 * Why: instruct files are prose with backtick-quoted API names, property names,
 * enum literals, and import paths. They drift silently when the SDK renames or
 * removes things. This script catches references that no longer appear in any
 * SDK explain topic.
 *
 * Approach:
 *   1. List all explain topics, fetch each with caching (parallelized).
 *   2. Concatenate into one corpus blob (the SDK's "known vocabulary").
 *   3. For each instruct file, extract backtick tokens, classify, and report
 *      any "validatable" token that doesn't appear anywhere in the corpus.
 *
 * Outputs:
 *   coverage/instruct-validation.md
 *
 * Usage:
 *   npm run validate:instructs                  # validate all
 *   node scripts/validate-instructs.mjs flow    # filter by basename substring
 *   node scripts/validate-instructs.mjs --no-cache  # refetch all explain output
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const INSTRUCT_DIR = path.join(PROJECT_ROOT, 'res', 'instruct');
const WORK_DIR = path.join(PROJECT_ROOT, '.instruct-validation');
const CACHE_DIR = path.join(WORK_DIR, 'cache');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');
const REPORT_FILE = path.join(COVERAGE_DIR, 'instruct-validation.md');

const args = process.argv.slice(2);
const NO_CACHE = args.includes('--no-cache');
const FILTER = args.find(a => !a.startsWith('--'));

// ─── Whitelist: platform globals + JS runtime that may appear in instructs
// but are not necessarily in the explain corpus. Anything here is treated
// as a known identifier regardless of corpus.
const WHITELIST = new Set([
    // Fluent platform globals
    'Now.ID', 'Now.include', 'Now.attach', 'Now.ref', 'Now',
    'now.config.json', 'keys.ts', 'now.ts',
    'g_form', 'g_scratchpad', 'g_user', 'g_list', 'g_request',
    'GlideRecord', 'GlideAjax', 'GlideForm',
    'gs', 'gs.getProperty', 'gs.eventQueue', 'gs.addInfoMessage', 'gs.log',
    'gs.info', 'gs.warn', 'gs.error', 'gs.hasRole',
    'current', 'previous', 'event', 'email', 'logger', 'classifier',
    'logger.info', 'logger.warn', 'logger.error',
    // Common script-context objects
    'params', 'params.trigger', 'params.flowVariables', 'params.inputs',
    'producer', 'response', 'request',
    // AngularJS service injections (Service Portal widgets)
    '$q', '$timeout', '$sce', '$scope', '$http', '$rootScope', '$window', '$location',
    // Jelly conventions (UI Page)
    'jvar_', 'jelly_',
    // Common JS / TS keywords / globals
    'string', 'number', 'boolean', 'object', 'array', 'any', 'void', 'null', 'undefined',
    'true', 'false',
    // Well-known ServiceNow tables / sys_id prefixes (not always echoed verbatim by explain)
    'sys_id', 'sys_user', 'sys_user_role', 'sys_dictionary', 'sys_dictionary_override',
    'sys_ui_message', 'sysevent_registry', 'sysverb_save', 'sysverb_custom_action',
    'sysevent_email_action', 'sys_email_action', 'sys_filter_option_dynamic',
    'item_option_new', 'item_option_new_set',
    'sc_cat_item', 'sc_cat_item_producer',
    'incident', 'task',
    // Fluent build-time helpers (resolved at compile, not exported in types)
    'get_sys_id',
    // ServiceNow business_calendar built-in names
    'Year', 'Quarter', 'Month', 'Week',
    // ServicePortal legacy property names that current instructs intentionally
    // mention as deprecated (replaced by customCss / fields). Whitelist so the
    // validator doesn't flag the documented "do NOT use" reference.
    'cssTemplate', 'sassSrc',
    // Dashboard componentProps suggested keys (free-form Record<string,unknown>;
    // not enumerable from SDK explain but documented conventions for report widgets)
    'reportId', 'reportSysId',
]);

// Prefixes that mark a dotted token as a USER-CHOSEN identifier in an example,
// not an SDK symbol. Skip these without flagging.
const EXAMPLE_VAR_PREFIXES = new Set([
    'myVariableSet', 'myVariable', 'topLayout', 'mySubflow',
    // AI Agent prompt template variables (documented platform convention)
    't', 'p',
    // Workspace expression namespaces (typed proxies, not exported globals)
    'Workspace', 'UxList',
]);

// ─── Run a shell command, capture stdout
function run(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { ...options });
        let stdout = '', stderr = '';
        child.stdout?.on('data', d => stdout += d);
        child.stderr?.on('data', d => stderr += d);
        child.on('error', reject);
        child.on('close', code => {
            if (code !== 0) reject(new Error(`${cmd} exited ${code}: ${stderr}`));
            else resolve(stdout);
        });
    });
}

// ─── Fetch raw explain output for a topic, with file-level caching
async function fetchExplain(topic) {
    const cacheFile = path.join(CACHE_DIR, `${topic}.md`);
    if (!NO_CACHE && fs.existsSync(cacheFile)) {
        return fs.readFileSync(cacheFile, 'utf8');
    }
    try {
        const out = await run('npx', ['now-sdk', 'explain', topic, '--format', 'raw'], {
            cwd: PROJECT_ROOT,
        });
        fs.writeFileSync(cacheFile, out);
        return out;
    } catch (e) {
        // Some topics may fail to render; record empty so we don't refetch forever
        fs.writeFileSync(cacheFile, '');
        return '';
    }
}

// ─── Parallel fetch with concurrency limit
async function fetchAll(topics, concurrency = 8) {
    const results = new Map();
    let i = 0;
    let lastReported = 0;
    async function worker() {
        while (i < topics.length) {
            const idx = i++;
            const topic = topics[idx];
            results.set(topic, await fetchExplain(topic));
            if (idx - lastReported >= 20 || idx === topics.length - 1) {
                process.stderr.write(`  fetched ${idx + 1}/${topics.length} topics\n`);
                lastReported = idx;
            }
        }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
}

// ─── Discover all SDK explain topics
async function listTopics() {
    const out = await run('npx', ['now-sdk', 'explain', '--list', '--format', 'raw'], {
        cwd: PROJECT_ROOT,
    });
    const topics = [];
    for (const line of out.split('\n')) {
        const m = line.match(/^([a-z][a-z0-9-]+(?:-api|-guide|-overview|-reference))\b/);
        if (m) topics.push(m[1]);
    }
    return topics;
}

// ─── Extract every backtick-quoted token from a markdown file
function extractBacktickTokens(content) {
    const tokens = [];
    // Match `…` but skip fenced code blocks (we treat them transparently here)
    const re = /`([^`\n]+)`/g;
    let m;
    while ((m = re.exec(content)) !== null) {
        tokens.push({ raw: m[1], offset: m.index });
    }
    return tokens;
}

// ─── Classify a token; return { kind, normalized } or null to skip
function classifyToken(raw) {
    const t = raw.trim();
    if (!t) return null;

    // Skip multi-statement / long code fragments
    if (t.length > 100) return null;
    // Skip tokens with semicolons/braces (code, not identifier)
    if (/[;{}]/.test(t)) return null;
    // Skip URLs and code with parens containing more than a simple call signature
    if (/^https?:\/\//.test(t)) return null;
    // Skip prose containing English words with spaces
    if (/\s/.test(t) && !/^'[^']+'$/.test(t)) return null;

    // Skip filename / URL-fragment references: foo.md, foo.ts, foo.js, foo.do, foo.json, foo.css, foo.scss, foo.html
    if (/\.(md|ts|tsx|js|jsx|do|json|css|scss|html|xml|sql)$/.test(t)) return null;

    // Skip JSON-path-style references in config files (kept as prose)
    if (/^dependencies\.[a-z_]+\.[a-z_]+$/.test(t)) return null;

    // Single-quoted string literal: 'value' or '...'
    const sqMatch = t.match(/^'([^']*)'$/);
    if (sqMatch) {
        const val = sqMatch[1];
        // Skip empty strings, long, or non-validatable values
        if (!val) return null;
        if (val.length > 60) return null;
        // Skip values with spaces or punctuation that suggest prose/sentences
        if (/[\s,]/.test(val)) return null;
        // Skip placeholder examples like '...'
        if (val === '...' || val === '…') return null;
        // Skip strings that are clearly encoded queries or script expressions:
        //   contain `=`, `^`, `(`, `"`, `\` — not simple enum literals.
        if (/[=^()"\\]/.test(val)) return null;
        // Skip encoded-query fragments with embedded operator codes
        // (e.g. 'assigned_toISNOTEMPTY', 'shortISEMPTY', 'foo_atSTARTSWITH'_)
        if (/[A-Z]{4,}/.test(val)) return null;
        // Skip strings that look like dotted table.column refs (e.g. 'parent_table.child_table')
        if (/^[a-z_]+\.[a-z_]+(?:\.[a-z_]+)*$/.test(val)) return null;
        // Skip path-style values (TZs, slashes, dashes) - too variable to validate
        if (/[\/]/.test(val)) return null;
        // Skip kebab-case slugs (often workspace paths / page IDs / component names)
        if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(val)) return null;
        // Skip short all-uppercase codes (TZ abbreviations: GMT, UTC, EST, etc.)
        if (/^[A-Z]{2,5}$/.test(val)) return null;
        return { kind: 'enum-literal', normalized: val };
    }

    // Import paths
    if (t.startsWith('@servicenow/')) {
        return { kind: 'import-path', normalized: t };
    }

    // Function call notation like `Action()` or `wfa.action()`
    const callMatch = t.match(/^([A-Za-z_$][\w$.]*)\(\s*\)?$/) || t.match(/^([A-Za-z_$][\w$.]*)\([^)]*\)$/);
    if (callMatch) {
        return { kind: 'call', normalized: callMatch[1] };
    }

    // Dot-walked or namespaced identifier (e.g., wfa.action, action.core.createRecord)
    if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(t)) {
        const head = t.split('.')[0];
        // Skip example-variable dotted paths (e.g. myVariableSet.variables.x, t.input.x)
        if (EXAMPLE_VAR_PREFIXES.has(head)) return null;
        return { kind: 'dotted', normalized: t };
    }

    // Simple identifier (camelCase, PascalCase, snake_case)
    if (/^[A-Za-z_$][\w$]*$/.test(t)) {
        return { kind: 'identifier', normalized: t };
    }

    // Type-style: Record<'sys_user_role'>, (string | Role)[], etc.
    if (/^[A-Z][\w<>|,\s'.\[\]]*$/.test(t)) {
        // Skip; type expressions are noisy to validate
        return null;
    }

    return null;
}

// ─── Validate a single token against the corpus
function isKnown(normalized, kind, corpus) {
    if (WHITELIST.has(normalized)) return true;
    // For dotted/call tokens, also try the head and last segment
    if (kind === 'dotted' || kind === 'call') {
        const parts = normalized.split('.');
        const head = parts[0];
        const tail = parts[parts.length - 1];
        if (WHITELIST.has(head)) return true;
        if (corpus.includes(normalized)) return true;
        if (tail !== normalized && corpus.includes(tail)) return true;
        return false;
    }
    // Case-sensitive corpus check
    if (corpus.includes(normalized)) return true;
    // For enum literals, try with surrounding quotes (the corpus has them quoted)
    if (kind === 'enum-literal') {
        if (corpus.includes(`'${normalized}'`)) return true;
        if (corpus.includes(`"${normalized}"`)) return true;
        return false;
    }
    return false;
}

// ─── Read all SDK .d.ts type definitions as a secondary corpus
//     (catches enum values explained in types but not surfaced by `explain`)
function readSdkTypeDefs() {
    const sdkCoreDist = path.join(PROJECT_ROOT, 'node_modules', '@servicenow', 'sdk-core', 'dist');
    if (!fs.existsSync(sdkCoreDist)) return '';
    const buf = [];
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
                try { buf.push(fs.readFileSync(full, 'utf8')); } catch { /* ignore */ }
            }
        }
    }
    walk(sdkCoreDist);
    return buf.join('\n\n');
}

// ─── Main
async function main() {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });

    process.stderr.write('Discovering SDK explain topics...\n');
    const topics = await listTopics();
    process.stderr.write(`  ${topics.length} topics found\n`);

    process.stderr.write('Fetching explain output (cached)...\n');
    const corpusMap = await fetchAll(topics);
    const explainCorpus = Array.from(corpusMap.values()).join('\n\n');
    process.stderr.write(`  explain corpus = ${explainCorpus.length} chars\n`);

    process.stderr.write('Loading SDK .d.ts type definitions...\n');
    const typeCorpus = readSdkTypeDefs();
    process.stderr.write(`  type corpus = ${typeCorpus.length} chars\n`);

    const corpus = explainCorpus + '\n\n' + typeCorpus;

    const files = fs.readdirSync(INSTRUCT_DIR)
        .filter(f => f.startsWith('fluent_instruct_') && f.endsWith('.md'))
        .filter(f => !FILTER || f.includes(FILTER));

    const fileResults = [];
    let totalIssues = 0;

    for (const file of files) {
        const content = fs.readFileSync(path.join(INSTRUCT_DIR, file), 'utf8');
        const tokens = extractBacktickTokens(content);
        const issues = [];
        const seen = new Set();
        for (const { raw, offset } of tokens) {
            const cls = classifyToken(raw);
            if (!cls) continue;
            const key = `${cls.kind}::${cls.normalized}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (!isKnown(cls.normalized, cls.kind, corpus)) {
                // Find line number
                const before = content.slice(0, offset);
                const line = before.split('\n').length;
                issues.push({ raw, ...cls, line });
            }
        }
        fileResults.push({ file, total: tokens.length, unique: seen.size, issues });
        totalIssues += issues.length;
    }

    // ─── Write report
    const okFiles = fileResults.filter(r => r.issues.length === 0);
    const badFiles = fileResults.filter(r => r.issues.length > 0);

    const lines = [];
    lines.push('# Instruct Validation Report');
    lines.push('');
    lines.push(`Validated against \`now-sdk explain\` corpus from **${topics.length}** SDK 4.7.1 topics.`);
    lines.push('');
    lines.push(`- **${fileResults.length}** instruct files scanned`);
    lines.push(`- **${okFiles.length}** clean (all backtick tokens resolved)`);
    lines.push(`- **${badFiles.length}** with unresolved tokens`);
    lines.push(`- **${totalIssues}** total unresolved tokens`);
    lines.push('');
    if (badFiles.length > 0) {
        lines.push('## Files with unresolved tokens');
        lines.push('');
        for (const r of badFiles) {
            lines.push(`### ${r.file}  (${r.issues.length} unresolved)`);
            lines.push('');
            lines.push('| Line | Token | Kind |');
            lines.push('|------|-------|------|');
            for (const iss of r.issues) {
                const tok = `\`${iss.raw.replace(/\|/g, '\\|')}\``;
                lines.push(`| ${iss.line} | ${tok} | ${iss.kind} |`);
            }
            lines.push('');
        }
    }
    if (okFiles.length > 0) {
        lines.push('## Clean files');
        lines.push('');
        for (const r of okFiles) {
            lines.push(`- ${r.file} — ${r.unique} unique tokens checked`);
        }
        lines.push('');
    }

    fs.writeFileSync(REPORT_FILE, lines.join('\n'));

    // ─── Console summary
    console.log('');
    console.log(`Instruct validation: ${okFiles.length}/${fileResults.length} clean, ${totalIssues} unresolved tokens`);
    console.log(`Report: ${path.relative(PROJECT_ROOT, REPORT_FILE)}`);
    if (badFiles.length > 0) {
        console.log('');
        console.log('Top unresolved tokens by file:');
        for (const r of badFiles.slice(0, 10)) {
            console.log(`  ${r.file} (${r.issues.length}):`);
            for (const iss of r.issues.slice(0, 5)) {
                console.log(`    L${iss.line}  [${iss.kind}]  ${iss.raw}`);
            }
        }
    }
    process.exit(totalIssues === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
