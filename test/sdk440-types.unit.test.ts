/**
 * Unit tests for SDK v4.4.0 metadata coverage - resource tool command pipeline
 * Tests with mocked filesystem, following patterns from test/tools/resourceTools.test.ts
 */
import fs from 'node:fs';
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
} from '../src/tools/resources/resourceTools.js';
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

describe('SDK v4.4.0 Types - Unit Tests', () => {
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

  const FLOW_SPEC = '# Flow API spec\nFlow({ $id: "", name: "" })';
  const FLOW_INSTRUCT = '# Instructions for Fluent Flow API\nImport { Flow, wfa, trigger, action } from @servicenow/sdk/automation';
  const FLOW_SNIPPET_1 = '# Flow snippet 1\nFlow({ name: "My Flow" })';

  const EMAIL_NOTIFICATION_SPEC = '# EmailNotification API spec\nEmailNotification({ table: "incident" })';
  const EMAIL_NOTIFICATION_INSTRUCT = '# Instructions for Fluent EmailNotification API\nImport EmailNotification from @servicenow/sdk/core';
  const EMAIL_NOTIFICATION_SNIPPET_1 = '# EmailNotification snippet 1\nEmailNotification({ table: "incident" })';

  const ATF_REST_ASSERT_PAYLOAD_SPEC = '# ATF REST Assert Payload API spec\natf.rest.assertResponseJSONPayloadIsValid({ $id: Now.ID[""] })';
  const ATF_REST_ASSERT_PAYLOAD_INSTRUCT = '# Instructions for Fluent ATF REST Assert Payload API\nAlways reference fluent_instruct_atf.md';
  const ATF_REST_ASSERT_PAYLOAD_SNIPPET_1 = '# ATF REST Assert Payload snippet 1\natf.rest.assertResponseJSONPayloadIsValid({ $id: "step_2" })';

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
          'fluent_snippet_flow_0001.md',
          'fluent_snippet_email-notification_0001.md',
          'fluent_snippet_atf-rest-assert-payload_0001.md',
        ]);
      }
      if (dirPath.includes('spec')) {
        return Promise.resolve([
          'fluent_spec_import-set.md',
          'fluent_spec_ui-policy.md',
          'fluent_spec_flow.md',
          'fluent_spec_email-notification.md',
          'fluent_spec_atf-rest-assert-payload.md',
        ]);
      }
      if (dirPath.includes('instruct')) {
        return Promise.resolve([
          'fluent_instruct_import-set.md',
          'fluent_instruct_ui-policy.md',
          'fluent_instruct_flow.md',
          'fluent_instruct_email-notification.md',
          'fluent_instruct_atf-rest-assert-payload.md',
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
      // Flow resources
      if (filePath.includes('spec') && filePath.includes('flow')) {
        return Promise.resolve(FLOW_SPEC);
      }
      if (filePath.includes('instruct') && filePath.includes('flow')) {
        return Promise.resolve(FLOW_INSTRUCT);
      }
      if (filePath.includes('snippet') && filePath.includes('flow')) {
        if (filePath.includes('0001')) return Promise.resolve(FLOW_SNIPPET_1);
      }
      // Email Notification resources
      if (filePath.includes('spec') && filePath.includes('email-notification')) {
        return Promise.resolve(EMAIL_NOTIFICATION_SPEC);
      }
      if (filePath.includes('instruct') && filePath.includes('email-notification')) {
        return Promise.resolve(EMAIL_NOTIFICATION_INSTRUCT);
      }
      if (filePath.includes('snippet') && filePath.includes('email-notification')) {
        if (filePath.includes('0001')) return Promise.resolve(EMAIL_NOTIFICATION_SNIPPET_1);
      }
      // ATF REST Assert Payload resources
      if (filePath.includes('spec') && filePath.includes('atf-rest-assert-payload')) {
        return Promise.resolve(ATF_REST_ASSERT_PAYLOAD_SPEC);
      }
      if (filePath.includes('instruct') && filePath.includes('atf-rest-assert-payload')) {
        return Promise.resolve(ATF_REST_ASSERT_PAYLOAD_INSTRUCT);
      }
      if (filePath.includes('snippet') && filePath.includes('atf-rest-assert-payload')) {
        if (filePath.includes('0001')) return Promise.resolve(ATF_REST_ASSERT_PAYLOAD_SNIPPET_1);
      }
      return Promise.resolve('');
    });

    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return filePath.includes('import-set')
        || filePath.includes('ui-policy')
        || filePath.includes('flow')
        || filePath.includes('email-notification')
        || filePath.includes('atf-rest-assert-payload');
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

    it('should return spec for flow', async () => {
      const result = await command.execute({ metadataType: 'flow' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(FLOW_SPEC);
      expect(result.output).toContain('Flow(');
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

    it('should return snippet for atf-rest-assert-payload', async () => {
      const result = await command.execute({ metadataType: 'atf-rest-assert-payload' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toContain(ATF_REST_ASSERT_PAYLOAD_SNIPPET_1);
      expect(result.output).toContain('assertResponseJSONPayloadIsValid');
    });

    it('should return error for typo metadata type atf-asert-payload', async () => {
      const result = await command.execute({ metadataType: 'atf-asert-payload' });

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
      expect(result.output).toContain("No snippets found for metadata type 'atf-asert-payload'");
      expect(result.error).toBeDefined();
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

    it('should return instructions for email-notification', async () => {
      const result = await command.execute({ metadataType: 'email-notification' });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(EMAIL_NOTIFICATION_INSTRUCT);
      expect(result.output).toContain('EmailNotification');
    });
  });

  describe('ResourceLoader', () => {
    it('should include new types when listing available metadata types', async () => {
      const loader = new ResourceLoader();
      const types = await loader.getAvailableMetadataTypes();

      expect(types).toContain('import-set');
      expect(types).toContain('ui-policy');
      expect(types).toContain('flow');
      expect(types).toContain('email-notification');
      expect(types).toContain('atf-rest-assert-payload');
    });
  });
});
