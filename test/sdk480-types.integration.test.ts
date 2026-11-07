/**
 * Integration tests for SDK v4.8.0 metadata coverage.
 * These tests read actual resource files from disk (no mocks) to verify content correctness
 * for the new metadata types (playbook, rest-message, alias, alias-template, retry-policy,
 * data-lookup) and the cross-cutting capabilities introduced in v4.8.0.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');
const PROMPT_DIR = path.join(RES_DIR, 'prompt');

const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');

describe('SDK v4.8.0 Types - Integration Tests', () => {
  describe('PlaybookDefinition resources', () => {
    it('spec should declare the 3-argument DSL from @servicenow/sdk/automation', () => {
      const content = read(SPEC_DIR, 'fluent_spec_playbook.md');
      for (const term of [
        'PlaybookDefinition(', '@servicenow/sdk/automation', 'sys_pd_process_definition',
        'wfa.playbook.trigger', 'wfa.playbook.lane', 'wfa.playbook.activity', 'startRule',
        'restartRule', 'ActivityDefinitions', 'parentTable',
      ]) {
        assert.ok(content.includes(term));
      }
    });

    it('instruct should explain lanes callback and the required triggers array', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_playbook.md');
      assert.ok(content.includes('@servicenow/sdk/automation'));
      assert.ok(content.includes('three arguments'));
      assert.ok(content.includes('callback'));
      assert.ok(content.includes('required even when empty'));
    });

    it('snippet 0001 should define a playbook with a trigger, lane, and activity', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_playbook_0001.md');
      assert.ok(content.includes('PlaybookDefinition('));
      assert.ok(content.includes('wfa.playbook.lane('));
      assert.ok(content.includes('wfa.playbook.activity('));
    });
  });

  describe('RestMessage resources', () => {
    it('spec should declare RestMessage with functions and variables', () => {
      const content = read(SPEC_DIR, 'fluent_spec_rest-message.md');
      for (const term of ['RestMessage(', 'sys_rest_message', 'functions:', 'httpMethod', 'variables:', 'queryParams', 'authenticationType']) {
        assert.ok(content.includes(term));
      }
    });
  });

  describe('Alias / AliasTemplate / RetryPolicy resources', () => {
    it('alias spec should document connection/credential types and composable references', () => {
      const content = read(SPEC_DIR, 'fluent_spec_alias.md');
      for (const term of ['Alias(', 'sys_alias', 'connectionType', 'retryPolicy', 'configurationTemplate']) {
        assert.ok(content.includes(term));
      }
    });

    it('alias-template spec should document dynamicDataSchema and defaultDataTemplate', () => {
      const content = read(SPEC_DIR, 'fluent_spec_alias-template.md');
      for (const term of ['AliasTemplate(', 'sys_alias_templates', 'dynamicDataSchema', 'defaultDataTemplate', 'connectionFields', 'credentialFields']) {
        assert.ok(content.includes(term));
      }
    });

    it('retry-policy spec should document the discriminated strategies', () => {
      const content = read(SPEC_DIR, 'fluent_spec_retry-policy.md');
      for (const term of ['RetryPolicy(', 'sys_retry_policy', 'fixed_time_interval', 'exponential_backoff', 'retry_after', 'maxElapsedTime']) {
        assert.ok(content.includes(term));
      }
    });
  });

  describe('DataLookup resources', () => {
    it('spec should document matcher/source tables and match/set rules', () => {
      const content = read(SPEC_DIR, 'fluent_spec_data-lookup.md');
      for (const term of ['DataLookup(', 'dl_definition', 'sourceTable', 'matcherTable', 'matchRules', 'setRules', 'dl_matcher']) {
        assert.ok(content.includes(term));
      }
    });

    it('instruct should warn about runOnUpdate default and active matcher rows', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_data-lookup.md');
      assert.ok(content.includes('runOnUpdate'));
      assert.ok(content.includes('active = true'));
    });
  });

  describe('Cross-cutting capabilities in coding_in_fluent prompt (v4.8.0)', () => {
    it('should list the v4.8.0 APIs, Now.del, $meta and now-sdk query', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      for (const term of ['PlaybookDefinition', 'RestMessage', 'Alias', 'RetryPolicy', 'DataLookup', 'Now.del()', '$meta', 'now-sdk query']) {
        assert.ok(content.includes(term));
      }
    });
  });

  describe('Existing resource updates (v4.8.0)', () => {
    it('acl spec should document field typing and $meta installMethod', () => {
      const content = read(SPEC_DIR, 'fluent_spec_acl.md');
      assert.ok(content.includes('SystemColumns'));
      assert.ok(content.includes('$meta'));
      assert.ok(content.includes('installMethod'));
    });

    it('user-preference spec should document $override and $meta', () => {
      const content = read(SPEC_DIR, 'fluent_spec_user-preference.md');
      assert.ok(content.includes('$override'));
      assert.ok(content.includes('$meta'));
    });

    it('table spec should note the accessibleFrom public default', () => {
      const content = read(SPEC_DIR, 'fluent_spec_table.md');
      assert.match(content, /accessibleFrom: .*defaults to 'public'/);
    });
  });
});
