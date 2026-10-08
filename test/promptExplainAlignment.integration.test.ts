/**
 * The two exposed prompts, aligned with the SDK v4.13.6 `now-sdk explain` corpus
 * (`node_modules/@servicenow/sdk/docs/**`) and, where the docs and the installed
 * package disagree, with the package as proven by a real `now-sdk build`.
 *
 * Every build claim asserted here was reproduced in a scratch project against
 * 4.13.6 (see `.mosey/upgrade-sdk-4.13.6.md`, "Prompt alignment"):
 *  - `for…of` → TS250, `if` → TS245, `'a' + b` in a property → TS303
 *  - `.map()`-generated records build but write `Symbol(Now.UNRESOLVED)`
 *  - `get_sys_id(...)` → TS2304; `Now.ref('sys_user_role', { name })` builds
 *  - a TS module function as `BusinessRule.script` builds; a function as the
 *    string-only `ScriptInclude.script` → TS2322
 *  - an `x_` scope rejects a `u_` augment column; global accepts it
 *  - the UiPage example endpoint must begin with `<scope>_` (TS11 otherwise)
 *  - a changed `clientDir` without `staticContent.paths` ships unbuilt HTML
 */
import fs from 'node:fs';
import path from 'node:path';

const PROMPT_DIR = path.join(process.cwd(), 'res', 'prompt');
const read = (file: string): string => fs.readFileSync(path.join(PROMPT_DIR, file), 'utf-8');

