/**
 * Integration tests for SDK v4.7.0/4.7.1 metadata coverage.
 * These tests read actual resource files from disk (no mocks) to verify content correctness
 * for the new `data-policy` metadata type and updates to existing resources introduced in v4.7.x.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';
import { VALID_TEMPLATES } from '../src/tools/commands/init/types.js';

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');
const PROMPT_DIR = path.join(RES_DIR, 'prompt');

const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');

describe('SDK v4.7.0 Types - Integration Tests', () => {

  describe('Enum completeness', () => {
    it('should have the new v4.7.0 data-policy enum entry', () => {
      expect(ServiceNowMetadataType.DATA_POLICY).toBe('data-policy');
    });
  });

  describe('New data-policy resource files', () => {
    it('should have spec/instruct/snippet coverage for data-policy', () => {
      expect(fs.existsSync(path.join(SPEC_DIR, 'fluent_spec_data-policy.md'))).toBe(true);
      expect(fs.existsSync(path.join(INSTRUCT_DIR, 'fluent_instruct_data-policy.md'))).toBe(true);
      const snippets = fs.readdirSync(SNIPPET_DIR)
        .filter((f) => f.startsWith('fluent_snippet_data-policy_') && f.endsWith('.md'));
      expect(snippets.length).toBeGreaterThan(0);
    });

    it('spec should declare the DataPolicy API signature', () => {
      const content = read(SPEC_DIR, 'fluent_spec_data-policy.md');
      for (const term of [
        'DataPolicy(', 'sys_data_policy2', 'rules', 'mandatory', 'readOnly',
        'conditions', 'applyToImportSets', 'applyToSOAP', 'reverseIfFalse', 'inherit',
      ]) {
        expect(content).toContain(term);
      }
    });

    it('instruct should explain server-side enforcement and dot-walk rules', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_data-policy.md');
      expect(content).toContain('@servicenow/sdk/core');
      expect(content).toContain('server-side');
      expect(content).toContain('dot-walk');
      expect(content).toContain('UI Policy');
    });

    it('snippet 0001 should define a data policy with field rules', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_data-policy_0001.md');
      expect(content).toContain('DataPolicy(');
      expect(content).toContain('rules:');
      expect(content).toContain('mandatory: true');
    });
  });

  describe('Updated Flow resources (v4.7.0)', () => {
    it('spec should document tryCatch, doInParallel, appendToFlowVariables, FlowStage', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      for (const term of [
        'wfa.flowLogic.tryCatch', 'wfa.flowLogic.doInParallel',
        'wfa.flowLogic.appendToFlowVariables', 'FlowStage', 'wfa.stage', 'SDK v4.7.0',
      ]) {
        expect(content).toContain(term);
      }
    });

    it('instruct should document v4.7.0 flow control additions', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_flow.md');
      expect(content).toContain('SDK v4.7.0');
      expect(content).toContain('tryCatch');
      expect(content).toContain('doInParallel');
      expect(content).toContain('appendToFlowVariables');
      expect(content).toContain('FlowStage');
    });

    it('snippet 0002 should demonstrate stages, tryCatch and doInParallel', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_flow_0002.md');
      expect(content).toContain('FlowStage(');
      expect(content).toContain('wfa.flowLogic.tryCatch');
      expect(content).toContain('wfa.flowLogic.doInParallel');
      expect(content).toContain('wfa.stage(');
    });
  });

  describe('Updated Table resources (v4.7.0)', () => {
    it('spec should document the augments mode and u_ prefix requirement', () => {
      const content = read(SPEC_DIR, 'fluent_spec_table.md');
      expect(content).toContain('augments');
      expect(content).toContain('SDK v4.7.0');
      expect(content).toContain('u_');
    });

    it('instruct should document table augments', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_table.md');
      expect(content).toContain('SDK v4.7.0');
      expect(content).toContain('augments');
    });

    it('snippet 0005 should use augments with u_-prefixed columns', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_table_0005.md');
      expect(content).toContain("augments: 'incident'");
      expect(content).toContain('u_');
    });
  });

  describe('Updated AI Agent resources (v4.7.0)', () => {
    it('spec should document agentDescriptor and dataAccess role formats', () => {
      const content = read(SPEC_DIR, 'fluent_spec_ai-agent.md');
      expect(content).toContain('agentDescriptor');
      expect(content).toContain('roleMap');
      expect(content).toContain('roleList');
      expect(content).toContain('securityAcl');
    });

    it('instruct should document v4.7.0 dataAccess role formats and agentDescriptor', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_ai-agent.md');
      expect(content).toContain('SDK v4.7.0');
      expect(content).toContain('roleMap');
      expect(content).toContain('agentDescriptor');
    });
  });

  describe('Updated NowAssist Skill Config resources (v4.7.0)', () => {
    it('spec should document roleMap alongside roleRestrictions', () => {
      const content = read(SPEC_DIR, 'fluent_spec_now-assist-skill-config.md');
      expect(content).toContain('roleMap');
      expect(content).toContain('roleRestrictions');
    });

    it('instruct should document the v4.7.0 role-format choice', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md');
      expect(content).toContain('SDK v4.7.0');
      expect(content).toContain('roleMap');
      expect(content).toContain('roleRestrictions');
    });
  });

  describe('protectionPolicy coverage (v4.7.0)', () => {
    it('custom-action spec should document protectionPolicy', () => {
      const content = read(SPEC_DIR, 'fluent_spec_custom-action.md');
      expect(content).toContain('protectionPolicy');
    });

    it('scripted-rest spec should prefer protectionPolicy over deprecated policy', () => {
      const content = read(SPEC_DIR, 'fluent_spec_scripted-rest.md');
      expect(content).toContain('protectionPolicy');
      expect(content).toContain('DEPRECATED');
    });
  });

  describe('Cross-cutting capabilities in coding_in_fluent prompt (v4.7.0)', () => {
    it('should list SDK v4.7.0 capabilities including DataPolicy, $override, protectionPolicy', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      expect(content).toContain('SDK v4.7.0');
      expect(content).toContain('DataPolicy');
      expect(content).toContain('$override');
      expect(content).toContain('protectionPolicy');
      expect(content).toContain('augments');
    });
  });

  describe('ATF Service Portal form instruct gap filled', () => {
    it('should provide an instruct file for atf-form-sp', () => {
      expect(fs.existsSync(path.join(INSTRUCT_DIR, 'fluent_instruct_atf-form-sp.md'))).toBe(true);
      const content = read(INSTRUCT_DIR, 'fluent_instruct_atf-form-sp.md');
      expect(content).toContain('atf.form_SP');
    });
  });

  describe('CLI tool updates (v4.7.0)', () => {
    it('init should offer the new typescript.vue template', () => {
      expect(VALID_TEMPLATES).toContain('typescript.vue');
    });
  });
});
