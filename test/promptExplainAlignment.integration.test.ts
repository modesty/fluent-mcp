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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROMPT_DIR = path.join(process.cwd(), 'res', 'prompt');
const read = (file: string): string => fs.readFileSync(path.join(PROMPT_DIR, file), 'utf-8');

// Substring checks that name the missing or unexpected text on failure.
const assertIncludes = (text: string, expected: string): void =>
  assert.ok(text.includes(expected), `expected prompt to contain: ${expected}`);
const assertExcludes = (text: string, unexpected: string): void =>
  assert.ok(!text.includes(unexpected), `expected prompt not to contain: ${unexpected}`);

describe('coding_in_fluent — explain alignment (SDK v4.13.6)', () => {
  const content = read('coding_in_fluent.md');

  describe('TypeScript-first server-side code (module-guide, fluent-overview)', () => {
    it('steers server logic to TypeScript modules under src/server, JavaScript only as the fallback', () => {
      assertIncludes(content, 'TypeScript first; JavaScript is only the fallback');
      assertIncludes(content, '`src/server/`');
      assertIncludes(content, '`serverModulesDir`');
      assertIncludes(content, "import { gs, GlideRecord } from '@servicenow/glide'");
      assertIncludes(content, "`GlideRecord<'<table>'>`");
      assertIncludes(content, 'Write a module in JavaScript only when the user asks for it');
    });

    it('names the APIs that accept module functions and the string-only fallbacks', () => {
      assertIncludes(content, '`BusinessRule`, `ScriptAction`, `UiAction`, `ScheduledScript`, `RestApi` route handlers, and `CatalogItemRecordProducer`');
      assertIncludes(content, '`ScriptInclude`, `ClientScript`, `CatalogClientScript`, `CatalogUiPolicy`, `UiPolicy`, `SPWidget`, `Record` data');
      assertIncludes(content, "TS2322 … is not assignable to type 'string'");
      assertIncludes(content, 'HTML stored as-is in a record field (a Jelly `UiPage`, a Service Portal template) use `Now.include()`');
    });

    it('exempts the bundled UI Page HTML entry from the Now.include rule (it must be imported)', () => {
      // Built against 4.13.6: Now.include('../client/index.html') succeeds but the
      // sys_ui_page record keeps src="./main.tsx"; importing the file rewrites it to
      // /uxasset/externals/<scope>/main.jsdbx?uxpcb=… via staticContent.paths.
      assertIncludes(content, 'The one exception is the HTML entry of a bundled UI Page');
      assertIncludes(content, "`import page from '../client/index.html'` and pass `html: page`");
      assertIncludes(content, '`Now.include()` there builds successfully but ships the unbuilt `src="./main.tsx"`');
      assertIncludes(content, '`create_custom_ui`');
      assertExcludes(content, 'Client-side scripts, HTML, and CSS always use `Now.include()`');
    });

    it('agrees with create_custom_ui, which forbids Now.include for the bundled page', () => {
      assertIncludes(read('create_custom_ui.md'), 'never use `Now.include()` for it');
    });

    it('keeps the Script Include rules: Class.create, no Glide imports, require() bridge', () => {
      assertIncludes(content, '`Class.create()`');
      assertIncludes(content, 'does **not** import Glide APIs');
      assertIncludes(content, '`require()`s the module');
    });

    it('retires the JavaScript-only and inline-ES5 policy', () => {
      assertExcludes(content, '/src/fluent/server');
      assertExcludes(content, '*not* TypeScript');
      assertExcludes(content, 'in ES5 syntax, not TypeScript');
    });

    it('states the ES2021 default and the platform-disallowed features (javascript-compatibility-guide)', () => {
      assertIncludes(content, "`jsLevel: 'es_latest'`");
      assertIncludes(content, 'ECMAScript 2021 mode by default');
      assertIncludes(content, '`helsinki_es5` or `traditional`');
      assertIncludes(content, '`async` class methods');
      assertIncludes(content, '`gs.nowDateTime()`');
    });
  });

  describe('Fluent syntax rules (proven by now-sdk build)', () => {
    it('cites the real compiler diagnostics for loops, conditionals and concatenation', () => {
      assertIncludes(content, '(TS250)');
      assertIncludes(content, '(TS245)');
      assertIncludes(content, '(TS303)');
    });

    it('warns that callback-generated records build but are corrupt', () => {
      assertIncludes(content, '`.map()`');
      assertIncludes(content, '`Symbol(Now.UNRESOLVED)`');
    });

    it('replaces get_sys_id with the now-ref-guide reference mechanisms', () => {
      assertIncludes(content, "Now.ref('sys_user_role', { name: 'itil' })");
      assertIncludes(content, "`Now.ref('<table>', '<sys_id>')`");
      assertIncludes(content, 'is **not** an SDK API');
      assertIncludes(content, "TS2304: Cannot find name 'get_sys_id'");
      assertExcludes(content, 'already available in the generated code');
      assertExcludes(content, 'EXCEPT get_sys_id');
    });

    it('carries the fluent-overview deletion warning for AI agents', () => {
      assertIncludes(content, '`keys.ts`');
      assertIncludes(content, 'ships a delete record');
    });

    it('describes this server’s working-directory contract, not the removed Roots flow', () => {
      assertIncludes(content, '`workingDirectory`');
      assertIncludes(content, '`FLUENT_MCP_WORKING_DIR`');
      assertExcludes(content, 'start the conversation with the `working directory`');
    });
  });

  describe('capability items corrected against explain + the package', () => {
    it('item 7: custom-action sys_id fallback, OverrideColumn baseTable optional, agent table ACLs', () => {
      assertIncludes(content, 'pass its sys_id string to `wfa.action()`');
      assertIncludes(content, 'alias `automation.actions`');
      assertIncludes(content, '`baseTable` is optional');
      assertIncludes(content, 'table ACLs for the tables an agent');
      assertExcludes(content, "`Record({ table: 'sys_ui_form', … })`");
    });

    it('item 8: protectionPolicy has two value sets', () => {
      assertIncludes(content, "`Action`/`Subflow` take `'read' | ''`");
      assertIncludes(content, "`'protected'` (others cannot change)");
      assertExcludes(content, "`''` (default) means no protection");
    });

    it('item 8: augments need the named export and use <scope>_ in x_ scopes, never "Store-app" u_', () => {
      assertIncludes(content, "export const <table> = Table({ augments: '<table>', schema })");
      assertIncludes(content, 'a Store app (always an `x_` scope) uses its scope prefix, never `u_`');
      assertExcludes(content, 'Store-app contexts');
    });

    it('item 9: DataLookup scope applies to both tables; ACL field accepts any string', () => {
      assertIncludes(content, '**both** `sourceTable` and `matcherTable`');
      assertIncludes(content, '`Record()` does not apply dictionary defaults');
      assertIncludes(content, "`keyof FullSchema<T> | SystemColumns | '*' | (string & {})`");
    });

    it('item 10: NASK providers come from the instance, never pre-selected', () => {
      assertIncludes(content, 'never hard-code or pre-select a provider');
      assertIncludes(content, "`'Amazon Bedrock'` (= AWS Claude)");
      assertExcludes(content, 'new LLM providers are selectable by name');
    });

    it('item 11: StateModel enforcement rule and companion Flow, useEsLatest reach, cicd logs', () => {
      assertIncludes(content, '`STTRMModel.evaluateTransition`');
      assertIncludes(content, 'companion approval `Flow`');
      assertIncludes(content, '`StateModel`, `AliasTemplate`, `InboundEmailAction`, and `CatalogItem` reject `$meta`');
      assertExcludes(content, 'new cross-cutting flag on any API with a server-side script field');
      assertIncludes(content, '`allowConfiguration` (SDK v4.13.3+), `allowNewFields`');
      assertIncludes(content, 'plus `logs` for a single test result');
    });

    it('item 12: on_demand forbids publicAccess; Manually() forbids variants and GoBack targeting', () => {
      assertIncludes(content, 'no `publicAccess` (typed `never`, SDK v4.13.0+)');
      assertIncludes(content, '`variant`/`variantOverrides` and pin');
      assertIncludes(content, 'never target it with `GoBack` or `evaluateVariantChildrenAfter`');
      assertIncludes(content, 'AI-agent activities are forbidden in `publicAccess` playbooks');
    });

    it('item 13: assessment array fields, scaleFactor, ChecklistTask default, augment-only never fields', () => {
      assertIncludes(content, '`displayedWhen` / `displayedWhenTemplate` / `correctAnswerChoice` / `correctAnswerTemplate`');
      assertIncludes(content, "unless `evaluationMethod: 'survey'`");
      assertIncludes(content, 'its default fills an omitted value');
      assertExcludes(content, '`ChecklistTask` requires `checklist_items` (the build enforces both)');
      assertIncludes(content, 'neither is allowed with `augments`');
      assertIncludes(content, 'Declaring any variant requires `parentTable`');
    });

    it('does not claim a dedicated constructor for every type (field-style is a Record table)', () => {
      assertIncludes(content, 'a typed `Record()` table for a few (e.g. `field-style`)');
      assertExcludes(content, 'a dedicated, strongly-typed API for every supported');
    });
  });
});

