/**
 * Verifies the focused MCP improvements added for the SDK v4.7.x upgrade:
 *  - read tools (get-api-spec, get-snippet, get-instruct, check_auth_status) declare an
 *    `outputSchema` and return `structuredContent` that validates against it (mirrors the
 *    MCP SDK's own `validateToolOutput` contract);
 *  - the transform command exposes the new `table`/`id` flags and no longer maps `preview`.
 *
 * Uses real resource files on disk (no fs mocks).
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { loggerFixture } from '../support/fixtures.js';

// Config is deliberately NOT mocked: the real getConfig() resolves resourcePaths
// from the module location, which under the native runner is the staged package
// root holding a copy of the real res/ tree. The ResourceLoader therefore reads
// the actual resource files this test is verifying. Only logging is silenced.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  CheckAuthStatusCommand,
} = await import('../../src/tools/resources/resourceTools.js');
const { TransformCommand } = await import('../../src/tools/commands/transformCommand.js');
const { CLICmdWriter } = await import('../../src/tools/processors/cliCmdWriter.js');
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

  it('get-api-spec (listing mode) returns schema-valid structuredContent', async () => {
    const cmd = new GetApiSpecCommand();
    const result = await cmd.execute({});
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(Array.isArray(result.structuredContent?.availableTypes), true);
    // data-policy is the new v4.7.0 type and must be discoverable
    assert.ok((result.structuredContent?.availableTypes as string[]).includes('data-policy'));
  });

  it('get-api-spec (spec mode) returns schema-valid structuredContent', async () => {
    const cmd = new GetApiSpecCommand();
    const result = await cmd.execute({ metadataType: 'data-policy' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(result.structuredContent?.metadataType, 'data-policy');
    assert.equal(result.structuredContent?.resourceType, 'spec');
  });

  it('get-snippet returns schema-valid structuredContent with snippetId', async () => {
    const cmd = new GetSnippetCommand();
    const result = await cmd.execute({ metadataType: 'data-policy' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.notEqual(result.structuredContent?.snippetId, undefined);
  });

  it('get-instruct returns schema-valid structuredContent', async () => {
    const cmd = new GetInstructCommand();
    const result = await cmd.execute({ metadataType: 'data-policy' });
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(result.structuredContent?.resourceType, 'instruct');
  });

  it('check_auth_status returns schema-valid structuredContent', async () => {
    const cmd = new CheckAuthStatusCommand();
    const result = await cmd.execute();
    assert.equal(result.success, true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    assert.equal(typeof result.structuredContent?.status, 'string');
  });
});

describe('Transform command — v4.7.0 flags', () => {
  const cmd = new TransformCommand(new CLICmdWriter());
  const argNames = cmd.arguments.map((a) => a.name);

  it('exposes the new table and id arguments', () => {
    assert.ok(argNames.includes('table'));
    assert.ok(argNames.includes('id'));
  });

  it('no longer exposes the removed preview argument', () => {
    assert.ok(!argNames.includes('preview'));
  });
});
