/**
 * Integration tests for SDK v4.10.1 metadata coverage (features shipped across
 * 4.10.0 and 4.10.1). These tests read actual resource files from disk (no mocks)
 * to verify content correctness for the two new metadata types (state-model,
 * atf-list) and the changed APIs: Table `actions` object form, ReferenceColumn
 * `mtom`, UiAction icon properties, Form `$meta`, Playbook `timerSchedule`,
 * catalog dynamic-default widening, and the cross-cutting `$meta.useEsLatest`.
 *
 * Source-of-truth directive: the locally-installed package wins wherever it
 * diverges from the release note. The 4.10.0 note claims a few things the
 * installed package does not corroborate; those are asserted as corrections:
 *   - "Dependent questions" are a DYNAMIC DEFAULT VALUE, not visibility/options
 *     control. The property is not new either — only its type widened.
 *   - `runServerSideScript` "surface support" was already present in 4.9.0.
 *   - `add_message` inference removal is an internal transform fix with no
 *     authoring-surface change.
 * The docs also over-claim which APIs accept `$meta.useEsLatest`: `StateModel`,
 * `AliasTemplate`, `InboundEmailAction`, `CatalogItem`,
 * `CatalogItemRecordProducer`, and the instance-scan checks carry no
 * `Now.Internal.Meta` in their declarations.
 */
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
  ['ATF_LIST', 'atf-list'],
  ['STATE_MODEL', 'state-model'],
];

