/**
 * Integration tests for SDK v4.8.0 metadata coverage.
 * These tests read actual resource files from disk (no mocks) to verify content correctness
 * for the new metadata types (playbook, rest-message, alias, alias-template, retry-policy,
 * data-lookup) and the cross-cutting capabilities introduced in v4.8.0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';
import { CommandFactory } from '../src/tools/registry/commandFactory.js';
import { QueryCommand } from '../src/tools/commands/queryCommand.js';

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');
const PROMPT_DIR = path.join(RES_DIR, 'prompt');

const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');

const NEW_TYPES: Array<[keyof typeof ServiceNowMetadataType, string]> = [
  ['ALIAS', 'alias'],
  ['ALIAS_TEMPLATE', 'alias-template'],
  ['DATA_LOOKUP', 'data-lookup'],
  ['PLAYBOOK', 'playbook'],
  ['REST_MESSAGE', 'rest-message'],
  ['RETRY_POLICY', 'retry-policy'],
];

describe('SDK v4.8.0 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    it.each(NEW_TYPES)('should have the new v4.8.0 enum entry %s', (key, value) => {
      expect(ServiceNowMetadataType[key]).toBe(value);
    });
  });

  describe('New resource files exist for each new type', () => {
    it.each(NEW_TYPES)('%s has spec/instruct/snippet coverage (%s)', (_key, value) => {
      expect(fs.existsSync(path.join(SPEC_DIR, `fluent_spec_${value}.md`))).toBe(true);
      expect(fs.existsSync(path.join(INSTRUCT_DIR, `fluent_instruct_${value}.md`))).toBe(true);
      const snippets = fs.readdirSync(SNIPPET_DIR)
        .filter((f) => f.startsWith(`fluent_snippet_${value}_`) && f.endsWith('.md'));
      expect(snippets.length).toBeGreaterThan(0);
    });
  });

  describe('PlaybookDefinition resources', () => {
    it('spec should declare the 3-argument DSL from @servicenow/sdk/automation', () => {
      const content = read(SPEC_DIR, 'fluent_spec_playbook.md');
      for (const term of [
        'PlaybookDefinition(', '@servicenow/sdk/automation', 'sys_pd_process_definition',
        'wfa.playbook.trigger', 'wfa.playbook.lane', 'wfa.playbook.activity', 'startRule',
        'restartRule', 'ActivityDefinitions', 'parentTable',
      ]) {
        expect(content).toContain(term);
      }
    });

    it('instruct should explain lanes callback and the required triggers array', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_playbook.md');
      expect(content).toContain('@servicenow/sdk/automation');
      expect(content).toContain('three arguments');
      expect(content).toContain('callback');
      expect(content).toContain('required even when empty');
    });

    it('snippet 0001 should define a playbook with a trigger, lane, and activity', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_playbook_0001.md');
      expect(content).toContain('PlaybookDefinition(');
      expect(content).toContain('wfa.playbook.lane(');
      expect(content).toContain('wfa.playbook.activity(');
    });
  });

  describe('RestMessage resources', () => {
    it('spec should declare RestMessage with functions and variables', () => {
      const content = read(SPEC_DIR, 'fluent_spec_rest-message.md');
      for (const term of ['RestMessage(', 'sys_rest_message', 'functions', 'httpMethod', 'variables', 'queryParams', 'authenticationType']) {
        expect(content).toContain(term);
      }
    });
  });

  describe('Alias / AliasTemplate / RetryPolicy resources', () => {
    it('alias spec should document connection/credential types and composable references', () => {
      const content = read(SPEC_DIR, 'fluent_spec_alias.md');
      for (const term of ['Alias(', 'sys_alias', 'connectionType', 'retryPolicy', 'configurationTemplate']) {
        expect(content).toContain(term);
      }
    });

    it('alias-template spec should document dynamicDataSchema and defaultDataTemplate', () => {
      const content = read(SPEC_DIR, 'fluent_spec_alias-template.md');
      for (const term of ['AliasTemplate(', 'sys_alias_templates', 'dynamicDataSchema', 'defaultDataTemplate', 'connectionFields', 'credentialFields']) {
        expect(content).toContain(term);
      }
    });

    it('retry-policy spec should document the discriminated strategies', () => {
      const content = read(SPEC_DIR, 'fluent_spec_retry-policy.md');
      for (const term of ['RetryPolicy(', 'sys_retry_policy', 'fixed_time_interval', 'exponential_backoff', 'retry_after', 'maxElapsedTime']) {
        expect(content).toContain(term);
      }
    });
  });

  describe('DataLookup resources', () => {
    it('spec should document matcher/source tables and match/set rules', () => {
      const content = read(SPEC_DIR, 'fluent_spec_data-lookup.md');
      for (const term of ['DataLookup(', 'dl_definition', 'sourceTable', 'matcherTable', 'matchRules', 'setRules', 'dl_matcher']) {
        expect(content).toContain(term);
      }
    });

    it('instruct should warn about runOnUpdate default and active matcher rows', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_data-lookup.md');
      expect(content).toContain('runOnUpdate');
      expect(content).toContain('active = true');
    });
  });

  describe('Cross-cutting capabilities in coding_in_fluent prompt (v4.8.0)', () => {
    it('should list SDK v4.8.0 capabilities including the new APIs and Now.del', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      expect(content).toContain('SDK v4.8.0');
      for (const term of ['PlaybookDefinition', 'RestMessage', 'Alias', 'RetryPolicy', 'DataLookup', 'Now.del()', '$meta', 'now-sdk query']) {
        expect(content).toContain(term);
      }
    });
  });

  describe('Existing resource updates (v4.8.0)', () => {
    it('acl spec should document field typing and $meta installMethod', () => {
      const content = read(SPEC_DIR, 'fluent_spec_acl.md');
      expect(content).toContain('SystemColumns');
      expect(content).toContain('$meta');
      expect(content).toContain('installMethod');
    });

    it('user-preference spec should document $override and $meta', () => {
      const content = read(SPEC_DIR, 'fluent_spec_user-preference.md');
      expect(content).toContain('$override');
      expect(content).toContain('$meta');
    });

    it('table spec should note the accessibleFrom public default', () => {
      const content = read(SPEC_DIR, 'fluent_spec_table.md');
      expect(content).toContain('SDK 4.8.0');
      expect(content).toContain('public');
    });

    it("scheduled-script spec should NOT claim a $meta property (not in installed SDK)", () => {
      const content = read(SPEC_DIR, 'fluent_spec_scheduled-script.md');
      expect(content).not.toContain('$meta');
    });
  });

  describe('CLI tool updates (v4.8.0) — query command', () => {
    it('should register the query_fluent_records command in the factory', () => {
      const mockExecutor = { process: jest.fn() };
      const commands = CommandFactory.createCommands(mockExecutor as never);
      expect(commands.map((c) => c.name)).toContain('query_fluent_records');
    });

    it('QueryCommand should require table and query, and be read-only', () => {
      const cmd = new QueryCommand({ process: jest.fn() } as never);
      expect(cmd.name).toBe('query_fluent_records');
      expect(cmd.annotations.readOnlyHint).toBe(true);
      const required = cmd.arguments.filter((a) => a.required).map((a) => a.name);
      expect(required).toEqual(expect.arrayContaining(['table', 'query']));
    });
  });
});
