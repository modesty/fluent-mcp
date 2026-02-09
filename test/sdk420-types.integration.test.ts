/**
 * Integration tests for SDK v4.2.0 new types
 * These tests read actual resource files from disk (no mocks) to verify content correctness.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types/index.js';
import { DependenciesCommand } from '../src/tools/commands/dependenciesCommand.js';

// Use process.cwd() as project root (same as setup.js mock for getProjectRootPath)
const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

describe('SDK v4.2.0 Types - Integration Tests', () => {

  describe('Enum completeness', () => {
    it('should have IMPORT_SET enum entry', () => {
      expect(ServiceNowMetadataType.IMPORT_SET).toBe('import-set');
    });

    it('should have UI_POLICY enum entry', () => {
      expect(ServiceNowMetadataType.UI_POLICY).toBe('ui-policy');
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
      expect(fs.existsSync(specFile)).toBe(true);
      expect(fs.existsSync(instructFile)).toBe(true);
      for (const file of snippetFiles) {
        expect(fs.existsSync(file)).toBe(true);
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
        expect(content).toContain(term);
      }
    });

    it('should have instruct with key guidance', () => {
      const content = fs.readFileSync(instructFile, 'utf-8');
      const expectedTerms = [
        '@servicenow/sdk/core', '$id', 'targetTable', 'sourceTable',
        'coalesce', 'choiceAction', 'enforceMandatoryFields', 'onBefore',
      ];
      for (const term of expectedTerms) {
        expect(content).toContain(term);
      }
    });

    it('should have snippet 0001 with basic field mappings', () => {
      const content = fs.readFileSync(snippetFiles[0], 'utf-8');
      expect(content).toContain('ImportSet(');
      expect(content).toContain('fields');
    });

    it('should have snippet 0002 with coalesce and choice actions', () => {
      const content = fs.readFileSync(snippetFiles[1], 'utf-8');
      expect(content).toContain('coalesce');
      expect(content).toContain('choiceAction');
      expect(content).toContain('dateFormat');
    });

    it('should have snippet 0003 with transform scripts', () => {
      const content = fs.readFileSync(snippetFiles[2], 'utf-8');
      expect(content).toContain('scripts');
      expect(content).toContain('when:');
      expect(content.includes('onBefore') || content.includes('onAfter')).toBe(true);
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
      expect(fs.existsSync(specFile)).toBe(true);
      expect(fs.existsSync(instructFile)).toBe(true);
      for (const file of snippetFiles) {
        expect(fs.existsSync(file)).toBe(true);
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
        expect(content).toContain(term);
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
        expect(content).toContain(term);
      }
    });

    it('should have snippet 0001 with basic actions', () => {
      const content = fs.readFileSync(snippetFiles[0], 'utf-8');
      expect(content).toContain('UiPolicy(');
      expect(content).toContain('actions');
      expect(content).toContain('visible');
      expect(content).toContain('mandatory');
    });

    it('should have snippet 0002 with conditional scripts', () => {
      const content = fs.readFileSync(snippetFiles[1], 'utf-8');
      expect(content).toContain('scriptTrue');
      expect(content).toContain('scriptFalse');
      expect(content).toContain('runScripts');
    });

    it('should have snippet 0003 with related list actions and field messages', () => {
      const content = fs.readFileSync(snippetFiles[2], 'utf-8');
      expect(content).toContain('relatedListActions');
      expect(content).toContain('fieldMessage');
    });
  });

  describe('Column spec - new types', () => {
    const specFile = path.join(SPEC_DIR, 'fluent_spec_column.md');
    let content: string;

    beforeAll(() => {
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
        expect(content).toContain(type);
      }
    });

    it('should contain utility helpers', () => {
      expect(content).toContain('Duration(');
      expect(content).toContain('Time(');
      expect(content).toContain('FieldList');
      expect(content).toContain('TemplateValue');
      expect(content).toContain('Now.attach');
    });
  });

  describe('Column snippets - new types', () => {
    it('should have snippet 0003 with DurationColumn, TimeColumn, and JsonColumn', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_column_0003.md'), 'utf-8'
      );
      expect(content).toContain('DurationColumn');
      expect(content).toContain('TimeColumn');
      expect(content).toContain('JsonColumn');
    });

    it('should have snippet 0004 with FieldListColumn, TemplateValueColumn, and SlushBucketColumn', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_column_0004.md'), 'utf-8'
      );
      expect(content).toContain('FieldListColumn');
      expect(content).toContain('TemplateValueColumn');
      expect(content).toContain('SlushBucketColumn');
      expect(content).toContain('FieldList<');
      expect(content).toContain('TemplateValue<');
    });

    it('should have snippet 0005 with Now.attach and BasicImageColumn', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_column_0005.md'), 'utf-8'
      );
      expect(content).toContain('Now.attach');
      expect(content).toContain('BasicImageColumn');
    });
  });

  describe('Table instructions - updated', () => {
    it('should contain Now.attach and dependencies.global references', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_table.md'), 'utf-8'
      );
      expect(content).toContain('Now.attach');
      expect(content).toContain('dependencies.global');
    });
  });

  describe('DependenciesCommand description', () => {
    it('should reference dependencies.global in description', () => {
      const command = new DependenciesCommand(undefined as any);
      expect(command.description).toContain('dependencies.global');
    });
  });
});
