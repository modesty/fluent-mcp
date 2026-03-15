# Instructions for Fluent Sla API
Always reference the Sla API specification for more details.
1. Always use the `Duration()` helper for the `duration` field — e.g., `Duration({ hours: 4 })`, `Duration({ days: 1, hours: 2, minutes: 30 })`. Never pass a raw number or string.
2. Use either `duration` (user-specified fixed duration) or `durationType` (relative duration reference) — never both. When `durationType` is set, the `duration`, `conditions.pause`, `conditions.resume`, and `whenTo.resume` fields are restricted.
3. `schedule` is mandatory when `scheduleSource` is `'sla_definition'` (the default). Set it to the sys_id of a `cmn_schedule` record. It is restricted (produces a warning) when `scheduleSource` is `'no_schedule'` or `'task_field'`.
4. When `scheduleSource` is `'task_field'`, you must also specify `scheduleSourceField` with the name of the field that holds the schedule reference.
5. `timezone` is only meaningful when `timezoneSource` is `'sla.timezone'`; it is ignored for all other timezone source values.
6. When `retroactive.start` is `true`, `retroactive.setStartTo` becomes mandatory. When `retroactive.start` is `false` or not set, `retroactive.setStartTo` and `retroactive.pause` are restricted.
7. `conditions.resume` is only relevant when `whenTo.resume` is `'on_condition'`. If `whenTo.resume` is `'no_match'`, setting `conditions.resume` produces a warning.
8. `conditions.cancel` is only relevant when `whenTo.cancel` is `'on_condition'`. It is restricted for other `whenTo.cancel` values.
9. The `type` field distinguishes SLA, OLA (Operational Level Agreement), and Underpinning Contract — use `'SLA'` for external commitments, `'OLA'` for internal team agreements.
10. Export SLA objects as named constants so they can be referenced by Flows or workflows that should trigger on breach.
