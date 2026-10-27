/**
 * `select` over a JSON envelope larger than the normal output cap, through the
 * real process runner and CLIExecutor (adapted from a reviewer's probe). The
 * runner keeps 60,000 characters by default and cuts the middle out of anything
 * longer, so an envelope bounded that early cannot be parsed and `select`
 * returned the cut JSON as if it were the result. The envelope commands capture
 * stdout whole (`ENVELOPE_RUN_OPTIONS`) and bound the shaped result afterwards.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, loggerFixture } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');
const { ENVELOPE_RUN_OPTIONS, shapeEnvelopeResult } = await import('../../src/utils/jsonSelect.js');
const { DEFAULT_MAX_OUTPUT_CHARS } = await import('../../src/utils/boundedOutput.js');

const TEST_TIMEOUT_MS = 30_000;
const FIRST_SYS_ID = `"${'0'.repeat(32)}"`;

/** A child printing an `ok` envelope of `count` records (~150 characters each). */
function envelopeChild(count: number, ok = true): string[] {
  return ['-e', `const r=[];for(let i=0;i<${count};i++)r.push({sys_id:String(i).padStart(32,'0'),short_description:'x'.repeat(80)});` +
    `console.log(JSON.stringify(${ok ? '{ok:true,records:r}' : "{ok:false,output:r.map(x=>x.short_description),errors:['ReferenceError: foo is not defined']}"}));` +
    (ok ? '' : 'process.exitCode=1;')];
}

async function capture(childArgs: string[], options = ENVELOPE_RUN_OPTIONS) {
  return new CLIExecutor(new NodeProcessRunner()).process(process.execPath, childArgs, process.cwd(), undefined, TEST_TIMEOUT_MS, undefined, options);
}

describe('select over a large envelope', () => {
  it('selects from a 100-record envelope', { timeout: TEST_TIMEOUT_MS }, async () => {
    assert.equal(shapeEnvelopeResult(await capture(envelopeChild(100)), 'records[0].sys_id').output, FIRST_SYS_ID);
  });

  it('selects from an 800-record envelope (~120 KB) that the default cap would cut', { timeout: TEST_TIMEOUT_MS }, async () => {
    const result = await capture(envelopeChild(800));
    assert.ok(result.output.length > DEFAULT_MAX_OUTPUT_CHARS, 'the probe must exceed the default cap');
    assert.equal(shapeEnvelopeResult(result, 'records[0].sys_id').output, FIRST_SYS_ID);
    // The regression: captured with the default cap, the same envelope cannot be selected from.
    const cut = await capture(envelopeChild(800), {});
    assert.equal(cut.outputTruncated, true);
    assert.doesNotMatch(shapeEnvelopeResult(cut, 'records[0].sys_id').output, /^\{/);
  });

  it('bounds the unselected envelope to the normal size', { timeout: TEST_TIMEOUT_MS }, async () => {
    const shaped = shapeEnvelopeResult(await capture(envelopeChild(800)), undefined);
    assert.ok(shaped.output.length < DEFAULT_MAX_OUTPUT_CHARS + 100, String(shaped.output.length));
    assert.match(shaped.output, /characters truncated/);
  });

  it('recovers the errors of a large ran-and-threw envelope, bounded', { timeout: TEST_TIMEOUT_MS }, async () => {
    const result = await capture(envelopeChild(800, false));
    assert.equal(result.success, false);
    assert.equal(result.error?.message, 'ReferenceError: foo is not defined');
    assert.ok(shapeEnvelopeResult(result, 'output[0]').output.length < DEFAULT_MAX_OUTPUT_CHARS + 100);
  });

  it('says plainly that select was not applied to an envelope past the capture cap', { timeout: TEST_TIMEOUT_MS }, async () => {
    const huge = ['-e', "process.stdout.write(JSON.stringify({ok:true,records:[{sys_id:'a'}],pad:'x'.repeat(8_100_000)}))"];
    const shaped = shapeEnvelopeResult(await capture(huge), 'records[0].sys_id');
    assert.equal(shaped.success, true);
    assert.equal(shaped.output, 'Output exceeded 8,000,000 characters and was cut, so select "records[0].sys_id" was not applied. ' +
      'Narrow what the command returns (for a query: fields, limit).');
  });
});
