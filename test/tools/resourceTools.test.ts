/**
 * Unit tests for resource tool commands
 *
 * Native runner: the filesystem is stubbed on the shared node:fs object, so the
 * real ResourceLoader reads canned directory listings and file contents. The
 * stubs are installed with the running test's mock tracker and restored when
 * the test ends. Configuration uses configFixture() with its default resource
 * paths (/test/res/spec, /test/res/snippet, /test/res/instruct) - the same
 * values the Jest setup supplied - because the stubs key on those path
 * segments, which a staged checkout path could otherwise collide with.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { configFixture, loggerFixture } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { GetApiSpecCommand, GetSnippetCommand, GetInstructCommand } = await import(
  '../../src/tools/resources/resourceTools.js'
);
const { ResourceLoader } = await import('../../src/utils/resourceLoader.js');

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

    t.mock.method(fs, 'existsSync', (path: string) => {
      return path.includes('business-rule') || path.includes('0001');
    });
  });

  describe('GetApiSpecCommand', () => {
    let command: InstanceType<typeof GetApiSpecCommand>;

    beforeEach(() => {
      command = new GetApiSpecCommand();
    });

    it('should return API specification for a valid metadata type', async () => {
      // Execute the command with a valid metadata type
      const result = await command.execute({ metadataType: TEST_METADATA_TYPE });

      // Verify the result contains the expected content
      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, mockSpecContent);

      // Verify the content contains expected text for a business rule spec
      assert.ok(result.output.includes('Business Rule spec'));
      assert.ok(result.output.includes('BusinessRule('));
    });

    it('should handle resource not found for non-existent metadata type', async () => {
      // Execute the command with a non-existent metadata type
      const result = await command.execute({ metadataType: 'non-existent' });

      assert.equal(result.exitCode, 1);
      assert.equal(result.success, false);
      assert.ok(result.output.includes("resource found for metadata type 'non-existent'"));
      assert.notEqual(result.error, undefined);
    });

    it('should list available metadata types when no argument provided', async (t) => {
      // Mock ResourceLoader to return our mock types
      t.mock.method(ResourceLoader.prototype, 'getAvailableMetadataTypes', async () => mockTypes);

      // Execute the command without arguments - should list available types
      const result = await command.execute({});

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.ok(result.output.includes('Available Fluent metadata types'));
    });
  });

  describe('GetSnippetCommand', () => {
    let command: InstanceType<typeof GetSnippetCommand>;

    beforeEach(() => {
      command = new GetSnippetCommand();
    });

    it('should return specific snippet when ID is provided', async () => {
      // Execute the command with a valid metadata type and snippet ID
      const result = await command.execute({
        metadataType: TEST_METADATA_TYPE,
        id: TEST_SNIPPET_ID,
      });

      // Verify the result contains the expected snippet content
      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, mockSnippetContent);

      // Verify the content contains expected text for a business rule snippet
      assert.ok(result.output.includes('Business Rule API example'));
      assert.ok(result.output.includes('BusinessRule('));
    });

    it('should list available snippets when ID is not provided', async () => {
      // The mock will return snippet IDs: 0001, 0002, 0003
      const mockSnippetIds = ['0001', '0002', '0003'];

      // Execute the command without specifying a snippet ID
      const result = await command.execute({ metadataType: TEST_METADATA_TYPE });

      // Verify the result contains the default snippet content and lists other available snippets
      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.ok(result.output.includes(mockSnippetContent));

      // Verify that additional snippets are listed (excluding the default one)
      assert.ok(result.output.includes('Additional snippets available:'));
      // Check for other snippet IDs (besides the default 0001)
      mockSnippetIds
        .filter((id) => id !== '0001')
        .forEach((id) => {
          assert.ok(result.output.includes(id));
        });
    });

    it('should normalize uppercase metadataType to lowercase', async () => {
      // Pass uppercase metadata type - should be normalized to lowercase
      const result = await command.execute({ metadataType: 'BUSINESS-RULE' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.ok(result.output.includes(mockSnippetContent));
    });

    it('should handle no snippets found for non-existent metadata type', async () => {
      // Execute the command with a non-existent metadata type
      const result = await command.execute({ metadataType: 'non-existent' });

      assert.equal(result.exitCode, 1);
      assert.equal(result.success, false);
      assert.ok(result.output.includes("No snippets found for metadata type 'non-existent'"));
      assert.notEqual(result.error, undefined);
    });
  });

  describe('GetInstructCommand', () => {
    let command: InstanceType<typeof GetInstructCommand>;

    beforeEach(() => {
      command = new GetInstructCommand();
    });

    it('should return instructions for a valid metadata type', async () => {
      // Execute the command with a valid metadata type
      const result = await command.execute({ metadataType: TEST_METADATA_TYPE });

      // Verify the result contains the expected instruction content
      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, mockInstructContent);

      // Verify the content contains expected text for business rule instructions
      assert.ok(result.output.includes('Instructions for Fluent Business Rule API'));
    });

    it('should handle resource not found for non-existent metadata type', async () => {
      // Execute the command with a non-existent metadata type
      const result = await command.execute({ metadataType: 'non-existent' });

      assert.equal(result.exitCode, 1);
      assert.equal(result.success, false);
      assert.ok(result.output.includes("resource found for metadata type 'non-existent'"));
      assert.notEqual(result.error, undefined);
    });

    it('should handle missing required arguments', async () => {
      // Execute the command without required arguments
      const result = await command.execute({});

      assert.equal(result.exitCode, 1);
      assert.equal(result.success, false);
      assert.ok(result.output.includes("Missing required argument 'metadataType'"));
      assert.notEqual(result.error, undefined);
    });
  });
});
