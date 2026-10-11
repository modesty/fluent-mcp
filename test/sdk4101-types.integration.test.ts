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
  ['ATF_LIST', 'atf-list'],
  ['STATE_MODEL', 'state-model'],
];

describe('SDK v4.10.1 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    for (const [key, value] of NEW_TYPES) {
      it(`should have the new v4.10.1 enum entry ${key}`, () => {
        assert.equal(ServiceNowMetadataType[key], value);
      });
    }

    it('should have grown to at least 67 metadata types (65 before v4.10.1 + state-model + atf-list)', () => {
      // Lower bound, not an equality: the exact total is a moving target owned by the
      // newest version's integration test (see sdk4112-types.integration.test.ts).
      // This assertion only guards that the two v4.10.1 additions were not lost.
      assert.ok(Object.values(ServiceNowMetadataType).length >= 67);
    });
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

  describe('state-model (StateModel state machine) resources', () => {
    it('spec should document the API, its four core tables, and the polymorphic model table', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      for (const term of [
        'StateModel', '@servicenow/sdk/core',
        'sttrm_model', 'sttrm_state', 'sttrm_state_transition', 'sttrm_transition_condition',
        'chg_model', 'prb_model', 'prb_task_model',
        'stateField', 'transitions', 'conditions',
      ]) {
        assert.ok(content.includes(term));
      }
    });

    it('spec should document the closed unions and the build-validated open unions', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      // Closed unions — invalid literals are a compile error.
      assert.ok(content.includes("'general' | 'rca' | 'model'"));
      assert.ok(content.includes("'standard' | 'normal' | 'emergency'"));
      assert.ok(content.includes("'read' | 'write'"));
      // Open-but-build-validated condition types; note the lowercase 'h' in 'Not On hold'.
      assert.ok(content.includes("'Transition Condition'"));
      assert.ok(content.includes("'Mandatory Fields'"));
      assert.ok(content.includes("'Not On hold'"));
      assert.ok(content.includes('allowImplementation'));
    });

    it('spec should carry the mutual-exclusion, clobber, and identity caveats', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      assert.ok(content.includes('MUTUALLY EXCLUSIVE'));
      assert.match(content, /clobber/i);
      assert.ok(content.includes('Now.del('));
    });

    it('spec should record that StateModel does NOT accept $meta', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      // The overview guide lists StateModel among $meta.useEsLatest consumers, but
      // state-model/StateModel.d.ts carries no Now.Internal.Meta. Package wins.
      assert.ok(content.includes('does NOT accept `$meta`'));
    });

    it('instruct should forbid gating transitions with a Business Rule abort', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_state-model.md');
      assert.ok(content.includes('setAbortAction'));
      assert.ok(content.includes('conditions'));
      assert.ok(content.includes('evaluateTransition'));
    });

    it('snippet 0001 should define a gated transition with a Mandatory Fields condition', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_state-model_0001.md');
      assert.ok(content.includes('StateModel('));
      assert.ok(content.includes('transitions'));
      assert.ok(content.includes("'Mandatory Fields'"));
      assert.ok(content.includes('initial: true'));
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
        assert.ok(content.includes(step));
      }
    });

    it('spec should document the step unions and the first_record output', () => {
      const content = read(SPEC_DIR, 'fluent_spec_atf-list.md');
      assert.ok(content.includes("'related_list' | 'list'"));
      assert.ok(content.includes('first_record'));
      assert.ok(content.includes("'no_record_present' | 'record_present'"));
      assert.ok(content.includes('list_banner_button'));
      assert.ok(content.includes("'' | 'single_record' | 'all_records'"));
    });

    it('instruct should carry the non-guessable relatedList format and its lookup', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_atf-list.md');
      assert.ok(content.includes('fluent_instruct_atf.md'));
      assert.ok(content.includes('ATFRelatedListUtil'));
      assert.ok(content.includes('REL:'));
      // clickListUIAction has real side effects and must be called out.
      assert.ok(content.includes('clickListUIAction'));
    });

    it('snippet 0001 should chain a filter into the read-only steps', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_atf-list_0001.md');
      assert.ok(content.includes('Test('));
      assert.ok(content.includes('atf.list.applyFilterToList('));
      assert.ok(content.includes('first_record'));
      assert.ok(content.includes('task.parent'));
    });
  });

  describe('Changed API resources (v4.10.1)', () => {
    it('table spec should document the actions object form and deprecate the array form', () => {
      const content = read(SPEC_DIR, 'fluent_spec_table.md');
      assert.ok(content.includes('TableActionAccess'));
      assert.match(content, /deprecated/i);
      // The array form is a complete enumeration — the trap worth naming.
      assert.match(content, /complete enumeration/i);
    });

    it('table instruct should steer to the object form', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_table.md');
      assert.ok(content.includes('actions: { read: true'));
      assert.match(content, /complete enumeration/i);
    });

    it('column spec should document mtom and the corrected referenceKey meaning', () => {
      const content = read(SPEC_DIR, 'fluent_spec_column.md');
      assert.ok(content.includes('mtom'));
      assert.ok(content.includes('referenceKey'));
      assert.ok(content.includes('sys_m2m'));
      // referenceKey no longer means many-to-many; that moved to mtom.
      assert.match(content, /instead of sys_id/i);
    });

    it('ui-action spec should document iconName and showIconOnly on both form and list', () => {
      const content = read(SPEC_DIR, 'fluent_spec_ui-action.md');
      assert.ok((content.match(/iconName/g) ?? []).length >= 2);
      assert.ok((content.match(/showIconOnly/g) ?? []).length >= 2);
      assert.ok(content.includes('retina_icons'));
    });

    it('form spec should document $meta.installMethod as newly functional', () => {
      const content = read(SPEC_DIR, 'fluent_spec_form.md');
      assert.ok(content.includes('$meta'));
      assert.ok(content.includes('installMethod'));
      assert.ok(content.includes('first install'));
    });

    it('playbook spec should document timerSchedule on startWithDelay', () => {
      const content = read(SPEC_DIR, 'fluent_spec_playbook.md');
      assert.ok(content.includes('timerSchedule'));
      assert.ok(content.includes('cmn_schedule'));
      // Present on all three discriminated variants.
      assert.ok((content.match(/timerSchedule/g) ?? []).length >= 3);
    });

    it('catalog-variable spec should document the widened dependentQuestion union', () => {
      const content = read(SPEC_DIR, 'fluent_spec_catalog-variable.md');
      assert.ok(content.includes('dependentQuestion'));
      assert.ok(content.includes('useDynamicDefault'));
      assert.ok(content.includes('dotWalkPath'));
      assert.ok(content.includes('ReferenceVariable'));
      assert.ok(content.includes('RequestedForVariable'));
    });

    it('catalog-ui-policy spec should document the new action variable property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_catalog-ui-policy.md');
      assert.ok(content.includes('variable'));
      assert.ok(content.includes('variableName'));
    });

    it('catalog-client-script spec should document the order property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_catalog-client-script.md');
      assert.ok(content.includes('order'));
    });
  });

  describe('Cross-cutting capabilities in coding_in_fluent prompt (v4.10.1)', () => {
    it('should list SDK v4.10.1 capabilities including both new types and the changed APIs', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      assert.ok(content.includes('SDK v4.10.1'));
      for (const term of [
        'StateModel', 'atf.list', 'useEsLatest', 'TableActionAccess',
        'mtom', 'iconName', 'timerSchedule', 'dependentQuestion',
        'sys_domain', 'now-sdk cicd',
      ]) {
        assert.ok(content.includes(term));
      }
    });

    it('should name the four framework-managed fields $override cannot set', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      for (const field of ['sys_id', 'sys_scope', 'sys_update_name', 'sys_domainpath']) {
        assert.ok(content.includes(field));
      }
    });
  });

  describe('State Model steering added to the guides it supersedes', () => {
    it('business-rule instruct should redirect state-machine work to a State Model', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_business-rule.md');
      assert.ok(content.includes('State Model'));
      assert.ok(content.includes('setAbortAction'));
      // The transform no longer infers add_message from message.
      assert.ok(content.includes('addMessage: true'));
    });

    it('data-policy instruct should distinguish a state condition from a transition gate', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_data-policy.md');
      assert.ok(content.includes('State Model'));
      assert.ok(content.includes('Mandatory Fields'));
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('catalog-variable resources describe a dynamic default, NOT visibility or options', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_catalog-variable.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_catalog-variable.md');
      // The release note calls this "dependent questions" controlling "visibility or
      // options"; the shipped guide files it under "Dynamic Default Values".
      assert.match(spec, /dynamic[-\s]\*?default/i);
      assert.match(instruct, /dynamic[-\s]\*?default/i);
      // Visibility belongs to CatalogUiPolicy — the correction must name the real owner.
      assert.ok(instruct.includes('CatalogUiPolicy'));
    });

    it('atf-server spec keeps runServerSideScript, which was NOT new in 4.10.x', () => {
      const content = read(SPEC_DIR, 'fluent_spec_atf-server.md');
      // Already present in 4.9.0; the note's "added surface support" is a correction.
      assert.ok(content.includes('runServerSideScript'));
      assert.ok(!content.includes('SDK v4.10'));
    });

    it('state-model spec does not claim $meta support the declaration lacks', () => {
      const content = read(SPEC_DIR, 'fluent_spec_state-model.md');
      assert.ok(!content.includes('$meta: {'));
    });

    it('business-rule spec keeps addMessage as the explicit switch (no surface change)', () => {
      const content = read(SPEC_DIR, 'fluent_spec_business-rule.md');
      assert.ok(content.includes('addMessage'));
      assert.ok(content.includes('message'));
    });
  });
});
