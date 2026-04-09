/**
 * Integration tests for SDK v4.5.0 metadata coverage
 * These tests read actual resource files from disk (no mocks) to verify content correctness.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';

// Use process.cwd() as project root (same as setup.js mock for getProjectRootPath)
const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

describe('SDK v4.5.0 Types - Integration Tests', () => {

  describe('Enum completeness', () => {
    it('should have new v4.5.0 enum entries', () => {
      expect(ServiceNowMetadataType.INSTANCE_SCAN).toBe('instance-scan');
      expect(ServiceNowMetadataType.NOW_ASSIST_SKILL_CONFIG).toBe('now-assist-skill-config');
      expect(ServiceNowMetadataType.AI_AGENT).toBe('ai-agent');
      expect(ServiceNowMetadataType.AI_AGENT_WORKFLOW).toBe('ai-agent-workflow');
    });
  });

  describe('SDK v4.5.0 resource files', () => {
    const v450Types = [
      'instance-scan',
      'now-assist-skill-config',
      'ai-agent',
      'ai-agent-workflow',
    ];

    it('should have spec/instruct/snippet coverage for each v4.5.0 type', () => {
      for (const metadataType of v450Types) {
        const specFile = path.join(SPEC_DIR, `fluent_spec_${metadataType}.md`);
        const instructFile = path.join(INSTRUCT_DIR, `fluent_instruct_${metadataType}.md`);
        expect(fs.existsSync(specFile)).toBe(true);
        expect(fs.existsSync(instructFile)).toBe(true);

        const snippetCandidates = fs
          .readdirSync(SNIPPET_DIR)
          .filter((file) => file.startsWith(`fluent_snippet_${metadataType}_`) && file.endsWith('.md'));
        expect(snippetCandidates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Instance Scan resource files', () => {
    it('should have spec with all four check type API signatures', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_instance-scan.md'), 'utf-8'
      );
      const expectedTerms = [
        'LinterCheck(', 'ScriptOnlyCheck(', 'ColumnTypeCheck(', 'TableCheck(',
        '$id', 'name', 'category', 'active',
        'columnType', 'conditions', 'priority', 'shortDescription',
      ];
      for (const term of expectedTerms) {
        expect(content).toContain(term);
      }
    });

    it('should have instruct with guidance for all check types', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_instance-scan.md'), 'utf-8'
      );
      const expectedTerms = [
        '@servicenow/sdk/core', 'LinterCheck', 'ScriptOnlyCheck',
        'ColumnTypeCheck', 'TableCheck', 'category',
      ];
      for (const term of expectedTerms) {
        expect(content).toContain(term);
      }
    });

    it('should have snippet 0001 with LinterCheck example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_instance-scan_0001.md'), 'utf-8'
      );
      expect(content).toContain('LinterCheck(');
      expect(content).toContain('script');
      expect(content).toContain('priority');
    });

    it('should have snippet 0002 with ScriptOnlyCheck example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_instance-scan_0002.md'), 'utf-8'
      );
      expect(content).toContain('ScriptOnlyCheck(');
      expect(content).toContain('script');
    });

    it('should have snippet 0003 with ColumnTypeCheck and TableCheck', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_instance-scan_0003.md'), 'utf-8'
      );
      expect(content).toContain('ColumnTypeCheck(');
      expect(content).toContain('TableCheck(');
      expect(content).toContain('columnType');
    });
  });

  describe('NowAssist Skill Config resource files', () => {
    it('should have spec with NowAssistSkillConfig API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_now-assist-skill-config.md'), 'utf-8'
      );
      expect(content).toContain('NowAssistSkillConfig(');
      expect(content).toContain('$id');
      expect(content).toContain('name');
      expect(content).toContain('securityControls');
      expect(content).toContain('inputs');
      expect(content).toContain('outputs');
    });

    it('should have instruct with guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md'), 'utf-8'
      );
      expect(content).toContain('@servicenow/sdk/core');
      expect(content).toContain('NowAssistSkillConfig');
    });
  });

  describe('AI Agent resource files', () => {
    it('should have spec with AiAgent API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_ai-agent.md'), 'utf-8'
      );
      expect(content).toContain('AiAgent(');
      expect(content).toContain('$id');
      expect(content).toContain('agentRole');
      expect(content).toContain('tools');
    });

    it('should have instruct with guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent.md'), 'utf-8'
      );
      expect(content).toContain('@servicenow/sdk/core');
      expect(content).toContain('AiAgent');
      expect(content).toContain('AiAgenticWorkflow');
    });
  });

  describe('AI Agent Workflow resource files', () => {
    it('should have spec with AiAgenticWorkflow API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_ai-agent-workflow.md'), 'utf-8'
      );
      expect(content).toContain('AiAgenticWorkflow(');
      expect(content).toContain('$id');
      expect(content).toContain('executionMode');
      expect(content).toContain('triggerConfig');
    });

    it('should have instruct with guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent-workflow.md'), 'utf-8'
      );
      expect(content).toContain('@servicenow/sdk/core');
      expect(content).toContain('AiAgenticWorkflow');
    });
  });

  describe('Updated Service Portal resources', () => {
    it('should contain SPPage, SPTheme, and SPMenu API signatures in spec', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_service-portal.md'), 'utf-8'
      );
      expect(content).toContain('SPPage(');
      expect(content).toContain('SPTheme(');
      expect(content).toContain('SPMenu(');
      expect(content).toContain('SPWidget('); // existing API still present
    });

    it('should contain SPPage, SPTheme, and SPMenu guidance in instruct', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_service-portal.md'), 'utf-8'
      );
      expect(content).toContain('SPPage');
      expect(content).toContain('SPTheme');
      expect(content).toContain('SPMenu');
    });

    it('should have new snippets for SPPage, SPTheme, and SPMenu', () => {
      expect(
        fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_service-portal_0016.md'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_service-portal_0017.md'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_service-portal_0018.md'))
      ).toBe(true);
    });
  });

  describe('Updated Scheduled Script resources', () => {
    it('should contain ScheduledScript Fluent API in spec', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_scheduled-script.md'), 'utf-8'
      );
      expect(content).toContain('ScheduledScript(');
      expect(content).toContain('@servicenow/sdk/core');
      expect(content).toContain('frequency');
      expect(content).toContain('timeZone');
    });

    it('should reference Fluent API in instruct', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_scheduled-script.md'), 'utf-8'
      );
      expect(content).toContain('ScheduledScript');
      expect(content).toContain('@servicenow/sdk/core');
    });
  });

  describe('Updated Flow resources', () => {
    it('should document runAs system default in spec', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_flow.md'), 'utf-8'
      );
      expect(content).toContain("default: 'system' since SDK v4.5.0");
    });

    it('should document auto-publish and skip-flow-activation in instruct', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_flow.md'), 'utf-8'
      );
      expect(content).toContain('auto-published');
      expect(content).toContain('--skip-flow-activation');
      expect(content).toContain("since SDK v4.5.0");
    });
  });
});
