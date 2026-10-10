/**
 * Integration tests for SDK v4.9.0 metadata coverage.
 * These tests read actual resource files from disk (no mocks) to verify content correctness
 * for the new metadata type (atf-ui-test-script) and the changed APIs introduced in v4.9.0
 * (Role.federatedId, AiAgent/AiAgenticWorkflow protectionPolicy, multi-language choice labels,
 * table index platform columns, and the new NASK LLM providers).
 *
 * Source-of-truth directive: the locally-installed 4.9.0 package wins wherever it diverges from
 * the release note. Two release-note claims that the installed docs do NOT corroborate are
 * asserted as corrections here:
 *   - Form `table_field.field` "any string" — docs describe it as a schema column name; our spec
 *     already types it `string`, so no loosening is claimed.
 *   - The 4 named NASK model strings (gpt-5-mini, etc.) appear nowhere in the installed package
 *     (`model` is a free `string`); we do not hardcode them as a documented enum.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');
const PROMPT_DIR = path.join(RES_DIR, 'prompt');

const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');

const NEW_TYPES: Array<[keyof typeof ServiceNowMetadataType, string]> = [
  ['ATF_UI_TEST_SCRIPT', 'atf-ui-test-script'],
];

describe('SDK v4.9.0 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    for (const [key, value] of NEW_TYPES) {
      it(`should have the new v4.9.0 enum entry ${key}`, () => {
        assert.equal(ServiceNowMetadataType[key], value);
      });
    }
  });

  describe('New resource files exist for each new type', () => {
    for (const [key, value] of NEW_TYPES) {
      it(`${key} has spec/instruct/snippet coverage (${value})`, () => {
        assert.equal(fs.existsSync(path.join(SPEC_DIR, `fluent_spec_${value}.md`)), true);
        assert.equal(fs.existsSync(path.join(INSTRUCT_DIR, `fluent_instruct_${value}.md`)), true);
        const snippets = fs.readdirSync(SNIPPET_DIR)
          .filter((f) => f.startsWith(`fluent_snippet_${value}_`) && f.endsWith('.md'));
        assert.ok(snippets.length > 0);
      });
    }
  });

  describe('atf-ui-test-script (UI Test Script / TestingLibrary) resources', () => {
    it('spec should document the runTest step and the injected script globals', () => {
      const content = read(SPEC_DIR, 'fluent_spec_atf-ui-test-script.md');
      for (const term of [
        'atf.uiTestScript.runTest', 'Now.include', 'script', 'screen', 'user',
        'sn_atf', 'waitFor', 'within', '8000',
      ]) {
        assert.ok(content.includes(term));
      }
    });

    it('instruct should reference the shared ATF scaffold and the src/fluent/atf location', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_atf-ui-test-script.md');
      assert.ok(content.includes('fluent_instruct_atf.md'));
      assert.ok(content.includes('atf.uiTestScript.runTest'));
      assert.ok(content.includes('src/fluent/atf/'));
    });

    it('snippet 0001 should define a Test with a uiTestScript.runTest step', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_atf-ui-test-script_0001.md');
      assert.ok(content.includes('Test('));
      assert.ok(content.includes('atf.uiTestScript.runTest('));
      assert.ok(content.includes('screen.findBy'));
    });
  });

  describe('Changed API resources (v4.9.0)', () => {
    it('role spec should document the federatedId property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_role.md');
      assert.ok(content.includes('federatedId'));
    });

    it('ai-agent spec should document protectionPolicy', () => {
      const content = read(SPEC_DIR, 'fluent_spec_ai-agent.md');
      assert.ok(content.includes('protectionPolicy'));
      assert.ok(content.includes("'read' | 'protected'"));
    });

    it('ai-agent-workflow spec should document protectionPolicy', () => {
      const content = read(SPEC_DIR, 'fluent_spec_ai-agent-workflow.md');
      assert.ok(content.includes('protectionPolicy'));
      assert.ok(content.includes("'read' | 'protected'"));
    });

    it('column spec should document multi-language choice labels (ChoiceConfig array + language)', () => {
      const content = read(SPEC_DIR, 'fluent_spec_column.md');
      for (const term of ['ChoiceConfig', 'language', 'BCP 47', 'MULTIPLE LANGUAGES']) {
        assert.ok(content.includes(term));
      }
    });

    it('table spec index element should note platform default columns', () => {
      const content = read(SPEC_DIR, 'fluent_spec_table.md');
      assert.ok(content.includes('sys_created_on'));
    });

    it('now-assist-skill-config spec should list the new v4.9.0 LLM providers', () => {
      const content = read(SPEC_DIR, 'fluent_spec_now-assist-skill-config.md');
      for (const provider of ['Now LLM LTS Generic', 'Google Cloud Vertex AI', 'Amazon Bedrock']) {
        assert.ok(content.includes(provider));
      }
    });
  });

  describe('Cross-cutting capabilities in coding_in_fluent prompt (v4.9.0)', () => {
    it('should list SDK v4.9.0 capabilities including the new type and changed APIs', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      assert.ok(content.includes('SDK v4.9.0'));
      for (const term of [
        'atf.uiTestScript.runTest', 'Multi-language choice labels', 'protectionPolicy',
        'federatedId', 'Amazon Bedrock',
      ]) {
        assert.ok(content.includes(term));
      }
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('form spec keeps table_field.field typed as a schema column name (no "any string" loosening)', () => {
      const content = read(SPEC_DIR, 'fluent_spec_form.md');
      // The installed docs describe `field` as "Column name from the table schema"; do not claim "any string".
      assert.ok(!content.includes('any string'));
      assert.ok(content.includes('column name from the table schema'));
    });

    it('now-assist-skill-config spec does NOT hardcode the undocumented 4.9.0 model strings', () => {
      const content = read(SPEC_DIR, 'fluent_spec_now-assist-skill-config.md');
      // These model names appear nowhere in the installed package; model is a free string.
      for (const model of ['gpt-5-mini', 'gemini_small', 'claude-haiku-4-5', 'llm_generic_small_v2-lts']) {
        assert.ok(!content.includes(model));
      }
    });

    it('scheduled-script spec already documents object inputs and protectionPolicy (no change needed in 4.9.0)', () => {
      const content = read(SPEC_DIR, 'fluent_spec_scheduled-script.md');
      assert.ok(content.includes('executionTime'));
      assert.ok(content.includes('maxDrift'));
      assert.ok(content.includes('protectionPolicy'));
    });
  });
});
