---
title: "Coding in Fluent (ServiceNow SDK)"
description: "Guide for coding in Fluent (ServiceNow SDK) with examples for specific metadata types"
arguments:
  - name: metadata_list
    description: 'Comma-separated list of metadata types to include in the guide (e.g., "table,business-rule,script-include")'
    required: true
---

# Coding in ServiceNow Fluent

Guide for coding in ServiceNow Fluent with metadata type examples.

Fluent (ServiceNow SDK) is a TypeScript-based domain-specific language that allows you to create and manage metadata, modules, records, and tests in the ServiceNow platform. It features:

- Strong typing with TypeScript
- Declarative syntax for better readability
- Integration with modern development tools
- Testability and portability

## Key Concepts

- **Metadata Types**: Each ServiceNow object type (tables, business rules, client scripts, etc.) has a corresponding Fluent API
- **Fluent API**: Uses method chaining for a readable, declarative style
- **TypeScript Support**: Full type checking and editor completion
- **SDK Commands**: CLI tools for initializing, building, and deploying ServiceNow applications

## Syntax and Best Practices

1. **Use Fluent Syntax**
    - Fluent syntax is TypeScript WITHOUT imperative coding constructs such as loops, if-else statements, promises, nor '+' operator for string  concatenation.
    - ALWAYS use template literals for string interpolation and concatenation. Incorrect Example: {conditions: 'priority=3^assignment_group=' + get_sys_id('sys_user_group', 'name=CAB Approval^ORlabel=CAB Approval')} ; Correct Example: {conditions: `priority=3^assignment_group=${get_sys_id('sys_user_group', 'name=CAB Approval^ORlabel=CAB Approval')}`}
    - Write TypeScript code with direct assignments for property values, avoiding any function calls EXCEPT get_sys_id and declared return variables
    - Do NOT put get_sys_id in the import statement, they are helper functions that are already available in the generated code
    - Always import from '@servicenow/sdk/core' for all Fluent (ServiceNow SDK) APIs
2. **Utilize tools**: Utilize the the tools to get metadata API spec, snippets, and instructs to help you write better Fluent (ServiceNow SDK)
   - tools also include now-sdk CLI commands for init a project, build, and deploy
   - when working with a Fluent project locally, ensure to start the conversation with the `working directory` set to the root of the Fluent project
3. **Modularize Code**: Split complex configurations into smaller, reusable modules
   - for `script` properties, create separate `/src/fluent/server/*.js` files and import them
   - to create `/src/fluent/server/*.js` file, use ServiceNow Scripting API to create JavaScript file, *not* TypeScript
4. **Validate Early**: Test your code locally before deploying to instances
5. **Use SDK Commands**: Utilize the ServiceNow SDK CLI for efficient workflows
6. **ServiceNow Glide Script**: ServiceNow scripting are usually used in `script` properties in Fluent APIs, write them inline in ServiceNow Scripting in ES5 syntax, not TypeScript
7. **SDK v4.6.0 capabilities** — when generating code, take advantage of these additions where applicable:
    - **Declarative Form API** publicly exported from `@servicenow/sdk/core` — prefer `Form({ table, view, sections })` over manual `Record({ table: 'sys_ui_form', … })` chains.
    - **Subflow-of-subflow** — Subflows can call other Subflows via `wfa.subflow(<importedSubflow>, …)`.
    - **Custom Actions in flows** — define reusable actions with `Action()` from `@servicenow/sdk/automation`, invoke from flows via `wfa.action(<importedAction>, …)`. Cross-scope references work through `now.config.json` SDK dependencies.
    - **AIAF auto-ACL** — `AiAgent` / `AiAgenticWorkflow` build automatically generates `sys_security_acl` and `sys_security_acl_role` records from the mandatory `securityAcl` property. Do not author manual `Acl()` records for agents.
    - **NASK** — when `outputs` is omitted, the SDK auto-generates `response`, `provider`, `errorcode`, `status`, `error`. New `dataType` values: `glide_record` (requires `tableName`), `simple_array`, `json_object`, `json_array`.
    - **Table dictionary overrides** — use `OverrideColumn({ baseTable, … })` inside a child table's `schema` instead of authoring `sys_dictionary_override` records by hand.
    - **InboundEmailAction**, **SPHeaderFooter**, **SPPageRouteMap** — new dedicated APIs for these metadata types (see their per-type specs).
