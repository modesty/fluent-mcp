/**
 * Unit tests for get_fluent_knowledge, the one tool over the resource catalog,
 * and for check_auth_status's cached-result branch
 *
 * Native runner: the filesystem is stubbed on the shared node:fs object, so the
 * real ResourceCatalog reads canned directory listings and file contents. The
 * stubs are installed with the running test's mock tracker and restored when
 * the test ends. Configuration uses configFixture() with its default resource
 * paths (/test/res/spec, /test/res/snippet, /test/res/instruct) - because the stubs key on those path
 * segments, which a staged checkout path could otherwise collide with.
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { z } from 'zod';
import { configFixture, loggerFixture } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { GetFluentKnowledgeCommand, CheckAuthStatusCommand } = await import('../../src/tools/resources/resourceTools.js');
const { SessionManager } = await import('../../src/utils/sessionManager.js');

describe('Resource Tool Commands', () => {
  // Test metadata type to use throughout tests
  const TEST_METADATA_TYPE = 'business-rule';
  const TEST_SNIPPET_ID = '0001';

  const mockTypes = ['business-rule', 'script-include', 'client-script', 'ui-action'];
  const mockSpecContent = 'Business Rule spec\nBusinessRule(';
  const mockSnippetContent = 'Business Rule API example\nBusinessRule(';
  const mockInstructContent = 'Instructions for Fluent Business Rule API';

  // Set up file operation stubs before each test. A beforeEach hook runs with the
  // current test's context, so the stubs are restored when the test ends.
  beforeEach((hook) => {
    const t = hook as TestContext;

    t.mock.method(fs.promises, 'readdir', async (path: string) => {
      if (path.includes('instruct')) {
        return [
          'fluent_instruct_business-rule.md',
          'fluent_instruct_script-include.md',
          'fluent_instruct_client-script.md',
          'fluent_instruct_ui-action.md',
        ];
      } else if (path.includes('snippet')) {
        return [
          'fluent_snippet_business-rule_0001.md',
          'fluent_snippet_business-rule_0002.md',
          'fluent_snippet_business-rule_0003.md',
        ];
      } else if (path.includes('spec')) {
        return mockTypes.map((type) => `fluent_spec_${type}.md`);
      }
      return [];
    });

    t.mock.method(fs.promises, 'readFile', async (path: string) => {
      if (path.includes('spec')) {
        return mockSpecContent;
      } else if (path.includes('snippet')) {
        return mockSnippetContent;
      } else if (path.includes('instruct')) {
        return mockInstructContent;
      }
      return '';
    });
  });

  let command: InstanceType<typeof GetFluentKnowledgeCommand>;

  beforeEach(() => {
    command = new GetFluentKnowledgeCommand();
  });

  describe("kind 'spec'", () => {
    it('returns the API specification for a metadata type', async () => {
      const result = await command.execute({ kind: 'spec', metadataType: TEST_METADATA_TYPE });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, mockSpecContent);
      assert.deepEqual(result.structuredContent, {
        content: mockSpecContent, resourceType: 'spec', metadataType: TEST_METADATA_TYPE,
      });
    });

    it('reports a supported type the catalog has no file for as not found', async () => {
      // acl is a ServiceNowMetadataType member, but not in the mocked listing.
      const result = await command.execute({ kind: 'spec', metadataType: 'acl' });

      assert.equal(result.success, false);
      assert.match(result.output, /No spec resource found for metadata type 'acl'\. Call get_fluent_knowledge with only kind 'spec'/);
      assert.notEqual(result.error, undefined);
    });

    it('lists the types that have a spec when metadataType is omitted (or null)', async () => {
      for (const args of [{ kind: 'spec' }, { kind: 'spec', metadataType: null }]) {
        const result = await command.execute(args);

        assert.equal(result.success, true, JSON.stringify(args));
        assert.equal(result.output,
          `Available Fluent metadata types with an API specification (4):\n${[...mockTypes].sort().join('\n')}\n\n` +
          "Call get_fluent_knowledge with kind 'spec' and a metadataType to read one.");
        assert.deepEqual(result.structuredContent?.availableTypes, [...mockTypes].sort());
      }
    });
  });

  describe("kind 'instruct'", () => {
    it('lists only the types that have a guide, each of which can be read (sparse catalog)', async (t) => {
      const readdir = fs.promises.readdir;
      t.mock.method(fs.promises, 'readdir', async (path: string) =>
        path.includes('instruct') ? ['fluent_instruct_business-rule.md'] : (readdir as (p: string) => Promise<string[]>)(path));
      const sparse = new GetFluentKnowledgeCommand();

      const listing = await sparse.execute({ kind: 'instruct' });
      assert.equal(listing.success, true);
      assert.deepEqual(listing.structuredContent?.availableTypes, [TEST_METADATA_TYPE]);
      assert.match(listing.output, /^Available Fluent metadata types with an authoring guide \(1\):\nbusiness-rule\n/);

      const listed = await sparse.execute({ kind: 'instruct', metadataType: TEST_METADATA_TYPE });
      assert.equal(listed.success, true);
      const unlisted = await sparse.execute({ kind: 'instruct', metadataType: 'script-include' });
      assert.match(unlisted.output, /No instruct resource found for metadata type 'script-include'/);
    });

    it('returns the authoring guide for a metadata type', async () => {
      const result = await command.execute({ kind: 'instruct', metadataType: TEST_METADATA_TYPE });

      assert.equal(result.success, true);
      assert.equal(result.output, mockInstructContent);
      assert.equal(result.structuredContent?.resourceType, 'instruct');
    });
  });

  describe("kind 'snippet'", () => {
    it('returns a specific snippet when snippetId is provided', async () => {
      const result = await command.execute({ kind: 'snippet', metadataType: TEST_METADATA_TYPE, snippetId: TEST_SNIPPET_ID });

      assert.equal(result.success, true);
      assert.equal(result.output, mockSnippetContent);
      assert.equal(result.structuredContent?.snippetId, TEST_SNIPPET_ID);
      assert.equal(result.structuredContent?.additionalSnippetIds, undefined);
    });

    it('returns the first snippet and names the others when snippetId is omitted, empty or null', async () => {
      for (const snippetId of [undefined, '', null]) {
        const result = await command.execute({ kind: 'snippet', metadataType: TEST_METADATA_TYPE, snippetId });

        assert.equal(result.success, true, String(snippetId));
        assert.equal(result.output, `${mockSnippetContent}\n\nAdditional snippets available: 0002, 0003`);
        assert.equal(result.structuredContent?.snippetId, '0001');
        assert.deepEqual(result.structuredContent?.additionalSnippetIds, ['0002', '0003']);
      }
    });

    it('reports an unknown snippet id with the ids that exist, never another snippet', async () => {
      const result = await command.execute({ kind: 'snippet', metadataType: TEST_METADATA_TYPE, snippetId: '9999' });

      assert.equal(result.success, false);
      assert.match(result.output, /Snippet '9999' not found for metadata type 'business-rule'/);
      assert.match(result.output, /Available snippet ids: 0001, 0002, 0003\./);
      assert.ok(!result.output.includes(mockSnippetContent));
    });

    it('reports a supported type without snippets', async () => {
      const result = await command.execute({ kind: 'snippet', metadataType: 'script-include' });

      assert.equal(result.success, false);
      assert.match(result.output, /No snippets found for metadata type 'script-include'/);
    });

    it('lists only the types that have a snippet', async () => {
      const result = await command.execute({ kind: 'snippet' });

      assert.equal(result.success, true);
      assert.deepEqual(result.structuredContent?.availableTypes, [TEST_METADATA_TYPE]);
    });
  });

  describe('the input contract', () => {
    const rejected = async (args: Record<string, unknown>, message: RegExp) => {
      const result = await command.execute(args);
      assert.equal(result.success, false, JSON.stringify(args));
      assert.match(result.output, message);
      assert.ok(!result.output.includes('Business Rule'), 'no content is served');
    };

    it('requires kind, from a closed set', async () => {
      await rejected({ metadataType: TEST_METADATA_TYPE }, /kind: Missing required argument 'kind'/);
      await rejected({ kind: 'guide', metadataType: TEST_METADATA_TYPE }, /Argument 'kind' must be one of: spec, instruct, snippet\. Received: "guide"/);
    });

    it('accepts only a supported, lowercase metadata type', async () => {
      for (const metadataType of ['BUSINESS-RULE', 'non-existent', 'x/../../../README', '']) {
        await rejected({ kind: 'spec', metadataType }, /metadataType: Argument 'metadataType' must be one of: /);
      }
    });

    it('takes snippetId only for kind snippet, and only with a metadata type', async () => {
      for (const kind of ['spec', 'instruct']) {
        await rejected({ kind, metadataType: TEST_METADATA_TYPE, snippetId: TEST_SNIPPET_ID }, new RegExp(`snippetId applies only to kind 'snippet', not '${kind}'`));
      }
      await rejected({ kind: 'snippet', snippetId: TEST_SNIPPET_ID }, /snippetId needs a metadataType/);
    });

    it('does not resolve a path-like snippet id outside the index', async () => {
      await rejected({ kind: 'snippet', metadataType: TEST_METADATA_TYPE, snippetId: '/../../../../README' }, /Snippet '\/\.\.\/\.\.\/\.\.\/\.\.\/README' not found/);
    });
  });
});

describe('check_auth_status', () => {
  // SessionManager is a process-wide singleton; start and end from an empty session.
  beforeEach(() => SessionManager.getInstance().clearSession());
  afterEach(() => SessionManager.getInstance().clearSession());

  it('returns the cached authenticated result that lazy validation stored, valid against its outputSchema', async () => {
    const cached = {
      status: 'authenticated' as const,
      alias: 'dev-profile',
      host: 'dev12345.service-now.com',
      authType: 'oauth',
      isDefault: true,
      message: 'Authenticated with profile dev-profile',
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    // The command awaits validation before it reads the session, so a result
    // stored by validation itself is the one returned.
    const ensureAuthValidated = mock.fn(async () => {
      SessionManager.getInstance().setAuthValidationResult(cached);
    });
    const command = new CheckAuthStatusCommand(ensureAuthValidated);

    const result = await command.execute();

    assert.equal(ensureAuthValidated.mock.callCount(), 1);
    assert.equal(result.success, true);
    assert.deepEqual(result.structuredContent, cached);
    assert.deepEqual(JSON.parse(result.output), cached);
    const parsed = z.object(command.outputSchema).safeParse(result.structuredContent);
    assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
  });
});
