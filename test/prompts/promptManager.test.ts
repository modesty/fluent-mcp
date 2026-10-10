/**
 * P0.1: the `coding_in_fluent` prompt renders REAL resource-backed guidance —
 * per-type instruction summaries plus explicit tool/URI pointers — and the full,
 * enum-derived catalog of supported metadata types. It must contain zero generic
 * "Use the appropriate Fluent API methods" stubs, and the catalog must list all
 * 75 types (single source of truth: ServiceNowMetadataType in src/types.ts).
 *
 * Native runner: configuration is NOT mocked. The real getProjectRootPath() and
 * resourcePaths resolve to the staged copy of the shipped res/ tree
 * (.test-build/<stage>/res), so the instruction summaries load from the shipped
 * content, which the suite's assertions read. Only the logger is
 * replaced, to keep the run quiet.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { PromptManager } = await import('../../src/prompts/promptManager.js');
const { ServiceNowMetadataType } = await import('../../src/types.js');

type PromptHandler = (request: { params: { name: string; arguments?: Record<string, unknown> } }) => Promise<{
  messages: { content: { type: string; text: string } }[];
}>;

async function renderCodingInFluent(metadataList: string[] | string): Promise<string> {
  // v2 keys request handlers by method string rather than by Zod schema object.
  const handlers = new Map<string, PromptHandler>();
  const mockServer = {
    server: {
      setRequestHandler: (method: string, handler: PromptHandler) => handlers.set(method, handler),
    },
  };

  const manager = new PromptManager();
  await manager.initialize();
  manager.registerOn(mockServer as never);

  const handler = handlers.get('prompts/get');
  if (!handler) throw new Error('prompts/get handler not registered');

  const result = await handler({ params: { name: 'coding_in_fluent', arguments: { metadata_list: metadataList } } });
  return result.messages[0].content.text;
}

describe('coding_in_fluent prompt rendering (P0.1)', () => {
  it('injects real per-type instruction content and explicit tool/URI pointers', async () => {
    const text = await renderCodingInFluent(['business-rule', 'table']);

    // Real content pulled from the shipped instruction resources.
    assert.ok(text.includes('### business-rule'));
    assert.ok(text.includes('`when` field')); // first substantive rule in fluent_instruct_business-rule.md
    assert.ok(text.includes('### table'));

    // Explicit tool pointers.
    assert.ok(text.includes('get-api-spec'));
    assert.ok(text.includes('get-instruct'));
    assert.ok(text.includes('get-snippet'));

    // Explicit resource-URI pointers.
    assert.ok(text.includes('sn-spec://business-rule'));
    assert.ok(text.includes('sn-instruct://business-rule'));
    assert.ok(text.includes('sn-snippet://table/0001'));
  });

  it('emits zero generic boilerplate stubs', async () => {
    const text = await renderCodingInFluent(['business-rule', 'client-script', 'acl']);
    assert.ok(!text.includes('Use the appropriate Fluent API methods'));
    assert.ok(!text.includes('Reference the specific instructions for'));
  });

  it('appends the full enum-derived catalog of all 75 metadata types', async () => {
    const text = await renderCodingInFluent(['flow']);
    const total = Object.values(ServiceNowMetadataType).length;

    assert.equal(total, 75); // guards against the pre-v4.12.x count of 71 (+ assessment, risk-assessment, database-view, interceptor)
    assert.ok(text.includes(`All ${total} supported metadata types`));

    // Every supported type appears in the rendered catalog.
    for (const type of Object.values(ServiceNowMetadataType)) {
      assert.ok(text.includes(type));
    }
    // Including the v4.9.0 addition.
    assert.ok(text.includes('atf-ui-test-script'));
  });

  /**
   * MCP prompt arguments are string-valued on the wire, so the comma-separated
   * form documented in res/prompt/coding_in_fluent.md is the only form a
   * conforming client can send. It must be split, not treated as one type name.
   */
  it('splits the documented comma-separated metadata_list string', async () => {
    const text = await renderCodingInFluent('state-model,atf-list');

    assert.ok(text.includes('### state-model'));
    assert.ok(text.includes('### atf-list'));
    assert.ok(!text.includes('not a recognized Fluent metadata type'));
  });

  it('tolerates whitespace and casing around comma-separated entries', async () => {
    const text = await renderCodingInFluent(' Table , business-rule ,, ');

    assert.ok(text.includes('### table'));
    assert.ok(text.includes('### business-rule'));
    assert.ok(!text.includes('not a recognized Fluent metadata type'));
  });

  it('handles an unknown metadata type with an actionable correction, not a stub', async () => {
    const text = await renderCodingInFluent(['not-a-real-type']);
    assert.ok(text.includes('not a recognized Fluent metadata type'));
    assert.ok(!text.includes('Use the appropriate Fluent API methods'));
  });
});
