/**
 * Unit tests for SDK v4.2.0 new types - resource tool command pipeline
 * Tests with mocked filesystem, following patterns from test/tools/resourceTools.test.ts
 */
import fs from 'node:fs';
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
} from '../src/tools/resourceTools.js';
import { ResourceLoader } from '../src/utils/resourceLoader.js';

// Mock the file system operations for tests
jest.mock('node:fs', () => {
  const originalFs = jest.requireActual('node:fs');
  return {
    ...originalFs,
    promises: {
      ...originalFs.promises,
      readdir: jest.fn(),
      readFile: jest.fn(),
    },
    existsSync: jest.fn(),
  };
});

describe('SDK v4.2.0 Types - Unit Tests', () => {
  const IMPORT_SET_SPEC = '# ImportSet API spec\nImportSet({ $id: "", targetTable: "" })';
  const IMPORT_SET_INSTRUCT = '# Instructions for Fluent ImportSet API\nImport ImportSet from @servicenow/sdk/core';
  const IMPORT_SET_SNIPPET_1 = '# ImportSet snippet 1\nImportSet({ fields: {} })';
  const IMPORT_SET_SNIPPET_2 = '# ImportSet snippet 2\nImportSet({ coalesce: true })';
  const IMPORT_SET_SNIPPET_3 = '# ImportSet snippet 3\nImportSet({ scripts: [] })';

  const UI_POLICY_SPEC = '# UiPolicy API spec\nUiPolicy({ $id: "", actions: [] })';
  const UI_POLICY_INSTRUCT = '# Instructions for Fluent UiPolicy API\nImport UiPolicy from @servicenow/sdk/core';
  const UI_POLICY_SNIPPET_1 = '# UiPolicy snippet 1\nUiPolicy({ actions: [{ visible: true }] })';
  const UI_POLICY_SNIPPET_2 = '# UiPolicy snippet 2\nUiPolicy({ runScripts: true, scriptTrue: "" })';
  const UI_POLICY_SNIPPET_3 = '# UiPolicy snippet 3\nUiPolicy({ relatedListActions: [] })';

  beforeEach(() => {
    jest.clearAllMocks();

    (fs.promises.readdir as jest.Mock).mockImplementation((dirPath: string) => {
      if (dirPath.includes('snippet')) {
        return Promise.resolve([
          'fluent_snippet_import-set_0001.md',
          'fluent_snippet_import-set_0002.md',
          'fluent_snippet_import-set_0003.md',
          'fluent_snippet_ui-policy_0001.md',
          'fluent_snippet_ui-policy_0002.md',
          'fluent_snippet_ui-policy_0003.md',
        ]);
      }
      if (dirPath.includes('spec')) {
        return Promise.resolve([
          'fluent_spec_import-set.md',
          'fluent_spec_ui-policy.md',
        ]);
      }
      if (dirPath.includes('instruct')) {
        return Promise.resolve([
          'fluent_instruct_import-set.md',
          'fluent_instruct_ui-policy.md',
        ]);
      }
      return Promise.resolve([]);
    });

    (fs.promises.readFile as jest.Mock).mockImplementation((filePath: string) => {
      // Import Set resources
      if (filePath.includes('spec') && filePath.includes('import-set')) {
        return Promise.resolve(IMPORT_SET_SPEC);
      }
      if (filePath.includes('instruct') && filePath.includes('import-set')) {
        return Promise.resolve(IMPORT_SET_INSTRUCT);
      }
      if (filePath.includes('snippet') && filePath.includes('import-set')) {
        if (filePath.includes('0001')) return Promise.resolve(IMPORT_SET_SNIPPET_1);
        if (filePath.includes('0002')) return Promise.resolve(IMPORT_SET_SNIPPET_2);
        if (filePath.includes('0003')) return Promise.resolve(IMPORT_SET_SNIPPET_3);
      }
      // UI Policy resources
      if (filePath.includes('spec') && filePath.includes('ui-policy')) {
        return Promise.resolve(UI_POLICY_SPEC);
      }
      if (filePath.includes('instruct') && filePath.includes('ui-policy')) {
        return Promise.resolve(UI_POLICY_INSTRUCT);
      }
      if (filePath.includes('snippet') && filePath.includes('ui-policy')) {
        if (filePath.includes('0001')) return Promise.resolve(UI_POLICY_SNIPPET_1);
        if (filePath.includes('0002')) return Promise.resolve(UI_POLICY_SNIPPET_2);
        if (filePath.includes('0003')) return Promise.resolve(UI_POLICY_SNIPPET_3);
      }
      return Promise.resolve('');
    });

    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return filePath.includes('import-set') || filePath.includes('ui-policy');
    });
  });

  describe('GetApiSpecCommand', () => {
    let command: GetApiSpecCommand;

    beforeEach(() => {
      command = new GetApiSpecCommand();
    });

    it('should return spec for import-set', async () => {
      const result = await command.execute({ metadataType: 'import-set' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(IMPORT_SET_SPEC);
      expect(result.output).toContain('ImportSet(');
    });

    it('should return spec for ui-policy', async () => {
      const result = await command.execute({ metadataType: 'ui-policy' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(UI_POLICY_SPEC);
      expect(result.output).toContain('UiPolicy(');
    });
  });

  describe('GetSnippetCommand', () => {
    let command: GetSnippetCommand;

    beforeEach(() => {
      command = new GetSnippetCommand();
    });

    it('should return snippets for import-set and list additional IDs', async () => {
      const result = await command.execute({ metadataType: 'import-set' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toContain(IMPORT_SET_SNIPPET_1);
      expect(result.output).toContain('Additional snippets available:');
      expect(result.output).toContain('0002');
      expect(result.output).toContain('0003');
    });

    it('should return snippets for ui-policy and list additional IDs', async () => {
      const result = await command.execute({ metadataType: 'ui-policy' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toContain(UI_POLICY_SNIPPET_1);
      expect(result.output).toContain('Additional snippets available:');
      expect(result.output).toContain('0002');
      expect(result.output).toContain('0003');
    });
  });

  describe('GetInstructCommand', () => {
    let command: GetInstructCommand;

    beforeEach(() => {
      command = new GetInstructCommand();
    });

    it('should return instructions for import-set', async () => {
      const result = await command.execute({ metadataType: 'import-set' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(IMPORT_SET_INSTRUCT);
      expect(result.output).toContain('ImportSet');
    });

    it('should return instructions for ui-policy', async () => {
      const result = await command.execute({ metadataType: 'ui-policy' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(UI_POLICY_INSTRUCT);
      expect(result.output).toContain('UiPolicy');
    });
  });

  describe('ResourceLoader', () => {
    it('should include new types when listing available metadata types', async () => {
      const loader = new ResourceLoader();
      const types = await loader.getAvailableMetadataTypes();

      expect(types).toContain('import-set');
      expect(types).toContain('ui-policy');
    });
  });
});
