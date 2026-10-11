/**
 * Integration tests for SDK v4.11.2 metadata coverage (features shipped across
 * 4.11.0 and 4.11.2 — 4.11.1 was never published to npm, and 4.11.2 shipped no
 * release notes at all). These tests read actual resource files from disk (no
 * mocks) to verify content correctness for the three new metadata types
 * (test-suite, graphql-api, field-style) and the changed APIs: the new Flow
 * do-while loop, the large Playbook expansion (on-demand execution, launcher
 * config, playbook/lane permissions, optional activities, SetPlaybookOutputs,
 * AI-agent activity config, activityRef), Table `sizeClass`, List `domain`, and
 * Action `rawInputs`.
 *
 * Source-of-truth directive: the locally-installed package wins wherever it
 * diverges from the release note. The v4.11.0 note diverges in five places,
 * each asserted below as a correction:
 *   - `doTheFollowingUntil` was NOT "reworked": the construct is new in 4.11.0,
 *     and that is not its name (`doTheFollowing` + `until` are).
 *   - `enforceAcl` is NOT a secure-by-default boolean; it is an ACL reference
 *     array defaulting to empty (= no schema gate).
 *   - The new-table claim under-reports: 17 tables were added, not 2.
 *   - A GraphQL resolver `script` cannot be an INLINE function literal, even
 *     though the type accepts a function.
 *   - The `launcher*` record-form fields are FORBIDDEN on
 *     `executionType: 'on_demand'` — the opposite of what the note implies.
 * Additionally the note's "`Decimal` inside `FlowObject`/`FlowArray`" item is a
 * build-pipeline fix, not a type change: `FlowTypes.d.ts` and
 * `db/types/Decimal.d.ts` are byte-identical to v4.10.1.
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
  ['FIELD_STYLE', 'field-style'],
  ['GRAPHQL_API', 'graphql-api'],
  ['TEST_SUITE', 'test-suite'],
];

describe('SDK v4.11.2 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    for (const [key, value] of NEW_TYPES) {
      it(`should have the new v4.11.x enum entry ${key}`, () => {
        assert.equal(ServiceNowMetadataType[key], value);
      });
    }

    it('should total at least 71 metadata types (67 before v4.11.x + field-style + graphql-api + test-suite + atf)', () => {
      // `atf` is not an SDK addition — it is the ATF `Test()` container type that
      // fronts the 18 atf-* step sub-types. It had an instruct file but no spec,
      // so get-api-spec('atf') failed while get-instruct('atf') succeeded.
      // Lower bound only: the exact total is owned by the newest version's test
      // (sdk4136-types), so this file keeps guarding its own additions.
      assert.ok(Object.values(ServiceNowMetadataType).length >= 71);
    });

    it('registers the ATF Test() container type that fronts the atf-* step sub-types', () => {
      assert.equal(ServiceNowMetadataType.ATF, 'atf');
    });

    it('should keep the enum sorted by value so new entries landed in the right place', () => {
      const values = Object.values(ServiceNowMetadataType) as string[];
      assert.deepStrictEqual(values, [...values].sort());
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

    for (const [key, value] of NEW_TYPES) {
      it(`${key} spec has balanced code fences (${value})`, () => {
        // An unterminated fence makes the spec validator silently SKIP the block —
        // it fails open, so a clean validator run proves nothing without this check.
        const content = read(SPEC_DIR, `fluent_spec_${value}.md`);
        const fences = (content.match(/^```/gm) ?? []).length;
        assert.equal(fences % 2, 0);
        assert.ok(fences > 0);
      });
    }
  });

  describe('test-suite (TestSuite ATF suite) resources', () => {
    it('spec should document the API, both tables, and every property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      for (const term of [
        'TestSuite', '@servicenow/sdk/core',
        'sys_atf_test_suite', 'sys_atf_test_suite_test',
        'abortOnFailure', 'testFilter', 'parent', 'input_filter',
      ]) {
        assert.ok(content.includes(term));
      }
    });

    it('spec should state that run order comes from array position, not a field', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      assert.match(content, /array\s+POSITION|position\s+in\s+this\s+array/i);
    });

    it('spec should record that abortOnFailure is ignored by the cloud/parallel runner', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      assert.match(content, /cloud\/parallel/i);
      assert.match(content, /IGNORED|Ignored/);
    });

    it('spec should state that testFilter syncs on the instance, not during a build', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      assert.match(content, /NOT during a Fluent build|not during a Fluent build/);
    });

    it('spec must NOT show tests and testFilter in the same TestSuite call', () => {
      // Static and dynamic membership are mutually exclusive: ATF re-syncs membership
      // from `testFilter` on every instance save, so a hand-listed test that does not
      // match the filter can be silently removed. The spec is also the block a reader
      // copies, so showing both together would model a config the instruct forbids.
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      const calls = content.split('TestSuite({').slice(1);
      assert.ok(calls.length >= 2);
      const offenders = calls.filter(
        (c) => /^\s*tests:/m.test(c) && /^\s*testFilter:/m.test(c)
      );
      assert.equal(offenders.length, 0);
      // Each mechanism must still be demonstrated somewhere in the spec.
      assert.equal(calls.some((c) => /^\s*tests:/m.test(c)), true);
      assert.equal(calls.some((c) => /^\s*testFilter:/m.test(c)), true);
      // And the mutual exclusivity must be stated, not merely implied by layout.
      assert.match(content, /MUTUALLY EXCLUSIVE/i);
    });

    it('instruct should steer running a suite to ATF/CI-CD, not to a Fluent build', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_test-suite.md');
      assert.match(content, /authoring only/i);
      assert.ok(content.includes('cicd_fluent_test'));
    });

    it('instruct should reference the shared ATF scaffold and warn about duplicate tests', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_test-suite.md');
      assert.ok(content.includes('fluent_instruct_atf.md'));
      assert.match(content, /resolved sys_id/i);
    });

    it('snippet should demonstrate nesting and both entry forms without testFilter', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_test-suite_0001.md');
      assert.ok(content.includes('TestSuite'));
      assert.ok(content.includes('parent:'));
      assert.ok(content.includes('abortOnFailure: true'));
      // Static + dynamic membership conflict, so the snippet must not model both.
      assert.doesNotMatch(content, /^\s*testFilter:/m);
    });
  });

  describe('graphql-api (GraphQLApi scripted GraphQL) resources', () => {
    it('spec should document the API, its four tables, and the security fields', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      for (const term of [
        'GraphQLApi', '@servicenow/sdk/core',
        'sys_graphql_schema', 'sys_graphql_resolver', 'sys_graphql_resolver_mapping',
        'sys_graphql_typeresolver',
        'namespace', 'applicationNamespace', 'schema', 'resolvers', 'typeResolvers',
        'enforceAcl', 'requiresAuthentication', 'requiresAclAuthorization',
        'requiresSncInternalRole', 'contextualAclMaxDepth',
      ]) {
        assert.ok(content.includes(term));
      }
    });

    it('spec should keep the two path formats distinct', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      // Resolver mapping format.
      assert.ok(content.includes("'Query:items'"));
      // Field-level ACL format — slash-delimited runtime path, a DIFFERENT format.
      assert.ok(content.includes("'/xSncMyApp/catalogGql/items/cost'"));
      assert.ok(content.includes("type: 'graphql'"));
    });

    it('spec should document that ACL depth counts the two envelope segments', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      assert.match(content, /depth 3/);
      assert.match(content, /depth 4/);
    });

    it('spec should state applicationNamespace is only honored in global scope', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      assert.match(content, /ONLY honored in global scope|only honored in global scope/);
      assert.ok(content.includes('xSncMyApp'));
    });

    it('instruct should steer small fixed endpoint sets to a Scripted REST API', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_graphql-api.md');
      // Must name the real constructor: there is no `ScriptedRest` export — the
      // Scripted REST API is created with `RestApi`.
      assert.ok(content.includes('`RestApi`'));
      assert.ok(!content.includes('`ScriptedRest`'));
    });

    it('snippet should use a schema-gate ACL plus a field-level path ACL', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_graphql-api_0001.md');
      assert.ok(content.includes('enforceAcl'));
      assert.ok(content.includes("type: 'graphql'"));
      assert.ok(content.includes('/xSncMyApp/catalogGql/items/cost'));
    });
  });

  describe('field-style (sys_ui_style via Record) resources', () => {
    it('spec should document the Record()-based authoring and every column', () => {
      const content = read(SPEC_DIR, 'fluent_spec_field-style.md');
      for (const term of [
        "table: 'sys_ui_style'", 'element', 'themed_style', 'alt',
        '--now-color_', 'Polaris',
      ]) {
        assert.ok(content.includes(term));
      }
      // There is no dedicated constructor for this type, and the spec must say so
      // rather than merely omitting it — but it must never be used as a call.
      assert.match(content, /there is no `FieldStyle\(\)` constructor/i);
      assert.doesNotMatch(content, /^\s*FieldStyle\(/m);
    });

    it('spec should carry the value-behaviour matrix and the always-true idiom', () => {
      const content = read(SPEC_DIR, 'fluent_spec_field-style.md');
      assert.ok(content.includes("'javascript:1==1;'"));
      assert.match(content, /null\/empty/);
      // The empty-value trap: unconditional on the FORM, blank-cells-only in a LIST.
      assert.match(content, /UNCONDITIONALLY|unconditionally/);
    });

    it('spec should record the platform limits the build does not enforce', () => {
      const content = read(SPEC_DIR, 'fluent_spec_field-style.md');
      assert.match(content, /dot indicator|DOT INDICATOR/i);
      assert.ok(content.includes('work_notes'));
      assert.ok(content.includes('glide.ui.activity_stream.style.work_notes'));
      assert.match(content, /database view/i);
    });

    it('instruct should warn that an empty value is not "always"', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_field-style.md');
      assert.match(content, /does not mean "always"/i);
      assert.ok(content.includes("'javascript:1==1;'"));
    });

    it('instruct should state style is not limited to background-color', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_field-style.md');
      assert.ok(content.includes('font-weight'));
      assert.ok(content.includes('text-align'));
    });

    it('snippet should use the always-true idiom for the layout style', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_field-style_0001.md');
      assert.ok(content.includes("table: 'sys_ui_style'"));
      assert.ok(content.includes("value: 'javascript:1==1;'"));
      assert.ok(content.includes('themed_style'));
    });
  });

  describe('Changed API: Flow do-while loop', () => {
    it('flow spec should document doTheFollowing and until with do-while semantics', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      assert.ok(content.includes('wfa.flowLogic.doTheFollowing'));
      assert.ok(content.includes('wfa.flowLogic.until'));
      assert.match(content, /DO-WHILE|do-while/);
      assert.ok(content.includes('SDK v4.11.0+'));
    });

    it('flow spec should require until() to be called, not returned', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      assert.match(content, /CALLED, not returned|last statement/i);
    });

    it('flow instruct should cover the loop, the guard, and forEach steering', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_flow.md');
      assert.ok(content.includes('doTheFollowing'));
      assert.ok(content.includes('waitForADuration'));
      assert.ok(content.includes('forEach'));
    });
  });

  describe('Changed API: Playbook v4.11.0 expansion', () => {
    const spec = () => read(SPEC_DIR, 'fluent_spec_playbook.md');
    const instruct = () => read(INSTRUCT_DIR, 'fluent_instruct_playbook.md');

    it('spec should use the renamed arg-2 type and drop the old name', () => {
      const content = spec();
      assert.ok(content.includes('PlaybookDependentConfig'));
      // The old name no longer exists in the package; it may only appear as history.
      assert.match(content, /PlaybookTriggerDeclaration.*(?:now|renamed|no longer)/is);
    });

    it('spec should document the widened executionType and all six on_demand constraints', () => {
      const content = spec();
      assert.ok(content.includes("'record_driven' | 'on_demand'"));
      assert.ok(content.includes('ON_DEMAND RESTRICTIONS'));
      assert.ok(content.includes('launch: true'));
      assert.ok(content.includes('params.parentRecord'));
    });

    it('spec should document every launcher field', () => {
      const content = spec();
      for (const field of [
        'launcherTitle', 'launcherDescription', 'launcherShowRecordForm',
        'launcherRecordFormView', 'launcherTemplateFields', 'launcherInputs',
      ]) {
        assert.ok(content.includes(field));
      }
      assert.ok(content.includes("'Default view'"));
    });

    it('spec should document playbook and lane permissions with the right shapes', () => {
      const content = spec();
      // Playbook level is a callback; lane level is a plain object.
      assert.ok(content.includes('permissions: (params) => ({'));
      assert.ok(content.includes('permissions: {'));
      for (const flag of [
        'laneAddOptionalActivity', 'laneRestart', 'activityRestart',
        'addOptionalActivity', 'userCriterias',
      ]) {
        assert.ok(content.includes(flag));
      }
    });

    it('spec should document optional activities and their reference restriction', () => {
      const content = spec();
      assert.ok(content.includes('wfa.playbook.run.Manually()'));
      assert.ok(content.includes('ManualActivityReference'));
      assert.match(content, /NOT part of the Dependency/i);
    });

    it('spec should document SetPlaybookOutputs and its hidden second input', () => {
      const content = spec();
      assert.ok(content.includes('SetPlaybookOutputs'));
      assert.ok(content.includes('playbook_outputs'));
      assert.ok(content.includes('playbook_outputs_var_table_name'));
    });

    it('spec should document activityRef and the AI-agent config surface', () => {
      const content = spec();
      assert.ok(content.includes('wfa.playbook.activityRef'));
      assert.ok(content.includes('enableAiAgent'));
      assert.ok(content.includes('aiAgentObjective'));
      assert.ok(content.includes('aiAgentExecutionMode'));
      // Only these four OOB definitions opted in.
      for (const def of ['RecordForm', 'AutocompletingRecordForm', 'NewRecordForm', 'EmailForm']) {
        assert.ok(content.includes(def));
      }
      // Platform prerequisites the SDK does not validate.
      assert.ok(content.includes('sn_genai_platform'));
      assert.ok(content.includes('sn_pa_designer.enable_agentic_playbooks'));
    });

    it('spec should document the instance-dependent schemaVersion ceiling', () => {
      const content = spec();
      assert.ok(content.includes('schemaVersion'));
      assert.ok(content.includes('com.glide.pad.core.model.maxSupportedSchemaVersion'));
    });

    it('instruct should explain that view gates flags on a playbook but not on a lane', () => {
      const content = instruct();
      assert.match(content, /gates every other flag/i);
      assert.match(content, /independent and optional/i);
    });

    it('instruct should warn not to build a dependency chain through an optional activity', () => {
      const content = instruct();
      assert.ok(content.includes('ManualActivityReference'));
      assert.ok(content.includes('run.After()'));
    });
  });

  describe('Changed API: Table sizeClass, List domain, Action rawInputs', () => {
    it('table spec and instruct should document sizeClass without inventing a range', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_table.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_table.md');
      assert.ok(spec.includes('sizeClass'));
      assert.ok(spec.includes('SDK v4.11.0+'));
      assert.ok(instruct.includes('sizeClass'));
      assert.match(instruct, /no default and validates no range/i);
    });

    it('list spec and instruct should document domain and its global default', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_list.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_list.md');
      assert.ok(spec.includes('domain'));
      assert.ok(spec.includes('sys_domain'));
      assert.ok(instruct.includes("defaults to `'global'`"));
    });

    it('custom-action spec should document rawInputs as inference machinery only', () => {
      const content = read(SPEC_DIR, 'fluent_spec_custom-action.md');
      assert.ok(content.includes('rawInputs'));
      assert.match(content, /never write `rawInputs`/i);
    });
  });

  describe('coding_in_fluent capabilities section', () => {
    it('should carry a v4.11.2 capabilities entry naming all three new types', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      assert.ok(content.includes('SDK v4.11.2 capabilities'));
      assert.ok(content.includes('TestSuite'));
      assert.ok(content.includes('GraphQLApi'));
      assert.ok(content.includes('Field Styles'));
    });

    it('should carry the playbook and flow additions', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      assert.ok(content.includes('doTheFollowing'));
      assert.ok(content.includes("executionType: 'on_demand'"));
      assert.ok(content.includes('SetPlaybookOutputs'));
      assert.ok(content.includes('activityRef'));
      assert.ok(content.includes('sizeClass'));
    });

    it('should keep the previous version entry rather than replacing it', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      assert.ok(content.includes('SDK v4.10.1 capabilities'));
      assert.ok(content.includes('SDK v4.9.0 capabilities'));
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('flow resources must NOT name a doTheFollowingUntil function', () => {
      // The note says the `doTheFollowingUntil` flow logic was "reworked". That
      // identifier exists in neither 4.10.1 nor 4.11.2; the construct is NEW and
      // is authored as doTheFollowing + until.
      const spec = read(SPEC_DIR, 'fluent_spec_flow.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_flow.md');
      assert.ok(!spec.includes('wfa.flowLogic.doTheFollowingUntil'));
      assert.ok(!instruct.includes('wfa.flowLogic.doTheFollowingUntil'));
      // And both must say so explicitly, so the wrong name is not reintroduced.
      // The instruct deliberately does NOT backtick the bad name: validate-instructs
      // resolves every backtick token against the SDK corpus, and a name that exists
      // nowhere would be reported as unresolved.
      assert.match(spec, /no `doTheFollowingUntil`|There is no `doTheFollowingUntil`/i);
      assert.match(instruct, /no\*{0,2} function named "doTheFollowingUntil"/i);
      assert.ok(!instruct.includes('`doTheFollowingUntil`'));
    });

    it('flow spec should present the do-while loop as new, not as a rework', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      assert.match(content, /NEW construct, not a rename/i);
    });

    it('graphql resources must NOT call enforceAcl secure-by-default', () => {
      // The note groups enforceAcl with the requires* booleans as
      // "secure-by-default". It is an ACL ARRAY defaulting to EMPTY.
      const spec = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_graphql-api.md');
      assert.match(spec, /NOT a secure-by-default boolean/i);
      assert.match(spec, /defaults to EMPTY/i);
      assert.match(instruct, /not a secure-by-default boolean/i);
    });

    it('graphql resources must state an inline resolver function is a build error', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_graphql-api.md');
      assert.match(spec, /INLINE here type-checks but is a BUILD ERROR/i);
      assert.match(instruct, /type-checks\*{0,2} — but it is a build error|is a build error/i);
    });

    it('graphql snippet must not define a resolver with an inline arrow function', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_graphql-api_0001.md');
      // The legal inline form is a STRING; an arrow assigned to script is not.
      assert.doesNotMatch(content, /script:\s*\(\s*env\s*\)\s*=>/);
      assert.ok(content.includes('script: `'));
    });

    it('playbook resources must state launcher record-form fields are forbidden on on_demand', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_playbook.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_playbook.md');
      assert.match(spec, /FORBIDDEN when\s+\/\/ executionType is 'on_demand'|FORBIDDEN when/i);
      assert.match(instruct, /forbidden\*{0,2} on an `'on_demand'` playbook/i);
      // And must name which three are legal there.
      assert.ok(instruct.includes('launcherInputs'));
    });

    it('custom-action spec should record that the Decimal item is not a type change', () => {
      const content = read(SPEC_DIR, 'fluent_spec_custom-action.md');
      assert.ok(content.includes('FlowTypes.d.ts'));
      assert.match(content, /byte-identical/i);
    });

    it('new-type specs must not claim $meta support the declarations lack', () => {
      // Neither TestSuite nor GraphQLApi contains Now.Internal.Meta.
      for (const type of ['test-suite', 'graphql-api']) {
        const content = read(SPEC_DIR, `fluent_spec_${type}.md`);
        assert.match(content, /does NOT accept `\$meta`/);
        assert.doesNotMatch(content, /^\s*\$meta: \{/m);
      }
    });
  });
});
