/**
 * Tests for recovering a `now-sdk` failure message. The SDK CLI reports failures
 * on stdout — `[now-sdk] ERROR:` logger lines, or a machine-mode
 * `{"ok":false,"error":{...}}` envelope — so reading stderr alone left every
 * instance-side failure as "Unknown error". The envelope messages below are the
 * real ones observed against an instance (cicd run_test 400, logs 404).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cliErrorMessage, stripAnsi } from '../../src/utils/cliError.js';

const RUN_TEST_400 = '{"ok":false,"error":{"message":"sn_cicd request to \'api/sn_cicd/tests/run_test\' failed (400): Start ATF test Failed with the given test ID"}}';

describe('cliErrorMessage', () => {
  it('returns the error.message of a machine-mode failure envelope on stdout', () => {
    assert.equal(
      cliErrorMessage(RUN_TEST_400, '', 1),
      "sn_cicd request to 'api/sn_cicd/tests/run_test' failed (400): Start ATF test Failed with the given test ID"
    );
  });

  it('keeps an envelope status that the message does not already carry', () => {
    assert.equal(
      cliErrorMessage('{"ok":false,"error":{"message":"Forbidden. Running scripts needs the admin role","status":403}}', '', 1),
      'Forbidden. Running scripts needs the admin role (status 403)'
    );
    assert.equal(cliErrorMessage('{"ok":false,"error":{"message":"failed (404): gone","status":404}}', '', 1), 'failed (404): gone');
  });

  // `exec` reports a script that ran but threw as its result envelope: `errors`, no `error`.
  it('joins the errors of an exec result envelope for a script that ran and threw', () => {
    const threw = '{"ok":false,"scope":"x_acme_app","output":["before"],"errors":["ReferenceError: foo is not defined","second"],"executionHistoryId":"h1"}';
    assert.equal(cliErrorMessage(threw, '', 1), 'ReferenceError: foo is not defined\nsecond');
    assert.equal(cliErrorMessage('{"ok":false,"output":[],"errors":[]}', '', 1), undefined);
    assert.equal(cliErrorMessage('{"ok":false,"error":{"message":"first"},"errors":["second"]}', '', 1), 'first');
  });

  // `--debug` / `LOG_LEVEL` put a CLI log line on stdout before the envelope.
  it('reads the envelope after a CLI debug line on stdout', () => {
    const debug = '[now-sdk] DEBUG: Debug logging enabled\n';
    assert.equal(cliErrorMessage(`${debug}${RUN_TEST_400}\n`, '', 1)?.startsWith('sn_cicd request'), true);
    assert.equal(cliErrorMessage(`${debug}{"ok":false,"output":[],"errors":["ReferenceError: foo is not defined"]}\n`, '', 1), 'ReferenceError: foo is not defined');
  });

  it('prefers the envelope over unrelated stderr noise', () => {
    assert.equal(cliErrorMessage(RUN_TEST_400, '(node:123) Warning: something deprecated', 1)?.startsWith('sn_cicd request'), true);
  });

  it('ignores a success envelope or non-JSON stdout as an envelope', () => {
    assert.equal(cliErrorMessage('{"ok":true,"result":{}}', '', 1), undefined);
    assert.equal(cliErrorMessage('{not json', '', 1), undefined);
  });

  it('falls back to the CLI logger ERROR lines on either stream, joined in order', () => {
    const stdout = [
      '[now-sdk] Starting installation with SDK 4.14.0...',
      "[now-sdk] ERROR: Stored credentials at /h/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.",
    ].join('\n');
    assert.equal(
      cliErrorMessage(stdout, '', 1),
      "Stored credentials at /h/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset."
    );
    assert.equal(cliErrorMessage('[now-sdk] ERROR: first', '[now-sdk] ERROR: second', 1), 'first second');
  });

  it('strips ANSI color codes before matching', () => {
    assert.equal(cliErrorMessage('\x1b[31m[now-sdk] ERROR: \x1b[0mBuild failed due to errors', '', 1), 'Build failed due to errors');
  });

  it('falls back to raw stderr, and to undefined when neither stream says anything', () => {
    assert.equal(cliErrorMessage('', '  spawn ENOENT  ', 1), 'spawn ENOENT');
    assert.equal(cliErrorMessage('', '', 1), undefined);
    // The CLI's --select over an error envelope prints only `null` (why the tools apply select
    // themselves): nothing recoverable, so no invented message.
    assert.equal(cliErrorMessage('null', '', 1), undefined);
  });

  it('always keeps the runner note on timeout (124) and cancellation (130)', () => {
    const note = 'Process timed out after 360000ms and was terminated (SIGKILL). Output above is partial.';
    assert.equal(cliErrorMessage('partial', note, 124), note);
    assert.equal(cliErrorMessage('[now-sdk] ERROR: stalled', note, 124), `stalled\n${note}`);
    assert.equal(cliErrorMessage('', 'Process was cancelled by the client and terminated (SIGKILL).', 130), 'Process was cancelled by the client and terminated (SIGKILL).');
  });
});

describe('stripAnsi', () => {
  it('removes CSI, OSC and charset sequences', () => {
    assert.equal(stripAnsi('\x1b[1;32mok\x1b[0m \x1b]0;title\x07done \x1b(B'), 'ok done ');
  });
});
