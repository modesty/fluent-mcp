/**
 * Verifies the focused MCP improvements added for the SDK v4.7.x upgrade:
 *  - read tools (get-api-spec, get-snippet, get-instruct, check_auth_status) declare an
 *    `outputSchema` and return `structuredContent` that validates against it (mirrors the
 *    MCP SDK's own `validateToolOutput` contract);
 *  - the transform command exposes the new `table`/`id` flags and no longer maps `preview`.
 *
 * Uses real resource files on disk (no fs mocks).
 */
import path from 'node:path';
import { z } from 'zod';
import { getConfig } from '../../src/config.js';
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  CheckAuthStatusCommand,
} from '../../src/tools/resources/resourceTools.js';
import { TransformCommand } from '../../src/tools/commands/transformCommand.js';
import { CLICmdWriter } from '../../src/tools/processors/cliCmdWriter.js';

// test/setup.js globally mocks src/config.js with placeholder /test/res paths.
// Point getConfig at the real res/ directories so the ResourceLoader reads the
// actual resource files this test is verifying.
const RES = path.join(process.cwd(), 'res');
beforeAll(() => {
  (getConfig as jest.Mock).mockReturnValue({
    name: 'test',
    version: '0.0.0',
    description: 'Test',
    logLevel: 'info',
    resourcePaths: {
      spec: path.join(RES, 'spec'),
      snippet: path.join(RES, 'snippet'),
      instruct: path.join(RES, 'instruct'),
    },
    servicenowSdk: { cliPath: 'snc', commandTimeoutMs: 30000 },
  });
});

/** Validate structured content the same way the MCP SDK does for a tool with an output schema. */
function expectValidStructuredContent(
  outputSchema: z.ZodRawShape,
  structuredContent: unknown
): void {
  expect(structuredContent).toBeDefined();
  const parsed = z.object(outputSchema).safeParse(structuredContent);
  if (!parsed.success) {
    throw new Error(`structuredContent failed output schema: ${JSON.stringify(parsed.error.issues)}`);
  }
}

describe('Read tools — outputSchema + structuredContent', () => {
  it('get-api-spec (listing mode) returns schema-valid structuredContent', async () => {
    const cmd = new GetApiSpecCommand();
    const result = await cmd.execute({});
    expect(result.success).toBe(true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    expect(Array.isArray(result.structuredContent?.availableTypes)).toBe(true);
    // data-policy is the new v4.7.0 type and must be discoverable
    expect(result.structuredContent?.availableTypes).toContain('data-policy');
  });

  it('get-api-spec (spec mode) returns schema-valid structuredContent', async () => {
    const cmd = new GetApiSpecCommand();
    const result = await cmd.execute({ metadataType: 'data-policy' });
    expect(result.success).toBe(true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    expect(result.structuredContent?.metadataType).toBe('data-policy');
    expect(result.structuredContent?.resourceType).toBe('spec');
  });

  it('get-snippet returns schema-valid structuredContent with snippetId', async () => {
    const cmd = new GetSnippetCommand();
    const result = await cmd.execute({ metadataType: 'data-policy' });
    expect(result.success).toBe(true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    expect(result.structuredContent?.snippetId).toBeDefined();
  });

  it('get-instruct returns schema-valid structuredContent', async () => {
    const cmd = new GetInstructCommand();
    const result = await cmd.execute({ metadataType: 'data-policy' });
    expect(result.success).toBe(true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    expect(result.structuredContent?.resourceType).toBe('instruct');
  });

  it('check_auth_status returns schema-valid structuredContent', async () => {
    const cmd = new CheckAuthStatusCommand();
    const result = await cmd.execute();
    expect(result.success).toBe(true);
    expectValidStructuredContent(cmd.outputSchema, result.structuredContent);
    expect(typeof result.structuredContent?.status).toBe('string');
  });
});

describe('Transform command — v4.7.0 flags', () => {
  const cmd = new TransformCommand(new CLICmdWriter());
  const argNames = cmd.arguments.map((a) => a.name);

  it('exposes the new table and id arguments', () => {
    expect(argNames).toContain('table');
    expect(argNames).toContain('id');
  });

  it('no longer exposes the removed preview argument', () => {
    expect(argNames).not.toContain('preview');
  });
});
