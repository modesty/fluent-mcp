/**
 * P0.1: the `coding_in_fluent` prompt renders REAL resource-backed guidance —
 * per-type instruction summaries plus explicit tool/URI pointers — and the full,
 * enum-derived catalog of supported metadata types. It must contain zero generic
 * "Use the appropriate Fluent API methods" stubs, and the catalog must list all
 * 65 types (single source of truth: ServiceNowMetadataType in src/types.ts).
 *
 * Config is mocked to point resourcePaths at the real res/ directories so the
 * instruction summaries load from the shipped content.
 */
import { GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PromptManager } from '../../src/prompts/promptManager.js';
import { ServiceNowMetadataType } from '../../src/types.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => {
  const path = require('node:path');
  const root = process.cwd();
  return {
    getProjectRootPath: jest.fn(() => root),
    getConfig: jest.fn(() => ({
      resourcePaths: {
        spec: path.join(root, 'res', 'spec'),
        snippet: path.join(root, 'res', 'snippet'),
        instruct: path.join(root, 'res', 'instruct'),
      },
    })),
    findMissingResourcePaths: jest.fn(() => []),
  };
});

type PromptHandler = (request: { params: { name: string; arguments?: Record<string, unknown> } }) => Promise<{
  messages: { content: { type: string; text: string } }[];
}>;

async function renderCodingInFluent(metadataList: string[]): Promise<string> {
  const handlers = new Map<unknown, PromptHandler>();
  const mockServer = {
    server: {
      setRequestHandler: (schema: unknown, handler: PromptHandler) => handlers.set(schema, handler),
    },
  };

  const manager = new PromptManager(mockServer as never);
  await manager.initialize();
  manager.setupHandlers();

  const handler = handlers.get(GetPromptRequestSchema);
  if (!handler) throw new Error('GetPromptRequest handler not registered');

  const result = await handler({ params: { name: 'coding_in_fluent', arguments: { metadata_list: metadataList } } });
  return result.messages[0].content.text;
}

describe('coding_in_fluent prompt rendering (P0.1)', () => {
  it('injects real per-type instruction content and explicit tool/URI pointers', async () => {
    const text = await renderCodingInFluent(['business-rule', 'table']);

    // Real content pulled from the shipped instruction resources.
    expect(text).toContain('### business-rule');
    expect(text).toContain('`when` field'); // first substantive rule in fluent_instruct_business-rule.md
    expect(text).toContain('### table');

    // Explicit tool pointers.
    expect(text).toContain('get-api-spec');
    expect(text).toContain('get-instruct');
    expect(text).toContain('get-snippet');

    // Explicit resource-URI pointers.
    expect(text).toContain('sn-spec://business-rule');
    expect(text).toContain('sn-instruct://business-rule');
    expect(text).toContain('sn-snippet://table/0001');
  });

  it('emits zero generic boilerplate stubs', async () => {
    const text = await renderCodingInFluent(['business-rule', 'client-script', 'acl']);
    expect(text).not.toContain('Use the appropriate Fluent API methods');
    expect(text).not.toContain('Reference the specific instructions for');
  });

  it('appends the full enum-derived catalog of all 65 metadata types', async () => {
    const text = await renderCodingInFluent(['flow']);
    const total = Object.values(ServiceNowMetadataType).length;

    expect(total).toBe(65); // guards against the pre-v4.9.0 count of 64
    expect(text).toContain(`All ${total} supported metadata types`);

    // Every supported type appears in the rendered catalog.
    for (const type of Object.values(ServiceNowMetadataType)) {
      expect(text).toContain(type);
    }
    // Including the v4.9.0 addition.
    expect(text).toContain('atf-ui-test-script');
  });

  it('handles an unknown metadata type with an actionable correction, not a stub', async () => {
    const text = await renderCodingInFluent(['not-a-real-type']);
    expect(text).toContain('not a recognized Fluent metadata type');
    expect(text).not.toContain('Use the appropriate Fluent API methods');
  });
});
