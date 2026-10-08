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
    it.each(NEW_TYPES)('should have the new v4.11.x enum entry %s', (key, value) => {
      expect(ServiceNowMetadataType[key]).toBe(value);
    });

    it('should total at least 71 metadata types (67 before v4.11.x + field-style + graphql-api + test-suite + atf)', () => {
      // `atf` is not an SDK addition — it is the ATF `Test()` container type that
      // fronts the 18 atf-* step sub-types. It had an instruct file but no spec,
      // so get-api-spec('atf') failed while get-instruct('atf') succeeded.
      // Lower bound only: the exact total is owned by the newest version's test
      // (sdk4136-types), so this file keeps guarding its own additions.
      expect(Object.values(ServiceNowMetadataType).length).toBeGreaterThanOrEqual(71);
    });

    it('registers the ATF Test() container type that fronts the atf-* step sub-types', () => {
      expect(ServiceNowMetadataType.ATF).toBe('atf');
    });

    it('should keep the enum sorted by value so new entries landed in the right place', () => {
      const values = Object.values(ServiceNowMetadataType) as string[];
      expect(values).toEqual([...values].sort());
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

    it.each(NEW_TYPES)('%s spec has balanced code fences (%s)', (_key, value) => {
      // An unterminated fence makes the spec validator silently SKIP the block —
      // it fails open, so a clean validator run proves nothing without this check.
      const content = read(SPEC_DIR, `fluent_spec_${value}.md`);
      const fences = (content.match(/^```/gm) ?? []).length;
      expect(fences % 2).toBe(0);
      expect(fences).toBeGreaterThan(0);
    });
  });

  describe('test-suite (TestSuite ATF suite) resources', () => {
    it('spec should document the API, both tables, and every property', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      for (const term of [
        'TestSuite', '@servicenow/sdk/core',
        'sys_atf_test_suite', 'sys_atf_test_suite_test',
        'abortOnFailure', 'testFilter', 'parent', 'input_filter',
      ]) {
        expect(content).toContain(term);
      }
    });

    it('spec should state that run order comes from array position, not a field', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      expect(content).toMatch(/array\s+POSITION|position\s+in\s+this\s+array/i);
    });

    it('spec should record that abortOnFailure is ignored by the cloud/parallel runner', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      expect(content).toMatch(/cloud\/parallel/i);
      expect(content).toMatch(/IGNORED|Ignored/);
    });

    it('spec should state that testFilter syncs on the instance, not during a build', () => {
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      expect(content).toMatch(/NOT during a Fluent build|not during a Fluent build/);
    });

    it('spec must NOT show tests and testFilter in the same TestSuite call', () => {
      // Static and dynamic membership are mutually exclusive: ATF re-syncs membership
      // from `testFilter` on every instance save, so a hand-listed test that does not
      // match the filter can be silently removed. The spec is also the block a reader
      // copies, so showing both together would model a config the instruct forbids.
      const content = read(SPEC_DIR, 'fluent_spec_test-suite.md');
      const calls = content.split('TestSuite({').slice(1);
      expect(calls.length).toBeGreaterThanOrEqual(2);
      const offenders = calls.filter(
        (c) => /^\s*tests:/m.test(c) && /^\s*testFilter:/m.test(c)
      );
      expect(offenders).toHaveLength(0);
      // Each mechanism must still be demonstrated somewhere in the spec.
      expect(calls.some((c) => /^\s*tests:/m.test(c))).toBe(true);
      expect(calls.some((c) => /^\s*testFilter:/m.test(c))).toBe(true);
      // And the mutual exclusivity must be stated, not merely implied by layout.
      expect(content).toMatch(/MUTUALLY EXCLUSIVE/i);
    });

    it('instruct should steer running a suite to ATF/CI-CD, not to a Fluent build', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_test-suite.md');
      expect(content).toMatch(/authoring only/i);
      expect(content).toContain('cicd_fluent_test');
    });

    it('instruct should reference the shared ATF scaffold and warn about duplicate tests', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_test-suite.md');
      expect(content).toContain('fluent_instruct_atf.md');
      expect(content).toMatch(/resolved sys_id/i);
    });

    it('snippet should demonstrate nesting and both entry forms without testFilter', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_test-suite_0001.md');
      expect(content).toContain('TestSuite');
      expect(content).toContain('parent:');
      expect(content).toContain('abortOnFailure: true');
      // Static + dynamic membership conflict, so the snippet must not model both.
      expect(content).not.toMatch(/^\s*testFilter:/m);
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
        expect(content).toContain(term);
      }
    });

    it('spec should keep the two path formats distinct', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      // Resolver mapping format.
      expect(content).toContain("'Query:items'");
      // Field-level ACL format — slash-delimited runtime path, a DIFFERENT format.
      expect(content).toContain("'/xSncMyApp/catalogGql/items/cost'");
      expect(content).toContain("type: 'graphql'");
    });

    it('spec should document that ACL depth counts the two envelope segments', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      expect(content).toMatch(/depth 3/);
      expect(content).toMatch(/depth 4/);
    });

    it('spec should state applicationNamespace is only honored in global scope', () => {
      const content = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      expect(content).toMatch(/ONLY honored in global scope|only honored in global scope/);
      expect(content).toContain('xSncMyApp');
    });

    it('instruct should steer small fixed endpoint sets to a Scripted REST API', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_graphql-api.md');
      // Must name the real constructor: there is no `ScriptedRest` export — the
      // Scripted REST API is created with `RestApi`.
      expect(content).toContain('`RestApi`');
      expect(content).not.toContain('`ScriptedRest`');
    });

    it('snippet should use a schema-gate ACL plus a field-level path ACL', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_graphql-api_0001.md');
      expect(content).toContain('enforceAcl');
      expect(content).toContain("type: 'graphql'");
      expect(content).toContain('/xSncMyApp/catalogGql/items/cost');
    });
  });

  describe('field-style (sys_ui_style via Record) resources', () => {
    it('spec should document the Record()-based authoring and every column', () => {
      const content = read(SPEC_DIR, 'fluent_spec_field-style.md');
      for (const term of [
        "table: 'sys_ui_style'", 'element', 'themed_style', 'alt',
        '--now-color_', 'Polaris',
      ]) {
        expect(content).toContain(term);
      }
      // There is no dedicated constructor for this type, and the spec must say so
      // rather than merely omitting it — but it must never be used as a call.
      expect(content).toMatch(/there is no `FieldStyle\(\)` constructor/i);
      expect(content).not.toMatch(/^\s*FieldStyle\(/m);
    });

    it('spec should carry the value-behaviour matrix and the always-true idiom', () => {
      const content = read(SPEC_DIR, 'fluent_spec_field-style.md');
      expect(content).toContain("'javascript:1==1;'");
      expect(content).toMatch(/null\/empty/);
      // The empty-value trap: unconditional on the FORM, blank-cells-only in a LIST.
      expect(content).toMatch(/UNCONDITIONALLY|unconditionally/);
    });

    it('spec should record the platform limits the build does not enforce', () => {
      const content = read(SPEC_DIR, 'fluent_spec_field-style.md');
      expect(content).toMatch(/dot indicator|DOT INDICATOR/i);
      expect(content).toContain('work_notes');
      expect(content).toContain('glide.ui.activity_stream.style.work_notes');
      expect(content).toMatch(/database view/i);
    });

    it('instruct should warn that an empty value is not "always"', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_field-style.md');
      expect(content).toMatch(/does not mean "always"/i);
      expect(content).toContain("'javascript:1==1;'");
    });

    it('instruct should state style is not limited to background-color', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_field-style.md');
      expect(content).toContain('font-weight');
      expect(content).toContain('text-align');
    });

    it('snippet should use the always-true idiom for the layout style', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_field-style_0001.md');
      expect(content).toContain("table: 'sys_ui_style'");
      expect(content).toContain("value: 'javascript:1==1;'");
      expect(content).toContain('themed_style');
    });
  });

  describe('Changed API: Flow do-while loop', () => {
    it('flow spec should document doTheFollowing and until with do-while semantics', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      expect(content).toContain('wfa.flowLogic.doTheFollowing');
      expect(content).toContain('wfa.flowLogic.until');
      expect(content).toMatch(/DO-WHILE|do-while/);
      expect(content).toContain('SDK v4.11.0+');
    });

    it('flow spec should require until() to be called, not returned', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      expect(content).toMatch(/CALLED, not returned|last statement/i);
    });

    it('flow instruct should cover the loop, the guard, and forEach steering', () => {
      const content = read(INSTRUCT_DIR, 'fluent_instruct_flow.md');
      expect(content).toContain('doTheFollowing');
      expect(content).toContain('waitForADuration');
      expect(content).toContain('forEach');
    });
  });

  describe('Changed API: Playbook v4.11.0 expansion', () => {
    const spec = () => read(SPEC_DIR, 'fluent_spec_playbook.md');
    const instruct = () => read(INSTRUCT_DIR, 'fluent_instruct_playbook.md');

    it('spec should use the renamed arg-2 type and drop the old name', () => {
      const content = spec();
      expect(content).toContain('PlaybookDependentConfig');
      // The old name no longer exists in the package; it may only appear as history.
      expect(content).toMatch(/PlaybookTriggerDeclaration.*(?:now|renamed|no longer)/is);
    });

    it('spec should document the widened executionType and all six on_demand constraints', () => {
      const content = spec();
      expect(content).toContain("'record_driven' | 'on_demand'");
      expect(content).toContain('ON_DEMAND RESTRICTIONS');
      expect(content).toContain('launch: true');
      expect(content).toContain('params.parentRecord');
    });

    it('spec should document every launcher field', () => {
      const content = spec();
      for (const field of [
        'launcherTitle', 'launcherDescription', 'launcherShowRecordForm',
        'launcherRecordFormView', 'launcherTemplateFields', 'launcherInputs',
      ]) {
        expect(content).toContain(field);
      }
      expect(content).toContain("'Default view'");
    });

    it('spec should document playbook and lane permissions with the right shapes', () => {
      const content = spec();
      // Playbook level is a callback; lane level is a plain object.
      expect(content).toContain('permissions: (params) => ({');
      expect(content).toContain('permissions: {');
      for (const flag of [
        'laneAddOptionalActivity', 'laneRestart', 'activityRestart',
        'addOptionalActivity', 'userCriterias',
      ]) {
        expect(content).toContain(flag);
      }
    });

    it('spec should document optional activities and their reference restriction', () => {
      const content = spec();
      expect(content).toContain('wfa.playbook.run.Manually()');
      expect(content).toContain('ManualActivityReference');
      expect(content).toMatch(/NOT part of the Dependency/i);
    });

    it('spec should document SetPlaybookOutputs and its hidden second input', () => {
      const content = spec();
      expect(content).toContain('SetPlaybookOutputs');
      expect(content).toContain('playbook_outputs');
      expect(content).toContain('playbook_outputs_var_table_name');
    });

    it('spec should document activityRef and the AI-agent config surface', () => {
      const content = spec();
      expect(content).toContain('wfa.playbook.activityRef');
      expect(content).toContain('enableAiAgent');
      expect(content).toContain('aiAgentObjective');
      expect(content).toContain('aiAgentExecutionMode');
      // Only these four OOB definitions opted in.
      for (const def of ['RecordForm', 'AutocompletingRecordForm', 'NewRecordForm', 'EmailForm']) {
        expect(content).toContain(def);
      }
      // Platform prerequisites the SDK does not validate.
      expect(content).toContain('sn_genai_platform');
      expect(content).toContain('sn_pa_designer.enable_agentic_playbooks');
    });

    it('spec should document the instance-dependent schemaVersion ceiling', () => {
      const content = spec();
      expect(content).toContain('schemaVersion');
      expect(content).toContain('com.glide.pad.core.model.maxSupportedSchemaVersion');
    });

    it('instruct should explain that view gates flags on a playbook but not on a lane', () => {
      const content = instruct();
      expect(content).toMatch(/gates every other flag/i);
      expect(content).toMatch(/independent and optional/i);
    });

    it('instruct should warn not to build a dependency chain through an optional activity', () => {
      const content = instruct();
      expect(content).toContain('ManualActivityReference');
      expect(content).toContain('run.After()');
    });
  });

  describe('Changed API: Table sizeClass, List domain, Action rawInputs', () => {
    it('table spec and instruct should document sizeClass without inventing a range', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_table.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_table.md');
      expect(spec).toContain('sizeClass');
      expect(spec).toContain('SDK v4.11.0+');
      expect(instruct).toContain('sizeClass');
      expect(instruct).toMatch(/no default and validates no range/i);
    });

    it('list spec and instruct should document domain and its global default', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_list.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_list.md');
      expect(spec).toContain('domain');
      expect(spec).toContain('sys_domain');
      expect(instruct).toContain("defaults to `'global'`");
    });

    it('custom-action spec should document rawInputs as inference machinery only', () => {
      const content = read(SPEC_DIR, 'fluent_spec_custom-action.md');
      expect(content).toContain('rawInputs');
      expect(content).toMatch(/never write `rawInputs`/i);
    });
  });

  describe('coding_in_fluent capabilities section', () => {
    it('should carry a v4.11.2 capabilities entry naming all three new types', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      expect(content).toContain('SDK v4.11.2 capabilities');
      expect(content).toContain('TestSuite');
      expect(content).toContain('GraphQLApi');
      expect(content).toContain('Field Styles');
    });

    it('should carry the playbook and flow additions', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      expect(content).toContain('doTheFollowing');
      expect(content).toContain("executionType: 'on_demand'");
      expect(content).toContain('SetPlaybookOutputs');
      expect(content).toContain('activityRef');
      expect(content).toContain('sizeClass');
    });

    it('should keep the previous version entry rather than replacing it', () => {
      const content = read(PROMPT_DIR, 'coding_in_fluent.md');
      expect(content).toContain('SDK v4.10.1 capabilities');
      expect(content).toContain('SDK v4.9.0 capabilities');
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('flow resources must NOT name a doTheFollowingUntil function', () => {
      // The note says the `doTheFollowingUntil` flow logic was "reworked". That
      // identifier exists in neither 4.10.1 nor 4.11.2; the construct is NEW and
      // is authored as doTheFollowing + until.
      const spec = read(SPEC_DIR, 'fluent_spec_flow.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_flow.md');
      expect(spec).not.toContain('wfa.flowLogic.doTheFollowingUntil');
      expect(instruct).not.toContain('wfa.flowLogic.doTheFollowingUntil');
      // And both must say so explicitly, so the wrong name is not reintroduced.
      // The instruct deliberately does NOT backtick the bad name: validate-instructs
      // resolves every backtick token against the SDK corpus, and a name that exists
      // nowhere would be reported as unresolved.
      expect(spec).toMatch(/no `doTheFollowingUntil`|There is no `doTheFollowingUntil`/i);
      expect(instruct).toMatch(/no\*{0,2} function named "doTheFollowingUntil"/i);
      expect(instruct).not.toContain('`doTheFollowingUntil`');
    });

    it('flow spec should present the do-while loop as new, not as a rework', () => {
      const content = read(SPEC_DIR, 'fluent_spec_flow.md');
      expect(content).toMatch(/NEW construct, not a rename/i);
    });

    it('graphql resources must NOT call enforceAcl secure-by-default', () => {
      // The note groups enforceAcl with the requires* booleans as
      // "secure-by-default". It is an ACL ARRAY defaulting to EMPTY.
      const spec = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_graphql-api.md');
      expect(spec).toMatch(/NOT a secure-by-default boolean/i);
      expect(spec).toMatch(/defaults to EMPTY/i);
      expect(instruct).toMatch(/not a secure-by-default boolean/i);
    });

    it('graphql resources must state an inline resolver function is a build error', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_graphql-api.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_graphql-api.md');
      expect(spec).toMatch(/INLINE here type-checks but is a BUILD ERROR/i);
      expect(instruct).toMatch(/type-checks\*{0,2} — but it is a build error|is a build error/i);
    });

    it('graphql snippet must not define a resolver with an inline arrow function', () => {
      const content = read(SNIPPET_DIR, 'fluent_snippet_graphql-api_0001.md');
      // The legal inline form is a STRING; an arrow assigned to script is not.
      expect(content).not.toMatch(/script:\s*\(\s*env\s*\)\s*=>/);
      expect(content).toContain('script: `');
    });

    it('playbook resources must state launcher record-form fields are forbidden on on_demand', () => {
      const spec = read(SPEC_DIR, 'fluent_spec_playbook.md');
      const instruct = read(INSTRUCT_DIR, 'fluent_instruct_playbook.md');
      expect(spec).toMatch(/FORBIDDEN when\s+\/\/ executionType is 'on_demand'|FORBIDDEN when/i);
      expect(instruct).toMatch(/forbidden\*{0,2} on an `'on_demand'` playbook/i);
      // And must name which three are legal there.
      expect(instruct).toContain('launcherInputs');
    });

    it('custom-action spec should record that the Decimal item is not a type change', () => {
      const content = read(SPEC_DIR, 'fluent_spec_custom-action.md');
      expect(content).toContain('FlowTypes.d.ts');
      expect(content).toMatch(/byte-identical/i);
    });

    it('new-type specs must not claim $meta support the declarations lack', () => {
      // Neither TestSuite nor GraphQLApi contains Now.Internal.Meta.
      for (const type of ['test-suite', 'graphql-api']) {
        const content = read(SPEC_DIR, `fluent_spec_${type}.md`);
        expect(content).toMatch(/does NOT accept `\$meta`/);
        expect(content).not.toMatch(/^\s*\$meta: \{/m);
      }
    });
  });
});
