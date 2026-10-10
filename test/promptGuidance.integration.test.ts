import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const promptPath = path.join(process.cwd(), 'res', 'prompt', 'create_custom_ui.md');

describe('Custom UI prompt guidance', () => {
  const content = fs.readFileSync(promptPath, 'utf-8');

  it('separates supported React guidance from Vue template availability', () => {
    assert.ok(content.includes('Current UI Page guidance mandates React'));
    assert.ok(content.includes('template availability is a technical capability'));
    assert.ok(content.includes('use React for new UI Pages'));
    assert.ok(!content.includes('sole non-React option'));
  });

  it('requires query-string routing and rejects hash routing', () => {
    assert.ok(content.includes('URLSearchParams'));
    assert.ok(content.includes('NEVER use hash-based routing'));
  });
});