describe('SDK v4.10.1 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    it.each(NEW_TYPES)('should have the new v4.10.1 enum entry %s', (key, value) => {
      expect(ServiceNowMetadataType[key]).toBe(value);
    });

    it('should total 67 metadata types (65 before v4.10.1 + state-model + atf-list)', () => {
      expect(Object.values(ServiceNowMetadataType).length).toBe(67);
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

  describe('state-model (StateModel state machine) resources', () => {
    it('spec should document the API, its four core tables, and the polymorphic model table', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      for (const term of [
        'StateModel', '@servicenow/sdk/core',
        'sttrm_model', 'sttrm_state', 'sttrm_state_transition', 'sttrm_transition_condition',
        'chg_model', 'prb_model', 'prb_task_model',
        'stateField', 'transitions', 'conditions',
      ]) {
        expect(content).toContain(term);
      }
    });

    it('spec should document the closed unions and the build-validated open unions', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      // Closed unions — invalid literals are a compile error.
      expect(content).toContain("'general' | 'rca' | 'model'");
      expect(content).toContain("'standard' | 'normal' | 'emergency'");
      expect(content).toContain("'read' | 'write'");
      // Open-but-build-validated condition types; note the lowercase 'h' in 'Not On hold'.
      expect(content).toContain("'Transition Condition'");
      expect(content).toContain("'Mandatory Fields'");
      expect(content).toContain("'Not On hold'");
      expect(content).toContain('allowImplementation');
    });

    it('spec should carry the mutual-exclusion, clobber, and identity caveats', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      expect(content).toContain('MUTUALLY EXCLUSIVE');
      expect(content).toMatch(/clobber/i);
      expect(content).toContain('Now.del(');
    });

    it('spec should record that StateModel does NOT accept $meta', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      // The overview guide lists StateModel among $meta.useEsLatest consumers, but
      // state-model/StateModel.d.ts carries no Now.Internal.Meta. Package wins.
      expect(content).toContain('does NOT accept `$meta`');
    });

    it('instruct should forbid gating transitions with a Business Rule abort', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_state-model.md');
      expect(content).toContain('setAbortAction');
      expect(content).toContain('conditions');
      expect(content).toContain('evaluateTransition');
    });

    it('snippet 0001 should define a gated transition with a Mandatory Fields condition', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_state-model_0001.md');
      expect(content).toContain('StateModel(');
      expect(content).toContain('transitions');
      expect(content).toContain("'Mandatory Fields'");
      expect(content).toContain('initial: true');
    });
  });

  describe('atf-list (ATF list / related-list steps) resources', () => {
    it('spec should document all six atf.list steps', () => {
      const content = read(SPEC_DIR, 'fluent_spec_atf-list.md');
      for (const step of [
        'atf.list.relatedListVisibility',
        'atf.list.applyFilterToList',
        'atf.list.recordPresentInList',
        'atf.list.openRecordInList',
        'atf.list.listUIActionVisibility',
        'atf.list.clickListUIAction',
      ]) {
        expect(content).toContain(step);
      }
    });

    it('spec should document the step unions and the first_record output', () => {
      const content = read(SPEC_DIR, 'fluent_spec_atf-list.md');
      expect(content).toContain("'related_list' | 'list'");
      expect(content).toContain('first_record');
      expect(content).toContain("'no_record_present' | 'record_present'");
      expect(content).toContain('list_banner_button');
      expect(content).toContain("'' | 'single_record' | 'all_records'");
    });

    it('instruct should carry the non-guessable relatedList format and its lookup', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_atf-list.md');
      expect(content).toContain('fluent_instruct_atf.md');
      expect(content).toContain('ATFRelatedListUtil');
      expect(content).toContain('REL:');
      // clickListUIAction has real side effects and must be called out.
      expect(content).toContain('clickListUIAction');
    });

    it('snippet 0001 should chain a filter into the read-only steps', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_atf-list_0001.md');
      expect(content).toContain('Test(');
      expect(content).toContain('atf.list.applyFilterToList(');
      expect(content).toContain('first_record');
      expect(content).toContain('task.parent');
    });
  });

  describe('Changed API resources (v4.10.1)', () => {
    it('table spec should document the actions object form and deprecate the array form', () => {
      const content = read(SPEC_DIR, 'fluent_spec_table.md');
      expect(content).toContain('TableActionAccess');
      expect(content).toMatch(/deprecated/i);
      // The array form is a complete enumeration — the trap worth naming.
      expect(content).toMatch(/complete enumeration/i);
    });

    it('table instruct should steer to the object form', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_table.md');
      expect(content).toContain('actions: { read: true');
      expect(content).toMatch(/complete enumeration/i);
    });

    it('column spec should document mtom and the corrected referenceKey meaning', () => {
      const content = read(SPEC_DIR, 'fluent_spec_column.md');
      expect(content).toContain('mtom');
      expect(content).toContain('referenceKey');
      expect(content).toContain('sys_m2m');
      // referenceKey no longer means many-to-many; that moved to mtom.
      expect(content).toMatch(/instead of sys_id/i);
    });

    it('ui-action spec should document iconName and showIconOnly on both form and list', () => {
      const content = read(SPEC_DIR, 'fluent_spec_ui-action.md');
      expect((content.match(/iconName/g) ?? []).length).toBeGreaterThanOrEqual(2);
      expect((content.match(/showIconOnly/g) ?? []).length).toBeGreaterThanOrEqual(2);
      expect(content).toContain('retina_icons');
    });

    it('form spec should document $meta.installMethod as newly functional', () => {
      const content = read(SPEC_DIR, 'fluent_spec_form.md');
      expect(content).toContain('$meta');
      expect(content).toContain('installMethod');
      expect(content).toContain('first install');
    });

    it('playbook spec should document timerSchedule on startWithDelay', () => {
      const content = read(SPEC_DIR, 'fluent_spec_playbook.md');
      expect(content).toContain('timerSchedule');
      expect(content).toContain('cmn_schedule');
      // Present on all three discriminated variants.
      expect((content.match(/timerSchedule/g) ?? []).length).toBeGreaterThanOrEqual(3);
    });

    it('catalog-variable spec should document the widened dependentQuestion union', () => {
      const content = read(SPEC_DIR, 'fluent_spec_catalog-variable.md');
      expect(content).toContain('dependentQuestion');
      expect(content).toContain('useDynamicDefault');
      expect(content).toContain('dotWalkPath');
      expect(content).toContain('ReferenceVariable');
      expect(content).toContain('RequestedForVariable');
    });

    it('catalog-ui-policy spec should document the new action variable property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_catalog-ui-policy.md');
      expect(content).toContain('variable');
      expect(content).toContain('variableName');
    });

    it('catalog-client-script spec should document the order property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_catalog-client-script.md');
      expect(content).toContain('order');
    });
  });

  describe('Cross-cutting capabilities in coding_in_fluent prompt (v4.10.1)', () => {
    it('should list SDK v4.10.1 capabilities including both new types and the changed APIs', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      expect(content).toContain('SDK v4.10.1');
      for (const term of [
        'StateModel', 'atf.list', 'useEsLatest', 'TableActionAccess',
        'mtom', 'iconName', 'timerSchedule', 'dependentQuestion',
        'sys_domain', 'now-sdk cicd',
      ]) {
        expect(content).toContain(term);
      }
    });

    it('should name the four framework-managed fields $override cannot set', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      for (const field of ['sys_id', 'sys_scope', 'sys_update_name', 'sys_domainpath']) {
        expect(content).toContain(field);
      }
    });
  });

  describe('State Model steering added to the guides it supersedes', () => {
    it('business-rule instruct should redirect state-machine work to a State Model', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_business-rule.md');
      expect(content).toContain('State Model');
      expect(content).toContain('setAbortAction');
      // The transform no longer infers add_message from message.
      expect(content).toContain('addMessage: true');
    });

    it('data-policy instruct should distinguish a state condition from a transition gate', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_data-policy.md');
      expect(content).toContain('State Model');
      expect(content).toContain('Mandatory Fields');
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('catalog-variable resources describe a dynamic default, NOT visibility or options', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_catalog-variable.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_catalog-variable.md');
      // The release note calls this "dependent questions" controlling "visibility or
      // options"; the shipped guide files it under "Dynamic Default Values".
      expect(spec).toMatch(/dynamic[-\s]\*?default/i);
      expect(instruct).toMatch(/dynamic[-\s]\*?default/i);
      // Visibility belongs to CatalogUiPolicy — the correction must name the real owner.
      expect(instruct).toContain('CatalogUiPolicy');
    });

    it('atf-server spec keeps runServerSideScript, which was NOT new in 4.10.x', () => {
      const content = read(SPEC_DIR, 'fluent_spec_atf-server.md');
      // Already present in 4.9.0; the note's "added surface support" is a correction.
      expect(content).toContain('runServerSideScript');
      expect(content).not.toContain('SDK v4.10');
    });

    it('state-model spec does not claim $meta support the declaration lacks', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      expect(content).not.toContain('$meta: {');
    });

    it('business-rule spec keeps addMessage as the explicit switch (no surface change)', () => {
      const content = read(SPEC_DIR, 'fluent_spec_business-rule.md');
      expect(content).toContain('addMessage');
      expect(content).toContain('message');
    });
  });
});
