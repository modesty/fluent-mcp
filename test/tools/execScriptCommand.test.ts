/**
 * Tests for the SDK v4.14.0 `now-sdk exec` wrapper (ExecScriptCommand,
 * `fluent_exec_script`). Verifies the risk annotations, argv construction (the
 * inline script as one positional argv entry, a project `file` run from a
 * private copy, always-JSON output, no rollback opt-out), the containment of
 * `file` inside the Fluent project (real temp directories, symlinks included),
 * the required scope/reason guardrails, the runner budget
 * past a caller-raised `--timeout`, the "may still be running" notice when the
 * runner stops the child, `select` applied by the tool to a successful run only
 * (a failure keeps its envelope and is flagged when the script ran), stdout
 * captured whole so a large envelope still parses, and the required-authentication
 * gate.
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor, CommandResult } from '../../src/utils/types.js';

const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => 'session-alias'),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

// With an explicit --scope the CLI reads nothing from the cwd, so the command
// runs in the project root (neutral cwd), never the session's working directory.
const config = configFixture();
config.getProjectRootPath.mock.mockImplementation(() => '/mock/project/root');

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', config.mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { ExecScriptCommand } = await import('../../src/tools/commands/execScriptCommand.js');
const { ENVELOPE_RUN_OPTIONS } = await import('../../src/utils/jsonSelect.js');
const { DEFAULT_MAX_OUTPUT_CHARS } = await import('../../src/utils/boundedOutput.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];
type MockProcessor = { process: ReturnType<typeof mock.fn<ProcessFn>> };

function createProcessor(result: CommandResult = { success: true, output: '{"ok":true}', exitCode: 0 }): MockProcessor {
  return { process: mock.fn<ProcessFn>(async () => result) };
}

const SCRIPT = "var gr = new GlideRecord('incident');\ngr.addQuery('active', true);\ngr.query();\ngs.info(gr.getRowCount());";
const BASE_ARGS = { script: SCRIPT, scope: 'x_acme_app', reason: 'Count active incidents (support case 42)' };

describe('ExecScriptCommand', () => {
  let mockProcessor: MockProcessor;

  beforeEach(() => {
    session.getAuthAlias.mock.mockImplementation(() => 'session-alias');
    mockProcessor = createProcessor();
  });

  it('exposes destructive, non-idempotent, open-world metadata with scope and reason required', () => {
    const command = new ExecScriptCommand(mockProcessor);
    assert.equal(command.name, 'fluent_exec_script');
    assert.deepStrictEqual(command.annotations, { destructiveHint: true, idempotentHint: false, openWorldHint: true });

    // script XOR file is enforced in validateArgs, so neither is schema-required.
    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    assert.deepStrictEqual(required, ['scope', 'reason']);

    const names = command.arguments.map((a) => a.name);
    for (const present of ['script', 'file', 'workingDirectory']) {
      assert.ok(names.includes(present), `${present} must be exposed`);
    }
    // Guardrails: no rollback opt-out, no output switch.
    for (const absent of ['recordForRollback', 'output']) {
      assert.equal(names.includes(absent), false, `${absent} must not be exposed`);
    }
  });

  it('carries the exec guide\'s approval and no-retry rules in its description', () => {
    const command = new ExecScriptCommand(mockProcessor);
    assert.match(command.description, /show the user the full script/);
    assert.match(command.description, /explicit approval for that run/);
    assert.match(command.description, /never retry automatically/);
    assert.match(command.description, /rollback only reverts record changes/);
    assert.match(command.description, /query_fluent_records/);
    assert.match(command.description, /show the file's full CONTENT, not just its path/);
  });

  it('passes the multi-line script as ONE positional argv entry, with JSON output, in the neutral cwd', async () => {
    const command = new ExecScriptCommand(mockProcessor);
    const result = await command.execute({ ...BASE_ARGS });

    assert.equal(result.success, true);
    assertCalledWith(
      mockProcessor.process,
      process.execPath,
      [
        SDK_BIN, 'exec', SCRIPT,
        '--scope', 'x_acme_app',
        '--reason', 'Count active incidents (support case 42)',
        '--auth', 'session-alias',
        '--output', 'json',
      ],
      '/mock/project/root',
      undefined,
      360_000,
      undefined,
      ENVELOPE_RUN_OPTIONS
    );
    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.equal(argv.includes('--file'), false);
    assert.equal(argv.includes('--no-record-for-rollback'), false);
  });

  it('accepts global and a 32-character sys_id as scope', async () => {
    const command = new ExecScriptCommand(mockProcessor);
    for (const scope of ['global', '0123456789abcdef0123456789abcdef']) {
      const result = await command.execute({ ...BASE_ARGS, scope });
      assert.equal(result.success, true, scope);
    }
  });

  it('maps timeoutMs, serverLogs, an explicit auth, and debug, but never forwards select', async () => {
    const command = new ExecScriptCommand(mockProcessor);
    await command.execute({
      ...BASE_ARGS,
      timeoutMs: 900_000,
      serverLogs: true,
      select: 'output[0]',
      auth: 'explicit-alias',
      debug: true,
    });

    assertCalledWith(
      mockProcessor.process,
      process.execPath,
      [
        SDK_BIN, 'exec', SCRIPT,
        '--scope', 'x_acme_app',
        '--reason', 'Count active incidents (support case 42)',
        '--timeout', '900000',
        '--server-logs',
        '--auth', 'explicit-alias',
        '--output', 'json',
        '--debug',
      ],
      '/mock/project/root',
      undefined,
      960_000, // the CLI's wait + 60 s headroom
      undefined,
      ENVELOPE_RUN_OPTIONS
    );
  });

  it('keeps the default runner budget when timeoutMs is below it', async () => {
    const command = new ExecScriptCommand(mockProcessor);
    await command.execute({ ...BASE_ARGS, timeoutMs: 5_000 });
    assert.equal(mockProcessor.process.mock.calls[0].arguments[4], 360_000);
  });

  it('reports a runner-stopped run as possibly still running on the instance', async () => {
    for (const exitCode of [124, 130]) {
      mockProcessor = createProcessor({ success: false, output: 'partial output', exitCode });
      const command = new ExecScriptCommand(mockProcessor);
      const result = await command.execute({ ...BASE_ARGS });
      assert.equal(result.exitCode, exitCode);
      assert.match(result.output, /^partial output/);
      assert.match(result.output, /may still be running on the instance/);
      assert.match(result.output, /Do not retry automatically/);
    }
  });

  it('passes a CLI failure envelope through unchanged', async () => {
    const output = '{"ok":false,"error":{"message":"Scope \\"x_nope\\" was not found"}}';
    mockProcessor = createProcessor({ success: false, output, exitCode: 1 });
    const command = new ExecScriptCommand(mockProcessor);
    const result = await command.execute({ ...BASE_ARGS });
    assert.equal(result.output, output);
  });

  // The CLI applies --select to failure envelopes too, so it is applied here instead.
  it('applies select to a successful run', async () => {
    mockProcessor = createProcessor({
      success: true, output: '{"ok":true,"scope":"x_acme_app","output":["42"],"errors":[],"executionHistoryId":"h1"}', exitCode: 0,
    });
    const result = await new ExecScriptCommand(mockProcessor).execute({ ...BASE_ARGS, select: 'output[0]' });
    assert.equal(result.output, '"42"');
  });

  it('returns the full envelope of a run that never started, even with select', async () => {
    const output = '{"ok":false,"error":{"message":"No application found with scope \'x_nope\' on the instance"}}';
    mockProcessor = createProcessor({ success: false, output, exitCode: 1 });
    const result = await new ExecScriptCommand(mockProcessor).execute({ ...BASE_ARGS, select: 'output[0]' });
    assert.equal(result.output, output);
  });

  it('flags a script that ran and threw as not safe to retry, even with select', async () => {
    const output = '{"ok":false,"scope":"x_acme_app","output":["before"],"errors":["ReferenceError: foo is not defined"],"executionHistoryId":"h1"}';
    mockProcessor = createProcessor({ success: false, output, exitCode: 1 });
    const result = await new ExecScriptCommand(mockProcessor).execute({ ...BASE_ARGS, select: 'output[0]' });
    assert.ok(result.output.startsWith(output), result.output);
    assert.match(result.output, /The script ran on the instance and reported errors/);
    assert.match(result.output, /Do not retry automatically: a retry runs the script again/);
  });

  it('flags a script that ran and threw when a CLI debug line precedes the envelope', async () => {
    const output = '[now-sdk] DEBUG: Debug logging enabled\n{"ok":false,"output":[],"errors":["ReferenceError: foo is not defined"]}\n';
    mockProcessor = createProcessor({ success: false, output, exitCode: 1 });
    const result = await new ExecScriptCommand(mockProcessor).execute({ ...BASE_ARGS, debug: true });
    assert.match(result.output, /The script ran on the instance and reported errors/);
  });

  // A chatty script that throws: the envelope is past the normal cap, so the notice
  // must be read from the whole capture and the returned envelope bounded after.
  it('flags a large ran-and-threw envelope and bounds it', async () => {
    const lines = Array.from({ length: 2_000 }, (_, i) => `line ${i} ${'x'.repeat(60)}`);
    const output = JSON.stringify({ ok: false, scope: 'x_acme_app', output: lines, errors: ['ReferenceError: foo is not defined'] });
    assert.ok(output.length > DEFAULT_MAX_OUTPUT_CHARS);
    mockProcessor = createProcessor({ success: false, output, exitCode: 1 });
    const result = await new ExecScriptCommand(mockProcessor).execute({ ...BASE_ARGS });
    assert.match(result.output, /characters truncated/);
    assert.match(result.output, /The script ran on the instance and reported errors/);
    assert.ok(result.output.length < DEFAULT_MAX_OUTPUT_CHARS + 1_000, String(result.output.length));
  });

  it('treats a failed run whose output was still cut as most likely run', async () => {
    mockProcessor = createProcessor({ success: false, output: '{"ok":false,"output":["a",\n\n... [9 characters truncated] ...\n\n]}', exitCode: 1, outputTruncated: true });
    const result = await new ExecScriptCommand(mockProcessor).execute({ ...BASE_ARGS, select: 'output[0]' });
    assert.match(result.output, /whether the script ran could not be confirmed/);
    assert.match(result.output, /Do not retry automatically/);
  });

  it('requires authentication', async () => {
    session.getAuthAlias.mock.mockImplementation(() => undefined);
    const command = new ExecScriptCommand(mockProcessor);
    const result = await command.execute({ ...BASE_ARGS });

    assert.equal(result.success, false);
    assert.match(result.output, /fluent_exec_script requires authentication/);
    assertNotCalled(mockProcessor.process);
  });

  describe('argument legality', () => {
    const rejects: Array<[string, Record<string, unknown>, RegExp]> = [
      ['neither script nor file', { scope: 'global', reason: 'r' }, /exactly one of 'script'/],
      ['both script and file', { ...BASE_ARGS, file: 'scripts/x.js' }, /exactly one of 'script'/],
      ['workingDirectory without file', { ...BASE_ARGS, workingDirectory: '/tmp/project' }, /only used with 'file'/],
      ['a non-.js file', { scope: 'global', reason: 'r', file: 'scripts/notes.txt' }, /must be a \.js file/],
      ['a file path with a control character', { scope: 'global', reason: 'r', file: 'a\nb.js' }, /control characters are not allowed/],
      ['a blank script', { ...BASE_ARGS, script: '  \n ' }, /non-empty server-side script/],
      ['a missing scope', { script: SCRIPT, reason: 'r' }, /Missing required argument 'scope'/],
      ['a missing reason', { script: SCRIPT, scope: 'global' }, /Missing required argument 'reason'/],
      ['a blank reason', { ...BASE_ARGS, reason: '   ' }, /'reason' must not be empty/],
      ['a multi-line reason', { ...BASE_ARGS, reason: 'line one\nline two' }, /control characters are not allowed/],
      ['an uppercase scope', { ...BASE_ARGS, scope: 'X_ACME' }, /Argument 'scope' must be "global"/],
      ['a scope with a path', { ...BASE_ARGS, scope: '../x' }, /Argument 'scope'/],
      ['a script with a NUL byte', { ...BASE_ARGS, script: 'gs.info(1);\u0000' }, /control characters other than newline/],
      ['a script starting with "-"', { ...BASE_ARGS, script: '-1;' }, /must not begin with "-"/],
      ['an over-long script', { ...BASE_ARGS, script: `// ${'x'.repeat(16_000)}` }, /the limit is 16000/],
      ['a zero timeoutMs', { ...BASE_ARGS, timeoutMs: 0 }, /'timeoutMs' must be a positive integer/],
      ['a fractional timeoutMs', { ...BASE_ARGS, timeoutMs: 1.5 }, /'timeoutMs' must be a positive integer/],
      ['a timeoutMs above the CLI maximum', { ...BASE_ARGS, timeoutMs: 2_147_483_648 }, /at most 2147483647/],
      ['a malformed select path', { ...BASE_ARGS, select: 'output[x]' }, /dot\/bracket path/],
    ];

    for (const [label, args, message] of rejects) {
      it(`rejects ${label} before spawning`, async () => {
        const command = new ExecScriptCommand(mockProcessor);
        const result = await command.execute(args);
        assert.equal(result.success, false);
        assert.match(result.output, message);
        assertNotCalled(mockProcessor.process);
      });
    }

    it('accepts ordinary script punctuation the base sanitizer would reject', async () => {
      const command = new ExecScriptCommand(mockProcessor);
      const script = "var a = [1, 2]; if (a.length > 1 && a[0] !== 2) { gs.info(`ok: ${a.join('|')}`); }\r\n\tgs.info('$done');";
      const result = await command.execute({ ...BASE_ARGS, script, reason: 'Probe (punctuation) & quotes "ok" | pipes; semicolons' });
      assert.equal(result.success, true);
      assert.equal(mockProcessor.process.mock.calls[0].arguments[1][2], script);
    });
  });

  describe('file (a .js script inside the Fluent project)', () => {
    let root: string;
    let project: string;
    const FILE_ARGS = { scope: 'x_acme_app', reason: 'Backfill priority (CHG0012345)' };
    const SCRIPT_BODY = "var gr = new GlideRecord('incident');\ngr.query();\ngs.info('rows: ' + gr.getRowCount());\n";

    beforeEach(() => {
      root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'exec-file-test-')));
      project = path.join(root, 'project');
      fs.mkdirSync(path.join(project, 'scripts'), { recursive: true });
      fs.writeFileSync(path.join(project, 'scripts', 'backfill.js'), SCRIPT_BODY);
      session.getWorkingDirectory.mock.mockImplementation(() => project);
    });

    afterEach(() => {
      fs.rmSync(root, { recursive: true, force: true });
      session.getWorkingDirectory.mock.mockImplementation(() => '/mock/working/dir');
    });

    it('runs a private copy via --file and echoes the path, sha256, and content that ran', async () => {
      let copied: { path: string; content: string; mode: number } | undefined;
      mockProcessor.process.mock.mockImplementation(async (_cmd, argv) => {
        const copyPath = argv[argv.indexOf('--file') + 1];
        copied = { path: copyPath, content: fs.readFileSync(copyPath, 'utf-8'), mode: fs.statSync(copyPath).mode & 0o777 };
        return { success: true, output: '{"ok":true,"output":["rows: 3"]}', exitCode: 0 };
      });

      const command = new ExecScriptCommand(mockProcessor);
      const result = await command.execute({ ...FILE_ARGS, file: 'scripts/backfill.js' });

      assert.equal(result.success, true);
      const argv = mockProcessor.process.mock.calls[0].arguments[1];
      assert.deepStrictEqual(argv.slice(0, 3), [SDK_BIN, 'exec', '--file']);
      assert.deepStrictEqual(argv.slice(4), ['--scope', 'x_acme_app', '--reason', 'Backfill priority (CHG0012345)', '--auth', 'session-alias', '--output', 'json']);
      // The CLI reads a private copy, never the project file itself.
      assert.ok(copied);
      assert.notEqual(copied.path, path.join(project, 'scripts', 'backfill.js'));
      assert.ok(!copied.path.startsWith(project));
      assert.equal(copied.content, SCRIPT_BODY);
      if (process.platform !== 'win32') assert.equal(copied.mode, 0o600);
      // The copy is removed after the run.
      assert.equal(fs.existsSync(copied.path), false);
      assert.equal(fs.existsSync(path.dirname(copied.path)), false);

      const sha256 = createHash('sha256').update(SCRIPT_BODY, 'utf-8').digest('hex');
      assert.match(result.output, /^\{"ok":true/);
      assert.ok(result.output.includes(`Script run from file ${path.join('scripts', 'backfill.js')} (sha256 ${sha256}, ${Buffer.byteLength(SCRIPT_BODY)} bytes):`));
      assert.ok(result.output.includes(`\`\`\`javascript\n${SCRIPT_BODY}\`\`\``));
    });

    it('accepts a project-root file whose name merely starts with ".."', async () => {
      fs.writeFileSync(path.join(project, '..backfill.js'), SCRIPT_BODY);
      const command = new ExecScriptCommand(mockProcessor);
      const result = await command.execute({ ...FILE_ARGS, file: '..backfill.js' });
      assert.equal(result.success, true, result.output);
      assert.ok(result.output.includes('Script run from file ..backfill.js'));
    });

    it('accepts an absolute path inside the project and an explicit workingDirectory', async () => {
      session.getWorkingDirectory.mock.mockImplementation(() => undefined);
      const command = new ExecScriptCommand(mockProcessor);
      const result = await command.execute({
        ...FILE_ARGS,
        workingDirectory: project,
        file: path.join(project, 'scripts', 'backfill.js'),
      });
      assert.equal(result.success, true);
      assert.ok(result.output.includes('Script run from file'));
    });

    it('still removes the private copy and reports the content when the runner stops the child', async () => {
      let copyPath = '';
      mockProcessor.process.mock.mockImplementation(async (_cmd, argv) => {
        copyPath = argv[argv.indexOf('--file') + 1];
        return { success: false, output: 'partial', exitCode: 124 };
      });
      const command = new ExecScriptCommand(mockProcessor);
      const result = await command.execute({ ...FILE_ARGS, file: 'scripts/backfill.js' });
      assert.match(result.output, /may still be running on the instance/);
      assert.ok(result.output.includes('Script run from file'));
      assert.equal(fs.existsSync(copyPath), false);
    });

    const rejectsFile = (label: string, setup: () => Record<string, unknown>, message: RegExp) => {
      it(`rejects ${label} before spawning`, async () => {
        const command = new ExecScriptCommand(mockProcessor);
        const result = await command.execute({ ...FILE_ARGS, ...setup() });
        assert.equal(result.success, false);
        assert.match(result.output, message);
        assertNotCalled(mockProcessor.process);
      });
    };

    rejectsFile('a file that escapes the project with ..', () => {
      fs.writeFileSync(path.join(root, 'outside.js'), 'gs.info(1);');
      return { file: '../outside.js' };
    }, /must be inside the Fluent project/);

    rejectsFile('an absolute path outside the project', () => {
      fs.writeFileSync(path.join(root, 'outside.js'), 'gs.info(1);');
      return { file: path.join(root, 'outside.js') };
    }, /must be inside the Fluent project/);

    rejectsFile('a symlink inside the project that points outside it', () => {
      fs.writeFileSync(path.join(root, 'secret.js'), 'gs.info("secret");');
      fs.symlinkSync(path.join(root, 'secret.js'), path.join(project, 'scripts', 'link.js'));
      return { file: 'scripts/link.js' };
    }, /must be inside the Fluent project/);

    rejectsFile('a missing file', () => ({ file: 'scripts/missing.js' }), /Script file not found/);

    it('rejects a file outside the project before any auth lookup', async () => {
      session.getAuthAlias.mock.mockImplementation(() => undefined);
      fs.writeFileSync(path.join(root, 'outside.js'), 'gs.info(1);');
      const command = new ExecScriptCommand(mockProcessor);
      const result = await command.execute({ ...FILE_ARGS, file: '../outside.js' });
      assert.match(result.output, /must be inside the Fluent project/);
      assert.doesNotMatch(result.output, /requires authentication/);
      assertNotCalled(mockProcessor.process);
    });

    rejectsFile('a directory named like a script', () => {
      fs.mkdirSync(path.join(project, 'scripts', 'dir.js'));
      return { file: 'scripts/dir.js' };
    }, /not a regular file/);

    rejectsFile('a file over 64 KB', () => {
      fs.writeFileSync(path.join(project, 'scripts', 'big.js'), `// ${'x'.repeat(64 * 1024)}`);
      return { file: 'scripts/big.js' };
    }, /the limit is 65536/);

    rejectsFile('an empty file', () => {
      fs.writeFileSync(path.join(project, 'scripts', 'empty.js'), ' \n');
      return { file: 'scripts/empty.js' };
    }, /Script file is empty/);

    rejectsFile('a file with a NUL byte', () => {
      fs.writeFileSync(path.join(project, 'scripts', 'nul.js'), 'gs.info(1);\u0000');
      return { file: 'scripts/nul.js' };
    }, /control characters other than newline/);

    rejectsFile('a file with no resolvable project directory', () => {
      session.getWorkingDirectory.mock.mockImplementation(() => undefined);
      return { file: 'scripts/backfill.js' };
    }, /needs a Fluent project directory/);
  });
});
