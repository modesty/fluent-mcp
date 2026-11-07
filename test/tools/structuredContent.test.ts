/**
 * The read tools (get_fluent_knowledge, check_auth_status) declare an
 * `outputSchema` and return `structuredContent` that validates against it
 * (mirrors the MCP SDK's own `validateToolOutput` contract).
 *
 * Uses real resource files on disk (no fs mocks).
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { loggerFixture } from '../support/fixtures.js';

// Config is deliberately NOT mocked: the real getConfig() resolves resourcePaths
// from the module location, which under the native runner is the staged package
// root holding a copy of the real res/ tree. The ResourceCatalog therefore reads
// the actual resource files this test is verifying. Only logging is silenced.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { GetFluentKnowledgeCommand, CheckAuthStatusCommand } = await import('../../src/tools/resources/resourceTools.js');
const { ResourceCatalog } = await import('../../src/res/resourceCatalog.js');
const { SessionManager } = await import('../../src/utils/sessionManager.js');

/** Validate structured content the same way the MCP SDK does for a tool with an output schema. */
function expectValidStructuredContent(
  outputSchema: z.ZodRawShape,
  structuredContent: unknown
): void {
  assert.notEqual(structuredContent, undefined);
  const parsed = z.object(outputSchema).safeParse(structuredContent);
  if (!parsed.success) {
    throw new Error(`structuredContent failed output schema: ${JSON.stringify(parsed.error.issues)}`);
  }
}

describe('Read tools — outputSchema + structuredContent', () => {
  // SessionManager is a process-wide singleton and check_auth_status reads it, so
  // start and end every test from an empty session.
  beforeEach(() => SessionManager.getInstance().clearSession());
  afterEach(() => SessionManager.getInstance().clearSession());

  it('get_fluent_knowledge (listing mode) returns schema-valid structuredContent', async () => {
    const cmd = new GetFluentKnowledgeCommand();
    const result = await cmd.execute({ kind: 'spec' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(Array.isArray(result.structuredContent?.availableTypes), true);
    // data-policy is the new v4.7.0 type and must be discoverable
    assert.ok((result.structuredContent?.availableTypes as string[]).includes('data-policy'));
  });

  it("get_fluent_knowledge kind 'spec' returns schema-valid structuredContent", async () => {
    const cmd = new GetFluentKnowledgeCommand();
    const result = await cmd.execute({ kind: 'spec', metadataType: 'data-policy' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(result.structuredContent?.metadataType, 'data-policy');
    assert.equal(result.structuredContent?.resourceType, 'spec');
  });

  it("get_fluent_knowledge kind 'snippet' returns schema-valid structuredContent with snippetId", async () => {
    const cmd = new GetFluentKnowledgeCommand();
    const result = await cmd.execute({ kind: 'snippet', metadataType: 'data-policy' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.notEqual(result.structuredContent?.snippetId, undefined);
  });

  it("get_fluent_knowledge kind 'instruct' returns schema-valid structuredContent", async () => {
    const cmd = new GetFluentKnowledgeCommand();
    const result = await cmd.execute({ kind: 'instruct', metadataType: 'data-policy' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(result.structuredContent?.resourceType, 'instruct');
  });

  it('advertises exactly the shipped metadata types as the metadataType enum', async () => {
    const domain = new GetFluentKnowledgeCommand().arguments.find((arg) => arg.name === 'metadataType')?.domain;
    assert.equal(domain?.kind, 'choices');
    const onDisk = await new ResourceCatalog().getAvailableMetadataTypes();
    // Same set; the enum is sorted by type name, the catalog by file name.
    assert.deepEqual(domain.kind === 'choices' ? [...domain.values].sort() : [], [...onDisk].sort());
    assert.equal(onDisk.length, 76);
  });

  it('lists, per kind, only the types that have that kind', async () => {
    const cmd = new GetFluentKnowledgeCommand();
    const catalog = new ResourceCatalog();
    const all = await catalog.getAvailableMetadataTypes();
    for (const kind of ['spec', 'instruct']) {
      const result = await cmd.execute({ kind });
      assert.deepEqual(result.structuredContent?.availableTypes, all, kind);
    }
    const snippetTypes = (await cmd.execute({ kind: 'snippet' })).structuredContent?.availableTypes as string[];
    const withSnippets = [];
    for (const type of all) if ((await catalog.listSnippets(type)).length > 0) withSnippets.push(type);
    assert.deepEqual(snippetTypes, withSnippets);
    // atf-form-sp has a spec but no snippet.
    assert.ok(all.includes('atf-form-sp') && !snippetTypes.includes('atf-form-sp'));
  });

  it('check_auth_status returns schema-valid structuredContent', async () => {
    const cmd = new CheckAuthStatusCommand();
    const result = await cmd.execute();
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(typeof result.structuredContent?.status, 'string');
  });
});
