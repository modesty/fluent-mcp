/**
 * Unit tests for SDK v4.4.0 metadata coverage - resource tool command pipeline
 * Tests with mocked filesystem, following patterns from test/tools/resourceTools.test.ts
 *
 * Native runner: the real node:fs stays in place and only the three functions
 * the resource loader uses are stubbed on the shared object, with the running
 * test's mock tracker (restored when the test ends). Configuration is
 * configFixture() with its default resource paths, the fixture's default values.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { configFixture, loggerFixture } from './support/fixtures.js';

mock.module('../src/config.js', configFixture().mockOptions);
mock.module('../src/utils/logger.js', loggerFixture().mockOptions);

const { GetApiSpecCommand, GetSnippetCommand, GetInstructCommand } = await import(
  '../src/tools/resources/resourceTools.js'
);
const { ResourceLoader } = await import('../src/utils/resourceLoader.js');

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

  // A beforeEach hook runs with the current test's context, so the stubs below
  // are restored when the test ends.
  beforeEach((hook) => {
    const t = hook as TestContext;

    t.mock.method(fs.promises, 'readdir', async (dirPath: string) => {
      if (dirPath.includes('snippet')) {
        return [
          'fluent_snippet_import-set_0001.md',
          'fluent_snippet_import-set_0002.md',
          'fluent_snippet_import-set_0003.md',
          'fluent_snippet_ui-policy_0001.md',
          'fluent_snippet_ui-policy_0002.md',
          'fluent_snippet_ui-policy_0003.md',
          'fluent_snippet_flow_0001.md',
          'fluent_snippet_email-notification_0001.md',
          'fluent_snippet_atf-rest-assert-payload_0001.md',
        ];
      }
      if (dirPath.includes('spec')) {
        return [
          'fluent_spec_import-set.md',
          'fluent_spec_ui-policy.md',
          'fluent_spec_flow.md',
          'fluent_spec_email-notification.md',
          'fluent_spec_atf-rest-assert-payload.md',
        ];
      }
      if (dirPath.includes('instruct')) {
        return [
          'fluent_instruct_import-set.md',
          'fluent_instruct_ui-policy.md',
          'fluent_instruct_flow.md',
          'fluent_instruct_email-notification.md',
          'fluent_instruct_atf-rest-assert-payload.md',
        ];
      }
      return [];
    });

    t.mock.method(fs.promises, 'readFile', async (filePath: string) => {
      // Import Set resources
      if (filePath.includes('spec') && filePath.includes('import-set')) {
        return IMPORT_SET_SPEC;
      }
      if (filePath.includes('instruct') && filePath.includes('import-set')) {
        return IMPORT_SET_INSTRUCT;
      }
      if (filePath.includes('snippet') && filePath.includes('import-set')) {
        if (filePath.includes('0001')) return IMPORT_SET_SNIPPET_1;
        if (filePath.includes('0002')) return IMPORT_SET_SNIPPET_2;
        if (filePath.includes('0003')) return IMPORT_SET_SNIPPET_3;
      }
      // UI Policy resources
      if (filePath.includes('spec') && filePath.includes('ui-policy')) {
        return UI_POLICY_SPEC;
      }
      if (filePath.includes('instruct') && filePath.includes('ui-policy')) {
        return UI_POLICY_INSTRUCT;
      }
      if (filePath.includes('snippet') && filePath.includes('ui-policy')) {
        if (filePath.includes('0001')) return UI_POLICY_SNIPPET_1;
        if (filePath.includes('0002')) return UI_POLICY_SNIPPET_2;
        if (filePath.includes('0003')) return UI_POLICY_SNIPPET_3;
      }
      // Flow resources
      if (filePath.includes('spec') && filePath.includes('flow')) {
        return FLOW_SPEC;
      }
      if (filePath.includes('instruct') && filePath.includes('flow')) {
        return FLOW_INSTRUCT;
      }
      if (filePath.includes('snippet') && filePath.includes('flow')) {
        if (filePath.includes('0001')) return FLOW_SNIPPET_1;
      }
      // Email Notification resources
      if (filePath.includes('spec') && filePath.includes('email-notification')) {
        return EMAIL_NOTIFICATION_SPEC;
      }
      if (filePath.includes('instruct') && filePath.includes('email-notification')) {
        return EMAIL_NOTIFICATION_INSTRUCT;
      }
      if (filePath.includes('snippet') && filePath.includes('email-notification')) {
        if (filePath.includes('0001')) return EMAIL_NOTIFICATION_SNIPPET_1;
      }
      // ATF REST Assert Payload resources
      if (filePath.includes('spec') && filePath.includes('atf-rest-assert-payload')) {
        return ATF_REST_ASSERT_PAYLOAD_SPEC;
      }
      if (filePath.includes('instruct') && filePath.includes('atf-rest-assert-payload')) {
        return ATF_REST_ASSERT_PAYLOAD_INSTRUCT;
      }
      if (filePath.includes('snippet') && filePath.includes('atf-rest-assert-payload')) {
        if (filePath.includes('0001')) return ATF_REST_ASSERT_PAYLOAD_SNIPPET_1;
      }
      return '';
    });

    t.mock.method(fs, 'existsSync', (filePath: string) => {
      return filePath.includes('import-set')
        || filePath.includes('ui-policy')
        || filePath.includes('flow')
        || filePath.includes('email-notification')
        || filePath.includes('atf-rest-assert-payload');
    });
  });

  describe('GetApiSpecCommand', () => {
    let command: InstanceType<typeof GetApiSpecCommand>;

    beforeEach(() => {
      command = new GetApiSpecCommand();
    });

    it('should return spec for import-set', async () => {
      const result = await command.execute({ metadataType: 'import-set' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, IMPORT_SET_SPEC);
      assert.ok(result.output.includes('ImportSet('));
    });

    it('should return spec for ui-policy', async () => {
      const result = await command.execute({ metadataType: 'ui-policy' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, UI_POLICY_SPEC);
      assert.ok(result.output.includes('UiPolicy('));
    });

    it('should return spec for flow', async () => {
      const result = await command.execute({ metadataType: 'flow' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, FLOW_SPEC);
      assert.ok(result.output.includes('Flow('));
    });
  });

  describe('GetSnippetCommand', () => {
    let command: InstanceType<typeof GetSnippetCommand>;

    beforeEach(() => {
      command = new GetSnippetCommand();
    });

    it('should return snippets for import-set and list additional IDs', async () => {
      const result = await command.execute({ metadataType: 'import-set' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.ok(result.output.includes(IMPORT_SET_SNIPPET_1));
      assert.ok(result.output.includes('Additional snippets available:'));
      assert.ok(result.output.includes('0002'));
      assert.ok(result.output.includes('0003'));
    });

    it('should return snippets for ui-policy and list additional IDs', async () => {
      const result = await command.execute({ metadataType: 'ui-policy' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.ok(result.output.includes(UI_POLICY_SNIPPET_1));
      assert.ok(result.output.includes('Additional snippets available:'));
      assert.ok(result.output.includes('0002'));
      assert.ok(result.output.includes('0003'));
    });

    it('should return snippet for atf-rest-assert-payload', async () => {
      const result = await command.execute({ metadataType: 'atf-rest-assert-payload' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.ok(result.output.includes(ATF_REST_ASSERT_PAYLOAD_SNIPPET_1));
      assert.ok(result.output.includes('assertResponseJSONPayloadIsValid'));
    });

    it('should return error for typo metadata type atf-asert-payload', async () => {
      const result = await command.execute({ metadataType: 'atf-asert-payload' });

      assert.equal(result.exitCode, 1);
      assert.equal(result.success, false);
      assert.ok(result.output.includes("No snippets found for metadata type 'atf-asert-payload'"));
      assert.notEqual(result.error, undefined);
    });
  });

  describe('GetInstructCommand', () => {
    let command: InstanceType<typeof GetInstructCommand>;

    beforeEach(() => {
      command = new GetInstructCommand();
    });

    it('should return instructions for import-set', async () => {
      const result = await command.execute({ metadataType: 'import-set' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, IMPORT_SET_INSTRUCT);
      assert.ok(result.output.includes('ImportSet'));
    });

    it('should return instructions for ui-policy', async () => {
      const result = await command.execute({ metadataType: 'ui-policy' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, UI_POLICY_INSTRUCT);
      assert.ok(result.output.includes('UiPolicy'));
    });

    it('should return instructions for email-notification', async () => {
      const result = await command.execute({ metadataType: 'email-notification' });

      assert.equal(result.exitCode, 0);
      assert.equal(result.success, true);
      assert.equal(result.output, EMAIL_NOTIFICATION_INSTRUCT);
      assert.ok(result.output.includes('EmailNotification'));
    });
  });

  describe('ResourceLoader', () => {
    it('should include new types when listing available metadata types', async () => {
      const loader = new ResourceLoader();
      const types = await loader.getAvailableMetadataTypes();

      assert.ok(types.includes('import-set'));
      assert.ok(types.includes('ui-policy'));
      assert.ok(types.includes('flow'));
      assert.ok(types.includes('email-notification'));
      assert.ok(types.includes('atf-rest-assert-payload'));
    });
  });
});
