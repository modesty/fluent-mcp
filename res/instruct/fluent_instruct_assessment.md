# Instructions for Fluent Assessment API
Always reference the Assessment API specifications for more details.
1. Import `Assessment` from `@servicenow/sdk/core` (SDK v4.12.0+). One `Assessment()` call writes the definition row (`asmt_metric_type`) plus every category (`asmt_metric_category`), metric (`asmt_metric`) and answer option (`asmt_metric_definition`), wiring the `metric_type`, `category` and `metric` foreign keys from the nesting. Never author those tables separately with `Record()`, and never set the foreign keys by hand.
2. **When to use it.** Use `Assessment` to **evaluate and score records** on a target `table` — vendors, CIs, services, projects — with weighted, normalized results. Use it with `evaluationMethod: 'survey'` to **collect unscored feedback** such as CSAT, NPS or onboarding questions.
3. **When NOT to use it.**
   - For **change-request risk**, use `RiskAssessment` instead (see `fluent_instruct_risk-assessment.md`).
   - Quizzes, attestations, test plans and vendor-risk assessments are not authorable: `evaluationMethod` accepts **only** `'assessment'` or `'survey'`.
   - It is not a delivery mechanism (see rule 17).
4. **Set `evaluationMethod` explicitly, every time.** Omitting it means `'assessment'`, which makes `table` and `scaleFactor` mandatory. A survey **must** say `evaluationMethod: 'survey'`.
   - Do not copy the SDK's own "Scored Onboarding Survey" and "Minimal Survey" API-doc examples, or the JSDoc example on the `Assessment` type. All three omit `scaleFactor` without being surveys, so they **fail `now-sdk build`**.
   - A survey gets no business rules. The build forces the definition row's table to `asmt_metric_type` and its `condition` to the survey's own sys_id, so do not set `table` or `condition` on a survey.
5. **A scored assessment needs `table` and an integer `scaleFactor`.** This is enforced by **build diagnostics, not by the type**: both are optional in TypeScript. The messages are "'table' is required when 'evaluationMethod' is 'assessment' (the default).", "'scaleFactor' is required when 'evaluationMethod' is 'assessment' (the default)." and "'scaleFactor' must be an integer.". Use 1, 10 or 100.
6. **Know what the build checks and what only tsc checks.** `now-sdk build` does **not** type-check, and it does not print hints — only errors and warnings.
   - The build catches the diagnostics in rules 5, 9, 13 and 15.
   - Only tsc (or the IDE) catches the `dataType` discriminated-union errors: a branch field on the wrong `dataType` (e.g. `min` on `'yesNo'`), a `'reference'` metric without `referenceTable`, or a missing `dataType`.
   - Type-check the project before trusting a green build.
7. **"Conditions" are encoded-query strings, nothing more.** The SDK 4.12.0 release note says the API includes "post-deployment steps and conditions". There is no "post-deployment steps" API, no condition object, and no "asmt_condition" table. There are three levels of scoping:
   - The assessment `condition` decides which `table` records get assessed at all; the generated trigger rule evaluates it.
   - A category `filter` scopes one section.
   - A metric `condition` decides whether one question applies.

   The build appends `^EQ` to the assessment `condition` and category `filter`, but writes a metric `condition` verbatim.
8. **Always set `condition` and every category `filter` explicitly, even for broad scope** (e.g. `'active=true'`). Empty means every record on `table`. Keep each `filter` a **subset** of `condition`: a disjoint filter leaves that category with zero assessable records, which blocks assignment to assessors with no error.
9. **Answer options.**
   - `definitions` keys are the stored numeric `value`, so they must be **integer strings** (`'1'`, `'-2'`). `'abc'` or `'1.5'` is a build error.
   - Definitions coalesce on (metric, value), so never give them an `$id`.
   - A `numericScale` metric with no `definitions` auto-generates one option per integer from `min` to `max` (default 0..10, which is 11 rows). A reversed range silently generates none.
   - `definitions` is only meaningful for choice, likertScale, numericScale, imageScale, multipleSelection and ranking metrics. The type does not stop you putting it elsewhere.
