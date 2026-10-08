# Instructions for Fluent RiskAssessment API
Always reference the RiskAssessment API specifications for more details.
1. Import `RiskAssessment` from `@servicenow/sdk/core` (SDK v4.12.0+). One `RiskAssessment()` call writes the definition row (`change_risk_asmt`, which extends `asmt_metric_type`) plus one `change_risk_asmt_threshold` per `thresholds` entry, and the same categories, metrics and answer options as `Assessment`. The foreign keys are wired from the nesting.
2. **HARD STOP — check the plugin first.** `change_risk_asmt` and `change_risk_asmt_threshold` exist only when the Change Management - Risk Assessment plugin (`com.snc.change_management.risk_assessment`) is active on the target instance.
   - Before authoring, run the query_fluent_records tool against table `sys_plugins` with query 'source=com.snc.change_management.risk_assessment' and fields 'active'.
   - If no record comes back, or `active` is not true, **stop**. Tell the user the plugin must be activated (All > System Definition > Plugins) before this can be built and installed.
3. **When to use it.** Use it to score a `change_request` and map the score to a change risk level (high, moderate, low) through thresholds.
4. **When NOT to use it.**
   - For any other target table, or for surveys and general scored assessments, use `Assessment` (see `fluent_instruct_assessment.md`).
   - Do not use `Assessment()` to build a change risk assessment either: it writes `asmt_metric_type`, not `change_risk_asmt`.
5. **There is no `table` and no `evaluationMethod` property.** The build fixes the target to `change_request` and forces `evaluation_method` to `risk_assessment`.
   - Passing either property is a type error. The SDK risk-assessment guide's wording "defaults `table` to change_request … avoid overriding it" wrongly implies it can be overridden.
   - `now-sdk build` does not type-check. A `table` smuggled past the type with a ts-ignore really is written, so never do that.
6. **Only `$id` and `name` are mandatory.** Set `condition` explicitly anyway — e.g. `'active=true'`, or `'type=emergency'` to risk-assess only emergency changes. Set every category `filter` explicitly too, as a **subset** of `condition`.
   - There is no "generate assessable records" step to re-run: Change Management creates them automatically.
   - A missing or disjoint filter shows up as a blank section on the change's Risk Assessment view, with nothing to fix it after the fact.
7. **Keep `scaleFactor` an integer yourself.** It defaults to 0. Unlike `Assessment`, the RiskAssessment build does **not** reject a float. The SDK guide's claim that "Floats produce a build error" is false here: 10.5 is written as-is into an integer column.
8. **Thresholds.**
   - Every threshold needs its own `$id`; there is no coalesce key, and duplicate risk/score rows are allowed.
   - `risk` is `'high'`, `'moderate'` or `'low'`. It is written as the `change_request` risk value, high = `'2'`, moderate = `'3'`, low = `'4'`. That is not the literal word, despite the type's JSDoc.
   - `scoreGreaterThan` is the minimum score for the level. The platform checks the highest threshold first. The build validates neither ordering, integer-ness nor coverage, so keep integers ordered high > moderate > low, and include a low threshold at 0.
9. **No business rule and no scheduled job is generated.** Do not hand-author a `sys_script` for it, and never set the inherited `businessRule`, `deleteBusinessRule`, `scheduleJob` or `userFieldBusinessRule` fields. `scheduleType: 'scheduled'` only writes the column and creates no `sys_trigger`, so keep the default `'onDemand'`.
10. **The build runs fewer checks than `Assessment`.** It enforces publishing (`state: 'published'` needs at least one category, and at least one metric per category) and integer `definitions` keys. It does **not** run the `scaleFactor` check or the 'condscript' check. A `method: 'defaultAnswerFromScript'` metric without `script` or `dependentPlugin` builds silently, so supply both yourself.
11. **Categories and metrics work exactly as in `Assessment`** (same `dataType` union and the same traps). In particular:
    - Use the ARRAY form for `displayedWhen`, `correctAnswerChoice` and `displayedWhenTemplate`. **The string form is silently written empty.**
    - Yes/No answers are `'1'` (Yes) and `'0'` (No).
    - Set `dependsOn` to `Now.ref('asmt_metric', '<sibling $id key>')`, never `Now.ID`.
    - Each category's `table` is always written as `change_request`.
12. **Post-deployment verification is a manual, on-instance checklist, not an API.** The SDK 4.12.0 release note mentions "post-deployment steps and conditions", but `RiskAssessmentConfig` has no such property. After deploy, open a `change_request` and use its Risk Assessment action.
    - **Heading shows but sections are blank:** check, in order:
      1. `condition` and every `filter` match the change.
      2. At least one category has an assessable record for it.
      3. The category user is a stakeholder.
      4. Domain visibility, if domain separation is installed.
    - **A different risk assessment shows:** that is instance ordering/precedence between `change_risk_asmt` records, which Fluent does not expose.
13. **Cross-cutting properties.**
    - `RiskAssessment` accepts `protectionPolicy` (written as `sys_policy` on every row).
    - It accepts `$override` (root row only; `sys_domain` cannot be overridden).
    - It does **not** accept `$meta`.
    - Thresholds, categories and metrics accept only `$id`.
