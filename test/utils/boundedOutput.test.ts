/**
 * Tests for the shared output bound: head + tail with an elision marker, used
 * by the runner while streaming and by the envelope commands after shaping.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BoundedBuffer, boundText } from '../../src/utils/boundedOutput.js';

describe('boundText', () => {
  it('returns text within budget unchanged', () => {
    assert.equal(boundText('short', 200), 'short');
    assert.equal(boundText('x'.repeat(200), 200), 'x'.repeat(200));
  });

  it('keeps a 60/40 head and tail with the count of dropped characters', () => {
    const bounded = boundText('A'.repeat(500) + 'B'.repeat(500), 200);
    assert.equal(bounded, `${'A'.repeat(120)}\n\n... [800 characters truncated] ...\n\n${'B'.repeat(80)}`);
  });
});

describe('BoundedBuffer', () => {
  it('reports truncation only once the budget is exceeded, across chunks', () => {
    const buffer = new BoundedBuffer(10);
    buffer.append('12345');
    buffer.append('67890');
    assert.equal(buffer.truncated, false);
    assert.equal(buffer.toString(), '1234567890');
    buffer.append('X');
    assert.equal(buffer.truncated, true);
    assert.equal(buffer.toString(), '123456\n\n... [1 characters truncated] ...\n\n890X');
  });
});
