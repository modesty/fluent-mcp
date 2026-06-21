# **Context:** PlaybookDefinition API spec (SDK v4.8.0+): Creates a ServiceNow Playbook (`sys_pd_process_definition`) — a guided, record-driven multi-step process composed of **lanes**, **activities**, **triggers**, **inputs**, and **outputs**, with inline `startRule` ordering. Import `PlaybookDefinition`, `wfa`, `PlaybookTriggerTypes`, and `ActivityDefinitions` from `@servicenow/sdk/automation`; import Column types (`ReferenceColumn`, `IntegerColumn`, `StringColumn`, ...) from `@servicenow/sdk/core`. Uses a **3-argument** pattern: `PlaybookDefinition(config, triggers, body)`.

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
   allowAsNested: false, // boolean, optional (default false) - can be used as a nested playbook
   access: 'public', // 'package_private' | 'public', optional (default 'public')
   runStrategy: 'run_once', // 'run_once' | 'run_if_not_running' | 'run_always', optional (default 'run_once')
   executionType: 'record_driven', // 'record_driven', optional (default 'record_driven')
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
 },
 // ── ARG 2: triggers (PlaybookTriggerDeclaration) — `triggers` array is REQUIRED (use [] for none) ──
 {
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
         return { stamp: stamp }
       },
     }),
   }),
 }
) // returns a PlaybookDefinition

// startWithDelay (on LaneConfig/ActivityConfig) is discriminated by `type`:
//   { type: 'explicit', duration: {days?,hours?,minutes?,seconds?} }
//   { type: 'relative', duration, relativeDatetime: 'yyyy-MM-dd HH:mm:ss', relativeOperator: 'before'|'after' }
//   { type: 'percentage', percentage: number, percentageDatetime: 'yyyy-MM-dd HH:mm:ss' }
// Decision activity (ActivityDefinitions.Core.Decision): inputs = { type: 'match_first'|'match_all', branches: [{id,label,condition?}, ...] }.
//   The 'else' branch must be LAST with id:'else', label:'Else', and no condition. Branch deps: wfa.playbook.run.After(decision.branches.<id>).
// wfa.playbook.run.After(...deps) takes VARARGS (not an array); deps are ActivityInstance/lane/branch references.
// Note: deploying a playbook does not update running instances — re-activate it in Playbook Designer to apply changes at runtime.
```
