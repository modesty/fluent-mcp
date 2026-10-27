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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';
import { ResourceManager } from '../src/res/resourceManager.js';
import { GetSnippetCommand } from '../src/tools/resources/resourceTools.js';

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
    for (const [key, value] of NEW_TYPES) {
      it(`should have the new enum entry ${key}`, () => {
        assert.equal(ServiceNowMetadataType[key], value);
      });
    }

    it('should total at least 75 metadata types (71 before v4.12.x + assessment + risk-assessment + database-view + interceptor)', () => {
      // The newest SDK integration test owns the exact total; this file guards only its own additions.
      assert.ok(Object.values(ServiceNowMetadataType).length >= 75);
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
        assert.ok(snippets(value).length > 0);
      });
    }

    for (const [key, value] of NEW_TYPES) {
      it(`${key} spec has balanced code fences (${value})`, () => {
        // An unterminated fence makes the spec validator silently SKIP the block.
        const fences = (spec(value).match(/^```/gm) ?? []).length;
        assert.equal(fences % 2, 0);
        assert.ok(fences > 0);
      });
    }

    for (const [key, value, version] of NEW_TYPES) {
      it(`${key} spec and instruct carry the version the API first shipped in (${value}, v${version})`, () => {
        assert.ok(spec(value).includes(`SDK v${version}+`));
        assert.ok(instruct(value).includes(`SDK v${version}+`));
      });
    }

    for (const [key, value] of NEW_TYPES) {
      it(`${key} spec opens with the Context header and imports from @servicenow/sdk/core (${value})`, () => {
        const content = spec(value);
        assert.equal(content.startsWith('# **Context:**'), true);
        assert.ok(content.includes('@servicenow/sdk/core'));
      });
    }

    for (const [key, value] of NEW_TYPES) {
      it(`${key} spec must not model $meta, which the declaration lacks (${value})`, () => {
        // None of the four new declarations contains Now.Internal.Meta.
        assert.doesNotMatch(code(spec(value)), /^\s*\$meta: \{/m);
      });
    }
  });

  describe('assessment (Assessment) resources', () => {
    it('spec should document the four-level table chain and the scored side effects', () => {
      const content = spec('assessment');
      for (const table of ['asmt_metric_type', 'asmt_metric_category', 'asmt_metric', 'asmt_metric_definition']) {
        assert.ok(content.includes(table));
      }
      assert.ok(content.includes('sys_script'));
      assert.ok(content.includes('sys_trigger'));
      assert.ok(content.includes('ships **inactive**'));
    });

    it('spec should restrict evaluationMethod to the two accepted values', () => {
      const content = spec('assessment');
      assert.ok(content.includes('ONLY these two values are accepted'));
      assert.ok(content.includes("'assessment'"));
      assert.ok(content.includes("'survey'"));
    });

    it('spec should state Yes/No answers are string codes and dependsOn uses Now.ref', () => {
      const content = spec('assessment');
      assert.ok(content.includes("'1' = Yes, '0' = No"));
      assert.ok(content.includes("NOT Now.ID['<key>']"));
    });

    it('spec should state a script default must be an inline string literal', () => {
      assert.ok(spec('assessment').includes('it MUST be an INLINE string literal'));
    });

    it('instruct should state what the build checks (corrected in SDK v4.14.0: it does type-check .now.ts files)', () => {
      // The 4.13.6 wording ("does **not** type-check") was wrong: sdk-build-core runs pre-emit
      // diagnostics on .now.ts files in both 4.13.6 and 4.14.0. Hints are still not printed.
      assert.ok(instruct('assessment').includes('`now-sdk build` reports TypeScript errors in `.now.ts` files, and it does not print hints'));
      assert.ok(!instruct('assessment').includes('does **not** type-check'));
    });

    it('instruct should record that Now.include on a script default fails the build', () => {
      assert.ok(instruct('assessment').includes("fails with \"must also set 'script'\""));
    });

    it('snippet should declare a scaleFactor, which the build requires even though the type does not', () => {
      assert.match(code(snippets('assessment')[0]), /scaleFactor:\s*\d+/);
    });
  });

  describe('risk-assessment (RiskAssessment) resources', () => {
    it('spec should document the risk tables and the absence of business rules', () => {
      const content = spec('risk-assessment');
      assert.ok(content.includes('change_risk_asmt'));
      assert.ok(content.includes('change_risk_asmt_threshold'));
      assert.ok(content.includes('no `sys_script` business rule and no `sys_trigger` job'));
    });

    it('spec should record the stored threshold risk codes', () => {
      assert.ok(spec('risk-assessment').includes('high = 2, moderate = 3, low = 4'));
    });

    it('instruct should require the plugin check first and name the tool to do it', () => {
      const content = instruct('risk-assessment');
      assert.ok(content.includes('**HARD STOP — check the plugin first.**'));
      assert.ok(content.includes('com.snc.change_management.risk_assessment'));
      assert.ok(content.includes('query_fluent_records tool against table `sys_plugins`'));
    });

    it('snippet should declare thresholds and no table or evaluationMethod', () => {
      const snippet = code(snippets('risk-assessment')[0]);
      assert.ok(snippet.includes('RiskAssessment('));
      assert.ok(snippet.includes('thresholds'));
      assert.doesNotMatch(snippet, /^\s*table:/m);
      assert.doesNotMatch(snippet, /^\s*evaluationMethod:/m);
    });
  });

  describe('database-view (DatabaseView) resources', () => {
    it('spec should document all three tables and the coalesce identity', () => {
      const content = spec('database-view');
      assert.ok(content.includes('sys_db_view'));
      assert.ok(content.includes('sys_db_view_table'));
      assert.ok(content.includes('sys_db_view_table_field'));
      assert.ok(content.includes('a top-level `$id` is **not accepted**, and neither is `$meta`'));
    });

    it('spec should document both scope prefixes as hard errors', () => {
      const content = spec('database-view');
      assert.ok(content.includes("'u_'"));
      assert.ok(content.includes('x_acme_'));
      assert.ok(content.includes('hard build error'));
    });

    it('spec should state the join predicate is not an encoded query', () => {
      assert.ok(spec('database-view').includes('NOT an encoded query'));
    });

    it('spec should state that protectionPolicy reaches every child row', () => {
      assert.ok(spec('database-view').includes('copies it onto EVERY'));
    });

    it('snippet should use the global u_ prefix, nested fields, and whereClause', () => {
      const snippet = code(snippets('database-view')[0]);
      assert.match(snippet, /name:\s*'u_/);
      assert.ok(snippet.includes('whereClause:'));
      assert.ok(snippet.includes('variablePrefix:'));
      assert.doesNotMatch(snippet, /^\s*where:/m);
    });

    it('snippet should not declare a top-level $id', () => {
      // The first property after `DatabaseView({` is the identity `name`, never `$id`.
      const snippet = code(snippets('database-view')[0]);
      assert.match(snippet, /DatabaseView\(\{\s*(\/\/[^\n]*\s*)*name:/);
    });
  });

  describe('interceptor (Interceptor) resources', () => {
    it('spec should document sys_wizard, its answers, and the WithMetadata type', () => {
      const content = spec('interceptor');
      assert.ok(content.includes('sys_wizard'));
      assert.ok(content.includes('sys_wizard_answer'));
      assert.ok(content.includes('the type is Now.Internal.WithMetadata'));
      assert.ok(content.includes('a top-level `$id` is **not accepted**, and neither is `$meta`'));
    });

    it('spec should author choices with Record() + Now.ref and warn about Now.ID', () => {
      const content = spec('interceptor');
      assert.ok(content.includes("table: 'sys_wizard_choice'"));
      assert.ok(content.includes("Now.ref('sys_wizard_answer', 'answer_multiple_choice')"));
      assert.ok(content.includes('writes the literal key string, a BROKEN reference'));
    });

    it('spec should record that choice install behaviour was not instance-verified', () => {
      assert.ok(spec('interceptor').includes('NOT verified against an'));
    });

    it('instruct should record the guide contradiction on choices', () => {
      const content = instruct('interceptor');
      assert.ok(content.includes('add these choices by hand on the instance after deploying'));
      assert.ok(content.includes('has not been verified against an instance'));
    });

    it('snippet should link questions with nextQuestion and give every answer an $id', () => {
      const snippet = code(snippets('interceptor')[0]);
      assert.ok(snippet.includes('Interceptor('));
      assert.ok(snippet.includes('nextQuestion'));
      assert.ok(snippet.includes('$id:'));
    });
  });

  describe('dashboard corrections (documented in the SDK v4.13.x guides)', () => {
    it('spec and instruct should state the 48-column grid', () => {
      assert.ok(spec('dashboard').includes('The widget grid is 48 columns wide, not 12 or 24.'));
      assert.ok(spec('dashboard').includes('half = 24'));
      assert.ok(instruct('dashboard').includes('The widget grid is 48 columns wide, not 12 or 24.'));
      assert.ok(instruct('dashboard').includes('half is 24'));
    });

    it('spec, instruct and snippet 0002 should carry the unverified-component caveat', () => {
      // Whitespace-normalized: the caveat wraps across `//` comment lines in the spec and snippet.
      // Since SDK v4.14.0 it covers only 'filter' and 'list-simple'; 'filter-group' now resolves.
      const flat = (text: string) => text.replace(/\s*\n\s*(\/\/\s*)?/g, ' ');
      const caveat = 'absent from the SDK build plugin\'s component name-to-sys_id map, so the build writes them through as literal strings — verify on an instance, or pass the component sys_id instead.';
      assert.ok(flat(spec('dashboard')).includes(caveat));
      assert.ok(flat(instruct('dashboard')).includes(caveat));
      assert.ok(flat(snippets('dashboard')[1]).includes(caveat));
    });

    it('spec and instruct should mark the corrections as guide-documented, not new features', () => {
      assert.ok(spec('dashboard').includes('documented in SDK v4.13.x guides'));
      assert.ok(instruct('dashboard').includes('documented in SDK v4.13.x guides'));
    });

    it('spec and snippets should bind data inline instead of by report sys_id', () => {
      assert.ok(!spec('dashboard').includes('reportSysId'));
      for (const snippet of snippets('dashboard')) {
        assert.ok(!snippet.includes('reportSysId'));
      }
      assert.ok(code(snippets('dashboard')[0]).includes('dataSources'));
    });

    it('should leave the plugin-defaulted filter wiring to the build', () => {
      // followFilters / '@state.parFilters' are filled in by the plugin.
      assert.ok(spec('dashboard').includes("'@state.parFilters'"));
      assert.ok(instruct('dashboard').includes("'@state.parFilters'"));
    });
  });

  describe('Changed API: Playbook v4.13.0 expansion', () => {
    it('spec should document variants, the evaluation point, and both per-activity variant forms', () => {
      const content = spec('playbook');
      assert.ok(content.includes('wfa.playbook.variant('));
      assert.ok(content.includes('evaluateVariantChildrenAfter'));
      assert.ok(content.includes('variantOverrides'));
      assert.ok(content.includes('strictly before: the evaluation-point activity'));
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

      assert.equal(offenders(code(spec('playbook'))).length, 0);

      // Negative control: the forbidden shape must be detected.
      const broken = `wfa.playbook.activity(X, {
        variant: params.variants.vip,
        variantOverrides: [{ variant: params.variants.vip, order: 1 }],
      })`;
      assert.equal(offenders(broken).length, 1);
    });

    it('spec should document Go Back placement and its RUN_ALWAYS target', () => {
      const content = spec('playbook');
      assert.ok(content.includes('GoBack'));
      assert.ok(content.includes("It is ONLY valid as the TERMINAL activity of a 'match_first' decision branch"));
      assert.ok(content.includes("restartRule MUST be 'RUN_ALWAYS'"));
    });

    it('spec should document isIdealPath, actionOverrides, and automationPlan placement', () => {
      const content = spec('playbook');
      assert.ok(content.includes('isIdealPath'));
      assert.ok(content.includes('PER ACTIVITY (not per playbook)'));
      assert.ok(content.includes("REPLACES the card's default Declarative Action"));
      assert.ok(content.includes('the ONLY place (besides an ActivityDefinition()\'s defaultExperienceProperties)'));
    });

    it('spec should flag the mandatory-input and BaseActivityConfig changes as potentially breaking', () => {
      const content = spec('playbook');
      assert.ok(content.includes('POTENTIALLY BREAKING for existing code'));
      assert.ok(content.includes('now fails with TS2312'));
      assert.ok(instruct('playbook').includes('potentially BREAKING'));
    });

    it('spec should only show launcher record-form fields with launcherShowRecordForm: true', () => {
      // Setting the view or template fields while the form is off is a build error,
      // so the copyable spec must never model that combination.
      const content = spec('playbook');
      assert.ok(content.includes('setting launcherRecordFormView while'));
      assert.ok(content.includes('"launcherTemplateFields can only be set when'));
      const calls = code(content).split('PlaybookDefinition(').slice(1);
      for (const call of calls.filter((c) => /^\s*launcherRecordFormView:/m.test(c))) {
        assert.match(call, /^\s*launcherShowRecordForm:\s*true/m);
      }
    });

    it('spec should mark preservedAttachment as framework-managed', () => {
      assert.ok(spec('playbook').includes('FRAMEWORK-MANAGED (SDK v4.13.0+)'));
    });

    it('instruct should warn against copying the guide variant example that uses a const before declaration', () => {
      assert.ok(instruct('playbook').includes('fails with TS2448'));
    });

    it('new snippets should demonstrate variants and a match_first Go Back with an ideal path', () => {
      const all = snippets('playbook').map(code);
      assert.equal(all.some((s) => s.includes('wfa.playbook.variant(') && s.includes('evaluateVariantChildrenAfter')), true);
      assert.equal(all.some((s) => s.includes('GoBack') && s.includes("'match_first'") && s.includes('isIdealPath')), true);
    });
  });

  describe('Changed APIs: flow hoisting, table, column, ACL, UI action, ATF, $meta', () => {
    it('flow spec should document hoisted outputs in the build-verified form', () => {
      const content = spec('flow');
      assert.ok(content.includes('return { lookup: lookup } // NOT the shorthand { lookup }'));
      assert.ok(content.includes('TS211 "Invalid pill reference"'));
      assert.ok(content.includes('name it `_tryOutputs`'));
      assert.ok(content.includes('CHANGED GUIDANCE'));
    });

    it('flow instruct should retire the setFlowVariables-only rule rather than contradict it', () => {
      const content = instruct('flow');
      assert.ok(content.includes('The old rule "datapills inside a tryCatch/doInParallel block are not accessible outside it — use setFlowVariables" is retired'));
      assert.ok(content.includes('never the shorthand "return { lookup }"'));
    });

    it('new flow snippet should hoist with explicit uuids and no shorthand returns', () => {
      const snippet = code(read(SNIPPET_DIR, 'fluent_snippet_flow_0003.md'));
      assert.ok(snippet.includes('wfa.flowLogic.tryCatch'));
      assert.match(snippet, /uuid:\s*'/);
      // A shorthand return such as `return { lookup }` is a Fluent build error.
      // Comments may quote the forbidden form, so check executable lines only.
      const executable = snippet.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
      assert.match(executable, /return \{ \w+: \w+ \}/);
      assert.doesNotMatch(executable, /return \{\s*\w+\s*\}/);
    });

    it('table spec should allow index in augment mode and document the v4.13.3 properties', () => {
      const content = spec('table');
      assert.ok(content.includes('only `schema` and — SDK v4.13.0+ — `index` are allowed'));
      assert.ok(content.includes('allowConfiguration: false, // boolean, optional (SDK v4.13.3+)'));
      assert.ok(content.includes('dbObjectId: false, // boolean, optional (SDK v4.13.3+)'));
    });

    it('column spec should accept any UrlColumn string, including relative values', () => {
      assert.ok(spec('column').includes('any string is accepted (SDK v4.12.0+), including relative values'));
    });

    it('acl spec should list 14 types, require name for aiux types, and document per-role policy', () => {
      const content = spec('acl');
      assert.ok(content.includes('those 14 are autocomplete suggestions'));
      assert.ok(content.includes('**WARNING — `aiux_*` types require `name`.**'));
      for (const type of ['aiux_page', 'aiux_widget', 'aiux_experience']) {
        assert.ok(content.includes(type));
      }
      assert.ok(content.includes('(SDK v4.13.6+)'));
    });

    it('ui-action spec should document programmatic-only form/list and the AI styles', () => {
      const content = spec('ui-action');
      assert.ok(content.includes('only applicable in UI26'));
      assert.ok(content.includes("'primary-ai'"));
      assert.ok(content.includes("'secondary-ai'"));
    });

    it('all advertised ui-action snippets should provide code through both resources and tools', async () => {
      const resources = new ResourceManager();
      const listed = await resources.listResources();
      assert.ok(listed.some((resource) => resource.uri === 'sn-snippet://ui-action/0001'));

      const command = new GetSnippetCommand();
      const defaultResult = await command.execute({ metadataType: 'ui-action' });
      assert.equal(defaultResult.success, true);
      assert.equal(defaultResult.structuredContent?.snippetId, '0001');
      const ids = ['0001', ...(defaultResult.structuredContent?.additionalSnippetIds as string[] ?? [])];
      assert.ok(ids.length >= 10, 'The default tool result must advertise the existing examples');

      for (const id of ids) {
        const resource = await resources.readResource(`sn-snippet://ui-action/${id}`);
        const content = resource.contents[0].text;
        assert.ok(content.trim().length > 0, `Advertised snippet ${id} must not be blank`);
        assert.match(code(content), /import\s+\{\s*UiAction\s*\}\s+from\s+['"]@servicenow\/sdk\/core['"]/);
        assert.match(code(content), /UiAction\s*\(/);

        const result = await command.execute({ metadataType: 'ui-action', id });
        assert.equal(result.success, true);
        assert.equal(result.structuredContent?.content, content);
        if (id === '0001') assert.equal(defaultResult.structuredContent?.content, content);
      }
    });

    for (const type of [
      'email-notification', 'ui-policy', 'instance-scan', 'catalog-client-script',
      'catalog-item-record-producer', 'catalog-variable',
    ]) {
      it(`${type} spec should document the $meta it accepts as of SDK v4.13.0`, () => {
        const content = spec(type);
        assert.ok(content.includes('$meta'));
        assert.ok(content.includes('SDK v4.13.0+'));
      });
    }

    it('graphql spec should keep the top-level $meta denial and warn the resolver form is ignored', () => {
      const content = spec('graphql-api');
      assert.ok(content.includes('NOTE: GraphQLApi does NOT accept `$meta`'));
      assert.ok(content.includes('ENTRY now type-checks with `$meta`, but the build'));
    });

    it('atf-server-catalog-item resources should use the real snake_case input and output names', () => {
      const content = spec('atf-server-catalog-item');
      assert.ok(content.includes('}): { catalog_item_id: string; };'));
      assert.ok(content.includes("request_item: get_sys_id('sc_req_item', '')"));
      for (const snippet of snippets('atf-server-catalog-item')) {
        assert.doesNotMatch(code(snippet), /\b(catalogItemId|requestItem|requestId)\b/);
      }
    });

    it('atf-form-sp instruct should reject the stale assertion value', () => {
      assert.ok(instruct('atf-form-sp').includes('"page_reloaded_or_redirected" is not a valid value'));
    });
  });

  describe('coding_in_fluent capabilities section', () => {
    const prompt = () => read(path.join(RES_DIR, 'prompt'), 'coding_in_fluent.md');

    it('should carry a v4.13.6 capabilities entry naming all four new types', () => {
      const content = prompt();
      assert.ok(content.includes('13. **SDK v4.13.6 capabilities** (shipped across 4.12.0–4.13.6)'));
      for (const api of ['Assessment', 'RiskAssessment', 'DatabaseView', 'Interceptor']) {
        assert.ok(content.includes(`**${api}**`));
      }
    });

    it('should carry the playbook, flow, and dashboard additions', () => {
      const content = prompt();
      assert.ok(content.includes('wfa.playbook.variant('));
      assert.ok(content.includes('ActivityDefinitions.Core.GoBack'));
      assert.ok(content.includes('publicAccess'));
      assert.ok(content.includes('return { lookup: lookup }'));
      assert.ok(content.includes('**48** columns wide'));
    });

    it('should keep the previous version entries rather than replacing them', () => {
      const content = prompt();
      assert.ok(content.includes('SDK v4.11.2 capabilities'));
      assert.ok(content.includes('SDK v4.10.1 capabilities'));
    });

    it('should no longer carry guidance the v4.13 SDK retired or contradicts', () => {
      const content = prompt();
      // Retired by SDK v4.13.0 flow hoisting and augment-mode index support.
      assert.ok(!content.includes('Datapills captured inside a tryCatch/doInParallel block are not visible outside'));
      assert.ok(!content.includes('only `augments` + `schema` are allowed'));
      // Fluent constructors take a config object; there is no method chaining.
      assert.ok(!content.includes('Uses method chaining'));
      // Automation APIs do not come from @servicenow/sdk/core.
      assert.ok(!content.includes("Always import from '@servicenow/sdk/core' for all Fluent"));
      assert.ok(content.includes("'@servicenow/sdk/automation'"));
      // Playbook argument 2 is no longer just triggers.
      assert.ok(content.includes('PlaybookDefinition(config, dependentConfig, body)'));
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('playbook resources must not call publicAccess a public API', () => {
      assert.ok(spec('playbook').includes('It is NOT a public API'));
      assert.ok(spec('playbook').includes('EMBEDDED ON PUBLIC PAGES AND RUN BY UNAUTHENTICATED USERS'));
      assert.ok(instruct('playbook').includes('is **not** a public API'));
      assert.ok(instruct('playbook').includes('**embedded on public pages and run by unauthenticated users**'));
    });

    it('playbook resources must not present image attachments as an authoring feature', () => {
      assert.ok(instruct('playbook').includes('image attachments are **not** an authoring feature'));
    });

    it('playbook resources must not claim @since JSDoc version markers', () => {
      assert.ok(spec('playbook').includes('carry NO @since JSDoc tags'));
      assert.ok(instruct('playbook').includes('carry no "@since" tags'));
    });

    it('playbook instruct must keep actionOverrides per activity and automationPlan in experience properties', () => {
      const content = instruct('playbook');
      assert.ok(content.includes('set **per activity** (not per playbook)'));
      assert.ok(content.includes("it **replaces** the Playbook Card's default Declarative Action buttons"));
      assert.ok(content.includes('allowed **only in experience properties**'));
    });

    it('assessment resources must not invent a post-deployment steps API', () => {
      const content = instruct('assessment');
      assert.ok(content.includes('There is no "post-deployment steps" API, no condition object, and no "asmt_condition" table'));
      assert.ok(instruct('risk-assessment').includes('**Post-deployment verification is a manual, on-instance checklist, not an API.**'));
    });

    it('assessment resources must warn that the string form of displayedWhen is written empty', () => {
      assert.ok(spec('assessment').includes('SILENTLY WRITTEN EMPTY by the build'));
      assert.ok(instruct('assessment').includes('**the string form is silently written empty** by the build'));
      assert.ok(instruct('risk-assessment').includes('**The string form is silently written empty.**'));
    });

    it('assessment resources must record that the shipped examples omitting scaleFactor do not build', () => {
      assert.ok(instruct('assessment').includes('**fail `now-sdk build`**'));
    });

    it('risk-assessment resources must state there is no table and no evaluationMethod', () => {
      assert.ok(spec('risk-assessment').includes('there is NO `table` property'));
      assert.ok(spec('risk-assessment').includes('NO `evaluationMethod` property'));
      assert.ok(instruct('risk-assessment').includes('**There is no `table` and no `evaluationMethod` property.**'));
    });

    it('risk-assessment resources must correct the float scaleFactor claim', () => {
      assert.ok(spec('risk-assessment').includes('the RiskAssessment build does NOT reject a float'));
      assert.ok(instruct('risk-assessment').includes('Floats produce a build error" is false here'));
    });

    it('new-type specs must state they do not accept $meta', () => {
      assert.ok(spec('assessment').includes('NOTE: Assessment does NOT accept `$meta`'));
      assert.ok(spec('risk-assessment').includes('NOTE: RiskAssessment does NOT accept `$meta`'));
      assert.ok(instruct('assessment').includes('It does **not** accept `$meta`'));
      assert.ok(instruct('risk-assessment').includes('It does **not** accept `$meta`.'));
    });

    it('database-view instruct must list the release-note example keys that do not exist', () => {
      const content = instruct('database-view');
      assert.ok(content.includes('not "where"'));
      assert.ok(content.includes('no top-level "fields" array'));
      assert.ok(content.includes('"inc.caller_id=usr.sys_id"'));
      // Negative references stay out of backticks so validate-instructs does not
      // try to resolve a key that is not in the SDK corpus.
      assert.ok(!content.includes('`where`'));
    });

    it('database-view instruct must call field autocomplete a suggestion only', () => {
      assert.ok(instruct('database-view').includes('suggestion only'));
    });

    it('interceptor resources must record the missing release note and the orphaning rename', () => {
      const content = instruct('interceptor');
      assert.ok(content.includes('appears in no release note'));
      assert.ok(content.includes('**orphans** the old one'));
      assert.ok(content.includes("API doc's claim that the old record is deleted is wrong"));
      assert.ok(spec('interceptor').includes('ORPHANS the old one'));
    });
  });
});