10. **Silent data-loss trap: always use the ARRAY form for `displayedWhen`, `correctAnswerChoice` and `displayedWhenTemplate`.** The type also accepts a bare string, but **the string form is silently written empty** by the build, so the reveal condition or correct answer just disappears.
    - Write `displayedWhen: ['3']`, not `displayedWhen: '3'`. The SDK assessment guide's own example uses the broken string form.
    - Values are the parent metric's definition keys.
11. **Yes/No answers are `'1'` (Yes) and `'0'` (No).** This applies to `correctAnswerYesNo` and `displayedWhenYesNo`. Both are plain strings written verbatim. The JSDoc example on the type uses 'Yes' — do not copy it.
12. **Conditional questions.** Set `dependsOn` to `Now.ref('asmt_metric', '<sibling $id key>')`, then pair it with the ONE reveal field that matches the **parent's** `dataType`:
    - `displayedWhenYesNo` for a yesNo parent
    - `displayedWhen` for a choice or multipleSelection parent
    - `displayedWhenCheckbox` for a checkbox parent
    - `displayedWhenTemplate` for a template parent

    **Do not use `Now.ID` for `dependsOn`**, even though the type's own JSDoc example does. It builds, but once `keys.ts` registers the key its `ExplicitKey` type is not assignable to `dependsOn`, and tsc fails.
13. **Scripted default answers.** `method: 'defaultAnswerFromScript'` **requires** both `script` and `dependentPlugin`. The build errors say "A metric with method 'condscript' must also set ..." — `'condscript'` is the database name for `'defaultAnswerFromScript'`.
    - For this method, `script` must be an **inline string literal**. The build's check does not see `Now.include`, so `script: Now.include(...)` fails with "must also set 'script'".
    - `method: 'script'` accepts `Now.include`.
    - `dependentPlugin` takes the friendly labels only (`'CMDB'`, `'Core'`, ...), not `com.snc.*` ids.
14. **Business rules are generated for you.** A scored assessment gets a trigger rule (after insert/update, calls `AssessmentUtils.checkRecord`) and a delete rule (before delete, calls `AssessmentUtils.checkDeleteRecord`), both as `sys_script` on `table`.
    - A third rule, which keeps `userField` ownership in sync, is generated only when the assessment is scored, `scheduleType: 'scheduled'`, `userField` is set and `state: 'published'`, all together.
    - Never hand-author these rules.
    - Never set `businessRule`, `deleteBusinessRule`, `scheduleJob` or `userFieldBusinessRule`: they are auto-generated round-trip sys_ids, and a non-GUID `scheduleJob`/`userFieldBusinessRule` is a build error.
15. **Publishing.** A scored assessment with `state: 'published'` must have at least one category, and every category at least one metric. Otherwise it is a build error. Surveys are not checked.
16. **`scheduleType: 'scheduled'` ships an INACTIVE job.** The generated `sys_trigger` is written with state 0 and no `next_action`, so it never fires until someone activates it in System Scheduler > Scheduled Jobs after deploy. Tell the user. The default `'onDemand'` creates instances only via UI actions or scripts.
17. **Building never assigns or notifies anyone.**
    - Publishing, generating assessable records and assigning assessors are on-instance steps. The SDK guide links to a "Generating and Assigning Assessable Records" section that does not exist.
    - The framework only puts an instance in the recipient's assessment queue. If the user asks to send, email or notify, also build an `EmailNotification`. The survey link is `<instance>/esc?id=take_survey&type_id=<asmt_metric_type sys_id>`.
18. **`filterField` segments the scorecard comparison pool; it does not rank.** For example, `'assignment_group'` on `incident` compares a record only against its own group. For a leaderboard across groups, build a report or Performance Analytics indicator.
19. **Cross-cutting properties.**
    - `Assessment` accepts `protectionPolicy`, which is written as `sys_policy` on every generated row, including the business rules.
    - It accepts `$override`, which applies to the root row only. `sys_domain` is hard-coded to global, so a `sys_domain` override is ignored with a warning.
    - It does **not** accept `$meta` (no `installMethod`, no `useEsLatest`).
    - Categories and metrics accept only `$id`.
    - Skip redundant defaults (`active: true`, `order: 100`, `weight: 10`).
