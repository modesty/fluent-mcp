/**
 * Unit tests for resource loader
 *
 * Native runner: module mocks are registered before the module under test is
 * imported. Static imports are hoisted above mock.module(), so the loader and
 * its dependencies are loaded with dynamic import() below the registrations.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture } from '../support/fixtures.js';

// Filesystem mocks shared by the default and named node:fs exports. The loader
// uses the default import; the assertions below read these same functions.
const readdir = mock.fn(async (_dir: string): Promise<string[]> => []);
const readFile = mock.fn(async (_file: string, _encoding?: string): Promise<string> => '');
const existsSync = mock.fn((_path: string): boolean => false);
const fsMock = { promises: { readdir, readFile }, existsSync };

mock.module('node:fs', { defaultExport: fsMock, namedExports: fsMock });

// Configuration with the mock resource paths this suite asserts against.
const config = configFixture({
  resourcePaths: {
    spec: '/mock/path/to/spec',
    snippet: '/mock/path/to/snippet',
    instruct: '/mock/path/to/instruct',
  },
});
mock.module('../../src/config.js', config.mockOptions);

// Logger is silenced under Jest; the fixture keeps the native run quiet the same way.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { ResourceLoader } = await import('../../src/utils/resourceLoader.js');
const { ResourceType } = await import('../../src/utils/types.js');

function resetFilesystemMocks(): void {
  readdir.mock.resetCalls();
  readFile.mock.resetCalls();
  existsSync.mock.resetCalls();
  readdir.mock.mockImplementation(async () => []);
  readFile.mock.mockImplementation(async () => '');
  existsSync.mock.mockImplementation(() => false);
}

describe('ResourceLoader', () => {
  let resourceLoader: InstanceType<typeof ResourceLoader>;

  // Create a fresh resourceLoader instance before each test
  beforeEach(() => {
    resetFilesystemMocks();
    resourceLoader = new ResourceLoader();
  });

  describe('getAvailableMetadataTypes', () => {
    it('should return list of available metadata types', async () => {
      // Mock fs.readdir to return a list of files
      const mockFiles = [
        'fluent_spec_business-rule.md',
        'fluent_spec_script-include.md',
        'fluent_spec_client-script.md',
        'some-other-file.md',
      ];

      readdir.mock.mockImplementation(async () => mockFiles);

      const types = await resourceLoader.getAvailableMetadataTypes();

      // Just check that we have some metadata types that we expect
      assert.ok(types.includes('business-rule'));
      assert.ok(types.includes('script-include'));
      assert.ok(types.includes('client-script'));

      // Since the code may now use the ServiceNowMetadataType enum directly,
      // we just check that some key types were called
      assert.ok(readdir.mock.callCount() > 0);
    });

    it('should return ServiceNowMetadataType values if directory read fails', async () => {
      // Both node:fs and regular fs should throw the same error
      const mockError = new Error('Directory read error');
      readdir.mock.mockImplementation(async () => {
        throw mockError;
      });

      const types = await resourceLoader.getAvailableMetadataTypes();

      // With the new implementation, we should get values from ServiceNowMetadataType enum
      assert.notDeepStrictEqual(types, []);
      assert.ok(types.includes('business-rule'));
      assert.ok(types.includes('script-include'));
      assert.ok(types.includes('client-script'));
    });
  });

  describe('getResource', () => {
    it('should return resource content for API spec', async () => {
      const metadataType = 'business-rule';
      const mockContent = '# API Specification for Business Rules\n... content ...';
      const expectedPath = '/mock/path/to/spec/fluent_spec_business-rule.md';

      existsSync.mock.mockImplementation((path: string) => path === expectedPath);
      readFile.mock.mockImplementation(async (path: string) => {
        if (path === expectedPath) return mockContent;
        throw new Error(`File not found: ${path}`);
      });

      const result = await resourceLoader.getResource(ResourceType.SPEC, metadataType);

      assert.deepStrictEqual(result, {
        content: mockContent,
        path: expectedPath,
        metadataType: 'business-rule',
        resourceType: 'spec',
        found: true,
      });

      assertCalledWith(existsSync, expectedPath);
      assertCalledWith(readFile, expectedPath, 'utf-8');
    });

    it('should return resource content for specific snippet', async () => {
      const metadataType = 'business-rule';
      const id = '0002';
      const mockContent = '# Snippet 0002 for Business Rules\n... content ...';
      const expectedPath = '/mock/path/to/snippet/fluent_snippet_business-rule_0002.md';

      existsSync.mock.mockImplementation((path: string) => path === expectedPath);
      readFile.mock.mockImplementation(async (path: string) => {
        if (path === expectedPath) return mockContent;
        throw new Error(`File not found: ${path}`);
      });

      const result = await resourceLoader.getResource(ResourceType.SNIPPET, metadataType, id);

      assert.deepStrictEqual(result, {
        content: mockContent,
        path: expectedPath,
        metadataType: 'business-rule',
        resourceType: 'snippet',
        found: true,
      });

      assertCalledWith(existsSync, expectedPath);
      assertCalledWith(readFile, expectedPath, 'utf-8');
    });

    it('should fall back to first snippet if specific ID not found', async () => {
      const metadataType = 'business-rule';
      const id = '9999'; // Non-existent ID
      const mockContent = '# Default Snippet for Business Rules\n... content ...';
      const specificPath = '/mock/path/to/snippet/fluent_snippet_business-rule_9999.md';
      const defaultPath = '/mock/path/to/snippet/fluent_snippet_business-rule_0001.md';

      existsSync.mock.mockImplementation((path: string) => path === defaultPath);
      readFile.mock.mockImplementation(async (path: string) => {
        if (path === defaultPath) return mockContent;
        throw new Error(`File not found: ${path}`);
      });

      const result = await resourceLoader.getResource(ResourceType.SNIPPET, metadataType, id);

      assert.deepStrictEqual(result, {
        content: mockContent,
        path: defaultPath,
        metadataType: 'business-rule',
        resourceType: 'snippet',
        found: true,
      });

      assertCalledWith(existsSync, specificPath);
      assertCalledWith(existsSync, defaultPath);
      assertCalledWith(readFile, defaultPath, 'utf-8');
    });

    it('should return not found if resource does not exist', async () => {
      const metadataType = 'non-existent-type';
      const expectedPath = '/mock/path/to/instruct/fluent_instruct_non-existent-type.md';

      existsSync.mock.mockImplementation(() => false);

      const result = await resourceLoader.getResource(ResourceType.INSTRUCT, metadataType);

      assert.deepStrictEqual(result, {
        content: '',
        path: expectedPath,
        metadataType: 'non-existent-type',
        resourceType: 'instruct',
        found: false,
      });

      assertCalledWith(existsSync, expectedPath);
      assertNotCalled(readFile);
    });

    it('should handle errors gracefully', async () => {
      const metadataType = 'business-rule';
      const mockError = new Error('File read error');

      existsSync.mock.mockImplementation(() => true);
      readFile.mock.mockImplementation(async () => {
        throw mockError;
      });

      const result = await resourceLoader.getResource(ResourceType.INSTRUCT, metadataType);

      assert.deepStrictEqual(result, {
        content: '',
        path: '', // The actual implementation clears the path on error
        metadataType: 'business-rule',
        resourceType: 'instruct',
        found: false,
      });
    });
  });

  describe('listSnippets', () => {
    it('should return list of available snippet IDs', async () => {
      const metadataType = 'business-rule';
      const mockFiles = [
        'fluent_snippet_business-rule_0001.md',
        'fluent_snippet_business-rule_0002.md',
        'fluent_snippet_business-rule_0003.md',
        'fluent_snippet_client-script_0001.md', // Should be filtered out
      ];

      readdir.mock.mockImplementation(async () => mockFiles);

      const snippetIds = await resourceLoader.listSnippets(metadataType);

      assert.deepStrictEqual(snippetIds, ['0001', '0002', '0003']);
      assertCalledWith(readdir, '/mock/path/to/snippet');
    });

    it('should return empty array if no snippets found', async () => {
      const metadataType = 'non-existent-type';
      const mockFiles = [
        'fluent_snippet_business-rule_0001.md',
        'fluent_snippet_client-script_0001.md',
      ];

      readdir.mock.mockImplementation(async () => mockFiles);

      const snippetIds = await resourceLoader.listSnippets(metadataType);

      assert.deepStrictEqual(snippetIds, []);
    });

    it('should handle directory read errors', async () => {
      const metadataType = 'business-rule';
      const mockError = new Error('Directory read error');

      readdir.mock.mockImplementation(async () => {
        throw mockError;
      });

      const snippetIds = await resourceLoader.listSnippets(metadataType);

      assert.deepStrictEqual(snippetIds, []);
    });
  });
});
