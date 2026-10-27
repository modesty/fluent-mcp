/**
 * Tests for reading the CLI's machine-mode envelope. `--debug` and an inherited
 * `LOG_LEVEL` make the CLI log a line to stdout before the envelope, so a parse of
 * the whole stdout alone failed and select, the error message and the exec notice
 * were all lost. The log lines below are the CLI's own (`sdk-cli/dist/index.js`,
 * `logger/index.js`).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliEnvelope } from '../../src/utils/cliEnvelope.js';

const DEBUG_LINE = '[now-sdk] DEBUG: Debug logging enabled';
const LOG_LEVEL_LINE = '[now-sdk] Setting log level to info from process.env.LOG_LEVEL';

describe('parseCliEnvelope', () => {
  it('parses stdout that is the envelope alone', () => {
    assert.deepEqual(parseCliEnvelope('{"ok":true,"records":[]}\n'), { ok: true, records: [] });
  });

  it('parses the envelope on the last line after CLI log lines', () => {
    assert.deepEqual(parseCliEnvelope(`${DEBUG_LINE}\n{"ok":false,"error":{"message":"boom"}}\n`), {
      ok: false,
      error: { message: 'boom' },
    });
    assert.deepEqual(parseCliEnvelope(`${LOG_LEVEL_LINE}\r\n${DEBUG_LINE}\r\n{"ok":true}\r\n`), { ok: true });
  });

  it('parses a multi-line (pretty) envelope only when it is the whole stdout', () => {
    assert.deepEqual(parseCliEnvelope('{\n  "ok": true\n}'), { ok: true });
    assert.equal(parseCliEnvelope(`${DEBUG_LINE}\n{\n  "ok": true\n}`), undefined);
  });

  it('yields undefined when there is no JSON object to read', () => {
    for (const stdout of ['', DEBUG_LINE, 'partial output', '{not json', 'null', '[1,2]', `${DEBUG_LINE}\n[1]`, '{"ok":true}\ntrailing']) {
      assert.equal(parseCliEnvelope(stdout), undefined, stdout);
    }
  });
});
