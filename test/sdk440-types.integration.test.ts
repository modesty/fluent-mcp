/**
 * Integration tests for SDK v4.4.0 metadata coverage
 * These tests read actual resource files from disk (no mocks) to verify content correctness.
 */
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DependenciesCommand } from '../src/tools/commands/dependenciesCommand.js';

// Use process.cwd() as project root (the repository root under npm run)
const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

describe('SDK v4.4.0 Types - Integration Tests', () => {

  describe('ImportSet resource files', () => {
    const specFile = path.join(SPEC_DIR, 'fluent_spec_import-set.md');
    const instructFile = path.join(INSTRUCT_DIR, 'fluent_instruct_import-set.md');
    const snippetFiles = [
      path.join(SNIPPET_DIR, 'fluent_snippet_import-set_0001.md'),
      path.join(SNIPPET_DIR, 'fluent_snippet_import-set_0002.md'),
      path.join(SNIPPET_DIR, 'fluent_snippet_import-set_0003.md'),
    ];

    it('should have spec with key API signatures', () => {
      const content = fs.readFileSync(specFile, 'utf-8');
      const expectedTerms = [
        'ImportSet(', 'targetTable', 'sourceTable',
        'fields:', 'scripts:', 'enforceMandatoryFields', 'coalesce',
        'choiceAction', 'dateFormat', 'onBefore', 'onAfter', 'onComplete',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with key guidance', () => {
      const content = fs.readFileSync(instructFile, 'utf-8');
      const expectedTerms = [
        '@servicenow/sdk/core', 'targetTable', 'sourceTable',
        'coalesce', 'choiceAction', 'enforceMandatoryFields', 'onBefore',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have snippet 0001 with basic field mappings', () => {
      const content = fs.readFileSync(snippetFiles[0], 'utf-8');
      assert.ok(content.includes('ImportSet('));
      assert.ok(content.includes('fields:'));
    });

    it('should have snippet 0002 with coalesce and choice actions', () => {
      const content = fs.readFileSync(snippetFiles[1], 'utf-8');
      assert.ok(content.includes('coalesce'));
      assert.ok(content.includes('choiceAction'));
      assert.ok(content.includes('dateFormat'));
    });

    it('should have snippet 0003 with transform scripts', () => {
      const content = fs.readFileSync(snippetFiles[2], 'utf-8');
      assert.ok(content.includes('scripts:'));
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

    it('should have spec with key API signatures', () => {
      const content = fs.readFileSync(specFile, 'utf-8');
      const expectedTerms = [
        'UiPolicy(', 'shortDescription', 'actions:',
        'visible:', 'readOnly', 'mandatory:', "'ignore'",
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
        '@servicenow/sdk/core', 'shortDescription',
        '`actions`', 'reverseIfFalse', 'runScripts',
        'relatedListActions', 'fieldMessage',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have snippet 0001 with basic actions', () => {
      const content = fs.readFileSync(snippetFiles[0], 'utf-8');
      assert.ok(content.includes('UiPolicy('));
      assert.ok(content.includes('actions:'));
      assert.ok(content.includes('visible:'));
      assert.ok(content.includes('mandatory:'));
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