describe('coding_in_fluent — explain alignment (SDK v4.13.6)', () => {
  const content = read('coding_in_fluent.md');

  describe('TypeScript-first server-side code (module-guide, fluent-overview)', () => {
    it('steers server logic to TypeScript modules under src/server, JavaScript only as the fallback', () => {
      expect(content).toContain('TypeScript first; JavaScript is only the fallback');
      expect(content).toContain('`src/server/`');
      expect(content).toContain('`serverModulesDir`');
      expect(content).toContain("import { gs, GlideRecord } from '@servicenow/glide'");
      expect(content).toContain("`GlideRecord<'<table>'>`");
      expect(content).toContain('Write a module in JavaScript only when the user asks for it');
    });

    it('names the APIs that accept module functions and the string-only fallbacks', () => {
      expect(content).toContain('`BusinessRule`, `ScriptAction`, `UiAction`, `ScheduledScript`, `RestApi` route handlers, and `CatalogItemRecordProducer`');
      expect(content).toContain('`ScriptInclude`, `ClientScript`, `CatalogClientScript`, `CatalogUiPolicy`, `UiPolicy`, `SPWidget`, `Record` data');
      expect(content).toContain("TS2322 … is not assignable to type 'string'");
      expect(content).toContain('HTML stored as-is in a record field (a Jelly `UiPage`, a Service Portal template) use `Now.include()`');
    });

    it('exempts the bundled UI Page HTML entry from the Now.include rule (it must be imported)', () => {
      // Built against 4.13.6: Now.include('../client/index.html') succeeds but the
      // sys_ui_page record keeps src="./main.tsx"; importing the file rewrites it to
      // /uxasset/externals/<scope>/main.jsdbx?uxpcb=… via staticContent.paths.
      expect(content).toContain('The one exception is the HTML entry of a bundled UI Page');
      expect(content).toContain("`import page from '../client/index.html'` and pass `html: page`");
      expect(content).toContain('`Now.include()` there builds successfully but ships the unbuilt `src="./main.tsx"`');
      expect(content).toContain('`create_custom_ui`');
      expect(content).not.toContain('Client-side scripts, HTML, and CSS always use `Now.include()`');
    });

    it('agrees with create_custom_ui, which forbids Now.include for the bundled page', () => {
      expect(read('create_custom_ui.md')).toContain('never use `Now.include()` for it');
    });

    it('keeps the Script Include rules: Class.create, no Glide imports, require() bridge', () => {
      expect(content).toContain('`Class.create()`');
      expect(content).toContain('does **not** import Glide APIs');
      expect(content).toContain('`require()`s the module');
    });

    it('retires the JavaScript-only and inline-ES5 policy', () => {
      expect(content).not.toContain('/src/fluent/server');
      expect(content).not.toContain('*not* TypeScript');
      expect(content).not.toContain('in ES5 syntax, not TypeScript');
    });

    it('states the ES2021 default and the platform-disallowed features (javascript-compatibility-guide)', () => {
      expect(content).toContain("`jsLevel: 'es_latest'`");
      expect(content).toContain('ECMAScript 2021 mode by default');
      expect(content).toContain('`helsinki_es5` or `traditional`');
      expect(content).toContain('`async` class methods');
      expect(content).toContain('`gs.nowDateTime()`');
    });
  });

  describe('Fluent syntax rules (proven by now-sdk build)', () => {
    it('cites the real compiler diagnostics for loops, conditionals and concatenation', () => {
      expect(content).toContain('(TS250)');
      expect(content).toContain('(TS245)');
      expect(content).toContain('(TS303)');
    });

    it('warns that callback-generated records build but are corrupt', () => {
      expect(content).toContain('`.map()`');
      expect(content).toContain('`Symbol(Now.UNRESOLVED)`');
    });

    it('replaces get_sys_id with the now-ref-guide reference mechanisms', () => {
      expect(content).toContain("Now.ref('sys_user_role', { name: 'itil' })");
      expect(content).toContain("`Now.ref('<table>', '<sys_id>')`");
      expect(content).toContain('is **not** an SDK API');
      expect(content).toContain("TS2304: Cannot find name 'get_sys_id'");
      expect(content).not.toContain('already available in the generated code');
      expect(content).not.toContain('EXCEPT get_sys_id');
    });

    it('carries the fluent-overview deletion warning for AI agents', () => {
      expect(content).toContain('`keys.ts`');
      expect(content).toContain('ships a delete record');
    });

    it('describes this server’s working-directory contract, not the removed Roots flow', () => {
      expect(content).toContain('`workingDirectory`');
      expect(content).toContain('`FLUENT_MCP_WORKING_DIR`');
      expect(content).not.toContain('start the conversation with the `working directory`');
    });
  });

  describe('capability items corrected against explain + the package', () => {
    it('item 7: custom-action sys_id fallback, OverrideColumn baseTable optional, agent table ACLs', () => {
      expect(content).toContain('pass its sys_id string to `wfa.action()`');
      expect(content).toContain('alias `automation.actions`');
      expect(content).toContain('`baseTable` is optional');
      expect(content).toContain('table ACLs for the tables an agent');
      expect(content).not.toContain("`Record({ table: 'sys_ui_form', … })`");
    });

    it('item 8: protectionPolicy has two value sets', () => {
      expect(content).toContain("`Action`/`Subflow` take `'read' | ''`");
      expect(content).toContain("`'protected'` (others cannot change)");
      expect(content).not.toContain("`''` (default) means no protection");
    });

    it('item 8: augments need the named export and use <scope>_ in x_ scopes, never "Store-app" u_', () => {
      expect(content).toContain("export const <table> = Table({ augments: '<table>', schema })");
      expect(content).toContain('a Store app (always an `x_` scope) uses its scope prefix, never `u_`');
      expect(content).not.toContain('Store-app contexts');
    });

    it('item 9: DataLookup scope applies to both tables; ACL field accepts any string', () => {
      expect(content).toContain('**both** `sourceTable` and `matcherTable`');
      expect(content).toContain('`Record()` does not apply dictionary defaults');
      expect(content).toContain("`keyof FullSchema<T> | SystemColumns | '*' | (string & {})`");
    });

    it('item 10: NASK providers come from the instance, never pre-selected', () => {
      expect(content).toContain('never hard-code or pre-select a provider');
      expect(content).toContain("`'Amazon Bedrock'` (= AWS Claude)");
      expect(content).not.toContain('new LLM providers are selectable by name');
    });

    it('item 11: StateModel enforcement rule and companion Flow, useEsLatest reach, cicd logs', () => {
      expect(content).toContain('`STTRMModel.evaluateTransition`');
      expect(content).toContain('companion approval `Flow`');
      expect(content).toContain('`StateModel`, `AliasTemplate`, `InboundEmailAction`, and `CatalogItem` reject `$meta`');
      expect(content).not.toContain('new cross-cutting flag on any API with a server-side script field');
      expect(content).toContain('`allowConfiguration` (SDK v4.13.3+), `allowNewFields`');
      expect(content).toContain('plus `logs` for a single test result');
    });

    it('item 12: on_demand forbids publicAccess; Manually() forbids variants and GoBack targeting', () => {
      expect(content).toContain('no `publicAccess` (typed `never`, SDK v4.13.0+)');
      expect(content).toContain('`variant`/`variantOverrides` and pin');
      expect(content).toContain('never target it with `GoBack` or `evaluateVariantChildrenAfter`');
      expect(content).toContain('AI-agent activities are forbidden in `publicAccess` playbooks');
    });

    it('item 13: assessment array fields, scaleFactor, ChecklistTask default, augment-only never fields', () => {
      expect(content).toContain('`displayedWhen` / `displayedWhenTemplate` / `correctAnswerChoice` / `correctAnswerTemplate`');
      expect(content).toContain("unless `evaluationMethod: 'survey'`");
      expect(content).toContain('its default fills an omitted value');
      expect(content).not.toContain('`ChecklistTask` requires `checklist_items` (the build enforces both)');
      expect(content).toContain('neither is allowed with `augments`');
      expect(content).toContain('Declaring any variant requires `parentTable`');
    });

    it('does not claim a dedicated constructor for every type (field-style is a Record table)', () => {
      expect(content).toContain('a typed `Record()` table for a few (e.g. `field-style`)');
      expect(content).not.toContain('a dedicated, strongly-typed API for every supported');
    });
  });
});

