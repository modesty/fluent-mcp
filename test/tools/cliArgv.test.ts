/**
 * The argv rules in src/tools/commands/cliArgv.ts, plus a guard on the premise
 * they rest on: the bundled now-sdk's yargs re-parses a "-"-leading entry after
 * a value-taking flag as an option, and never re-parses the value of a
 * `--flag=value` entry. Both are checked against the real CLI (offline
 * `explain`), so an SDK upgrade that changes the parser fails here.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { assertNotOption, cliOption } from '../../src/tools/commands/cliArgv.js';
import { resolveSdkCli } from '../../src/utils/sdkCli.js';
import { parseCliOption } from '../support/argv.js';

describe('cliOption', () => {
  it('joins the option and its value into one entry', () => {
    assert.equal(cliOption('--auth', 'dev'), '--auth=dev');
    assert.equal(cliOption('--limit', 50), '--limit=50');
  });

  it('keeps a value that contains "=" or begins with "-" verbatim', () => {
    assert.equal(cliOption('--query', 'active=true^priority<=2'), '--query=active=true^priority<=2');
    assert.equal(cliOption('--dev-notes', '--app-version=9.9.9'), '--dev-notes=--app-version=9.9.9');
  });

  it('adds one pair of quotes for the parser to strip when the value is wrapped in matching quotes', () => {
    assert.equal(cliOption('--pattern', '"error"'), '--pattern=""error""');
    assert.equal(cliOption('--pattern', "'error'"), `--pattern="'error'"`);
    assert.equal(cliOption('--pattern', '""'), '--pattern=""""');
  });

  it('leaves a value whose quotes do not match, or a lone quote, as is', () => {
    for (const value of ['"', "'", `"error'`, 'say "hi"', '"a" or "b', "it's"]) {
      assert.equal(cliOption('--pattern', value), `--pattern=${value}`);
    }
  });
});

describe('cliOption round-trip through the bundled CLI parser', () => {
  const values = [
    'error', '"error"', "'error'", '"', "'", '""', "''", `"'"`, '"a"b"', `"error'`, 'say "hi"',
    `"'nested'"`, '--app-version=9.9.9', '- fixed X', 'a=b=c', 'active=true^priority<=2', '',
  ];

  it('parses every value back exactly', () => {
    for (const value of values) {
      assert.equal(parseCliOption(cliOption('--pattern', value), '--pattern'), value, JSON.stringify(value));
    }
  });

  it('negative control: the bare --flag=value form loses matching outer quotes', () => {
    assert.equal(parseCliOption('--pattern="error"', '--pattern'), 'error');
    assert.equal(parseCliOption("--pattern='error'", '--pattern'), 'error');
  });
});

describe('assertNotOption', () => {
  it('returns an ordinary positional unchanged', () => {
    assert.equal(assertNotOption('incident', 'table'), 'incident');
    assert.equal(assertNotOption('a-b', 'table'), 'a-b');
  });

  it('rejects a positional that begins with "-", naming the argument', () => {
    assert.throws(() => assertNotOption('--list', 'topic'), /Argument 'topic' must not begin with "-": the CLI would read "--list" as an option/);
    assert.throws(() => assertNotOption('-x', 'directory'), /Argument 'directory'/);
  });
});

describe('bundled now-sdk option parsing (real CLI, offline)', () => {
  const explain = (...argv: string[]): string => {
    const { command, baseArgs } = resolveSdkCli();
    const run = spawnSync(command, [...baseArgs, 'explain', 'table-api', ...argv], {
      encoding: 'utf-8',
      env: { ...process.env, NO_TELEMETRY: '1' },
      timeout: 30_000,
    });
    return `${run.stdout}${run.stderr}`;
  };

  it('negative control: a "-"-leading entry after --format is parsed as an option', () => {
    // --list takes over: the topic index is printed instead of an error about --format.
    assert.match(explain('--format', '--list'), /Matching topics/);
  });

  it('a "-"-leading value inside --format=… stays the value', () => {
    const output = explain(cliOption('--format', '--list'));
    assert.match(output, /Argument: format, Given: "--list"/);
    assert.doesNotMatch(output, /Matching topics/);
  });

  it('negative control: matching outer quotes in --format=… are stripped', () => {
    // "raw" with its quotes becomes the valid choice raw: no choice error.
    assert.doesNotMatch(explain('--peek', '--format="raw"'), /Invalid values/);
    assert.doesNotMatch(explain('--peek', "--format='raw'"), /Invalid values/);
  });

  it('a value wrapped in matching quotes keeps them through cliOption', () => {
    assert.match(explain('--peek', cliOption('--format', '"raw"')), /Argument: format, Given: "\\"raw\\""/);
    assert.match(explain('--peek', cliOption('--format', "'raw'")), /Argument: format, Given: "'raw'"/);
  });
});
