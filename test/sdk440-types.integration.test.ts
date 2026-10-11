/**
 * Integration tests for SDK v4.4.0 metadata coverage
 * These tests read actual resource files from disk (no mocks) to verify content correctness.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';
import { DependenciesCommand } from '../src/tools/commands/dependenciesCommand.js';

// Use process.cwd() as project root (the repository root under npm run)
const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

describe('SDK v4.4.0 Types - Integration Tests', () => {

  describe('Enum completeness', () => {
    it('should have IMPORT_SET enum entry', () => {
      assert.equal(ServiceNowMetadataType.IMPORT_SET, 'import-set');
    });

    it('should have UI_POLICY enum entry', () => {
      assert.equal(ServiceNowMetadataType.UI_POLICY, 'ui-policy');
    });

    it('should have SDK v4.3/v4.4 enum entries', () => {
      assert.equal(ServiceNowMetadataType.FLOW, 'flow');
      assert.equal(ServiceNowMetadataType.CATALOG_CLIENT_SCRIPT, 'catalog-client-script');
      assert.equal(ServiceNowMetadataType.CATALOG_ITEM, 'catalog-item');
      assert.equal(ServiceNowMetadataType.CATALOG_ITEM_RECORD_PRODUCER, 'catalog-item-record-producer');
      assert.equal(ServiceNowMetadataType.CATALOG_UI_POLICY, 'catalog-ui-policy');
      assert.equal(ServiceNowMetadataType.CATALOG_VARIABLE, 'catalog-variable');
      assert.equal(ServiceNowMetadataType.VARIABLE_SET, 'variable-set');
      assert.equal(ServiceNowMetadataType.EMAIL_NOTIFICATION, 'email-notification');
      assert.equal(ServiceNowMetadataType.WORKSPACE, 'workspace');
      assert.equal(ServiceNowMetadataType.SLA, 'sla');
      assert.equal(ServiceNowMetadataType.DASHBOARD, 'dashboard');
      assert.equal(ServiceNowMetadataType.ATF_REST_ASSERT_PAYLOAD, 'atf-rest-assert-payload');
    });
  });

  describe('SDK v4.3/v4.4 resource files', () => {
    const v440Types = [
      'flow',
      'catalog-client-script',
      'catalog-item',
      'catalog-item-record-producer',
      'catalog-ui-policy',
      'catalog-variable',
      'variable-set',
      'email-notification',
      'workspace',
      'sla',
      'dashboard',
      'atf-rest-assert-payload',
    ];

    it('should have spec/instruct/snippet coverage for each v4.3/v4.4 type', () => {
      for (const metadataType of v440Types) {
        const specFile = path.join(SPEC_DIR, `fluent_spec_${metadataType}.md`);
        const instructFile = path.join(INSTRUCT_DIR, `fluent_instruct_${metadataType}.md`);
        assert.equal(fs.existsSync(specFile), true);
        assert.equal(fs.existsSync(instructFile), true);

        const snippetCandidates = fs
          .readdirSync(SNIPPET_DIR)
          .filter((file) => file.startsWith(`fluent_snippet_${metadataType}_`) && file.endsWith('.md'));
        assert.ok(snippetCandidates.length > 0);
      }
    });
  });

  describe('ImportSet resource files', () => {
    const specFile = path.join(SPEC_DIR, 'fluent_spec_import-set.md');
    const instructFile = path.join(INSTRUCT_DIR, 'fluent_instruct_import-set.md');
    const snippetFiles = [
      path.join(SNIPPET_DIR, 'fluent_snippet_import-set_0001.md'),
      path.join(SNIPPET_DIR, 'fluent_snippet_import-set_0002.md'),
      path.join(SNIPPET_DIR, 'fluent_snippet_import-set_0003.md'),
    ];

    it('should have all resource files on disk', () => {
      assert.equal(fs.existsSync(specFile), true);
      assert.equal(fs.existsSync(instructFile), true);
      for (const file of snippetFiles) {
        assert.equal(fs.existsSync(file), true);
      }
    });

    it('should have spec with key API signatures', () => {
      const content = fs.readFileSync(specFile, 'utf-8');
      const expectedTerms = [
        'ImportSet(', '$id', 'name', 'targetTable', 'sourceTable',
        'fields', 'scripts', 'enforceMandatoryFields', 'coalesce',
        'choiceAction', 'dateFormat', 'onBefore', 'onAfter', 'onComplete',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with key guidance', () => {
      const content = fs.readFileSync(instructFile, 'utf-8');
      const expectedTerms = [
        '@servicenow/sdk/core', '$id', 'targetTable', 'sourceTable',
        'coalesce', 'choiceAction', 'enforceMandatoryFields', 'onBefore',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have snippet 0001 with basic field mappings', () => {
      const content = fs.readFileSync(snippetFiles[0], 'utf-8');
      assert.ok(content.includes('ImportSet('));
      assert.ok(content.includes('fields'));
    });

    it('should have snippet 0002 with coalesce and choice actions', () => {
      const content = fs.readFileSync(snippetFiles[1], 'utf-8');
      assert.ok(content.includes('coalesce'));
      assert.ok(content.includes('choiceAction'));
      assert.ok(content.includes('dateFormat'));
    });

    it('should have snippet 0003 with transform scripts', () => {
      const content = fs.readFileSync(snippetFiles[2], 'utf-8');
      assert.ok(content.includes('scripts'));
      assert.ok(content.includes('when:'));
      assert.equal(content.includes('onBefore') || content.includes('onAfter'), true);
    });
  });

  describe('UiPolicy resource files', () => {
    const specFile = path.join(SPEC_DIR, 'fluent_spec_ui-policy.md');
    const instructFile = path.join(INSTRUCT_DIR, 'fluent_instruct_ui-policy.md');
    const snippetFiles = [
      path.join(SNIPPET_DIR, 'fluent_snippet_ui-policy_0001.md'),
      path.join(SNIPPET_DIR, 'fluent_snippet_ui-policy_0002.md'),
      path.join(SNIPPET_DIR, 'fluent_snippet_ui-policy_0003.md'),
    ];

    it('should have all resource files on disk', () => {
      assert.equal(fs.existsSync(specFile), true);
      assert.equal(fs.existsSync(instructFile), true);
      for (const file of snippetFiles) {
        assert.equal(fs.existsSync(file), true);
      }
    });

    it('should have spec with key API signatures', () => {
      const content = fs.readFileSync(specFile, 'utf-8');
      const expectedTerms = [
        'UiPolicy(', '$id', 'shortDescription', 'actions',
        'visible', 'readOnly', 'mandatory', "'ignore'",
        'relatedListActions', 'reverseIfFalse', 'runScripts',
        'scriptTrue', 'scriptFalse', 'uiType',
        'fieldMessage', 'fieldMessageType',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with key guidance', () => {
      const content = fs.readFileSync(instructFile, 'utf-8');
      const expectedTerms = [
        '@servicenow/sdk/core', '$id', 'shortDescription',
        'actions', 'reverseIfFalse', 'runScripts',
        'relatedListActions', 'fieldMessage',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have snippet 0001 with basic actions', () => {
      const content = fs.readFileSync(snippetFiles[0], 'utf-8');
      assert.ok(content.includes('UiPolicy('));
      assert.ok(content.includes('actions'));
      assert.ok(content.includes('visible'));
      assert.ok(content.includes('mandatory'));
    });

    it('should have snippet 0002 with conditional scripts', () => {
      const content = fs.readFileSync(snippetFiles[1], 'utf-8');
      assert.ok(content.includes('scriptTrue'));
      assert.ok(content.includes('scriptFalse'));
      assert.ok(content.includes('runScripts'));
    });

    it('should have snippet 0003 with related list actions and field messages', () => {
      const content = fs.readFileSync(snippetFiles[2], 'utf-8');
      assert.ok(content.includes('relatedListActions'));
      assert.ok(content.includes('fieldMessage'));
    });
  });

  describe('Column spec - new types', () => {
    const specFile = path.join(SPEC_DIR, 'fluent_spec_column.md');
    let content: string;

    before(() => {
      content = fs.readFileSync(specFile, 'utf-8');
    });

    it('should contain all 15 new column type names', () => {
      const newColumnTypes = [
        'Password2Column', 'GuidColumn', 'JsonColumn',
        'NameValuePairsColumn', 'UrlColumn', 'EmailColumn',
        'HtmlColumn', 'FloatColumn', 'MultiLineTextColumn',
        'DurationColumn', 'TimeColumn', 'FieldListColumn',
        'SlushBucketColumn', 'TemplateValueColumn', 'ApprovalRulesColumn',
      ];
      for (const type of newColumnTypes) {
        assert.ok(content.includes(type));
      }
    });

    it('should contain utility helpers', () => {
      assert.ok(content.includes('Duration('));
      assert.ok(content.includes('Time('));
      assert.ok(content.includes('FieldList'));
      assert.ok(content.includes('TemplateValue'));
      assert.ok(content.includes('Now.attach'));
    });
  });

  describe('Column snippets - new types', () => {
    it('should have snippet 0003 with DurationColumn, TimeColumn, and JsonColumn', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_column_0003.md'), 'utf-8'
      );
      assert.ok(content.includes('DurationColumn'));
      assert.ok(content.includes('TimeColumn'));
      assert.ok(content.includes('JsonColumn'));
    });

    it('should have snippet 0004 with FieldListColumn, TemplateValueColumn, and SlushBucketColumn', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_column_0004.md'), 'utf-8'
      );
      assert.ok(content.includes('FieldListColumn'));
      assert.ok(content.includes('TemplateValueColumn'));
      assert.ok(content.includes('SlushBucketColumn'));
      assert.ok(content.includes('FieldList<'));
      assert.ok(content.includes('TemplateValue<'));
    });

    it('should have snippet 0005 with Now.attach and BasicImageColumn', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_column_0005.md'), 'utf-8'
      );
      assert.ok(content.includes('Now.attach'));
      assert.ok(content.includes('BasicImageColumn'));
    });
  });

  describe('Flow spec - SDK v4.4.0 updates', () => {
    it('should contain service catalog trigger and action signatures using current SDK names', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_flow.md'),
        'utf-8'
      );

      const expectedTerms = [
        'trigger.application.serviceCatalog',
        'action.core.lookUpRecord',
        'action.core.lookUpRecords',
        'action.core.getCatalogVariables',
        'action.core.createCatalogTask',
        'action.core.submitCatalogItemRequest',
        'ah_requested_item',
        'template_catalog_item',
        "durationType: 'explicit_duration'",
        "run_in: ''",
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }

      const removedTerms = [
        'trigger.serviceCatalog.catalogItemRequested',
        'action.core.lookupRecord',
        'action.core.lookupRecords',
        'repeat_interval',
        'start_date_time',
      ];
      for (const term of removedTerms) {
        assert.ok(!content.includes(term));
      }
    });
  });

  describe('ACL spec - SDK v4.4.0 protection policy', () => {
    it('should document the updated protectionPolicy values', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_acl.md'),
        'utf-8'
      );

      assert.ok(content.includes('protectionPolicy'));
      assert.ok(content.includes("'read' | 'protected'"));
      assert.ok(!content.includes('protected_if_all_patches_installed'));
    });
  });

  describe('ATF REST assert payload snippet naming', () => {
    it('should use the corrected snippet filename and remove typo filename', () => {
      assert.equal(fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_atf-rest-assert-payload_0001.md')), true);
      assert.equal(fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_atf-asert-payload_0001.md')), false);
    });
  });

  describe('ATF and column instruct coverage', () => {
    it('should have instruct files for all ATF and column metadata types', () => {
      const requiredInstructTypes = [
        'atf-appnav',
        'atf-catalog-action',
        'atf-catalog-validation',
        'atf-catalog-variable',
        'atf-email',
        'atf-form',
        'atf-form-action',
        'atf-form-declarative-action',
        'atf-form-field',
        'atf-reporting',
        'atf-rest-api',
        'atf-rest-assert-payload',
        'atf-server',
        'atf-server-catalog-item',
        'atf-server-record',
        'column',
        'column-generic',
      ];

      for (const metadataType of requiredInstructTypes) {
        assert.equal(fs.existsSync(path.join(INSTRUCT_DIR, `fluent_instruct_${metadataType}.md`)), true);
      }
    });
  });

  describe('Table instructions - updated', () => {
    it('should contain Now.attach and dependencies.global references', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_table.md'), 'utf-8'
      );
      assert.ok(content.includes('Now.attach'));
      assert.ok(content.includes('dependencies.global'));
    });
  });

  describe('DependenciesCommand description', () => {
    it('should reference dependencies.global in description', () => {
      const command = new DependenciesCommand(undefined as any);
      assert.ok(command.description.includes('dependencies.global'));
    });
  });
});
