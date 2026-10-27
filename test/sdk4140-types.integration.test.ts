/**
 * Integration tests for SDK v4.14.0 metadata coverage. These tests read actual
 * resource files from disk (no mocks) to verify content correctness for the one
 * new metadata type (ui-macro), the reusable-ATF-test additions to the `atf`
 * family, and the changed table/column/catalog/dashboard APIs, plus the CLI
 * surface this server wraps (`now-sdk exec` → fluent_exec_script).
 *
 * Source-of-truth directive: the locally-installed package wins wherever it
 * diverges from the release note or a shipped doc. Each divergence is asserted
 * below as a correction, e.g.:
 *   - The note's reusable-test example fails `now-sdk build` (TS6133, unused `const result`).
 *   - "ACL role protectionPolicy" is not new: it shipped in 4.13.6.
 *   - `atf.server.setOutputVariables` was removed; `Test()` never accepted `$meta`.
 *   - Dashboard `componentProps` is now written verbatim (no SDK default merge).
 *   - The snake_case `reference_qual_condition` column key is silently dropped.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';
import { loggerFixture } from './support/fixtures.js';
import type { CommandProcessor } from '../src/utils/types.js';

mock.module('../src/utils/logger.js', loggerFixture().mockOptions);
const { CommandFactory } = await import('../src/tools/registry/commandFactory.js');

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');

const read = (dir: string, file: string) => fs.readFileSync(path.join(dir, file), 'utf-8');
const spec = (type: string) => read(SPEC_DIR, `fluent_spec_${type}.md`);
const instruct = (type: string) => read(INSTRUCT_DIR, `fluent_instruct_${type}.md`);
const snippet = (type: string, id: string) => read(SNIPPET_DIR, `fluent_snippet_${type}_${id}.md`);
const prompt = (id: string) => read(path.join(RES_DIR, 'prompt'), `${id}.md`);

/** The fenced ```typescript code of a resource, without its surrounding prose. */
const code = (content: string) =>
  [...content.matchAll(/```typescript\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

/** Code with `//` comments removed, so prose that names a forbidden form is not mistaken for using it. */
const codeOnly = (content: string) => code(content).replace(/\/\/.*$/gm, '');

describe('SDK v4.14.0 Types - Integration Tests', () => {
  describe('Enum completeness', () => {
    it('should have the new enum entry UI_MACRO', () => {
      assert.equal(ServiceNowMetadataType.UI_MACRO, 'ui-macro');
    });

    it('should total 76 metadata types (75 before v4.14.0 + ui-macro)', () => {
      assert.equal(Object.values(ServiceNowMetadataType).length, 76);
    });

    it('should keep the enum sorted by value so ui-macro landed between ui-action and ui-page', () => {
      const values = Object.values(ServiceNowMetadataType) as string[];
      assert.deepStrictEqual(values, [...values].sort());
    });

    it('should not register reusable tests as a separate type (they are a Test() overload in the atf family)', () => {
      const values = Object.values(ServiceNowMetadataType) as string[];
      assert.equal(values.some((v) => v.includes('reusable')), false);
    });
  });

  describe('ui-macro (UiMacro) resources', () => {
    it('has spec/instruct/snippet coverage with balanced fences and the version marker', () => {
      const content = spec('ui-macro');
      assert.ok(content.startsWith('# **Context:**'));
      assert.ok(content.includes('@servicenow/sdk/core'));
      assert.ok(content.includes('SDK v4.14.0+'));
      assert.ok(instruct('ui-macro').includes('SDK v4.14.0+'));
      const fences = (content.match(/^```/gm) ?? []).length;
      assert.ok(fences > 0 && fences % 2 === 0);
      assert.ok(code(snippet('ui-macro', '0001')).includes('UiMacro({'));
    });

    it('documents $id as the identity and the derived scoped_name', () => {
      const content = spec('ui-macro');
      assert.ok(content.includes('MANDATORY - the record identity'));
      assert.ok(content.includes('never set sys_name/scoped_name'));
      assert.ok(content.includes('<g:x_myapp_alert_banner />'));
      assert.ok(instruct('ui-macro').includes('`<g:x_myapp_alert_banner />`'));
    });

    it('documents the build diagnostics, including the global-scope gap in the length check', () => {
      const content = spec('ui-macro');
      assert.ok(content.includes('longer than 100 characters -> ERROR (TS11)'));
      assert.ok(content.includes('In GLOBAL scope the length is NOT checked at all'));
      assert.ok(content.includes('same name AND mediaType -> ERROR (TS213'));
    });

    it('requires escaping Jelly ${...} in an inline template literal, as the snippet does', () => {
      assert.ok(spec('ui-macro').includes('escaped as \\${...}'));
      assert.ok(instruct('ui-macro').includes('must be escaped as `\\${...}`'));
      const body = code(snippet('ui-macro', '0001'));
      assert.ok(body.includes('\\${jvar_message}'));
      // An unescaped Jelly expression inside the template literal would be a TS interpolation (TS2304).
      assert.doesNotMatch(body, /(?<!\\)\$\{jvar_/);
    });

    it('treats mediaType as a lookup key, not a MIME type', () => {
      assert.ok(spec('ui-macro').includes('NOT an HTTP MIME type'));
      assert.ok(instruct('ui-macro').includes('**Omit `mediaType`**'));
      assert.doesNotMatch(codeOnly(spec('ui-macro')), /mediaType:\s*'text\/html'/);
    });

    it('carries the jelly-guide rule against && and < in an inline script body, entity-escaped or not', () => {
      const text = instruct('ui-macro');
      assert.ok(text.includes('Never place `&&` or `<` anywhere in an inline `<script>` body'));
      assert.ok(text.includes('decode back to raw characters between the two Jelly passes'));
    });

    it('steers away from Record({ table: \'sys_ui_macro\' }) and accepts $meta', () => {
      assert.ok(spec('ui-macro').includes("Prefer `UiMacro()` over `Record({ table: 'sys_ui_macro' })`"));
      assert.ok(instruct('ui-macro').includes('`$meta` (`installMethod`, `useEsLatest`)'));
    });

    it('is cross-referenced from the catalog, form, and UI page resources that consume macros', () => {
      assert.ok(spec('catalog-item').includes('UiMacro'));
      assert.ok(spec('catalog-variable').includes('UiMacro'));
      assert.ok(instruct('form').includes('UiMacro'));
      assert.ok(instruct('ui-page').includes('UiMacro'));
    });
  });

  describe('ATF reusable tests (Test() overload, atf family)', () => {
    it('spec documents isReusable/inputs/outputs in argument 1 and the callable tables', () => {
      const content = spec('atf');
      assert.ok(content.includes('REUSABLE TESTS (SDK v4.14.0+)'));
      assert.ok(content.includes('ALL go in ARG 1'));
      for (const table of ['sys_atf_test_callable', 'atf_input_variable_callable', 'atf_output_variable_callable', 'sys_atf_step_callable']) {
        assert.ok(content.includes(table), table);
      }
    });

    it('spec code calls atf.executeTest and atf.setReusableTestOutputs', () => {
      const body = code(spec('atf'));
      assert.ok(body.includes('isReusable: true'));
      assert.ok(body.includes('atf.executeTest('));
      assert.ok(body.includes('atf.setReusableTestOutputs('));
    });

    it('has a buildable reusable-test snippet with a caller that reads its result', () => {
      const body = code(snippet('atf', '0002'));
      assert.ok(body.includes('isReusable: true'));
      assert.match(body, /const created = atf\.executeTest\(/);
      // The caller must read the result (an unused const fails the build with TS6133).
      assert.ok(body.includes('created.incidentId'));
    });

    it('instruct has the reusable-tests section and the release-note corrections', () => {
      const text = instruct('atf');
      assert.ok(text.includes('## Reusable tests (SDK v4.14.0+)'));
      assert.ok(text.includes('fails `now-sdk build` with TS6133'));
    });

    it('no longer models $meta on Test(), which the declaration has never accepted', () => {
      assert.doesNotMatch(codeOnly(spec('atf')), /^\s*\$meta:\s*\{/m);
      assert.ok(!instruct('atf').includes('**Use `$meta.useEsLatest` only when a script body needs it**'));
    });

    it('removes atf.server.setOutputVariables everywhere except the removal note', () => {
      assert.doesNotMatch(codeOnly(spec('atf-server')), /setOutputVariables\s*\(/);
      assert.ok(spec('atf-server').includes('setOutputVariables was REMOVED in SDK v4.14.0'));
      // The atf index row no longer lists it as an atf.server method.
      const indexRow = spec('atf').split('\n').find((line) => line.startsWith('| `atf-server`')) ?? '';
      assert.ok(indexRow.length > 0);
      assert.ok(!indexRow.includes('setOutputVariables'));
    });

    it('uses the real snake_case step outputs on atf-server', () => {
      assert.ok(spec('atf-server').includes('record_id'));
      assert.doesNotMatch(code(snippet('atf-server', '0001')), /\.recordId\b/);
    });

    it('test-suite rejects reusable tests as entries', () => {
      assert.ok(spec('test-suite').includes('is TS2322'));
    });
  });

  describe('Changed APIs: columns, tables, role/property, assessment, catalog, dashboard, playbook', () => {
    it('column spec documents the four role arrays, arrayDenormalized, and referenceQualCondition', () => {
      const content = spec('column');
      for (const term of ['createRoles', 'readRoles', 'writeRoles', 'deleteRoles', 'arrayDenormalized', 'referenceQualCondition']) {
        assert.ok(content.includes(term), term);
      }
      assert.ok(content.includes('`arrayDenormalized?: boolean` (SDK v4.14.0+)'));
    });

    it('table spec documents basePolicy and table role arrays', () => {
      const content = spec('table');
      assert.ok(content.includes("basePolicy: 'private', // 'public' | 'private', optional (SDK v4.14.0+)"));
      assert.ok(content.includes('UNLESS `basePolicy` is set (SDK v4.14.0+)'));
      assert.ok(content.includes('createRoles: [], // (string | Role)[], optional (SDK v4.14.0+)'));
    });

    it('table_0004 uses camelCase referenceQualCondition (the snake_case key is silently dropped)', () => {
      const body = codeOnly(snippet('table', '0004'));
      assert.ok(body.includes('referenceQualCondition'));
      // Comments may explain the old key; only the code must not use it.
      assert.ok(!body.includes('reference_qual_condition'));
    });

    it('role and property specs document the explicit suffix', () => {
      assert.ok(spec('role').includes('suffix: \'\', // string, optional (SDK v4.14.0+)'));
      assert.ok(spec('property').includes('suffix: \'\', // string, optional (SDK v4.14.0+)'));
    });

    it('assessment specs replace the hard-coded global domain with domain/domainPath', () => {
      for (const type of ['assessment', 'risk-assessment']) {
        const content = spec(type);
        assert.ok(content.includes('domain'), type);
        assert.ok(content.includes('domainPath'), type);
        assert.ok(!/sys_domain is hard-coded to global/i.test(content), type);
      }
    });

    it('catalog-ui-policy spec accepts $meta', () => {
      assert.ok(spec('catalog-ui-policy').includes('$meta: { installMethod: \'demo\' }, // optional (SDK v4.14.0+)'));
    });

    it('dashboard writes componentProps verbatim and maps filter-group', () => {
      const content = spec('dashboard');
      assert.ok(content.includes('SDK v4.14.0+: written VERBATIM'));
      assert.ok(content.includes("'filter-group' (SDK v4.14.0+ resolves it to sys_id 'ba8b5fa922351c2027c524c91a134bf2')"));
      const body = code(snippet('dashboard', '0002'));
      assert.ok(body.includes('followFilters: true'));
      assert.ok(body.includes("filterConfigurations: '@state.parFilters'"));
    });

    it('playbook notes the always-settable AI-agent fields', () => {
      assert.ok(spec('playbook').includes('v4.14.0'));
      assert.ok(instruct('playbook').includes('v4.14.0'));
    });
  });

  describe('coding_in_fluent capabilities section', () => {
    it('adds an SDK v4.14.0 capabilities item and keeps the previous one', () => {
      const text = prompt('coding_in_fluent');
      assert.ok(text.includes('14. **SDK v4.14.0 capabilities**'));
      assert.ok(text.includes('13. **SDK v4.13.6 capabilities**'));
      for (const term of ['**UiMacro**', '**Reusable ATF tests**', 'basePolicy', 'arrayDenormalized', '`fluent_exec_script`']) {
        assert.ok(text.includes(term), term);
      }
    });

    it('does not present the build\'s unused-locals check as new in 4.14.0', () => {
      assert.ok(prompt('coding_in_fluent').includes('(not new, but the 4.14.0 release-note reusable-test example trips it)'));
    });
  });

  describe('CLI surface (Phase 4)', () => {
    const commands = CommandFactory.createCommands({ process: mock.fn() } as unknown as CommandProcessor);
    const byName = new Map(commands.map((c) => [c.name, c]));

    it('registers fluent_exec_script as the 14th SDK command tool', () => {
      assert.equal(commands.length, 14);
      assert.ok(byName.has('fluent_exec_script'));
      assert.equal(byName.get('fluent_exec_script')?.annotations?.destructiveHint, true);
    });

    it('lists fluent_exec_script in the MCPB manifest, keeping tools sorted (18 total)', () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'manifest.json'), 'utf-8')) as { tools: Array<{ name: string }> };
      const names = manifest.tools.map((t) => t.name);
      assert.equal(names.length, 18);
      assert.ok(names.includes('fluent_exec_script'));
      assert.deepStrictEqual(names, [...names].sort());
    });

    it('explain_fluent_api no longer advertises the never-declared --source', () => {
      const explain = byName.get('explain_fluent_api');
      assert.equal(explain?.arguments.some((a) => a.name === 'source'), false);
    });

    it('build_fluent_app exposes the new sourceMap flag', () => {
      assert.ok(byName.get('build_fluent_app')?.arguments.some((a) => a.name === 'sourceMap'));
    });
  });

  describe('Review corrections (verified by source or build against SDK v4.14.0)', () => {
    it('recordQuery enforceSecurity defaults to false, not true (Test.d.ts recordQuery)', () => {
      for (const type of ['atf-server', 'atf-server-record']) {
        assert.ok(spec(type).includes('recordQuery DEFAULTS TO FALSE'), type);
        assert.ok(instruct(type).includes('but to **`false` on `recordQuery`**'), type);
      }
    });

    it('steers instance-only ATF references to a looked-up sys_id, not the coalesce-key Now.ref form', () => {
      // The coalesce-key form writes a fresh random sys_id per build into the step value, with no lookup keys.
      const text = instruct('atf');
      assert.ok(text.includes("look its sys_id up on the instance"));
      assert.ok(text.includes('writes a fresh random sys_id on every build'));
    });

    it('reports $meta on Test() as TS2769 (two overloads), not TS2353', () => {
      assert.ok(spec('atf').includes('TS2769'));
      assert.ok(instruct('atf').includes('TS2769'));
      assert.doesNotMatch(spec('atf') + instruct('atf'), /\$meta[^\n]*TS2353|TS2353[^\n]*\$meta/);
    });

    it('CatalogUiPolicy useEsLatest writes a sys_es_latest_script row (it is not a no-op)', () => {
      for (const content of [spec('catalog-ui-policy'), instruct('catalog-ui-policy')]) {
        assert.ok(content.includes('sys_es_latest_script'));
        assert.ok(!content.includes('writes nothing'));
      }
    });

    it('maps installMethod to the real output folders (Keys.d.ts)', () => {
      const content = spec('ui-macro');
      assert.ok(content.includes("'first install' -> unload, 'demo' -> unload.demo"));
      assert.ok(content.includes("'once' -> apply_once"));
      assert.ok(!content.includes('unload.<method>'));
    });

    it('a wrong-dataType assessment branch field is a build error too', () => {
      const content = spec('assessment');
      assert.ok(content.includes('fails both tsc and now-sdk build (TS2353)'));
      assert.ok(!content.includes('NOT a build error'));
    });

    it('custom, UI page, rich-text label and checkbox variables do not take all base properties', () => {
      const content = spec('catalog-variable');
      const block = (name: string) => content.slice(content.indexOf(`${name}({`), content.indexOf('})', content.indexOf(`${name}({`)));
      for (const name of ['CustomVariable', 'CustomWithLabelVariable', 'UIPageVariable', 'RichTextLabelVariable']) {
        assert.match(block(name), /mandatory\/readOnly\/hidden/, name);
        assert.ok(!block(name).includes('+ all base properties'), name);
      }
      assert.ok(block('CheckboxVariable').includes('EXCEPT `mandatory`'));
      assert.ok(block('CheckboxVariable').includes('selectionRequired'));
    });
  });

  describe('Review corrections 2 (misleading claims)', () => {
    it('dashboard: a partial componentProps is fine (install fills defaults); no "set every prop" overclaim', () => {
      for (const content of [spec('dashboard'), instruct('dashboard'), snippet('dashboard', '0001'), prompt('coding_in_fluent')]) {
        assert.ok(!/set every prop/i.test(content));
        assert.ok(!content.includes('no longer follows the filter'));
      }
      assert.ok(instruct('dashboard').includes('so a partial object is fine'));
      assert.ok(!spec('dashboard').includes('no longer merged in v4.14.0+'));
    });

    it('assessment: Now.ID dependsOn fails the next now-sdk build, not only tsc', () => {
      assert.ok(spec('assessment').includes('the NEXT now-sdk build (and tsc) fails with TS2322'));
      assert.ok(instruct('assessment').includes('the next `now-sdk build` (and tsc) fails with TS2322'));
    });

    it('ui-macro: attribute values still need &amp;&amp;; the decode caveat is only for <script> bodies', () => {
      assert.ok(spec('ui-macro').includes('write test="${a &amp;&amp; b}", never'));
      assert.ok(instruct('ui-macro').includes('That decode caveat applies only to `<script>` bodies.'));
    });

    it('ATF examples follow the no-bypass rule and use no get_sys_id', () => {
      assert.doesNotMatch(codeOnly(snippet('atf', '0001')), /enforceSecurity:\s*false/);
      const createUserBlock = spec('atf-server').slice(spec('atf-server').indexOf('atf.server.impersonate({'), spec('atf-server').indexOf('atf.server.log({'));
      assert.ok(!createUserBlock.includes('get_sys_id'));
    });

    it('column: only the sys_dictionary record is contradictory without array: true', () => {
      assert.ok(spec('column').includes('the bootstrap still writes `array="denormalized"`'));
      assert.ok(instruct('column').includes('the bootstrap still writes `array="denormalized"`'));
    });
  });

  describe('Review nits', () => {
    it('ui-macro explains that Fluent TSnn codes are node kinds, not stable error codes', () => {
      assert.ok(spec('ui-macro').includes('SYNTAX KIND of the flagged node'));
      assert.ok(instruct('ui-macro').includes('**Match build diagnostics by message, not code.**'));
    });

    it('counts 92 ATF steps after setOutputVariables was removed', () => {
      assert.ok(spec('atf').includes('The 92 step APIs'));
      assert.ok(!/\b93 step APIs\b/.test(spec('atf') + snippet('atf', '0001')));
    });

    it('does not pass the deprecated $id to Role() in ATF resources', () => {
      for (const content of [spec('atf-server'), snippet('atf', '0001'), snippet('atf-server', '0001')]) {
        assert.doesNotMatch(codeOnly(content), /Role\(\{[^}]*\$id/);
      }
    });

    it('types createUser().user as any, formatterName as optional, and lists the j2/g2 namespaces', () => {
      assert.ok(spec('atf-server').includes('}): { user: any; };'));
      assert.ok(spec('form').includes('formatterName?: string,      // optional'));
      assert.ok(instruct('ui-page').includes('xmlns:j2="null" xmlns:g2="null"'));
    });

    it('table access-flag comments defer to basePolicy, and dashboard documents sys_domain global', () => {
      assert.ok(!/no SDK-applied default\n/.test(spec('table')));
      assert.ok(spec('table').includes('no SDK-applied default unless `basePolicy` is set'));
      assert.ok(spec('dashboard').includes("Every widget record is written with sys_domain 'global'"));
    });

    it('no ATF snippet bypasses ACLs or hard-codes the admin sys_id', () => {
      for (const file of fs.readdirSync(SNIPPET_DIR).filter((f) => f.startsWith('fluent_snippet_atf'))) {
        const body = codeOnly(read(SNIPPET_DIR, file));
        assert.doesNotMatch(body, /enforceSecurity:\s*false/, file);
        assert.ok(!body.includes('6816f79cc0a8016401c5a33be04be441'), file);
      }
      assert.ok(!instruct('atf-server-record').includes('set it to `false` only when'));
    });
  });

  describe('Live-instance finding (arp_bp0)', () => {
    it('sizes reusable-test sys_id outputs (maxLength: 32) so the platform does not truncate them to 30', () => {
      for (const content of [code(spec('atf')), code(snippet('atf', '0002'))]) {
        assert.ok(content.includes("incidentId: StringColumn({ label: 'Incident sys_id', maxLength: 32 })"));
      }
      assert.ok(instruct('atf').includes('`StringColumn` output with `maxLength: 32`'));
    });
  });

  describe('Release-note corrections (installed package = source of truth)', () => {
    it('does not re-mark ACL per-role protectionPolicy as a 4.14.0 feature (it shipped in 4.13.6)', () => {
      const content = spec('acl');
      assert.ok(content.includes('protectionPolicy'));
      for (const type of ['acl', 'column', 'table']) {
        for (const line of [...spec(type).split('\n'), ...instruct(type).split('\n')]) {
          assert.ok(!/protectionPolicy[^\n]*\(SDK v4\.14\.0\+\)/.test(line), `${type}: ${line}`);
        }
      }
    });

    it('records that arrayDenormalized needs array: true despite the type allowing it alone', () => {
      assert.ok(/array: true/.test(instruct('column')));
      assert.ok(instruct('column').includes('arrayDenormalized'));
    });

    it('records that basePolicy never governs web-service access and is rejected on augments', () => {
      const text = instruct('table');
      assert.ok(text.includes('basePolicy'));
      assert.ok(/allowWebServiceAccess|ws_access/.test(text));
      assert.ok(text.includes('augments'));
    });

    it('records that Assessment domainPath is not enforced with a non-global domain', () => {
      assert.ok(/domainPath/.test(instruct('assessment')));
    });
  });

  // Follow-up review: residual claims, each re-verified against the installed SDK
  // (a real build for executeTest, the build plugin's component map, Table.d.ts).
  describe('Residual review corrections', () => {
    it('executeTest with a standard test reports the plugin diagnostic AND TS2769, not only TS213', () => {
      const content = spec('atf');
      assert.ok(content.includes('fails the build twice'));
      assert.ok(content.includes('TS2769 "No overload matches this call" from the typed call'));
      assert.ok(!content.includes('Passing a standard test is TS213'));
    });

    it('ui-macro and form guidance treat formatterName as optional and derived', () => {
      assert.ok(!spec('ui-macro').includes("the Form's `formatterName`\n// must be"));
      assert.ok(spec('ui-macro').includes('`formatterName` is optional'));
      assert.ok(instruct('ui-macro').includes('Omit `formatterName`'));
      assert.ok(!instruct('ui-macro').includes('both values must be the **scoped** file name'));
      assert.ok(!spec('form').includes("formatterName: '<file name>' } in the Form"));
    });

    it('dashboard credits rule 14 to 4.14.0 and calls false the component default, not an SDK default', () => {
      const text = instruct('dashboard');
      assert.ok(text.includes('rule 14 was rewritten for SDK v4.14.0'));
      assert.ok(!text.includes('the SDK default is `false`'));
      assert.ok(!spec('dashboard').includes('(SDK default false)'));
    });

    it("warns that 'indicator-scorecard' resolves to the SDK's malformed id and gives the real sys_id", () => {
      const resolver = fs.readFileSync(
        path.join('node_modules', '@servicenow', 'sdk-build-plugins', 'dist', 'dashboard', 'dashboard-component-resolver.js'), 'utf-8');
      const mapped = /'indicator-scorecard': '([^']+)'/.exec(resolver)?.[1];
      // Guard: once the SDK fixes the map, this warning must be revisited.
      assert.equal(mapped, '9d31ba4d773ce32ef350d4A555b673f6e');
      assert.ok(!/^[0-9a-f]{32}$/.test(mapped ?? ''));
      for (const text of [spec('dashboard'), instruct('dashboard')]) {
        assert.ok(text.includes("'9d31ba4d773ce32ef350d4555b673f6e'"));
        assert.ok(text.includes('malformed'));
      }
    });

    it('records that basePolicy is never on the deprecated snake_case Table branch', () => {
      assert.ok(spec('table').includes('deprecated snake_case keys'));
      assert.ok(instruct('table').includes('deprecated snake_case keys'));
    });

    it('create_custom_ui forbids .ts/.tsx extensions in import paths (TS5097)', () => {
      assert.ok(prompt('create_custom_ui').includes('TS5097'));
    });
  });
});
