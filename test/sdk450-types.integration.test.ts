/**
 * Integration tests for SDK v4.5.0 metadata coverage
 * These tests read actual resource files from disk (no mocks) to verify content correctness.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';

// Use process.cwd() as project root (the repository root under npm run)
const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

describe('SDK v4.5.0 Types - Integration Tests', () => {

  describe('Enum completeness', () => {
    it('should have new v4.5.0 enum entries', () => {
      assert.equal(ServiceNowMetadataType.INSTANCE_SCAN, 'instance-scan');
      assert.equal(ServiceNowMetadataType.NOW_ASSIST_SKILL_CONFIG, 'now-assist-skill-config');
      assert.equal(ServiceNowMetadataType.AI_AGENT, 'ai-agent');
      assert.equal(ServiceNowMetadataType.AI_AGENT_WORKFLOW, 'ai-agent-workflow');
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
        assert.equal(fs.existsSync(specFile), true);
        assert.equal(fs.existsSync(instructFile), true);

        const snippetCandidates = fs
          .readdirSync(SNIPPET_DIR)
          .filter((file) => file.startsWith(`fluent_snippet_${metadataType}_`) && file.endsWith('.md'));
        assert.ok(snippetCandidates.length > 0);
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
        assert.ok(content.includes(term));
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
        assert.ok(content.includes(term));
      }
    });

    it('should have snippet 0001 with LinterCheck example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_instance-scan_0001.md'), 'utf-8'
      );
      assert.ok(content.includes('LinterCheck('));
      assert.ok(content.includes('script'));
      assert.ok(content.includes('priority'));
    });

    it('should have snippet 0002 with ScriptOnlyCheck example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_instance-scan_0002.md'), 'utf-8'
      );
      assert.ok(content.includes('ScriptOnlyCheck('));
      assert.ok(content.includes('script'));
    });

    it('should have snippet 0003 with ColumnTypeCheck and TableCheck', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_instance-scan_0003.md'), 'utf-8'
      );
      assert.ok(content.includes('ColumnTypeCheck('));
      assert.ok(content.includes('TableCheck('));
      assert.ok(content.includes('columnType'));
    });
  });

  describe('NowAssist Skill Config resource files', () => {
    it('should have spec with NowAssistSkillConfig API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_now-assist-skill-config.md'), 'utf-8'
      );
      assert.ok(content.includes('NowAssistSkillConfig('));
      assert.ok(content.includes('$id'));
      assert.ok(content.includes('name'));
      assert.ok(content.includes('securityControls'));
      assert.ok(content.includes('inputs'));
      assert.ok(content.includes('outputs'));
    });

    it('should have instruct with guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md'), 'utf-8'
      );
      assert.ok(content.includes('@servicenow/sdk/core'));
      assert.ok(content.includes('NowAssistSkillConfig'));
    });
  });

  describe('AI Agent resource files', () => {
    it('should have spec with AiAgent API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_ai-agent.md'), 'utf-8'
      );
      assert.ok(content.includes('AiAgent('));
      assert.ok(content.includes('$id'));
      assert.ok(content.includes('agentRole'));
      assert.ok(content.includes('tools'));
    });

    it('should have instruct with guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent.md'), 'utf-8'
      );
      assert.ok(content.includes('@servicenow/sdk/core'));
      assert.ok(content.includes('AiAgent'));
      assert.ok(content.includes('AiAgenticWorkflow'));
    });
  });

  describe('AI Agent Workflow resource files', () => {
    it('should have spec with AiAgenticWorkflow API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_ai-agent-workflow.md'), 'utf-8'
      );
      assert.ok(content.includes('AiAgenticWorkflow('));
      assert.ok(content.includes('$id'));
      assert.ok(content.includes('executionMode'));
      assert.ok(content.includes('triggerConfig'));
    });

    it('should have instruct with guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent-workflow.md'), 'utf-8'
      );
      assert.ok(content.includes('@servicenow/sdk/core'));
      assert.ok(content.includes('AiAgenticWorkflow'));
    });
  });

  describe('Updated Service Portal resources', () => {
    it('should contain SPPage, SPTheme, and SPMenu API signatures in spec', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_service-portal.md'), 'utf-8'
      );
      assert.ok(content.includes('SPPage('));
      assert.ok(content.includes('SPTheme('));
      assert.ok(content.includes('SPMenu('));
      assert.ok(content.includes('SPWidget(')); // existing API still present
    });

    it('should contain SPPage, SPTheme, and SPMenu guidance in instruct', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_service-portal.md'), 'utf-8'
      );
      assert.ok(content.includes('SPPage'));
      assert.ok(content.includes('SPTheme'));
      assert.ok(content.includes('SPMenu'));
    });

    it('should have new snippets for SPPage, SPTheme, and SPMenu', () => {
      assert.equal(fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_service-portal_0016.md')), true);
      assert.equal(fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_service-portal_0017.md')), true);
      assert.equal(fs.existsSync(path.join(SNIPPET_DIR, 'fluent_snippet_service-portal_0018.md')), true);
    });
  });

  describe('Updated Scheduled Script resources', () => {
    it('should contain ScheduledScript Fluent API in spec', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_scheduled-script.md'), 'utf-8'
      );
      assert.ok(content.includes('ScheduledScript('));
      assert.ok(content.includes('@servicenow/sdk/core'));
      assert.ok(content.includes('frequency'));
      assert.ok(content.includes('timeZone'));
    });

    it('should reference Fluent API in instruct', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_scheduled-script.md'), 'utf-8'
      );
      assert.ok(content.includes('ScheduledScript'));
      assert.ok(content.includes('@servicenow/sdk/core'));
    });
  });

  describe('Updated Flow resources', () => {
    it('should document runAs system default in spec', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_flow.md'), 'utf-8'
      );
      assert.ok(content.includes("default: 'system' since SDK v4.5.0"));
    });

    it('should document auto-publish and skip-flow-activation in instruct', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_flow.md'), 'utf-8'
      );
      assert.ok(content.includes('auto-published'));
      assert.ok(content.includes('--skip-flow-activation'));
      assert.ok(content.includes("since SDK v4.5.0"));
    });
  });
});
