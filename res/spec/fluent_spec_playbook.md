# **Context:** PlaybookDefinition API spec (SDK v4.8.0+): Creates a ServiceNow Playbook (`sys_pd_process_definition`) — a guided, record-driven multi-step process composed of **lanes**, **activities**, **triggers**, **inputs**, and **outputs**, with inline `startRule` ordering. Import `PlaybookDefinition`, `wfa`, `PlaybookTriggerTypes`, and `ActivityDefinitions` from `@servicenow/sdk/automation`; import Column types (`ReferenceColumn`, `IntegerColumn`, `StringColumn`, ...) from `@servicenow/sdk/core`. Uses a **3-argument** pattern: `PlaybookDefinition(config, dependentConfig, body)`. **Renamed in SDK v4.11.0:** argument 2's type was `PlaybookTriggerDeclaration` and is now `PlaybookDependentConfig<I, P, E>` — the old name no longer exists in the package. It now carries `permissions` as well as `triggers`, and its shape depends on arg 1 (`inputs` schema `I`, `parentTable` `P`, `executionType` `E`). **SDK v4.13.0+:** the type gained a 4th generic, `PlaybookDependentConfig<I, P, E, V>`, because argument 2 now also carries **`variants`** (`V`), and the release adds variant-only activities / `variantOverrides`, `evaluateVariantChildrenAfter`, the **Go Back** activity, `isIdealPath` decision branches, `publicAccess`, per-activity `actionOverrides`, and `wfa.playbook.automationPlan()` pills.

