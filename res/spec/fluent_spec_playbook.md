# **Context:** PlaybookDefinition API spec (SDK v4.8.0+): Creates a ServiceNow Playbook (`sys_pd_process_definition`) — a guided, record-driven multi-step process composed of **lanes**, **activities**, **triggers**, **inputs**, and **outputs**, with inline `startRule` ordering. Import `PlaybookDefinition`, `wfa`, `PlaybookTriggerTypes`, and `ActivityDefinitions` from `@servicenow/sdk/automation`; import Column types (`ReferenceColumn`, `IntegerColumn`, `StringColumn`, ...) from `@servicenow/sdk/core`. Uses a **3-argument** pattern: `PlaybookDefinition(config, dependentConfig, body)`. **Renamed in SDK v4.11.0:** argument 2's type was `PlaybookTriggerDeclaration` and is now `PlaybookDependentConfig<I, P, E>` — the old name no longer exists in the package. It now carries `permissions` as well as `triggers`, and its shape depends on arg 1 (`inputs` schema `I`, `parentTable` `P`, `executionType` `E`).

```typescript
// Creates a new Playbook (`sys_pd_process_definition`). 3-argument DSL: (config, triggers, body).
PlaybookDefinition(
 // ── ARG 1: config (PlaybookConfig) — top-level properties + declarative inputs/outputs ──
 {
   $id: '', // string | number | guid, mandatory - unique identifier
   label: '', // string, mandatory - display name (max 240 chars)
   name: '', // string, optional - internal name; auto-slugified from label if omitted. STABLE IDENTITY: changing it after deploy creates a new record
   description: '', // string, optional - max 1000 chars
   restartable: 'RESTARTABLE_FALSE', // 'RESTARTABLE_TRUE' | 'RESTARTABLE_FALSE', optional (default RESTARTABLE_FALSE)
   allowAsNested: false, // boolean, optional (default false) - can be used as a nested playbook.
     // CONSTRAINED (SDK v4.11.0+): may only be `true` when executionType is 'on_demand'; a record-driven
     // playbook is typed `false`
   access: 'public', // 'package_private' | 'public', optional (default 'public')
   runStrategy: 'run_once', // 'run_once' | 'run_if_not_running' | 'run_always', optional (default 'run_once')
   executionType: 'record_driven', // 'record_driven' | 'on_demand', optional (default 'record_driven').
     // WIDENED in SDK v4.11.0. 'on_demand' (a.k.a. standalone) playbooks are started explicitly rather
     // than by a trigger. See the ON_DEMAND RESTRICTIONS block below — six things change at once
   schemaVersion: 3, // number, optional (SDK v4.11.0+ — was @internal before). Defaults to Fluent's safe
     // fallback (PLAYBOOK_DEFAULTS.MAX_SUPPORTED_SCHEMA_VERSION). The ceiling is INSTANCE-dependent:
     // Australia and older cap at 3, Brazil and newer also accept 4. Set 4 explicitly to opt into the newer
     // schema on a Brazil+ instance — but confirm against that instance's
     // `com.glide.pad.core.model.maxSupportedSchemaVersion` property rather than inferring from the release name
   processType: 'Standard playbook', // string, optional (default 'Standard playbook')
   parentTable: 'incident', // TableName, optional - the table this playbook operates on. Auto-generates a `parent_record` input;
     // the triggering record is then accessible in the lanes callback via `params.parentRecord` (dot-walkable)
   inputs: { // Record<string, Column>, optional - input schema (maps to sys_pd_process_input). Surfaced as params.inputs.<name>
     record: ReferenceColumn({ label: 'Record', referenceTable: 'incident', mandatory: true }),
     priority: IntegerColumn({ label: 'Priority Override', default: 3 }),
   },
   outputs: { // Record<string, Column>, optional - output schema (maps to sys_pd_process_output). Declarative only at this layer
     resolvedBy: ReferenceColumn({ label: 'Resolved By', referenceTable: 'sys_user' }),
   },
   dataRetentionPeriodOverride: '6_month', // '2_week' | '6_week' | '6_month' | '1_year', optional

   // ── ON-DEMAND LAUNCHER CONFIG (SDK v4.11.0+) ──
   // ⚠️ COUNTERINTUITIVE: the three RECORD-FORM fields below are FORBIDDEN when
   // executionType is 'on_demand' (typed `never`), because they pre-populate a `parentTable`
   // record and parentTable is itself forbidden there. They configure launching a
   // RECORD-DRIVEN playbook on demand. Only launcherTitle / launcherDescription /
   // launcherInputs are legal on a standalone ('on_demand') playbook.
   launcherTitle: '', // string, optional - title in the launcher. Required by the launcher UI: if any other
     // launcher field is set and this is omitted, it defaults to the playbook's `label`
   launcherDescription: '', // string, optional - description in the launcher. Leading/trailing whitespace is
     // trimmed during XML parsing
   launcherShowRecordForm: false, // boolean, optional (default false) - show a create-new-record form in the
     // launcher. Set this FIRST: using either field below without it is a build ERROR
   launcherRecordFormView: 'Default view', // string | Record<'sys_ui_view'>, optional - which form view to use.
     // The platform stores the view's SYS_ID, not its display name. 'Default view' is a special-case string
     // that works as-is; ANY OTHER view must be passed by real sys_id (or a typed Record<'sys_ui_view'>) —
     // a display name will NOT resolve, and the SDK cannot verify it. Depends on parentTable
   launcherTemplateFields: TemplateValue({ active: true }), // string | TemplateValueElement<parentTable>, optional -
     // pre-populated field values for the record form. Keys are constrained to parentTable's columns when
     // parentTable is set; without parentTable a clearer build-time diagnostic fires. Depends on parentTable
   launcherInputs: { // Partial<Record<keyof inputs, string | Record<TableName>>>, optional - the value SHOWN in
     // the launcher for each declared input. Requires `inputs`; an unknown key is a build ERROR.
     // For a ReferenceColumn input pass a sys_id string or a typed Record<'table'>. For EVERY OTHER type —
     // INCLUDING Boolean and Integer — pass a STRING ('true', '3'); a raw true/3 literal does not compile.
     // Setting this only changes what the launcher DISPLAYS; it does NOT change the input's own `default`.
     // When launcherShowRecordForm is true, every `mandatory: true` input must resolve to a value (a `default`
     // or an explicit override here) or the build fails.
     priority: '1',
   },
 },
 // ── ON_DEMAND RESTRICTIONS (executionType: 'on_demand') — enforced BOTH as a type error and as a
 //    build diagnostic (so JS / `as any` / untyped callers are caught too): ──
 //   1. `triggers` is not configurable AT ALL — omit the key entirely, not even `[]`
 //   2. `parentTable` cannot be set (no triggering record)
 //   3. `params.parentRecord` does not exist — referencing it in `lanes` or `permissions` is a compile error
 //   4. `launcherShowRecordForm` / `launcherRecordFormView` / `launcherTemplateFields` cannot be set
 //   5. `allowAsNested` may be true (it may ONLY be true here)
 //   6. At least one permission set MUST grant `launch: true`, or there is no way to start the playbook.
 //      This fires even when `permissions` is omitted entirely.
 // ── ARG 2: dependentConfig (PlaybookDependentConfig<I, P, E>) — RENAMED in SDK v4.11.0 from
 //    PlaybookTriggerDeclaration. `triggers` is REQUIRED for a record-driven playbook (use [] for none),
 //    and must be OMITTED ENTIRELY when executionType is 'on_demand'. ──
 {
   // ── PERMISSIONS (SDK v4.11.0+): a CALLBACK, not a plain object, so pills can reference
   //    params.parentRecord and wfa.playbook.activityRef(...). Grouped by reference kind; each
   //    reference should appear once. ──
   permissions: (params) => ({
     users: [ // UserPermission[] - `user` is normally a dataPill to a sys_user record. A bare sysId string is
       // only valid when executionType is NOT 'record_driven' (enforced by a build diagnostic)
       {
         user: wfa.playbook.dataPill(params.parentRecord.assigned_to),
         view: true, // REQUIRED on every playbook permission set, and it GATES all the others:
           // another flag only takes effect when the same set also has view: true. Setting one without
           // view is a build ERROR
         launch: true, // launch the playbook on demand (the flag 'on_demand' playbooks must have somewhere)
         laneAddOptionalActivity: true, // add optional activities to a lane at runtime
         restart: true, // restart the whole playbook
         laneRestart: true, // restart a stage/lane
         activityRestart: true, // restart an individual activity
         cancel: true, // cancel the playbook
       },
     ],
     userGroups: [{ userGroup: wfa.playbook.dataPill(params.parentRecord.assignment_group), view: true }],
     roles: [{ role: 'b453c203c3213100ad408039dfba8fb0', view: true, restart: true }], // sys_user_role sysId or pill
     userCriterias: [{ userCriteria: 'fb1166d64fff0200086eeed18110c7ab', view: true }], // user_criteria sysId
   }),
   triggers: [
     wfa.playbook.trigger(
       PlaybookTriggerTypes.RecordCreate, // RecordCreate | RecordUpdate | RecordCreateOrUpdate | Scheduled
       { $id: Now.ID['trig_1'], label: 'On Incident Created' }, // TriggerConfig: $id (req), label?
       { table: 'incident', condition: 'priority=1', runTriggerOnExtendedTables: false }, // TriggerInputs (record-based)
         // Scheduled triggers instead require: table, limit (1-1000), startDateAndTime ('yyyy-MM-dd HH:mm:ss'), timeZone?, + schedule-type fields
       (trigger) => ({ // optional 4th arg: maps trigger data / literals to declared inputs + parentRecord
         parentRecord: wfa.playbook.dataPill(trigger.current),
         priority: wfa.playbook.dataPill(trigger.current.priority),
       })
     ),
   ],
 },
 // ── ARG 3: body (PlaybookBody) — `lanes` MUST be a callback returning lane/activity definitions keyed by name ──
 {
   lanes: (params) => ({
     stamp_note: wfa.playbook.lane({
       config: { // LaneConfig (plain object, read statically)
         $id: Now.ID['lane_1'],
         label: 'Stamp Note',
         order: 1, // number, required - visual layout only; use startRule for execution order
         startRule: wfa.playbook.run.Immediately(), // required: run.Immediately() | run.After(...deps)
         restartRule: 'RUN_ONLY_ONCE', // required: 'RUN_ALWAYS' | 'RUN_ONLY_ONCE' | 'RUN_ONLY_ON_RESTART'
         // optional: name?, description?, conditionToRun? (encoded query), startWithDelay?
         permissions: { // LanePermissions, optional (SDK v4.11.0+) - a PLAIN OBJECT here, unlike the
           // playbook-level permissions CALLBACK. Pills may still reference params.parentRecord (from the
           // enclosing lanes callback) and wfa.playbook.activityRef(...).
           // Lanes take a REDUCED flag set — no launch/cancel/laneRestart — and unlike the playbook,
           // `view` does NOT gate the others: all four flags are INDEPENDENT and all are optional.
           users: [{ user: wfa.playbook.dataPill(params.parentRecord.assigned_to), view: true, addOptionalActivity: true }],
           userGroups: [{ userGroup: wfa.playbook.dataPill(params.parentRecord.assignment_group), view: true }],
           roles: [{ role: 'b453c203c3213100ad408039dfba8fb0', view: true, restart: true, activityRestart: true }],
           userCriterias: [{ userCriteria: 'fb1166d64fff0200086eeed18110c7ab', view: true }],
           // NOTE for lane users/userGroups the reference must be a DATA PILL (TableAwareRecordWithFallback);
           // a bare sysId string is accepted only for `role` and `userCriteria`
         },
       },
       activities: () => { // callback returning activity instances; use const + explicit-key return for static extraction
         const stamp = wfa.playbook.activity(
           ActivityDefinitions.Core.UpdateRecord, // ActivityDefinitions.Core.* (UpdateRecord, CreateNewRecord, Decision, SendEmail, ...)
           { $id: Now.ID['act_1'], label: 'Stamp Note', order: 1, startRule: wfa.playbook.run.Immediately(), restartRule: 'RUN_ONLY_ONCE' },
           { // inputs (passed to the underlying flow/action)
             table_name: 'incident',
             record: wfa.playbook.dataPill(params.parentRecord),
             values: TemplateValue({ work_notes: 'Priority 1 received' }),
           }
           // optional 4th arg: experienceProperties (UI rendering config)
         )
         // ── OPTIONAL ACTIVITY (SDK v4.11.0+) — Playbook Designer's term for one a user starts manually ──
         // run.Manually() returns a DIFFERENT rule type, so an optional activity's config is narrower:
         // `order`, `conditionToRun` and `startWithDelay` are OMITTED (no fixed position or start time), and
         // restartRule is PINNED to 'RUN_ONLY_ONCE'.
         const escalate = wfa.playbook.activity(
           ActivityDefinitions.Core.CreateNewRecord,
           {
             $id: Now.ID['act_optional'],
             label: 'Escalate',
             startRule: wfa.playbook.run.Manually(),
             restartRule: 'RUN_ONLY_ONCE', // the only accepted value here
           },
           { table_name: 'incident', values: TemplateValue({ short_description: 'Escalated' }) }
         )
         // ⚠️ This returns a ManualActivityReference, which is deliberately NOT part of the Dependency
         // union and exposes NO outputs: an optional activity may never run, so nothing may reference its
         // outputs or wait on it with run.After(). Passing `escalate` to run.After() is a type error.

         // ── SET PLAYBOOK OUTPUTS (SDK v4.11.0+) — new OOB activity that writes the playbook's own outputs ──
         const setOutputs = wfa.playbook.activity(
           ActivityDefinitions.Core.SetPlaybookOutputs,
           { $id: Now.ID['act_set_outputs'], label: 'Publish Outputs', order: 2,
             startRule: wfa.playbook.run.After(stamp), restartRule: 'RUN_ONLY_ONCE' },
           { playbook_outputs: TemplateValue({ resolvedBy: '' }) } // keyed by the playbook's declared `outputs`
           // The subflow's second input (playbook_outputs_var_table_name) is intentionally NOT exposed —
           // the plugin derives it from the containing playbook. Do not try to set it.
         )

         return { stamp: stamp, escalate: escalate, setOutputs: setOutputs }
       },
     }),
   }),
 }
) // returns a PlaybookDefinition

// startWithDelay (on LaneConfig/ActivityConfig) maps to a sys_pd_timer_attributes record and is discriminated by `type`:
//   { type: 'explicit', duration: {days?,hours?,minutes?,seconds?}, timerSchedule? }
//   { type: 'relative', duration, relativeDatetime: 'yyyy-MM-dd HH:mm:ss', relativeOperator: 'before'|'after', timerSchedule? }
//   { type: 'percentage', percentage: number, percentageDatetime: 'yyyy-MM-dd HH:mm:ss', timerSchedule? }
//   timerSchedule?: string | Record<'cmn_schedule'> — optional on ALL THREE variants (SDK v4.10.1+). Evaluates the
//   delay against a schedule (business hours / calendar) instead of elapsed clock time, so e.g. an 8-hour explicit
//   delay started Friday afternoon on a 9-5 weekday schedule expires Monday morning rather than Friday night.
// Decision activity (ActivityDefinitions.Core.Decision): inputs = { type: 'match_first'|'match_all', branches: [{id,label,condition?}, ...] }.
//   The 'else' branch must be LAST with id:'else', label:'Else', and no condition. Branch deps: wfa.playbook.run.After(decision.branches.<id>).
// wfa.playbook.run.After(...deps) takes VARARGS (not an array); deps are ActivityInstance/lane/branch references.
// Note: deploying a playbook does not update running instances — re-activate it in Playbook Designer to apply changes at runtime.

// ─── wfa.playbook.activityRef (SDK v4.11.0+) ───
// A CROSS-SCOPE reference to an activity by its Now.ID, for use inside wfa.playbook.dataPill().
// Unlike same-lane local variables or cross-lane lane variables, the referenced activity need NOT be in
// lexical scope — it is matched by `$id` against any activity in the playbook. Intended precisely for
// places that cannot see the activity variables: playbook-level and lane-level `permissions`.
// ONLY activity OUTPUTS are referenceable.
//   wfa.playbook.dataPill(wfa.playbook.activityRef(Now.ID['review_step']).outputs.record)

// ─── AI-AGENT ACTIVITY CONFIG (SDK v4.11.0+) ───
// Extra ActivityConfig fields, available ONLY on activity definitions that declare enableAiAgent: 'on'.
// Setting any AI field on a definition that does not is a TYPESCRIPT error. In SDK v4.11.0 exactly four
// OOB definitions opted in: RecordForm, AutocompletingRecordForm, NewRecordForm, EmailForm
// (AutocompletingRecordForm exposes a reduced field set — no conversationalAgents /
// aiAgentObjAdditionalDetail / aiAgentSupportedActions).
//   enableAiAgent?: boolean             — turn AI agent support on for this instance
//   aiAgentObjective?: string           — Collaborative-mode instructions. REQUIRED once enableAiAgent is
//                                         true; omitting it (with no definition default) or passing '' is a
//                                         build ERROR — an explicit '' always overrides the default
//   aiAgentExecutionMode?: string       — 'off' = Collaborative, 'on' = Autonomous. Typed as a raw string
//                                         because platform choice values may change. Setting 'on' is a build
//                                         ERROR unless the DEFINITION itself declares aiAgentExecutionMode: 'on'
//   aiAgentObjAdditionalDetail?: string — Autonomous-mode extra instructions. Setting it while
//                                         aiAgentExecutionMode is not 'on' is a build WARNING and the value
//                                         is DISCARDED, not persisted
//   aiAgentRunAs?: 'playbook_user' | 'prior_activity_user'  — defaults to the definition's own value, then
//                                         to 'playbook_user'
//   aiAgentRunWithRoles?: (string | Record<'sys_user_role'>)[]
//   aiAgentSupportedActions?: ('update_record' | 'create_record' | 'mark_complete')[]
//   conversationalAgents?: (string | Record<'sn_aia_agent'>)[] — AI agents from AI Agent Studio
// PLATFORM PREREQUISITES the SDK does NOT validate: the `sn_genai_platform` store app must be installed
// and `sn_pa_designer.enable_agentic_playbooks` must be true, or the configuration has no runtime effect.

// ─── DEPENDENT RECORD INPUTS (SDK v4.11.0+) ───
// UpdateRecord and CreateNewRecord now preserve `rawInputs`, so a `record`/`values` input is checked
// against the table chosen by the sibling `table_name` input: a sys_user UpdateRecord REJECTS an incident
// record pill at compile time. RecordForm's `associated_record` is checked the same way against
// `associated_table`. Keep table_name and the record pill in agreement.
// SendEmail also gained to_email_address / cc_email_address / bcc_email_address inputs.
```
