/**
 * Integration tests for SDK v4.13.6 metadata coverage (features shipped across
 * 4.12.0–4.13.6; only 4.12.0 and 4.13.0 published release notes, and 4.13.1,
 * 4.13.2, 4.13.4 and 4.13.5 were never published to npm). These tests read
 * actual resource files from disk (no mocks) to verify content correctness for
 * the four new metadata types (assessment and risk-assessment from 4.12.0,
 * database-view and interceptor from 4.13.0) and the changed or corrected APIs.
 *
 * Source-of-truth directive: the locally-installed package wins wherever it
 * diverges from a release note or a shipped doc. Each divergence is asserted
 * below as a correction, e.g.:
 *   - Assessments have no "post-deployment steps" API (4.12.0 note).
 *   - The string form of displayedWhen / correctAnswerChoice is silently written empty.
 *   - RiskAssessment has no `table` and no `evaluationMethod`.
 *   - The 4.13.0 note's DatabaseView example fails to compile six ways.
 *   - Interceptor appears in no release note, and renaming one orphans the old record.
 *   - The dashboard grid is 48 columns, and three component names are unverified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');
const spec = (type: string) => read(SPEC_DIR, `fluent_spec_${type}.md`);
const instruct = (type: string) => read(INSTRUCT_DIR, `fluent_instruct_${type}.md`);
const snippets = (type: string) =>
  fs.readdirSync(SNIPPET_DIR)
    .filter((f) => f.startsWith(`fluent_snippet_${type}_`) && f.endsWith('.md'))
    .sort()
    .map((f) => read(SNIPPET_DIR, f));

/** The fenced ```typescript code of a resource, without its surrounding prose. */
const code = (content: string) =>
  [...content.matchAll(/```typescript\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

const NEW_TYPES: Array<[keyof typeof ServiceNowMetadataType, string, string]> = [
  ['ASSESSMENT', 'assessment', '4.12.0'],
  ['DATABASE_VIEW', 'database-view', '4.13.0'],
  ['INTERCEPTOR', 'interceptor', '4.13.0'],
  ['RISK_ASSESSMENT', 'risk-assessment', '4.12.0'],
];

describe('SDK v4.13.6 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    it.each(NEW_TYPES)('should have the new enum entry %s', (key, value) => {
      expect(ServiceNowMetadataType[key]).toBe(value);
    });

    it('should total 75 metadata types (71 before v4.12.x + assessment + risk-assessment + database-view + interceptor)', () => {
      expect(Object.values(ServiceNowMetadataType).length).toBe(75);
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
      expect(snippets(value).length).toBeGreaterThan(0);
    });

    it.each(NEW_TYPES)('%s spec has balanced code fences (%s)', (_key, value) => {
      // An unterminated fence makes the spec validator silently SKIP the block.
      const fences = (spec(value).match(/^```/gm) ?? []).length;
      expect(fences % 2).toBe(0);
      expect(fences).toBeGreaterThan(0);
    });

    it.each(NEW_TYPES)('%s spec and instruct carry the version the API first shipped in (%s, v%s)', (_key, value, version) => {
      expect(spec(value)).toContain(`SDK v${version}+`);
      expect(instruct(value)).toContain(`SDK v${version}+`);
    });

    it.each(NEW_TYPES)('%s spec opens with the Context header and imports from @servicenow/sdk/core (%s)', (_key, value) => {
      const content = spec(value);
      expect(content.startsWith('# **Context:**')).toBe(true);
      expect(content).toContain('@servicenow/sdk/core');
    });

    it.each(NEW_TYPES)('%s spec must not model $meta, which the declaration lacks (%s)', (_key, value) => {
      // None of the four new declarations contains Now.Internal.Meta.
      expect(code(spec(value))).not.toMatch(/^\s*\$meta: \{/m);
    });
  });

  describe('assessment (Assessment) resources', () => {
    it('spec should document the four-level table chain and the scored side effects', () => {
      const content = spec('assessment');
      for (const table of ['asmt_metric_type', 'asmt_metric_category', 'asmt_metric', 'asmt_metric_definition']) {
        expect(content).toContain(table);
      }
      expect(content).toContain('sys_script');
      expect(content).toContain('sys_trigger');
      expect(content).toContain('ships **inactive**');
    });

    it('spec should restrict evaluationMethod to the two accepted values', () => {
      const content = spec('assessment');
      expect(content).toContain('ONLY these two values are accepted');
      expect(content).toContain("'assessment'");
      expect(content).toContain("'survey'");
    });

    it('spec should state Yes/No answers are string codes and dependsOn uses Now.ref', () => {
      const content = spec('assessment');
      expect(content).toContain("'1' = Yes, '0' = No");
      expect(content).toContain("NOT Now.ID['<key>']");
    });

    it('spec should state a script default must be an inline string literal', () => {
      expect(spec('assessment')).toContain('it MUST be an INLINE string literal');
    });

    it('instruct should warn that now-sdk build does not type-check', () => {
      expect(instruct('assessment')).toContain('`now-sdk build` does **not** type-check, and it does not print hints');
    });

    it('instruct should record that Now.include on a script default fails the build', () => {
      expect(instruct('assessment')).toContain("fails with \"must also set 'script'\"");
    });

    it('snippet should declare a scaleFactor, which the build requires even though the type does not', () => {
      expect(code(snippets('assessment')[0])).toMatch(/scaleFactor:\s*\d+/);
    });
  });

  describe('risk-assessment (RiskAssessment) resources', () => {
    it('spec should document the risk tables and the absence of business rules', () => {
      const content = spec('risk-assessment');
      expect(content).toContain('change_risk_asmt');
      expect(content).toContain('change_risk_asmt_threshold');
      expect(content).toContain('no `sys_script` business rule and no `sys_trigger` job');
    });

    it('spec should record the stored threshold risk codes', () => {
      expect(spec('risk-assessment')).toContain('high = 2, moderate = 3, low = 4');
    });

    it('instruct should require the plugin check first and name the tool to do it', () => {
      const content = instruct('risk-assessment');
      expect(content).toContain('**HARD STOP — check the plugin first.**');
      expect(content).toContain('com.snc.change_management.risk_assessment');
      expect(content).toContain('query_fluent_records tool against table `sys_plugins`');
    });

    it('snippet should declare thresholds and no table or evaluationMethod', () => {
      const snippet = code(snippets('risk-assessment')[0]);
      expect(snippet).toContain('RiskAssessment(');
      expect(snippet).toContain('thresholds');
      expect(snippet).not.toMatch(/^\s*table:/m);
      expect(snippet).not.toMatch(/^\s*evaluationMethod:/m);
    });
  });

  describe('database-view (DatabaseView) resources', () => {
    it('spec should document all three tables and the coalesce identity', () => {
      const content = spec('database-view');
      expect(content).toContain('sys_db_view');
      expect(content).toContain('sys_db_view_table');
      expect(content).toContain('sys_db_view_table_field');
      expect(content).toContain('a top-level `$id` is **not accepted**, and neither is `$meta`');
    });

    it('spec should document both scope prefixes as hard errors', () => {
      const content = spec('database-view');
      expect(content).toContain("'u_'");
      expect(content).toContain('x_acme_');
      expect(content).toContain('hard build error');
    });

    it('spec should state the join predicate is not an encoded query', () => {
      expect(spec('database-view')).toContain('NOT an encoded query');
    });

    it('spec should state that protectionPolicy reaches every child row', () => {
      expect(spec('database-view')).toContain('copies it onto EVERY');
    });

    it('snippet should use the global u_ prefix, nested fields, and whereClause', () => {
      const snippet = code(snippets('database-view')[0]);
      expect(snippet).toMatch(/name:\s*'u_/);
      expect(snippet).toContain('whereClause:');
      expect(snippet).toContain('variablePrefix:');
      expect(snippet).not.toMatch(/^\s*where:/m);
    });

    it('snippet should not declare a top-level $id', () => {
      // The first property after `DatabaseView({` is the identity `name`, never `$id`.
      const snippet = code(snippets('database-view')[0]);
      expect(snippet).toMatch(/DatabaseView\(\{\s*(\/\/[^\n]*\s*)*name:/);
    });
  });

  describe('interceptor (Interceptor) resources', () => {
    it('spec should document sys_wizard, its answers, and the WithMetadata type', () => {
      const content = spec('interceptor');
      expect(content).toContain('sys_wizard');
      expect(content).toContain('sys_wizard_answer');
      expect(content).toContain('the type is Now.Internal.WithMetadata');
      expect(content).toContain('a top-level `$id` is **not accepted**, and neither is `$meta`');
    });

    it('spec should author choices with Record() + Now.ref and warn about Now.ID', () => {
      const content = spec('interceptor');
      expect(content).toContain("table: 'sys_wizard_choice'");
      expect(content).toContain("Now.ref('sys_wizard_answer', 'answer_multiple_choice')");
      expect(content).toContain('writes the literal key string, a BROKEN reference');
    });

    it('spec should record that choice install behaviour was not instance-verified', () => {
      expect(spec('interceptor')).toContain('NOT verified against an');
    });

    it('instruct should record the guide contradiction on choices', () => {
      const content = instruct('interceptor');
      expect(content).toContain('add these choices by hand on the instance after deploying');
      expect(content).toContain('has not been verified against an instance');
    });

    it('snippet should link questions with nextQuestion and give every answer an $id', () => {
      const snippet = code(snippets('interceptor')[0]);
      expect(snippet).toContain('Interceptor(');
      expect(snippet).toContain('nextQuestion');
      expect(snippet).toContain('$id:');
    });
  });

  describe('dashboard corrections (documented in the SDK v4.13.x guides)', () => {
    it('spec and instruct should state the 48-column grid', () => {
      expect(spec('dashboard')).toContain('The widget grid is 48 columns wide, not 12 or 24.');
      expect(spec('dashboard')).toContain('half = 24');
      expect(instruct('dashboard')).toContain('The widget grid is 48 columns wide, not 12 or 24.');
      expect(instruct('dashboard')).toContain('half is 24');
    });

    it('spec, instruct and snippet 0002 should carry the unverified-component caveat', () => {
      const caveat = 'absent from the SDK build plugin\'s component name-to-sys_id map, so the build writes them through as literal strings — verify on an instance, or pass the component sys_id instead.';
      expect(spec('dashboard')).toContain(caveat);
      expect(instruct('dashboard')).toContain(caveat);
      expect(snippets('dashboard')[1]).toContain(caveat);
    });

    it('spec and instruct should mark the corrections as guide-documented, not new features', () => {
      expect(spec('dashboard')).toContain('documented in SDK v4.13.x guides');
      expect(instruct('dashboard')).toContain('documented in SDK v4.13.x guides');
    });

    it('spec and snippets should bind data inline instead of by report sys_id', () => {
      expect(spec('dashboard')).not.toContain('reportSysId');
      for (const snippet of snippets('dashboard')) {
        expect(snippet).not.toContain('reportSysId');
      }
      expect(code(snippets('dashboard')[0])).toContain('dataSources');
    });

    it('should leave the plugin-defaulted filter wiring to the build', () => {
      // followFilters / '@state.parFilters' are filled in by the plugin.
      expect(spec('dashboard')).toContain("'@state.parFilters'");
      expect(instruct('dashboard')).toContain("'@state.parFilters'");
    });
  });

  describe('Changed API: Playbook v4.13.0 expansion', () => {
    it('spec should document variants, the evaluation point, and both per-activity variant forms', () => {
      const content = spec('playbook');
      expect(content).toContain('wfa.playbook.variant(');
      expect(content).toContain('evaluateVariantChildrenAfter');
      expect(content).toContain('variantOverrides');
      expect(content).toContain('strictly before: the evaluation-point activity');
    });

    it('spec must never put variant and variantOverrides on the same activity', () => {
      // Mutually exclusive per activity (PlaybookTypes.d.ts). Each override entry
      // legitimately names its own `variant`, so strip the bracket-matched
      // variantOverrides array before looking for a top-level `variant:`.
      const withoutOverrides = (block: string) => {
        const start = block.indexOf('variantOverrides:');
        if (start === -1) return block;
        let depth = 0;
        for (let i = block.indexOf('[', start); i < block.length; i++) {
          if (block[i] === '[') depth++;
          if (block[i] === ']' && --depth === 0) return block.slice(0, start) + block.slice(i + 1);
        }
        return block.slice(0, start);
      };
      const offenders = (source: string) =>
        source.split('wfa.playbook.activity(').slice(1)
          .filter((b) => b.includes('variantOverrides:') && /^\s*variant:/m.test(withoutOverrides(b)));

      expect(offenders(code(spec('playbook')))).toHaveLength(0);

      // Negative control: the forbidden shape must be detected.
      const broken = `wfa.playbook.activity(X, {
        variant: params.variants.vip,
        variantOverrides: [{ variant: params.variants.vip, order: 1 }],
      })`;
      expect(offenders(broken)).toHaveLength(1);
    });

    it('spec should document Go Back placement and its RUN_ALWAYS target', () => {
      const content = spec('playbook');
      expect(content).toContain('GoBack');
      expect(content).toContain("It is ONLY valid as the TERMINAL activity of a 'match_first' decision branch");
      expect(content).toContain("restartRule MUST be 'RUN_ALWAYS'");
    });

    it('spec should document isIdealPath, actionOverrides, and automationPlan placement', () => {
      const content = spec('playbook');
      expect(content).toContain('isIdealPath');
      expect(content).toContain('PER ACTIVITY (not per playbook)');
      expect(content).toContain("REPLACES the card's default Declarative Action");
      expect(content).toContain('the ONLY place (besides an ActivityDefinition()\'s defaultExperienceProperties)');
    });

    it('spec should flag the mandatory-input and BaseActivityConfig changes as potentially breaking', () => {
      const content = spec('playbook');
      expect(content).toContain('POTENTIALLY BREAKING for existing code');
      expect(content).toContain('now fails with TS2312');
      expect(instruct('playbook')).toContain('potentially BREAKING');
    });

    it('spec should only show launcher record-form fields with launcherShowRecordForm: true', () => {
      // Setting the view or template fields while the form is off is a build error,
      // so the copyable spec must never model that combination.
      const content = spec('playbook');
      expect(content).toContain('setting launcherRecordFormView while');
      expect(content).toContain('"launcherTemplateFields can only be set when');
      const calls = code(content).split('PlaybookDefinition(').slice(1);
      for (const call of calls.filter((c) => /^\s*launcherRecordFormView:/m.test(c))) {
        expect(call).toMatch(/^\s*launcherShowRecordForm:\s*true/m);
      }
    });

    it('spec should mark preservedAttachment as framework-managed', () => {
      expect(spec('playbook')).toContain('FRAMEWORK-MANAGED (SDK v4.13.0+)');
    });

    it('instruct should warn against copying the guide variant example that uses a const before declaration', () => {
      expect(instruct('playbook')).toContain('fails with TS2448');
    });

    it('new snippets should demonstrate variants and a match_first Go Back with an ideal path', () => {
      const all = snippets('playbook').map(code);
      expect(all.some((s) => s.includes('wfa.playbook.variant(') && s.includes('evaluateVariantChildrenAfter'))).toBe(true);
      expect(all.some((s) => s.includes('GoBack') && s.includes("'match_first'") && s.includes('isIdealPath'))).toBe(true);
    });
  });

  describe('Changed APIs: flow hoisting, table, column, ACL, UI action, ATF, $meta', () => {
    it('flow spec should document hoisted outputs in the build-verified form', () => {
      const content = spec('flow');
      expect(content).toContain('return { lookup: lookup } // NOT the shorthand { lookup }');
      expect(content).toContain('TS211 "Invalid pill reference"');
      expect(content).toContain('name it `_tryOutputs`');
      expect(content).toContain('CHANGED GUIDANCE');
    });

    it('flow instruct should retire the setFlowVariables-only rule rather than contradict it', () => {
      const content = instruct('flow');
      expect(content).toContain('The old rule "datapills inside a tryCatch/doInParallel block are not accessible outside it — use setFlowVariables" is retired');
      expect(content).toContain('never the shorthand "return { lookup }"');
    });

    it('new flow snippet should hoist with explicit uuids and no shorthand returns', () => {
      const snippet = code(read(SNIPPET_DIR, 'fluent_snippet_flow_0003.md'));
      expect(snippet).toContain('wfa.flowLogic.tryCatch');
      expect(snippet).toMatch(/uuid:\s*'/);
      // A shorthand return such as `return { lookup }` is a Fluent build error.
      // Comments may quote the forbidden form, so check executable lines only.
      const executable = snippet.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
      expect(executable).toMatch(/return \{ \w+: \w+ \}/);
      expect(executable).not.toMatch(/return \{\s*\w+\s*\}/);
    });

    it('table spec should allow index in augment mode and document the v4.13.3 properties', () => {
      const content = spec('table');
      expect(content).toContain('only `schema` and — SDK v4.13.0+ — `index` are allowed');
      expect(content).toContain('allowConfiguration: false, // boolean, optional (SDK v4.13.3+)');
      expect(content).toContain('dbObjectId: false, // boolean, optional (SDK v4.13.3+)');
    });

    it('column spec should accept any UrlColumn string, including relative values', () => {
      expect(spec('column')).toContain('any string is accepted (SDK v4.12.0+), including relative values');
    });

    it('acl spec should list 14 types, require name for aiux types, and document per-role policy', () => {
      const content = spec('acl');
      expect(content).toContain('those 14 are autocomplete suggestions');
      expect(content).toContain('**WARNING — `aiux_*` types require `name`.**');
      for (const type of ['aiux_page', 'aiux_widget', 'aiux_experience']) {
        expect(content).toContain(type);
      }
      expect(content).toContain('(SDK v4.13.6+)');
    });

    it('ui-action spec should document programmatic-only form/list and the AI styles', () => {
      const content = spec('ui-action');
      expect(content).toContain('only applicable in UI26');
      expect(content).toContain("'primary-ai'");
      expect(content).toContain("'secondary-ai'");
    });

    it.each([
      'email-notification', 'ui-policy', 'instance-scan', 'catalog-client-script',
      'catalog-item-record-producer', 'catalog-variable',
    ])('%s spec should document the $meta it accepts as of SDK v4.13.0', (type) => {
      const content = spec(type);
      expect(content).toContain('$meta');
      expect(content).toContain('SDK v4.13.0+');
    });

    it('graphql spec should keep the top-level $meta denial and warn the resolver form is ignored', () => {
      const content = spec('graphql-api');
      expect(content).toContain('NOTE: GraphQLApi does NOT accept `$meta`');
      expect(content).toContain('ENTRY now type-checks with `$meta`, but the build');
    });

    it('atf-server-catalog-item resources should use the real snake_case input and output names', () => {
      const content = spec('atf-server-catalog-item');
      expect(content).toContain('}): { catalog_item_id: string; };');
      expect(content).toContain("request_item: get_sys_id('sc_req_item', '')");
      for (const snippet of snippets('atf-server-catalog-item')) {
        expect(code(snippet)).not.toMatch(/\b(catalogItemId|requestItem|requestId)\b/);
      }
    });

    it('atf-form-sp instruct should reject the stale assertion value', () => {
      expect(instruct('atf-form-sp')).toContain('"page_reloaded_or_redirected" is not a valid value');
    });
  });

  describe('coding_in_fluent capabilities section', () => {
    const prompt = () => read(path.join(RES_DIR, 'prompt'), 'coding_in_fluent.md');

    it('should carry a v4.13.6 capabilities entry naming all four new types', () => {
      const content = prompt();
      expect(content).toContain('13. **SDK v4.13.6 capabilities** (shipped across 4.12.0–4.13.6)');
      for (const api of ['Assessment', 'RiskAssessment', 'DatabaseView', 'Interceptor']) {
        expect(content).toContain(`**${api}**`);
      }
    });

    it('should carry the playbook, flow, and dashboard additions', () => {
      const content = prompt();
      expect(content).toContain('wfa.playbook.variant(');
      expect(content).toContain('ActivityDefinitions.Core.GoBack');
      expect(content).toContain('publicAccess');
      expect(content).toContain('return { lookup: lookup }');
      expect(content).toContain('**48** columns wide');
    });

    it('should keep the previous version entries rather than replacing them', () => {
      const content = prompt();
      expect(content).toContain('SDK v4.11.2 capabilities');
      expect(content).toContain('SDK v4.10.1 capabilities');
    });

    it('should no longer carry guidance the v4.13 SDK retired or contradicts', () => {
      const content = prompt();
      // Retired by SDK v4.13.0 flow hoisting and augment-mode index support.
      expect(content).not.toContain('Datapills captured inside a tryCatch/doInParallel block are not visible outside');
      expect(content).not.toContain('only `augments` + `schema` are allowed');
      // Fluent constructors take a config object; there is no method chaining.
      expect(content).not.toContain('Uses method chaining');
      // Automation APIs do not come from @servicenow/sdk/core.
      expect(content).not.toContain("Always import from '@servicenow/sdk/core' for all Fluent");
      expect(content).toContain("'@servicenow/sdk/automation'");
      // Playbook argument 2 is no longer just triggers.
      expect(content).toContain('PlaybookDefinition(config, dependentConfig, body)');
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('playbook resources must not call publicAccess a public API', () => {
      expect(spec('playbook')).toContain('It is NOT a public API');
      expect(spec('playbook')).toContain('EMBEDDED ON PUBLIC PAGES AND RUN BY UNAUTHENTICATED USERS');
      expect(instruct('playbook')).toContain('is **not** a public API');
      expect(instruct('playbook')).toContain('**embedded on public pages and run by unauthenticated users**');
    });

    it('playbook resources must not present image attachments as an authoring feature', () => {
      expect(instruct('playbook')).toContain('image attachments are **not** an authoring feature');
    });

    it('playbook resources must not claim @since JSDoc version markers', () => {
      expect(spec('playbook')).toContain('carry NO @since JSDoc tags');
      expect(instruct('playbook')).toContain('carry no "@since" tags');
    });

    it('playbook instruct must keep actionOverrides per activity and automationPlan in experience properties', () => {
      const content = instruct('playbook');
      expect(content).toContain('set **per activity** (not per playbook)');
      expect(content).toContain("it **replaces** the Playbook Card's default Declarative Action buttons");
      expect(content).toContain('allowed **only in experience properties**');
    });

    it('assessment resources must not invent a post-deployment steps API', () => {
      const content = instruct('assessment');
      expect(content).toContain('There is no "post-deployment steps" API, no condition object, and no "asmt_condition" table');
      expect(instruct('risk-assessment')).toContain('**Post-deployment verification is a manual, on-instance checklist, not an API.**');
    });

    it('assessment resources must warn that the string form of displayedWhen is written empty', () => {
      expect(spec('assessment')).toContain('SILENTLY WRITTEN EMPTY by the build');
      expect(instruct('assessment')).toContain('**the string form is silently written empty** by the build');
      expect(instruct('risk-assessment')).toContain('**The string form is silently written empty.**');
    });

    it('assessment resources must record that the shipped examples omitting scaleFactor do not build', () => {
      expect(instruct('assessment')).toContain('**fail `now-sdk build`**');
    });

    it('risk-assessment resources must state there is no table and no evaluationMethod', () => {
      expect(spec('risk-assessment')).toContain('there is NO `table` property');
      expect(spec('risk-assessment')).toContain('NO `evaluationMethod` property');
      expect(instruct('risk-assessment')).toContain('**There is no `table` and no `evaluationMethod` property.**');
    });

    it('risk-assessment resources must correct the float scaleFactor claim', () => {
      expect(spec('risk-assessment')).toContain('the RiskAssessment build does NOT reject a float');
      expect(instruct('risk-assessment')).toContain('Floats produce a build error" is false here');
    });

    it('new-type specs must state they do not accept $meta', () => {
      expect(spec('assessment')).toContain('NOTE: Assessment does NOT accept `$meta`');
      expect(spec('risk-assessment')).toContain('NOTE: RiskAssessment does NOT accept `$meta`');
      expect(instruct('assessment')).toContain('It does **not** accept `$meta`');
      expect(instruct('risk-assessment')).toContain('It does **not** accept `$meta`.');
    });

    it('database-view instruct must list the release-note example keys that do not exist', () => {
      const content = instruct('database-view');
      expect(content).toContain('not "where"');
      expect(content).toContain('no top-level "fields" array');
      expect(content).toContain('"inc.caller_id=usr.sys_id"');
      // Negative references stay out of backticks so validate-instructs does not
      // try to resolve a key that is not in the SDK corpus.
      expect(content).not.toContain('`where`');
    });

    it('database-view instruct must call field autocomplete a suggestion only', () => {
      expect(instruct('database-view')).toContain('suggestion only');
    });

    it('interceptor resources must record the missing release note and the orphaning rename', () => {
      const content = instruct('interceptor');
      expect(content).toContain('appears in no release note');
      expect(content).toContain('**orphans** the old one');
      expect(content).toContain("API doc's claim that the old record is deleted is wrong");
      expect(spec('interceptor')).toContain('ORPHANS the old one');
    });
  });
});
