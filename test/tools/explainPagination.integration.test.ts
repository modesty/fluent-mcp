/**
 * Integration test for `explain_fluent_api` `--range` pagination against the real
 * bundled `@servicenow/sdk` CLI. Verifies that adjacent pages (`1-3`, `4-6`) of
 * a non-exact fuzzy search match a wider page (`1-6`) with no gaps or duplicates.
 *
 * (`list=true` + `range` is intentionally disallowed in ExplainCommand because
 * SDK v4.14.2 limits fuzzy search hits before removing strong matches in list mode.)
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { ExplainCommand } = await import('../../src/tools/commands/explainCommand.js');
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');
const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');

/** Extract ranked topic entries (`1. topic-name: ...`) from `explain --format=raw` output. */
function rankedTopics(output: string): Array<{ rank: number; name: string }> {
  const entries: Array<{ rank: number; name: string }> = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^(\d+)\.\s+([^\s:]+):/.exec(line);
    if (match) entries.push({ rank: Number(match[1]), name: match[2] });
  }
  return entries;
}

describe('ExplainCommand — real CLI range pagination', () => {
  it('returns gap-free adjacent pages matching a wider page for non-exact fuzzy search', { timeout: 30_000 }, async () => {
    const command = new ExplainCommand(new CLIExecutor(new NodeProcessRunner()));
    const query = { topic: 'incident workflow trigger', format: 'raw' };

    const [wide, page1, page2] = await Promise.all([
      command.execute({ ...query, range: '1-6' }),
      command.execute({ ...query, range: '1-3' }),
      command.execute({ ...query, range: '4-6' }),
    ]);

    assert.equal(wide.success, true, wide.output);
    assert.equal(page1.success, true, page1.output);
    assert.equal(page2.success, true, page2.output);

    const wideEntries = rankedTopics(wide.output);
    const page1Entries = rankedTopics(page1.output);
    const page2Entries = rankedTopics(page2.output);

    assert.equal(wideEntries.length, 6, wide.output);
    assert.equal(page1Entries.length, 3, page1.output);
    assert.equal(page2Entries.length, 3, page2.output);
    assert.deepStrictEqual([...page1Entries, ...page2Entries], wideEntries);
  });
});