describe('create_custom_ui — explain alignment (SDK v4.13.6)', () => {
  const content = read('create_custom_ui.md');

  it('uses an endpoint that passes the scope-prefix rule (TS11)', () => {
    assertIncludes(content, "endpoint: 'x_sampleapp_frontend.do'");
    assertExcludes(content, 'x_sampleapp-uipage-fe.do');
  });

  it('pins the guide’s React 18.2.0 stack over the 19.x the templates scaffold', () => {
    assertIncludes(content, '**19.x** without `@servicenow/react-components`');
    assertIncludes(content, '"react": "18.2.0"');
    assertIncludes(content, '"@servicenow/react-components": "^0.1.0"');
    assertIncludes(content, '"@types/react": "18.3.12"');
  });

  it('describes the real bundling path and the clientDir / staticContent.paths trap', () => {
    assertIncludes(content, '`staticContent.paths`');
    assertIncludes(content, '{ "src/client/*.html": "dist/static/*.html" }');
    assertIncludes(content, 'never use `Now.include()` for it');
    assertExcludes(content, 'The SDK detects importing from an .html page');
  });

  it('matches the patterns-guide entry file', () => {
    assertIncludes(content, '<html class="-polaris">');
    assertIncludes(content, 'no `<!DOCTYPE html>`');
    assertIncludes(content, 'uxpcb');
  });

  it('carries the must-follow UI Page patterns', () => {
    assertIncludes(content, '"skipLibCheck": true');
    assertIncludes(content, '`NowRecordListConnected`');
    assertIncludes(content, '`RecordProvider`');
    assertIncludes(content, '`useRecord().form.isDirty`');
    assertIncludes(content, '`X-UserToken: window.g_ck`');
    assertIncludes(content, '`sysparm_display_value=all`');
    assertIncludes(content, '`window.self !== window.top`');
  });

  it('lists the guide’s full limitations', () => {
    assertIncludes(content, '`@import` in CSS files isn\'t supported (relative or remote)');
    assertExcludes(content, 'Relative @import in CSS isn\'t supported');
    assertIncludes(content, 'Audio, video, and WASM files aren\'t supported');
    assertIncludes(content, 'Output paths must be deterministic');
  });
});