8. **SDK v4.7.0 capabilities** — when generating code, take advantage of these additions where applicable:
    - **DataPolicy** — new API from `@servicenow/sdk/core` for `sys_data_policy2`. Enforces mandatory / read-only field rules **server-side** (cannot be bypassed via API, import, or web service). Prefer it over UI Policy for security/data-integrity rules. See the `data-policy` spec.
    - **Flow error handling & parallelism** — `wfa.flowLogic.tryCatch({ $id }, { try, catch })`, `wfa.flowLogic.doInParallel({ $id }, ...blocks)`, and `wfa.flowLogic.appendToFlowVariables({ $id }, params.flowVariables, { arrayVar: … })`. Datapills captured inside a tryCatch/doInParallel block are not visible outside — persist via `setFlowVariables`.
    - **Flow stages** — declare `stages` in the `Flow` config with `FlowStage({ label, value, … })` and activate them in the body with `wfa.stage(params.stages.<key>)` for progress tracking.
    - **Table augments** — add columns to an existing platform/cross-scope table with `Table({ augments: '<table>', schema })`; only `augments` + `schema` are allowed. Added column names must use the current app's ownership prefix: `<scope>_` in a named custom scope (e.g. `x_acme_`), or `u_` in global and Store-app contexts.
    - **AI Agent** — new optional `agentDescriptor` (`'require_caller_id'` | `'created_by_ai_agent_advisor'` | `'created_by_build_agent'`); `dataAccess` now takes `roleMap` (role names, preferred) or `roleList` (role sys_ids).
    - **NASK** — `securityControls` now takes `roleMap` (role names, preferred) in addition to `roleRestrictions` (role sys_ids); supply at least one.
    - **`$override` (universal field override)** — escape hatch on Fluent constructors to set columns the typed API does not model: `$override: { db_column_name: value }` where values are `string | boolean | number` and keys are **database column names** (snake_case). No type-checking; prefer the typed property whenever the field is modeled. Use for customer-added `x_`/`u_` columns or fields owned by another app.
    - **`protectionPolicy`** — added to APIs backed by `sys_policy` (e.g. `Action`, `Subflow`, business logic APIs). Set `protectionPolicy: 'read'` to read-protect the artifact's body; `''` (default) means no protection.
