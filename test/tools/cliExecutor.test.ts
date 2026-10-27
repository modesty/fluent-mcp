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

  it('takes the error from the errors array of an exec script that ran and threw', async () => {
    const stdout = '{"ok":false,"scope":"x_acme_app","output":[],"errors":["ReferenceError: foo is not defined"]}';
    const result = await new CLIExecutor(runner({ stdout, stderr: '', exitCode: 1 })).process('node', ['cli'], '/tmp/x');
    assert.equal(result.error?.message, 'ReferenceError: foo is not defined');
  });

  it('takes the error from the CLI logger ERROR line on stdout', async () => {
    const result = await new CLIExecutor(runner({ stdout: '[now-sdk] ERROR: Build failed due to errors', stderr: '', exitCode: 1 }))
      .process('node', ['cli'], '/tmp/x');
    assert.equal(result.error?.message, 'Build failed due to errors');
  });

  it('keeps stderr as the message when it is the only source, and sets none on success', async () => {
    const failed = await new CLIExecutor(runner({ stdout: '', stderr: 'boom', exitCode: 2 })).process('node', ['cli'], '/tmp/x');
    assert.equal(failed.error?.message, 'boom');
    const ok = await new CLIExecutor(runner({ stdout: '{"ok":true}', stderr: '', exitCode: 0 })).process('node', ['cli'], '/tmp/x');
    assert.equal(ok.success, true);
    assert.equal(ok.error, undefined);
  });

  it('forwards per-call process options and reports a cut stdout', async () => {
    const run = mock.fn<ProcessRunner['run']>(async () => ({ stdout: '{"ok":true', stderr: '', exitCode: 0, stdoutTruncated: true }));
    const options = { maxStdoutChars: 1234 };
    const result = await new CLIExecutor({ run }).process('node', ['cli'], '/tmp/x', undefined, 5_000, undefined, options);
    assert.equal(run.mock.calls[0].arguments[6], options);
    assert.equal(result.outputTruncated, true);
    const whole = await new CLIExecutor(runner({ stdout: '{"ok":true}', stderr: '', exitCode: 0 })).process('node', ['cli'], '/tmp/x');
    assert.equal(whole.outputTruncated, undefined);
  });
});
