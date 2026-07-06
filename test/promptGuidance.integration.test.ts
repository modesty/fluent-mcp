import fs from 'node:fs';
import path from 'node:path';

const promptPath = path.join(process.cwd(), 'res', 'prompt', 'create_custom_ui.md');

describe('Custom UI prompt guidance', () => {
  const content = fs.readFileSync(promptPath, 'utf-8');

  it('separates supported React guidance from Vue template availability', () => {
    expect(content).toContain('Current UI Page guidance mandates React');
    expect(content).toContain('template availability is a technical capability');
    expect(content).toContain('use React for new UI Pages');
    expect(content).not.toContain('sole non-React option');
  });

  it('requires query-string routing and rejects hash routing', () => {
    expect(content).toContain('URLSearchParams');
    expect(content).toContain('NEVER use hash-based routing');
  });
});
