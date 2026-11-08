#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, parseArgs, stripVTControlCharacters } from 'node:util';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_JOBS = Math.min(2, os.availableParallelism());

export function parseOptions(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { changed: { type: 'boolean' }, jobs: { type: 'string' } },
  });
  if (positionals.length > 1 || (values.changed && positionals.length)) {
    throw new Error('Supply one snippet filter or --changed, not both.');
  }
  const jobs = values.jobs === undefined ? DEFAULT_JOBS : Number(values.jobs);
  if (!Number.isSafeInteger(jobs) || jobs < 1 || (values.jobs && !/^\d+$/.test(values.jobs))) {
    throw new Error('--jobs must be a positive integer.');
  }
  return { filter: positionals[0] ?? '', changed: values.changed ?? false, jobs };
}

export function extractTypescript(markdown) {
  const lines = [];
  let capture = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^```typescript\b/.test(line)) {
      capture = true;
    } else if (line === '```') {
      if (capture) lines.push('');
      capture = false;
    } else if (capture) {
      lines.push(line);
    }
  }
  return lines.join('\n').trimEnd();
}

export function collectSnippets(projectRoot, { filter = '', changed = false } = {}) {
  const snippetDir = path.join(projectRoot, 'res', 'snippet');
  let files;
  if (changed) {
    const gitPaths = (args) => execFileSync('git', args, {
      cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).split('\0').filter(Boolean);
    files = [...new Set([
      ...gitPaths(['diff', '--name-only', '-z', 'HEAD', '--', 'res/snippet/*.md']),
      ...gitPaths(['ls-files', '--others', '--exclude-standard', '-z', '--', 'res/snippet/*.md']),
    ])].map((file) => path.resolve(projectRoot, file));
  } else {
    files = fs.readdirSync(snippetDir, { recursive: true })
      .map((file) => path.join(snippetDir, file));
  }
  return files
    .filter((file) => path.basename(file).startsWith(`fluent_snippet_${filter}`) &&
      file.endsWith('.md') && fs.existsSync(file) && fs.statSync(file).isFile())
    .sort()
    .map((file) => ({ name: path.basename(file), code: extractTypescript(fs.readFileSync(file, 'utf8')) }));
}

async function buildSnippet(snippet, { projectRoot, sdkVersion, workRoot }) {
  if (!snippet.code.trim()) {
    return { name: snippet.name, status: 'skipped', error: 'no typescript block' };
  }
  const { Project, Orchestrator } = await import('@servicenow/sdk/api');
  const workDir = fs.mkdtempSync(path.join(workRoot, 'snippet-'));
  const errors = [];
  const logger = {
    info() {},
    debug() {},
    warn() {},
    error: (...args) => errors.push(stripVTControlCharacters(format(...args))),
  };
  try {
    const scope = snippet.code.match(/^\/\/ App scope: ([a-z0-9_]+)/m)?.[1] ?? 'global';
    fs.mkdirSync(path.join(workDir, 'src', 'fluent'), { recursive: true });
    fs.symlinkSync(path.join(projectRoot, 'node_modules'), path.join(workDir, 'node_modules'), 'junction');
    fs.writeFileSync(path.join(workDir, 'now.config.json'), JSON.stringify({
      scope,
      scopeId: scope === 'global' ? 'global' : '0123456789abcdef0123456789abcdef',
      fluentDir: 'src/fluent',
      clientDir: '',
    }));
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({
      name: 'snippet-test', version: '1.0.0', private: true,
      dependencies: { '@servicenow/sdk': sdkVersion },
    }));
    fs.writeFileSync(path.join(workDir, 'src', 'fluent', 'snippet.now.ts'), snippet.code);
    const project = new Project({ rootDir: workDir, fileSystem: fs, logger });
    const result = await new Orchestrator(project).build();
    if (!result.success) {
      return { name: snippet.name, status: 'failed', error: errors.join('\n') || 'SDK build failed without a diagnostic.' };
    }
    const unresolved = fs.readdirSync(path.join(workDir, 'dist'), { recursive: true })
      .map((file) => path.join(workDir, 'dist', file))
      .find((file) => fs.statSync(file).isFile() && fs.readFileSync(file).includes('Symbol('));
    return unresolved
      ? { name: snippet.name, status: 'failed',
        error: `build wrote an unresolved Symbol(...) value into ${path.relative(workDir, unresolved)}` }
      : { name: snippet.name, status: 'passed', error: '' };
  } catch (error) {
    return { name: snippet.name, status: 'failed', error: stripVTControlCharacters(String(error)) };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function validateSnippets(snippets, {
  projectRoot = PROJECT_ROOT, sdkVersion = '', jobs = DEFAULT_JOBS, onResult = (_result) => {},
  signal = new AbortController().signal,
} = {}) {
  if (!snippets.length) return [];
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-snippet-validate-'));
  const workers = [];
  const results = new Array(snippets.length);
  let next = 0;
  let completed = 0;
  let abort;
  try {
    await new Promise((resolve, reject) => {
      abort = () => reject(signal.reason);
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      const dispatch = (worker) => {
        if (next < snippets.length) {
          const index = next++;
          worker.postMessage({ index, snippet: snippets[index] });
        }
      };
      for (let i = 0; i < Math.min(jobs, snippets.length); i++) {
        const worker = new Worker(new URL(import.meta.url), {
          workerData: { snippetValidator: true, projectRoot, sdkVersion, workRoot },
          resourceLimits: { maxOldGenerationSizeMb: 512 },
        });
        workers.push(worker);
        worker.once('error', reject);
        worker.once('exit', (code) => {
          if (completed < snippets.length) reject(new Error(`Snippet worker exited early (code ${code}).`));
        });
        worker.on('message', ({ index, result }) => {
          results[index] = result;
          completed++;
          try {
            onResult(result);
          } catch (error) {
            reject(error);
            return;
          }
          if (completed === snippets.length) resolve();
          else dispatch(worker);
        });
        dispatch(worker);
      }
    });
    return results;
  } finally {
    signal.removeEventListener('abort', abort);
    await Promise.all(workers.map((worker) => worker.terminate()));
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
}

export function renderReport(results, sdkVersion, elapsedSeconds) {
  const byStatus = (status) => results.filter((result) => result.status === status);
  const passed = byStatus('passed');
  const failed = byStatus('failed');
  const skipped = byStatus('skipped');
  return [
    '# Snippet Validation Report', '',
    `Generated by \`scripts/validate-snippets.mjs\` against \`@servicenow/sdk@${sdkVersion}\` on ${new Date().toISOString()}.`,
    '', `Duration: ${elapsedSeconds.toFixed(2)}s.`, '',
    '## Summary', '', '| Status | Count |', '|--------|-------|',
    `| Passed | ${passed.length} |`, `| Failed | ${failed.length} |`,
    `| Skipped (no typescript block) | ${skipped.length} |`, `| **Total** | **${results.length}** |`, '',
    ...(failed.length ? ['## Failures', '', ...failed.map((r) =>
      `- **${r.name}** — ${r.error.split('\n')[0]}`), ''] : []),
    `## Passed (${passed.length})`, '', ...passed.map((r) => `- ${r.name}`), '',
    `## Skipped (${skipped.length})`, '', ...skipped.map((r) => `- ${r.name} — ${r.error}`), '',
  ].join('\n');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sdkVersion = JSON.parse(fs.readFileSync(
    path.join(PROJECT_ROOT, 'node_modules', '@servicenow', 'sdk', 'package.json'), 'utf8'
  )).version;
  const snippets = collectSnippets(PROJECT_ROOT, options);
  if (!snippets.length) {
    console.log(`No snippets found matching filter: ${options.filter || (options.changed ? '--changed' : 'all')}`);
    return;
  }
  const started = performance.now();
  console.log(`Validating ${snippets.length} snippets against SDK ${sdkVersion} (${Math.min(options.jobs, snippets.length)} workers)...`);
  const controller = new AbortController();
  const stop = (signal) => controller.abort(new Error(`Snippet validation interrupted by ${signal}.`));
  const handlers = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((signal) => {
    const handler = () => stop(signal);
    process.once(signal, handler);
    return [signal, handler];
  });
  try {
    const results = await validateSnippets(snippets, {
      ...options, sdkVersion, signal: controller.signal,
      onResult: (result) => {
        console.log(`  [${{ passed: 'PASS', failed: 'FAIL', skipped: 'SKIP' }[result.status]}] ${result.name}`);
        if (result.status === 'failed') console.log(`         ${result.error.replaceAll('\n', '\n         ')}`);
      },
    });
    const elapsed = (performance.now() - started) / 1000;
    const count = (status) => results.filter((result) => result.status === status).length;
    console.log(`\nResults: ${count('passed')} passed, ${count('failed')} failed, ${count('skipped')} skipped, ${results.length} total (${elapsed.toFixed(2)}s)`);
    if (!options.filter) {
      const reportFile = path.join(PROJECT_ROOT, 'coverage', 'snippet-validation.md');
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
      fs.writeFileSync(reportFile, renderReport(results, sdkVersion, elapsed));
      console.log(`Report written: ${path.relative(PROJECT_ROOT, reportFile)}`);
    }
    if (count('failed')) process.exitCode = 1;
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}

if (!isMainThread && workerData?.snippetValidator) {
  parentPort.on('message', async ({ index, snippet }) => {
    const result = await buildSnippet(snippet, workerData);
    parentPort.postMessage({ index, result });
  });
} else if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