describe('create_custom_ui — explain alignment (SDK v4.13.6)', () => {
  const content = read('create_custom_ui.md');

  it('uses an endpoint that passes the scope-prefix rule (TS11)', () => {
    expect(content).toContain("endpoint: 'x_sampleapp_frontend.do'");
    expect(content).not.toContain('x_sampleapp-uipage-fe.do');
  });

  it('pins the guide’s React 18.2.0 stack over the 19.x the templates scaffold', () => {
    expect(content).toContain('**19.x** without `@servicenow/react-components`');
    expect(content).toContain('"react": "18.2.0"');
    expect(content).toContain('"@servicenow/react-components": "^0.1.0"');
    expect(content).toContain('"@types/react": "18.3.12"');
  });

  it('describes the real bundling path and the clientDir / staticContent.paths trap', () => {
    expect(content).toContain('`staticContent.paths`');
    expect(content).toContain('{ "src/client/*.html": "dist/static/*.html" }');
    expect(content).toContain('never use `Now.include()` for it');
    expect(content).not.toContain('The SDK detects importing from an .html page');
  });

  it('matches the patterns-guide entry file', () => {
    expect(content).toContain('<html class="-polaris">');
    expect(content).toContain('no `<!DOCTYPE html>`');
    expect(content).toContain('uxpcb');
  });

  it('carries the must-follow UI Page patterns', () => {
    expect(content).toContain('"skipLibCheck": true');
    expect(content).toContain('`NowRecordListConnected`');
    expect(content).toContain('`RecordProvider`');
    expect(content).toContain('`useRecord().form.isDirty`');
    expect(content).toContain('`X-UserToken: window.g_ck`');
    expect(content).toContain('`sysparm_display_value=all`');
    expect(content).toContain('`window.self !== window.top`');
  });

  it('lists the guide’s full limitations', () => {
    expect(content).toContain('`@import` in CSS files isn\'t supported (relative or remote)');
    expect(content).not.toContain('Relative @import in CSS isn\'t supported');
    expect(content).toContain('Audio, video, and WASM files aren\'t supported');
    expect(content).toContain('Output paths must be deterministic');
  });
});
