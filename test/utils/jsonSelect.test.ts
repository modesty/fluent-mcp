/**
 * Tests for the tool-side `select`. The CLI applies `--select` to failure
 * envelopes too (`@servicenow/sdk-cli` `util/json-select.js`), printing only the
 * selected value — usually `null` — so a failure's reason was lost. The tools
 * apply the path themselves, to a successful (`ok: true`) envelope only; the path
 * resolution and formatting mirror the CLI's. An envelope the runner cut is
 * reported as such, and the shaped result is bounded to the normal size.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applySelect, formatSelectedValue, resolveJsonPath, shapeEnvelopeResult } from '../../src/utils/jsonSelect.js';
import { DEFAULT_MAX_OUTPUT_CHARS } from '../../src/utils/boundedOutput.js';

const ENVELOPE = { ok: true, records: [{ sys_id: 'abc', caller: { display_value: 'Abel' } }], hasMore: false };

describe('resolveJsonPath', () => {
  it('resolves dot and bracket paths as the CLI does', () => {
    assert.equal(resolveJsonPath(ENVELOPE, 'records[0].sys_id'), 'abc');
    assert.equal(resolveJsonPath(ENVELOPE, 'records[0].caller.display_value'), 'Abel');
    assert.equal(resolveJsonPath(ENVELOPE, 'hasMore'), false);
    assert.deepEqual(resolveJsonPath(ENVELOPE, 'records[0]'), ENVELOPE.records[0]);
  });

  it('yields undefined for a missing key, an out-of-range index, or a subscript on a non-array', () => {
    assert.equal(resolveJsonPath(ENVELOPE, 'records[3].sys_id'), undefined);
    assert.equal(resolveJsonPath(ENVELOPE, 'nope.deeper'), undefined);
    assert.equal(resolveJsonPath(ENVELOPE, 'hasMore[0]'), undefined);
    assert.equal(resolveJsonPath(ENVELOPE, 'records[0].sys_id.length'), undefined);
  });
});

describe('formatSelectedValue', () => {
  it('prints compact JSON, with undefined as null', () => {
    assert.equal(formatSelectedValue('abc', false), '"abc"');
    assert.equal(formatSelectedValue({ a: 1 }, false), '{"a":1}');
    assert.equal(formatSelectedValue(undefined, false), 'null');
  });

  it('with raw, prints strings unquoted and undefined as empty', () => {
    assert.equal(formatSelectedValue('abc', true), 'abc');
    assert.equal(formatSelectedValue(42, true), '42');
    assert.equal(formatSelectedValue(undefined, true), '');
  });
});

describe('applySelect', () => {
  const success = { success: true, output: `${JSON.stringify(ENVELOPE)}\n`, exitCode: 0 };

  it('replaces a successful envelope with the selected value', () => {
    assert.equal(applySelect(success, 'records[0].sys_id').output, '"abc"');
    assert.equal(applySelect(success, 'records[0].sys_id', true).output, 'abc');
    assert.equal(applySelect(success, 'records[9]').output, 'null');
  });

  // `--debug` / `LOG_LEVEL` put a CLI log line on stdout before the envelope.
  it('selects from an envelope that follows a CLI debug line', () => {
    const debug = { ...success, output: `[now-sdk] DEBUG: Debug logging enabled\n${success.output}` };
    assert.equal(applySelect(debug, 'records[0].sys_id').output, '"abc"');
  });

  it('returns the result unchanged without a path', () => {
    assert.equal(applySelect(success, undefined), success);
    assert.equal(applySelect(success, ''), success);
  });

  it('keeps a failure envelope whole, so its error stays visible', () => {
    const failure = { success: false, output: '{"ok":false,"error":{"message":"No logs found"}}', exitCode: 1 };
    assert.equal(applySelect(failure, 'result'), failure);
    // An exec script that ran and threw: the errors array must not be selected away.
    const threw = { success: false, output: '{"ok":false,"output":[],"errors":["boom"]}', exitCode: 1 };
    assert.equal(applySelect(threw, 'output[0]'), threw);
  });

  it('leaves output that is not an ok:true envelope unchanged', () => {
    for (const output of ['partial output', '{"ok":false}', 'null', '[1,2]']) {
      const result = { success: true, output, exitCode: 0 };
      assert.equal(applySelect(result, 'ok'), result, output);
    }
  });

  it('reports an envelope the runner cut instead of returning broken JSON', () => {
    const cut = { success: true, output: '{"ok":true,"records":[\n\n... [9 characters truncated] ...\n\n]}', exitCode: 0, outputTruncated: true };
    const result = applySelect(cut, 'records[0].sys_id');
    assert.equal(result.success, true);
    assert.match(result.output, /^Output exceeded 8,000,000 characters and was cut, so select "records\[0\]\.sys_id" was not applied/);
    // Without a path, or on a failure, the cut output is left for the bound step.
    assert.equal(applySelect(cut, undefined), cut);
    const failed = { ...cut, success: false, exitCode: 1 };
    assert.equal(applySelect(failed, 'ok'), failed);
  });
});

describe('shapeEnvelopeResult', () => {
  it('applies select, and returns a result within budget unchanged', () => {
    const success = { success: true, output: JSON.stringify(ENVELOPE), exitCode: 0 };
    assert.equal(shapeEnvelopeResult(success, 'records[0].sys_id', true).output, 'abc');
    assert.equal(shapeEnvelopeResult(success, undefined), success);
  });

  it('bounds the output and the error message to the normal size after selecting', () => {
    const big = 'x'.repeat(DEFAULT_MAX_OUTPUT_CHARS * 2);
    const ok = shapeEnvelopeResult({ success: true, output: JSON.stringify({ ok: true, big }), exitCode: 0 }, 'big');
    assert.ok(ok.output.length < DEFAULT_MAX_OUTPUT_CHARS + 100, String(ok.output.length));
    assert.match(ok.output, /^"x+\n\n\.\.\. \[\d+ characters truncated\] \.\.\.\n\nx+"$/);

    const failed = shapeEnvelopeResult({ success: false, output: big, exitCode: 1, error: new Error(big) }, 'big');
    assert.ok(failed.output.length < DEFAULT_MAX_OUTPUT_CHARS + 100);
    assert.ok((failed.error?.message.length ?? 0) < DEFAULT_MAX_OUTPUT_CHARS + 100);
  });
});