9. **SDK v4.8.0 capabilities** — when generating code, take advantage of these additions where applicable:
    - **PlaybookDefinition** — new API from `@servicenow/sdk/automation` for guided, record-driven processes (`sys_pd_process_definition`). Uses a 3-argument DSL `PlaybookDefinition(config, triggers, body)` with lanes, activities, triggers, inputs/outputs, and inline `startRule` ordering. See the `playbook` spec.
    - **RestMessage** — new API from `@servicenow/sdk/core` for outbound HTTP integrations (`sys_rest_message`): base URL, shared auth (`basic`/`oauth2` via auth profiles), shared/per-function headers, and callable `functions` with `${var}` substitution. See the `rest-message` spec.
    - **Alias / AliasTemplate** — new APIs from `@servicenow/sdk/core` for Connection & Credential aliases (`sys_alias`) and reusable connection-setup templates (`sys_alias_templates`). An `Alias` can compose a `RetryPolicy`, an `AliasTemplate`, and a parent alias inline. See the `alias` and `alias-template` specs.
    - **RetryPolicy** — new API from `@servicenow/sdk/core` (`sys_retry_policy`) controlling transient-failure handling for connections. Discriminated union over `retryStrategy`: `'fixed_time_interval'` / `'exponential_backoff'` (use `count` + `interval`) and `'retry_after'` (use `maxElapsedTime`, HTTP only). See the `retry-policy` spec.
    - **DataLookup** — new API from `@servicenow/sdk/core` (`dl_definition`) that auto-copies field values from a matcher table to a source record via `matchRules`/`setRules`. The matcher table must extend `dl_matcher`, live in the same scope, and seed rows must have `active = true`. Note `runOnUpdate` defaults to `false`. See the `data-lookup` spec.
    - **`Now.del()`** — declarative record deletion (cross-cutting, top-level statement only). `Now.del(table, { coalesceKey: value })` or `Now.del(table, '<sys_id>')`. Use it to remove OOB records you don't own; for records authored in Fluent, prefer deleting the code (deletes are tracked automatically).
    - **`$meta.installMethod`** — `Record`, `Acl`, `Alias`, and `UserPreference` accept `$meta: { installMethod: 'first install' | 'demo' | 'once' }` to map a record to an output folder that loads only in specific circumstances.
    - **`$override` on more APIs** — `DataPolicy` and `UserPreference` now support `$override` for setting unmodeled columns (same flat `{ db_column: value }` escape-hatch shape as other constructors).
    - **ACL `field`** — the ACL `field` property accepts known schema field names, system columns, or the wildcard `'*'` (`keyof FullSchema<T> | SystemColumns | '*'`).
    - **Table `accessibleFrom`** — defaults to `'public'`; set `'package_private'` only to restrict cross-scope read access (note that doing so removes the table from some platform features such as Business Rules).
    - **CLI `now-sdk query`** — new read-only Table REST query command (surfaced as the `query_fluent_records` MCP tool) for inspecting instance data without leaving the terminal.
10. **SDK v4.9.0 capabilities** — when generating code, take advantage of these additions where applicable:
    - **UI Test Script (TestingLibrary) ATF step** — `atf.uiTestScript.runTest({ $id, script })` runs a TestingLibrary test body in the client test runner to test custom UI components (Angular/React widgets, embedded SPAs, custom workspaces, `now-*` web components) that the standard `atf.form.*` / `atf.catalog.*` steps cannot reach. Prefer `script: Now.include('./file.script.js')`; inside the body `screen`/`user`/`sn_atf`/`expect`/`waitFor`/`within`/`steps`/`params` are injected (no imports). See the `atf-ui-test-script` spec.
    - **Multi-language choice labels** — a choice field's `choices` value may be an **array of `ChoiceConfig`** objects, each with a `language` (BCP 47) key, producing one translated `sys_choice` record per language: `choices: { 1: [{ label: 'Critical', language: 'en' }, { label: 'Critique', language: 'fr' }] }`. See the `column` spec.
    - **`protectionPolicy` on AI Agent & AI Agentic Workflow** — `AiAgent` and `AiAgenticWorkflow` accept `protectionPolicy: 'read' | 'protected'` to control post-install edit/view access for other developers (same values as other `sys_policy`-backed APIs).
    - **`Role.federatedId`** — the `Role` API accepts an optional `federatedId` string used to match a role to an externally federated role during identity federation.
    - **Table index platform columns** — a table `index` entry's `element` may reference platform default columns (e.g. `'sys_created_on'`) in addition to custom columns.
    - **Now Assist Skill Kit providers** — new LLM providers are selectable by name: `'Now LLM LTS Generic'`, `'Google Cloud Vertex AI'`, `'Amazon Bedrock'` (the `provider`/`model` fields are free strings — newer platform models are selectable by name).

## Working with Specific Metadata Types

Fluent provides a dedicated, strongly-typed API for every supported ServiceNow metadata type. This server ships the full specification, authoring instructions, and runnable snippets for each type — fetch them on demand instead of guessing an API shape:

- **API specification** — the `get-api-spec` tool (or resource URI `sn-spec://<type>`)
- **Authoring instructions & best practices** — the `get-instruct` tool (or `sn-instruct://<type>`)
- **Runnable code snippet** — the `get-snippet` tool (or `sn-snippet://<type>/<id>`)

Call `get-api-spec` with no arguments at any time to list every available metadata type. When this prompt is invoked with a `metadata_list`, per-type guidance and the full type catalog are appended below.
