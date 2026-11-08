import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  collectSnippets,
  extractTypescript,
  parseOptions,
  renderReport,
  validateSnippets,
} from '../../scripts/validate-snippets.mjs';

const projectRoot = process.cwd();
const sdkVersion: string = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'node_modules/@servicenow/sdk/package.json'), 'utf8')
).version;

describe('snippet validation', () => {
  it('concatenates TypeScript fences without including prose or other languages', () => {
    assert.equal(extractTypescript([
      '# Example', '```typescript', 'const a = 1', '```',
      '```javascript', 'ignored()', '```',
      '```typescript', 'const b = 2', '```',
    ].join('\r\n')), 'const a = 1\n\nconst b = 2');
    assert.equal(extractTypescript('No code here'), '');
  });

  it('accepts the existing filters and an explicit bounded worker count', () => {
    assert.deepEqual(parseOptions(['ai-agent', '--jobs', '1']), {
      filter: 'ai-agent', changed: false, jobs: 1,
    });
    assert.equal(parseOptions(['--changed', '--jobs=2']).changed, true);
    for (const jobs of ['0', '-1', '1.5', 'no', 'Infinity']) {
      assert.throws(() => parseOptions([`--jobs=${jobs}`]), /jobs/);
    }
    assert.throws(() => parseOptions(['--changed', 'role']), /filter/);
    assert.throws(() => parseOptions(['--unknown']));
  });

  it('deduplicates changed files, excludes deletions, and includes untracked snippets', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snippet-selection-'));
    const snippetDir = path.join(root, 'res/snippet');
    const git = (...args: string[]): string =>
      execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const write = (name: string, content = '```typescript\nexport {}\n```'): void =>
      fs.writeFileSync(path.join(snippetDir, name), content);
    try {
      fs.mkdirSync(snippetDir, { recursive: true });
      git('init', '--initial-branch=scratch/snippet-test');
      write('fluent_snippet_role_0001.md');
      write('fluent_snippet_role_0002.md');
      write('fluent_snippet_table_0001.md');
      git('add', '.');
      git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
        '-c', 'commit.gpgsign=false', 'commit', '-m', 'chore: seed fixture');
      write('fluent_snippet_role_0001.md', 'staged');
      git('add', '.');
      write('fluent_snippet_role_0001.md', 'unstaged');
      fs.unlinkSync(path.join(snippetDir, 'fluent_snippet_role_0002.md'));
      write('fluent_snippet_role_new example.md');
      assert.deepEqual(collectSnippets(root, { changed: true }).map((s) => s.name), [
        'fluent_snippet_role_0001.md',
        'fluent_snippet_role_new example.md',
      ]);
      assert.equal(collectSnippets(root, { filter: 'role' }).length, 2);
      assert.equal(collectSnippets(root, { filter: 'missing' }).length, 0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses isolated SDK builds and keeps compiler, scope, and unresolved-output failures', { timeout: 120_000 }, async (t) => {
    const table = `import { Table, StringColumn } from '@servicenow/sdk/core'
export const incident = Table({
  augments: 'incident',
  schema: { u_validator_text: StringColumn({}) },
})`;
    const snippets = [
      { name: 'table.md', code: table },
      { name: 'same-table.md', code: table },
      { name: 'missing-table.md', code: `import { Record } from '@servicenow/sdk/core'
Record({ $id: Now.ID['record'], table: 'incident', data: { u_validator_text: 'test' } })` },
      { name: 'bad-type.md', code: `import { Role } from '@servicenow/sdk/core'
Role({ $id: Now.ID['role'], name: 123 })` },
      { name: 'unresolved.md', code: `import { Property } from '@servicenow/sdk/core'
Property({
  $id: Now.ID['property'],
  name: 'u_validator',
  value: 'Symbol(Now.UNRESOLVED)',
})` },
      { name: 'scoped.md', code: `// App scope: x_validator
import { Table, StringColumn } from '@servicenow/sdk/core'
export const x_validator_example = Table({
  name: 'x_validator_example',
  schema: { text: StringColumn({}) },
})` },
      { name: 'bad-scope.md', code: `// App scope: x_validator
${table}` },
      { name: 'empty.md', code: '' },
      { name: 'after-failure.md', code: table },
    ];
    const results = await validateSnippets(snippets, { projectRoot, sdkVersion, jobs: 1, signal: t.signal });
    assert.deepEqual(results.map((r) => r.status), [
      'passed', 'passed', 'failed', 'failed', 'failed', 'passed', 'failed', 'skipped', 'passed',
    ]);
    assert.match(results[2]!.error, /u_validator_text/);
    assert.match(results[3]!.error, /number|123/);
    assert.match(results[4]!.error, /Symbol/);
    assert.match(results[6]!.error, /prefix|scope/i);

    const parallel = await validateSnippets(
      [snippets[0]!, snippets[3]!, snippets[5]!, snippets[7]!],
      { projectRoot, sdkVersion, jobs: 2, signal: t.signal }
    );
    assert.deepEqual(parallel.map((r) => r.status), ['passed', 'failed', 'passed', 'skipped']);
    const report = renderReport(results, sdkVersion, 1.25);
    assert.match(report, new RegExp(`@servicenow/sdk@${sdkVersion.replaceAll('.', '\\.')}`));
    assert.match(report, /\| Passed \| 4 \|/);
    assert.match(report, /\| Failed \| 4 \|/);
    assert.match(report, /unresolved\.md/);
    assert.match(report, /empty\.md/);
  });

  it('rejects cancellation and worker failures instead of hanging or reporting success', { timeout: 10_000 }, async (t) => {
    const controller = new AbortController();
    controller.abort(new Error('validation cancelled'));
    await assert.rejects(
      validateSnippets([{ name: 'empty.md', code: '' }], { signal: controller.signal }),
      /validation cancelled/
    );
    await assert.rejects(
      validateSnippets([{ name: 'broken.md', code: null }], { jobs: 1, signal: t.signal }),
      /trim/
    );
    await assert.rejects(
      validateSnippets([{ name: 'empty.md', code: '' }], {
        jobs: 1, signal: t.signal, onResult: () => { throw new Error('report failed'); },
      }),
      /report failed/
    );
  });

  it('returns a failing CLI exit status and a complete report for bad snippets', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snippet-cli-'));
    try {
      fs.mkdirSync(path.join(root, 'scripts'));
      fs.mkdirSync(path.join(root, 'res', 'snippet'), { recursive: true });
      const script = path.join(root, 'scripts', 'validate-snippets.mjs');
      fs.copyFileSync(path.join(projectRoot, 'scripts', 'validate-snippets.mjs'), script);
      fs.symlinkSync(path.join(projectRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction');
      fs.writeFileSync(path.join(root, 'res', 'snippet', 'fluent_snippet_bad_0001.md'), [
        '```typescript', "import { Role } from '@servicenow/sdk/core'",
        "Role({ $id: Now.ID['role'], name: 123 })", '```',
      ].join('\n'));
      fs.writeFileSync(path.join(root, 'res', 'snippet', 'fluent_snippet_empty_0001.md'), 'No code');
      const result = spawnSync(process.execPath, [script, '--jobs=1'], { encoding: 'utf8', timeout: 60_000 });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /0 passed, 1 failed, 1 skipped, 2 total/);
      const report = fs.readFileSync(path.join(root, 'coverage', 'snippet-validation.md'), 'utf8');
      assert.match(report, /fluent_snippet_bad_0001\.md/);
      assert.match(report, /fluent_snippet_empty_0001\.md/);
      const filtered = spawnSync(process.execPath, [script, 'empty'], { encoding: 'utf8', timeout: 10_000 });
      assert.equal(filtered.status, 0, filtered.stdout + filtered.stderr);
      assert.match(filtered.stdout, /0 passed, 0 failed, 1 skipped, 1 total/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
