# Instructions for Fluent Custom Action API
Always reference the Custom Action API specifications for more details.
1. Custom Action lives in `@servicenow/sdk/automation` — import as `import { Action, wfa, actionStep } from '@servicenow/sdk/automation'`. The wrapping function is `Action()`, not `CustomAction()`.
2. Column types for `inputs` / `outputs` come from `@servicenow/sdk/core` (`StringColumn`, `IntegerColumn`, `BooleanColumn`, `ReferenceColumn`, `DecimalColumn`, `FloatColumn`, `DateTimeColumn`). Complex types (`FlowObject`, `FlowArray`) come from `@servicenow/sdk/automation`.
3. The `body` function receives `(params: { inputs })` — only the action's declared inputs are available in scope. Use `wfa.dataPill(params.inputs.<name>, '<type>')` to thread input values into step parameters.
4. Each `wfa.actionStep()` call must supply a unique `$id` (use `Now.ID['…']`). The `label` is optional but recommended for visibility in the flow designer.
5. Set `access: 'public'` when the action will be called from flows in other scopes. Default `'private'` is safer when the action is internal to one app.
6. Steps are sequential. To branch / loop, model that in the calling Flow/Subflow, not inside the custom action body.
7. Outputs are populated by step return values — assign them via `wfa.dataPill()` from the step that produces the value.
8. Custom Actions are typically invoked from a Flow or Subflow via `wfa.action(<importedAction>, { $id, … }, { <inputName>: <value> })`. They can also be invoked as a `wfa.actionStep` from inside another Custom Action.
9. Use `TemplateValue({ … })` when passing field-value maps to record-related steps (`createRecord`, `updateRecord`, `createOrUpdateRecord`). Static strings/booleans/numbers are fine inside `TemplateValue`; data pills slot in directly.
10. Reuse the same action across multiple flows where possible — that is the entire reason Custom Action exists. Resist inlining identical logic into separate flows.
11. Cross-scope: when calling a Custom Action defined in another scope, declare it as an SDK dependency in `now.config.json` so the type information is available at build time.
