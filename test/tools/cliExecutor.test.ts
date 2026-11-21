/**
 * CLIExecutor must surface the SDK CLI's own failure message. The CLI writes
 * failures to stdout (machine-mode envelope or `[now-sdk] ERROR:` lines), so an
 * executor that read only stderr reported every instance failure as
 * "Unknown error" (observed live: cicd run_test 400, exec errors).
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';
import type { ProcessResult, ProcessRunner } from '../../src/utils/types.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');

const runner = (result: ProcessResult): ProcessRunner => ({ run: async () => result }) as unknown as ProcessRunner;

describe('CLIExecutor failure messages', () => {
  it('takes the error from a machine-mode envelope on stdout when stderr is empty', async () => {
    const stdout = '{"ok":false,"error":{"message":"sn_cicd request to \'api/sn_cicd/tests/run_test\' failed (400): Start ATF test Failed with the given test ID"}}';
    const result = await new CLIExecutor(runner({ stdout, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
    assert.equal(result.success, false);
    assert.equal(result.output, stdout);
    assert.equal(result.error?.message, "sn_cicd request to 'api/sn_cicd/tests/run_test' failed (400): Start ATF test Failed with the given test ID");
  });

  // Each message source (errors array, ERROR lines) is covered by cliError.test.ts.
  it('keeps stderr as the message when it is the only source, and sets none on success', async () => {
    const failed = await new CLIExecutor(runner({ stdout: '', stderr: 'boom', exitCode: 2 })).process('node', ['cli'], '/tmp/x');
    assert.equal(failed.error?.message, 'boom');
    const ok = await new CLIExecutor(runner({ stdout: '{"ok":true}', stderr: '', exitCode: 0 })).process('node', ['cli'], '/tmp/x');
    assert.equal(ok.success, true);
    assert.equal(ok.error, undefined);
    const okWithWarning = await new CLIExecutor(
      runner({ stdout: '{"ok":true}', stderr: 'DeprecationWarning: something', exitCode: 0 })
    ).process('node', ['cli'], '/tmp/x');
    assert.equal(okWithWarning.success, true);
    assert.equal(okWithWarning.error, undefined);
  });

  it('forwards per-call process options and reports a cut stdout', async () => {
    const run = mock.fn<ProcessRunner['run']>(async () => ({ stdout: '{"ok":true', stderr: '', exitCode: 0, stdoutTruncated: true }));
    const options = { maxStdoutChars: 1234 };
    const result = await new CLIExecutor({ run }).process('node', ['cli'], '/tmp/x', 5_000, undefined, options);
    assert.equal(run.mock.calls[0].arguments[5], options);
    assert.equal(result.outputTruncated, true);
    const whole = await new CLIExecutor(runner({ stdout: '{"ok":true}', stderr: '', exitCode: 0 })).process('node', ['cli'], '/tmp/x');
    assert.equal(whole.outputTruncated, undefined);
  });

  it('propagates terminatedBySignal and preserves its stderr note alongside stdout errors', async () => {
    const sigNote = 'Process was terminated by signal SIGTERM. Output above may be partial.';
    const result = await new CLIExecutor(
      runner({ stdout: '[now-sdk] ERROR: mid-flight', stderr: sigNote, exitCode: 143, terminatedBySignal: 'SIGTERM' })
    ).process('node', ['cli'], '/tmp/x');
    assert.equal(result.success, false);
    assert.equal(result.exitCode, 143);
    assert.equal(result.terminatedBySignal, 'SIGTERM');
    assert.equal(result.error?.message, `mid-flight\n${sigNote}`);
  });

  it('sanitizes destructive credential-store advice and attaches safe recovery on JSON-envelope failures', async () => {
    const mismatchStdout = JSON.stringify({
      ok: false,
      error: {
        message: "Stored credentials at /home/u/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.",
      },
    });
    const mismatch = await new CLIExecutor(runner({ stdout: mismatchStdout, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
    assert.equal(mismatch.success, false);
    const parsedMismatch = JSON.parse(mismatch.output) as { ok: boolean; error: { message: string } };
    assert.equal(parsedMismatch.error.message, 'Stored credentials at /home/u/.now-sdk/credentials.enc could not be read.');
    assert.ok(!mismatch.output.includes('--delete all'), mismatch.output);
    assert.match(mismatch.error?.message ?? '', /^Stored credentials at \/home\/u\/\.now-sdk\/credentials\.enc could not be read\./);
    assert.match(mismatch.error?.message ?? '', /read permission on the file and traversal permission on its parent directories[\s\S]*Only as a last resort/);
    assert.match(mismatch.error?.message ?? '', /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/);
    assert.ok(
      (mismatch.error?.message ?? '').indexOf('SN_SDK_KEY_SOURCE=env') <
      (mismatch.error?.message ?? '').indexOf('--delete all')
    );

    const wrongKeyStdout = JSON.stringify({
      ok: false,
      error: {
        message: "Could not decrypt the stored credentials at /home/u/.now-sdk/credentials.enc with SN_SDK_ENCRYPTION_KEY: the key doesn't match, or the file is corrupted. The stored credentials were not reset. Set SN_SDK_ENCRYPTION_KEY to the original key, or delete that file to start over.",
      },
    });
    const wrongKey = await new CLIExecutor(runner({ stdout: wrongKeyStdout, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
    assert.equal(wrongKey.success, false);
    const parsedWrongKey = JSON.parse(wrongKey.output) as { ok: boolean; error: { message: string } };
    assert.ok(!parsedWrongKey.error.message.includes('delete that file'), parsedWrongKey.error.message);
    assert.ok(!wrongKey.output.includes('--delete all'), wrongKey.output);
    assert.ok(!wrongKey.error?.message.includes('delete that file'), wrongKey.error?.message);
    assert.ok(!wrongKey.error?.message.includes('--delete all'), wrongKey.error?.message);
    assert.match(wrongKey.error?.message ?? '', /Set SN_SDK_ENCRYPTION_KEY to the original key/);
    assert.match(wrongKey.error?.message ?? '', /original store used the OS keyring[\s\S]*SN_SDK_KEY_SOURCE=keyring/);
    assert.match(wrongKey.error?.message ?? '', /Do not reset the stored credentials/);
  });

  it('preserves failed script output and errors that quote a credential diagnostic', async () => {
    const diagnostic = "Stored credentials at sample could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.";
    const stdout = '[now-sdk] DEBUG: debug enabled\n' + JSON.stringify({ ok: false, output: [diagnostic], errors: [diagnostic] });
    const result = await new CLIExecutor(runner({ stdout, stderr: '', exitCode: 1 })).process('node', ['cli', 'exec']);
    assert.equal(result.output, stdout);
    assert.equal(result.error?.message, diagnostic);
  });

  it('offers the original keyring for a missing env key', async () => {
    const failure = 'SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist at /some/credentials.enc.';
    const stdout = JSON.stringify({ ok: false, error: { message: failure } });
    const result = await new CLIExecutor(runner({ stdout, stderr: '', exitCode: 1 })).process('node', ['cli']);
    assert.match(result.error?.message ?? '', /original store used the OS keyring[\s\S]*SN_SDK_KEY_SOURCE=keyring/);
    assert.doesNotMatch(result.error?.message ?? '', /--delete all/);
  });

  it('sanitizes plain SDK credential-store errors on failure, while leaving exit-0 output untouched', async () => {
    const raw = "[now-sdk] ERROR: Stored credentials at /home/u/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.";
    const failed = await new CLIExecutor(runner({ stdout: raw, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
    assert.equal(failed.output, '[now-sdk] ERROR: Stored credentials at /home/u/.now-sdk/credentials.enc could not be read.');
    assert.match(failed.error?.message ?? '', /Verify SN_SDK_CREDENTIALS_DIR/);

    const ok = await new CLIExecutor(runner({ stdout: raw, stderr: '', exitCode: 0 })).process('node', ['cli'], '/tmp/x');
    assert.equal(ok.output, raw);
    assert.equal(ok.error, undefined);
  });

  it('normalizes SDK command and --debug Error prefixes before classifying and sanitizing credential-store failures', async () => {
    const storePath = '/home/u/.now-sdk/credentials.enc';
    const cases: Array<{ name: string; stdout: string; expectedErrPrefix: string }> = [
      {
        name: 'fluent_transform without debug',
        stdout: [
          '[now-sdk] Initiating the transform process with SDK 4.14.2...',
          `[now-sdk] ERROR: Transform failed. Stored credentials at ${storePath} could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.`,
          '[now-sdk] For more detailed debug output, try running the command again with the "-d" option',
        ].join('\n'),
        expectedErrPrefix: `Transform failed. Stored credentials at ${storePath} could not be read.`,
      },
      {
        name: 'download_fluent_app with debug: true',
        stdout: [
          '[now-sdk] DEBUG: Debug logging enabled',
          '[now-sdk] Downloading application metadata from instance...',
          `[now-sdk] ERROR: Error: Stored credentials at ${storePath} could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.`,
          '    at handleDecryptFailure (/sdk/auth/credential-store/index.js:67:15)',
        ].join('\n'),
        expectedErrPrefix: `Error: Stored credentials at ${storePath} could not be read.`,
      },
      {
        name: 'fluent_transform with debug: true',
        stdout: [
          '[now-sdk] DEBUG: Debug logging enabled',
          `[now-sdk] ERROR: Transform failed. Error: Stored credentials at ${storePath} could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.`,
          '    at handleDecryptFailure (/sdk/auth/credential-store/index.js:67:15)',
        ].join('\n'),
        expectedErrPrefix: `Transform failed. Error: Stored credentials at ${storePath} could not be read.`,
      },
      {
        name: 'cicd human-mode prefix with debug',
        stdout: [
          `[now-sdk] ERROR: cicd app install failed: Error: Stored credentials at ${storePath} could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.`,
          '    at handleDecryptFailure (/sdk/auth/credential-store/index.js:67:15)',
        ].join('\n'),
        expectedErrPrefix: `cicd app install failed: Error: Stored credentials at ${storePath} could not be read.`,
      },
    ];

    for (const c of cases) {
      const res = await new CLIExecutor(runner({ stdout: c.stdout, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
      assert.equal(res.success, false, c.name);
      assert.ok(!res.output.includes('--delete all'), `${c.name}: output still contains --delete all: ${res.output}`);
      const msg = res.error?.message ?? '';
      assert.ok(msg.startsWith(c.expectedErrPrefix), `${c.name}: unexpected error start: ${msg}`);
      assert.match(msg, /Verify SN_SDK_CREDENTIALS_DIR/, c.name);
      assert.match(msg, /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/, c.name);
      assert.ok(msg.includes(`(${storePath})`), `${c.name}: resolved file path missing from guidance: ${msg}`);
      assert.ok(msg.indexOf('SN_SDK_KEY_SOURCE=env') < msg.indexOf('--delete all'), c.name);
    }

    // UnsupportedFormatVersionError subclass under --debug
    const futureOut = [
      '[now-sdk] ERROR: Transform failed. UnsupportedFormatVersionError: Stored credentials were written in format version 2, but this version of now-sdk only supports up to version 1.',
      '    at readEncryptedFile (/sdk/auth/credential-store/file-store.js:102:15)',
    ].join('\n');
    const futureRes = await new CLIExecutor(runner({ stdout: futureOut, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
    assert.match(futureRes.error?.message ?? '', /Do not reset the stored credentials\. A newer now-sdk wrote them/);
  });
});