```typescript
// Creates a new Playbook (`sys_pd_process_definition`). 3-argument DSL: (config, dependentConfig, body).
PlaybookDefinition(
 // ── ARG 1: config (PlaybookConfig) — top-level properties + declarative inputs/outputs ──
 {
   $id: '', // string | number | guid, mandatory - unique identifier
   label: '', // string, mandatory - display name (max 240 chars)
   name: '', // string, optional - internal name; auto-slugified from label if omitted. STABLE IDENTITY: changing it after deploy creates a new record
   description: '', // string, optional - max 1000 chars
   restartable: 'RESTARTABLE_FALSE', // 'RESTARTABLE_TRUE' | 'RESTARTABLE_FALSE', optional (default RESTARTABLE_FALSE).
     // A Go Back with target_type 'start_of_playbook' needs 'RESTARTABLE_TRUE' (build WARNING otherwise)
   allowAsNested: false, // boolean, optional (default false) - can be used as a nested playbook.
     // CONSTRAINED (SDK v4.11.0+): may only be `true` when executionType is 'on_demand'; a record-driven
     // playbook is typed `false`
   access: 'public', // 'package_private' | 'public', optional (default 'public') - CROSS-SCOPE visibility only
     // ("this scope only" vs "all scopes"). Unrelated to `publicAccess` below
   publicAccess: false, // boolean, optional (default false) (SDK v4.13.0+) - sets sys_pd_process_definition.public_access:
     // the playbook may be EMBEDDED ON PUBLIC PAGES AND RUN BY UNAUTHENTICATED USERS. It is NOT a public API.
     // Build-time rules when true: (1) parentTable is REQUIRED; (2) not allowed on executionType 'on_demand'
     // (typed `never`); (3) EVERY activity must come from a definition declaring publicAccess: true — the
     // public-safe built-ins are Instruction, TwoStepInstruction, RecordForm, AutocompletingRecordForm,
     // NewRecordForm, KnowledgeArticle, Placeholder, WaitForCondition, SetPlaybookOutputs, Decision, GoBack
     // (NOT SendEmail, EmailForm, UpdateRecord, CreateNewRecord, ChecklistTask, RecordList, NewRecordFormWithList
     // or the three approval definitions). A non-public activity is a TypeScript error reported on the lane /
     // body entry that holds it (not on the Activity() call) plus a build error naming the activity;
     // (4) NO activity may set enableAiAgent: true (build error — the record forms are public-safe AND
     // AI-capable, so this is easy to hit). It is not a single switch: serving it publicly also needs a public
     // page/experience embedding the playbook and guest access to the parent table and runtime records, and
     // editing it in Playbook Designer requires the playbook.write.public_access role.
     // Process Automation Designer (sn_pa_designer) 29.0.0+ (Australia) — the SDK does not check the version
   runStrategy: 'run_once', // 'run_once' | 'run_if_not_running' | 'run_always', optional (default 'run_once')
   executionType: 'record_driven', // 'record_driven' | 'on_demand', optional (default 'record_driven').
     // WIDENED in SDK v4.11.0. 'on_demand' (a.k.a. standalone) playbooks are started explicitly rather
     // than by a trigger. See the ON_DEMAND RESTRICTIONS block below — seven things change at once
   schemaVersion: 3, // number, optional (SDK v4.11.0+ — was @internal before). Defaults to Fluent's safe
     // fallback (PLAYBOOK_DEFAULTS.MAX_SUPPORTED_SCHEMA_VERSION). The ceiling is INSTANCE-dependent:
     // Australia and older cap at 3, Brazil and newer also accept 4. Set 4 explicitly to opt into the newer
     // schema on a Brazil+ instance — but confirm against that instance's
     // `com.glide.pad.core.model.maxSupportedSchemaVersion` property rather than inferring from the release name
   processType: 'Standard playbook', // string, optional (default 'Standard playbook')
   parentTable: 'incident', // TableName, optional - the table this playbook operates on. Auto-generates a `parent_record` input;
     // the triggering record is then accessible in the lanes callback via `params.parentRecord` (dot-walkable).
     // REQUIRED (build error) once any variant is declared, and when publicAccess is true
   evaluateVariantChildrenAfter: Now.ID['act_review'], // Now.Internal.ExplicitKey, optional (SDK v4.13.0+).
     // Defers variant selection until THIS ACTIVITY completes (default: variants are evaluated at playbook start).
     // Accepts ONLY a Now.ID['key'] reference (a string literal is a TypeScript error). Build errors: it must
     // name an ACTIVITY (not a lane), not a Run.Manually() optional activity, and at least one variant must be
     // declared. Effects: (a) a variant `condition` may then reference, via wfa.playbook.activityRef(), the
     // outputs of activities that run BEFORE this activity — strictly before: the evaluation-point activity
     // itself is NOT referenceable ("activityRef() pills are not allowed in this context"); (b) every
     // variant-only activity must be a guaranteed descendant of it (build error otherwise); (c) a Go Back whose
     // decision runs after it must also target something after it ("Select a target after the variant
     // evaluation point")
   inputs: { // Record<string, Column>, optional - input schema (maps to sys_pd_process_input). Surfaced as params.inputs.<name>
     record: ReferenceColumn({ label: 'Record', referenceTable: 'incident', mandatory: true }),
     priority: IntegerColumn({ label: 'Priority Override', default: 3 }),
   },
   outputs: { // Record<string, Column>, optional - output schema (maps to sys_pd_process_output). Written with the SetPlaybookOutputs activity
     resolvedBy: ReferenceColumn({ label: 'Resolved By', referenceTable: 'sys_user' }),
   },
   dataRetentionPeriodOverride: '6_month', // '2_week' | '6_week' | '6_month' | '1_year', optional

   // ── ON-DEMAND LAUNCHER CONFIG (SDK v4.11.0+) ──
   // ⚠️ COUNTERINTUITIVE: the three RECORD-FORM fields (launcherShowRecordForm, launcherRecordFormView,
   // launcherTemplateFields) are FORBIDDEN when executionType is 'on_demand' (typed `never`), because they
   // pre-populate a `parentTable` record and parentTable is itself forbidden there. They configure launching a
   // RECORD-DRIVEN playbook on demand — see the separate RECORD-FORM LAUNCHER example below. Only
   // launcherTitle / launcherDescription / launcherInputs are legal on a standalone ('on_demand') playbook.
   launcherTitle: '', // string, optional - title in the launcher. Required by the launcher UI: if any other
     // launcher field is set and this is omitted, it defaults to the playbook's `label`
   launcherDescription: '', // string, optional - description in the launcher. Leading/trailing whitespace is
     // trimmed during XML parsing
   launcherInputs: { // Partial<Record<keyof inputs, string | Record<TableName>>>, optional - the value SHOWN in
     // the launcher for each declared input. Requires `inputs`; an unknown key is a build ERROR.
     // For a ReferenceColumn input pass a sys_id string or a typed Record<'table'>. For EVERY OTHER type —
     // INCLUDING Boolean and Integer — pass a STRING ('true', '3'); a raw true/3 literal does not compile.
     // Setting this only changes what the launcher DISPLAYS; it does NOT change the input's own `default`.
     // When launcherShowRecordForm is true, every `mandatory: true` input must resolve to a value (a `default`
     // or an explicit override here) or the build fails: "Required playbook input "<name>" has no value for the
     // on-demand launcher. Set launcherInputs.<name> or give the input a default value."
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
 //   7. (SDK v4.13.0+) `publicAccess` cannot be set (typed `never`) — a public playbook must be tied to a record
 // ── ARG 2: dependentConfig (PlaybookDependentConfig<I, P, E, V>) — RENAMED in SDK v4.11.0 from
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
   // ── VARIANTS (SDK v4.13.0+) → sys_pd_process_variant. A CALLBACK returning wfa.playbook.variant()
   //    definitions keyed by name; the body's lanes/activities see them as params.variants.<name>.
   //    Declaring ANY variant requires parentTable (build error); zero lanes is a build warning.
   //    Evaluation is hierarchical and top-down: at each level the first child (lowest `order`) whose
   //    `condition` is true wins, and a child is only ever evaluated if its parent matched. Only ACTIVITIES
   //    can be variant-scoped or overridden — LaneConfig has no variant fields. ──
   variants: (params) => {
     const vip = wfa.playbook.variant({ // VariantConfig
       $id: Now.ID['var_vip'], // mandatory
       label: 'VIP Caller', // string, mandatory (build error when empty)
       name: 'vip_caller', // string, optional - slugified from label if omitted
       description: '', // string, optional
       condition: `${wfa.playbook.dataPill(params.parentRecord.caller_id.vip)}=true`, // string, MANDATORY (build
         // error when empty) - encoded query. Pills may use params.inputs / params.parentRecord; with
         // evaluateVariantChildrenAfter set, also activityRef() outputs of activities BEFORE that activity
       order: 1, // number, mandatory - order among sibling variants (first match wins)
       color: 'purple', // 'blue' | 'brown' | 'green' | 'magenta' | 'orange' | 'purple' | 'teal' | 'yellow', optional -
         // auto-assigned deterministically from $id when omitted; any other value is an error
     })
     const vipCritical = wfa.playbook.variant({
       $id: Now.ID['var_vip_critical'],
       label: 'VIP Critical',
       // act_1 (stamp) runs BEFORE the evaluation point (act_review), so its outputs are readable here
       condition: `${wfa.playbook.dataPill(wfa.playbook.activityRef(Now.ID['act_1']).outputs.record.priority)}=1`,
       order: 1,
       parentVariant: vip, // VariantReference, optional - a SIBLING declared in this same callback, referenced by
         // its LOCAL identifier (not params.variants). Only evaluated when the parent's condition matched
     })
     return { vip: vip, vipCritical: vipCritical }
   },
   // preservedAttachment — FRAMEWORK-MANAGED (SDK v4.13.0+). Carries an image attachment that already exists on
   //   the process definition (e.g. the source image of a Now Assist-generated playbook) through
   //   transform/build/deploy round trips. Populated automatically by transform; it is NOT an authoring
   //   feature (not on activities, not settable by hand) — never write or edit it.
   triggers: [
     wfa.playbook.trigger(
       PlaybookTriggerTypes.RecordCreate, // RecordCreate | RecordUpdate | RecordCreateOrUpdate | Scheduled
       { $id: Now.ID['trig_1'], label: 'On Incident Created' }, // TriggerConfig: $id (req), label?
       { table: 'incident', condition: 'priority=1', runTriggerOnExtendedTables: false }, // TriggerInputs (record-based)
         // Scheduled triggers instead require: table, limit (1-1000), startDateAndTime ('yyyy-MM-dd HH:mm:ss'), timeZone?, + schedule-type fields
       (trigger) => ({ // optional 4th arg: maps trigger data / literals to declared inputs.
         // Every `mandatory: true` input (here `record`) MUST be mapped — a missing one is a type error.
         // Add `parentRecord: wfa.playbook.dataPill(trigger.current.<ref>)` ONLY when the trigger table DIFFERS
         // from parentTable (then it is required); when they match, specifying it is a build error
         record: wfa.playbook.dataPill(trigger.current),
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
           ActivityDefinitions.Core.UpdateRecord, // ActivityDefinitions.Core.* (UpdateRecord, CreateNewRecord, Decision, GoBack, SendEmail, ...)
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
         // `order`, `conditionToRun`, `startWithDelay` — and (SDK v4.13.0+) `variant` and `variantOverrides` —
         // are OMITTED (no fixed position or start time, and optional activities exist only at the base
         // playbook level), and restartRule is PINNED to 'RUN_ONLY_ONCE'. It also cannot be the
         // evaluateVariantChildrenAfter target or a Go Back target.
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

         // ── ACTION OVERRIDES + AUTOMATION PLAN PILLS (SDK v4.13.0+). This activity is also the
         //    evaluateVariantChildrenAfter point (act_review) declared in arg 1. ──
         const review = wfa.playbook.activity(
           ActivityDefinitions.Core.RecordForm,
           {
             $id: Now.ID['act_review'], label: 'Review Incident', order: 3,
             startRule: wfa.playbook.run.After(stamp), restartRule: 'RUN_ONLY_ONCE',
             actionOverrides: [ // ActionOverride[], optional → one sys_pd_activity_action_override per entry.
               // PER ACTIVITY (not per playbook). When present it REPLACES the card's default Declarative Action
               // buttons with EXACTLY this list (it does not merge); omit or [] to keep the defaults.
               // Process Automation Designer (sn_pa_designer) 29.4+ (records are written but ignored on older).
               {
                 actionAssignment: '<sys_declarative_action_assignment sys_id>', // string | Record<'sys_declarative_action_assignment'>,
                   // required - an app/experience-specific platform row (not authored in Fluent; look it up on the
                   // instance, assigned to "Playbook Card"). A missing/empty value is SKIPPED with a build WARNING
                 label: 'Resolve Incident', // string, required - overridden button label
                 displayOrder: 1, // number, required - lower first. Duplicate displayOrder or duplicate
                   // actionAssignment values across entries are build WARNINGS, not errors
               },
             ],
           },
           {}, // inputs
           { // experienceProperties — the ONLY place (besides an ActivityDefinition()'s defaultExperienceProperties)
             // where wfa.playbook.automationPlan(uiId?) is allowed; in activity inputs, conditions, or
             // startWithDelay it is a build error. It references an input/output of THIS activity's own backing
             // flow/action → {{vl.<label>.[<uiId>.]<start|end>.<path>}}. Must continue with .inputs.<field> or
             // .outputs.<field> (dot-walkable, `_tableName` allowed). `uiId` (optional) names a step inside a
             // Subflow-backed definition: it must be a STRING LITERAL and is a build error on an Action-backed one
             experience_status_record: wfa.playbook.dataPill(
               wfa.playbook.automationPlan('e17e6678-8e97-4584-a903-cfa6e47fd378').outputs.record
             ),
           }
         )

         // ── VARIANT OVERRIDES (SDK v4.13.0+) → sys_pd_activity_override. A BASE activity (present in every
         //    variant) whose startRule and/or order change when a given variant is selected. ONLY startRule
         //    and order can be overridden. One entry per variant (a duplicate is a build error); an entry
         //    with neither startRule nor order is a no-op build WARNING. ──
         const notify = wfa.playbook.activity(
           ActivityDefinitions.Core.Instruction,
           {
             $id: Now.ID['act_notify'], label: 'Notify Caller', order: 4,
             startRule: wfa.playbook.run.After(review), restartRule: 'RUN_ONLY_ONCE',
             variantOverrides: [ // VariantOverride[] — MUTUALLY EXCLUSIVE with `variant` (setting both is a TS error)
               { variant: params.variants.vipCritical, order: 6 }, // reorder only
               {
                 variant: params.variants.vip,
                 // FORWARD REFERENCE: vipCall is declared BELOW, so a plain `vipCall` identifier would be a
                 // use-before-declaration error. wfa.playbook.activityRef(Now.ID[...]) resolves by $id instead.
                 // This activityRef()-accepting Run.After() overload is legal ONLY inside
                 // variantOverrides[].startRule — in a normal startRule it is a TypeScript error.
                 // If an override REVERSES a base edge, override the other activity too or the two deadlock.
                 startRule: wfa.playbook.run.After(wfa.playbook.activityRef(Now.ID['act_vip_call'])),
               },
             ],
           },
           { message: 'Tell the caller the incident is being worked.' }
         )
         // ── VARIANT-ONLY ACTIVITY (SDK v4.13.0+) — the ALTERNATIVE to variantOverrides: the activity exists
         //    ONLY when this variant is selected (sys_pd_activity.variant); omit `variant` for a base activity.
         //    With evaluateVariantChildrenAfter set it must run after that activity (build error otherwise). ──
         const vipCall = wfa.playbook.activity(
           ActivityDefinitions.Core.Instruction,
           {
             $id: Now.ID['act_vip_call'], label: 'Call VIP Caller', order: 5,
             startRule: wfa.playbook.run.After(review), restartRule: 'RUN_ONLY_ONCE',
             variant: params.variants.vip, // VariantReference — MUTUALLY EXCLUSIVE with `variantOverrides`
           },
           { message: 'Call the VIP caller within 15 minutes.' }
         )

         return { stamp: stamp, escalate: escalate, setOutputs: setOutputs, review: review, notify: notify, vipCall: vipCall }
       },
     }),
   }),
 }
) // returns a PlaybookDefinition

// ─── RECORD-FORM LAUNCHER (SDK v4.11.0+) — a SEPARATE alternative config, RECORD-DRIVEN playbooks only ───
PlaybookDefinition(
 {
   $id: Now.ID['pb_record_form_launcher'],
   label: 'Incident Intake Launcher',
   parentTable: 'incident', // required by the record-form fields (they create/pre-fill a parentTable record)
   inputs: {
     priority: IntegerColumn({ label: 'Priority Override', mandatory: true, default: 3 }), // mandatory inputs need
       // a `default` or a launcherInputs value once launcherShowRecordForm is true
   },
   launcherTitle: 'Report an Incident',
   launcherShowRecordForm: true, // boolean, optional (default false) - show a create-new-record form in the
     // launcher. MUST be true for the two fields below: setting launcherRecordFormView while
     // launcherShowRecordForm is false (or omitted) is a build ERROR — "launcherRecordFormView can only be set
     // when launcherShowRecordForm is true." — and likewise "launcherTemplateFields can only be set when
     // launcherShowRecordForm is true."
   launcherRecordFormView: 'Default view', // string | Record<'sys_ui_view'>, optional - which form view to use.
     // The platform stores the view's SYS_ID, not its display name. 'Default view' is a special-case string
     // that works as-is; ANY OTHER view must be passed by real sys_id (or a typed Record<'sys_ui_view'>) —
     // a display name will NOT resolve, and the SDK cannot verify it. Depends on parentTable
   launcherTemplateFields: TemplateValue({ active: true }), // string | TemplateValueElement<parentTable>, optional -
     // pre-populated field values for the record form. Keys are constrained to parentTable's columns when
     // parentTable is set; without parentTable a clearer build-time diagnostic fires. Depends on parentTable
   launcherInputs: { priority: '2' },
 },
 { triggers: [] },
 {
   lanes: () => ({
     intake: wfa.playbook.lane({
       config: { $id: Now.ID['lane_launcher_intake'], label: 'Intake', order: 1,
         startRule: wfa.playbook.run.Immediately(), restartRule: 'RUN_ONLY_ONCE' },
       activities: () => {
         const confirm = wfa.playbook.activity(ActivityDefinitions.Core.Instruction,
           { $id: Now.ID['act_launcher_confirm'], label: 'Confirm Details', order: 1,
             startRule: wfa.playbook.run.Immediately(), restartRule: 'RUN_ONLY_ONCE' },
           { message: 'Review the submitted incident details.' })
         return { confirm: confirm }
       },
     }),
   }),
 }
)

// ─── GO BACK + IDEAL PATH (SDK v4.13.0+) ───
PlaybookDefinition(
 { $id: Now.ID['pb_go_back'], label: 'Resolution Check', parentTable: 'incident' },
 { triggers: [] },
 {
   lanes: (params) => {
     // Go Back TARGET: restartRule MUST be 'RUN_ALWAYS' so it re-runs on the jump back — any other value is a
     // build WARNING and the target is silently SKIPPED at runtime
     const fix = wfa.playbook.lane({
       config: { $id: Now.ID['lane_fix'], label: 'Apply Fix', order: 1,
         startRule: wfa.playbook.run.Immediately(), restartRule: 'RUN_ALWAYS' },
       activities: () => {
         const applyFix = wfa.playbook.activity(ActivityDefinitions.Core.RecordForm,
           { $id: Now.ID['act_apply_fix'], label: 'Apply Fix', order: 1,
             startRule: wfa.playbook.run.Immediately(), restartRule: 'RUN_ALWAYS' })
         return { applyFix: applyFix }
       },
     })
     // Stage-level Decision (declared between lanes, in no lane). A Go Back needs a 'match_first' decision
     const verify = wfa.playbook.activity(
       ActivityDefinitions.Core.Decision,
       { $id: Now.ID['act_verify'], label: 'Fix Verified?', order: 2,
         startRule: wfa.playbook.run.After(fix), restartRule: 'RUN_ALWAYS' },
       {
         type: 'match_first',
         branches: [
           { id: 'reopened', label: 'Caller Reopened', condition: `${wfa.playbook.dataPill(params.parentRecord.state)}=2` },
           // isIdealPath?: boolean (SDK v4.13.0+, default false) — marks the "golden path" branch Playbook
           // Designer highlights. 'match_first' allows AT MOST ONE ideal branch; 'match_all' allows several;
           // 'else' may be ideal but NOT together with a conditional branch (all build errors).
           // Process Automation Designer (sn_pa_designer) 29.6.4+ (written but ignored on older)
           { id: 'else', label: 'Else', isIdealPath: true },
         ],
       }
     )
     // GO BACK (SDK v4.13.0+) — ActivityDefinitions.Core.GoBack restarts the playbook at an earlier activity,
     // an earlier stage (lane), or the start of the playbook. Its config is the plain BaseActivityConfig: NO
     // AI-agent fields. Inputs are the discriminated union GoBackInputs:
     //   { target_type: 'go_back_to_target_activity', go_back_to_target_activity: <activity variable or lane.activity> }
     //   { target_type: 'go_back_to_target_stage',    go_back_to_target_stage: <lane variable> }
     //   { target_type: 'start_of_playbook' } (needs restartable: 'RESTARTABLE_TRUE', build WARNING otherwise)
     // Pass the RAW lane/activity variable (no dataPill). Process Automation Designer (sn_pa_designer) 29.3.0+.
     const retryFix = wfa.playbook.activity(
       ActivityDefinitions.Core.GoBack,
       { $id: Now.ID['act_retry_fix'], label: 'Retry Fix', order: 3,
         startRule: wfa.playbook.run.After(verify.branches.reopened), restartRule: 'RUN_ALWAYS' },
       { target_type: 'go_back_to_target_stage', go_back_to_target_stage: fix }
     )
     const close = wfa.playbook.activity(
       ActivityDefinitions.Core.Instruction,
       { $id: Now.ID['act_close'], label: 'Close Incident', order: 4,
         startRule: wfa.playbook.run.After(verify.branches.else), restartRule: 'RUN_ONLY_ONCE' },
       { message: 'Fix verified - close the incident.' }
     )
     return { fix: fix, verify: verify, retryFix: retryFix, close: close }
   },
 }
)
// GO BACK PLACEMENT RULES (build ERRORS unless noted):
//   1. It is ONLY valid as the TERMINAL activity of a 'match_first' decision branch, reached through its own
//      run.After chain within the same scope (in-lane decision → same lane; stage-level decision → no lane).
//      Not a plain lane activity, and not the first activity of a stage a branch leads into.
//   2. The target must resolve to a real activity/stage that PRECEDES the decision (not optional, not another
//      Go Back); with evaluateVariantChildrenAfter set (and the decision after it) the target must also run
//      after the evaluation point.
//   3. The enclosing decision must be 'match_first'.   4. At most one Go Back per branch.
//   5. No parallel paths between the branch start and the Go Back.
//   6. At least one branch of the decision must NOT end in a Go Back (a forward path).
//   7. Nothing may run after the Go Back.
//   8. (WARNING) target restartRule not 'RUN_ALWAYS' / start_of_playbook on a non-restartable playbook.
//   The build cannot prove the loop terminates: something on the re-run (a reviewer edit, automation) must be
//   able to change which branch the decision takes, or the playbook loops forever.

// startWithDelay (on LaneConfig/ActivityConfig) maps to a sys_pd_timer_attributes record and is discriminated by `type`:
//   { type: 'explicit', duration: {days?,hours?,minutes?,seconds?}, timerSchedule? }
//   { type: 'relative', duration, relativeDatetime: 'yyyy-MM-dd HH:mm:ss', relativeOperator: 'before'|'after', timerSchedule? }
//   { type: 'percentage', percentage: number, percentageDatetime: 'yyyy-MM-dd HH:mm:ss', timerSchedule? }
//   timerSchedule?: string | Record<'cmn_schedule'> — optional on ALL THREE variants (SDK v4.10.1+). Evaluates the
//   delay against a schedule (business hours / calendar) instead of elapsed clock time, so e.g. an 8-hour explicit
//   delay started Friday afternoon on a 9-5 weekday schedule expires Monday morning rather than Friday night.
// Decision activity (ActivityDefinitions.Core.Decision): inputs = { type: 'match_first'|'match_all', branches: [{id,label,condition?,isIdealPath?}, ...] }.
//   The 'else' branch must be LAST with id:'else', label:'Else', and no condition. Branch deps: wfa.playbook.run.After(decision.branches.<id>).
//   isIdealPath (SDK v4.13.0+): see the Go Back example above for its rules.
// wfa.playbook.run.After(...deps) takes VARARGS (not an array); deps are ActivityInstance/lane/branch references.
//   A wfa.playbook.activityRef(...) dependency is accepted ONLY in a variantOverrides[].startRule (SDK v4.13.0+).
// Note: deploying a playbook does not update running instances — re-activate it in Playbook Designer to apply changes at runtime.

// ─── wfa.playbook.activityRef (SDK v4.11.0+; widened in SDK v4.13.0) ───
// A reference to an activity by its Now.ID. Unlike same-lane local variables or cross-lane lane variables, the
// referenced activity need NOT be in lexical scope — it is matched by `$id` against any activity in the playbook.
// It is valid in exactly THREE contexts (anywhere else it is an error):
//   1. Inside wfa.playbook.dataPill() in playbook-level and lane-level `permissions` (outputs only):
//        wfa.playbook.dataPill(wfa.playbook.activityRef(Now.ID['review_step']).outputs.record)
//   2. Inside wfa.playbook.dataPill() in a variant `condition`, ONLY when evaluateVariantChildrenAfter is set and
//      ONLY for activities that run strictly before that evaluation-point activity (SDK v4.13.0+)
//   3. As a run.After() dependency inside a variantOverrides[].startRule, to forward-reference an activity
//      declared later in the same lane (SDK v4.13.0+) — NOT in a normal lane/activity startRule (type error)

// ─── AI-AGENT ACTIVITY CONFIG (SDK v4.11.0+) ───
// Extra ActivityConfig fields, available ONLY on activity definitions that declare enableAiAgent: 'on'.
// Setting any AI field on a definition that does not is a TYPESCRIPT error. Exactly four OOB definitions
// opt in (unchanged in SDK v4.13.x): RecordForm, AutocompletingRecordForm, NewRecordForm, EmailForm
// (AutocompletingRecordForm exposes a reduced field set — no conversationalAgents /
// aiAgentObjAdditionalDetail / aiAgentSupportedActions). Decision and GoBack expose NO AI fields.
// (SDK v4.13.0+) enableAiAgent: true is a build ERROR on any activity of a publicAccess: true playbook.
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

// ─── MANDATORY ACTIVITY INPUTS (SDK v4.13.0+) — ⚠️ POTENTIALLY BREAKING for existing code ───
// Inputs / experienceProperties whose backing Column is `mandatory: true` are now validated at BUILD time:
// the effective value (your explicit value, else the definition's defaultInputs/defaultExperienceProperties)
// must not be empty. An explicit '' always wins over the default and errors; a wfa.playbook.dataPill(...) is
// never treated as empty. The TypeScript call signature still marks them optional — only the build fails.
//   NewRecordForm.table          — now mandatory and has NO default: a NewRecordForm without `table` that
//                                  built on 4.11 now FAILS: "'table' (Table) is required and cannot be empty."
//   ChecklistTask.checklist_items — now mandatory; omitting it uses the default 'Item 1\nItem 2\nItem 3',
//                                  but an explicit '' fails the build
// No OOB activity-type experience property is mandatory, so the experience-property half only affects custom
// ActivityType definitions.

// ─── CUSTOM ActivityDefinition() publicAccess (SDK v4.13.0+) ───
// ActivityDefinition({ ..., publicAccess: true }) declares the definition safe for public playbooks
// (sys_pd_activity_definition.public_access, default false). Set it only when the platform record allows it.
// Process Automation Designer (sn_pa_designer) 29.0.0+.

// ─── TYPE-LEVEL CHANGE (SDK v4.13.0) ───
// BaseActivityConfig changed from an `interface` to a `type` (an object type intersected with the
// variant/variantOverrides union), so `interface X extends BaseActivityConfig` now fails with TS2312.
// Use `type X = BaseActivityConfig & { ... }` instead. The Decision and GoBack overloads use this config, so
// they also accept variant / variantOverrides / actionOverrides.

// ─── VERSION MARKERS ───
// The playbook .d.ts files carry NO @since JSDoc tags (none in 4.11.2 or 4.13.x), so a feature's SDK version
// cannot be read from the types. The only version markers are Process Automation Designer (sn_pa_designer)
// store-app minimums, none of which the SDK validates: publicAccess 29.0.0, GoBack 29.3.0,
// actionOverrides 29.4, isIdealPath 29.6.4.
```
