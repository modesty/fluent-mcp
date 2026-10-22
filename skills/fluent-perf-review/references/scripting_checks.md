# Scripting Performance Checks (12)

Server-side script patterns (Business Rules, Transform scripts, outbound integrations, Flow API, XML parsing, large-table queries) and Jelly evaluation that degrade instance performance.

1. **`recursive_business_rule` — Recursive Business Rule (`current.update()` in Before BR)** [P0] (Impact: Critical)
   - *Check:* Inspect `BusinessRule({ when: 'before' })` and `sys_script*.xml` (`<when>before</when>`) scripts for `current.update()`. A before rule's changes to `current` are saved automatically; calling `update()` re-runs the Business Rule chain (recursion / double write). Also report `current.update()` in `after` / `async` rules [P1] — same recursion unless guarded by `current.setWorkflow(false)` [P3]. `update()` on *other* GlideRecords is not this check.
   - *Fix:* Remove `current.update()` from before rules and set fields on `current` directly. In after/async rules, move the field change into a before rule; use `setWorkflow(false)` + `update()` only when a before rule cannot do the job.

2. **`AvoidCallingFlowAPIMethodsFromAsyncBR` — FlowAPI Called from Async Business Rule** [P1] (Impact: High)
   - *Check:* Inspect `BusinessRule({ when: 'async' })` / `<when>async</when>` (and `async_deprecated`) scripts — and the Script Includes they call — for `sn_fd.FlowAPI` execution methods: `startFlow`, `startSubflow`, `startAction`, `executeFlow`, `executeSubflow`, `executeAction`, `executeDataStreamAction` (incl. `*Quick` variants) and `getRunner()`.
   - *Fix:* Per the FlowAPI docs, do not launch flows from an async BR; let Workflow Studio run them (a record-triggered flow on the same table/condition, or a scheduled trigger).

3. **`wait_for_response` — `waitForResponse()` on an Asynchronous Outbound Call** [P1] (Impact: High)
   - *Check:* Search server scripts for `.waitForResponse(` on a `RESTResponseV2` / `SOAPResponseV2` returned by `executeAsync()` — especially MID Server calls (`setMIDServer()`), which are always asynchronous. Waiting freezes the initiating thread for the full round-trip.
   - *Fix:* Do not wait. Call `setEccCorrelator()` (and `setEccParameter()` as needed) on the request, and process the reply in an after-insert Business Rule on `ecc_queue` matching the correlator.

4. **`gr_on_sys_audit_table` — GlideRecord Query on `sys_audit`** [P1] (Impact: High)
   - *Check:* Search scripts for `GlideRecord`, `GlideRecordSecure`, `GlideAggregate`, or `GlideQuery` on `sys_audit` (incl. `sys_audit_delete`). `sys_audit` is typically the largest table on an instance (tens of GB). Also report queries on the other large system tables named by policy PERF-1 — `syslog`, `syslog_transaction`, `sys_email` [P2].
   - *Fix:* Avoid runtime queries on audit data. If unavoidable, filter on indexed fields only (`documentkey`, `tablename`, a bounded `sys_created_on` range), add `setLimit()`, and never run the query per row or inside a loop.

5. **`br_insert` — Insert Operation in Before Business Rule** [P1] (Impact: High)
   - *Check:* Inspect before Business Rule scripts for `current.insert()` or any GlideRecord `.insert()`. `current.insert()` writes a duplicate record; inserting other records from a before rule runs before the triggering write is committed (or aborted).
   - *Fix:* Remove `current.insert()` (the platform saves `current`); move inserts into other tables to an `after` (or `async`) Business Rule.

6. **`before_transform_insert` — Insert Operation in onBefore Transform Script** [P1] (Impact: High)
   - *Check:* Inspect `ImportSet({ scripts: [{ when: 'onBefore' }] })`, `sys_transform_script*.xml` (`<when>onBefore</when>`), and the map-level Run script (`ImportSet({ runScript: true, script })` / `sys_transform_map` with `<run_script>true</run_script>`, which runs per row before the target is written) for `.insert()`.
   - *Fix:* Move inserts into reference/target tables to an `onAfter` transform script.

7. **`parse_xml_infinite_loop` — Unbounded XML Node Parsing Loop** [P1] (Impact: High)
   - *Check:* Find `while` / `do…while` / `for (;;)` loops that walk XML nodes (`XMLDocument2` / `XMLNode` — `getChildNodeIterator()…hasNext()`, `getNextSibling()`, `getFirstChild()`) with no iteration cap in the condition or body. A large third-party payload can spin the loop and make the instance unresponsive. Also report `gs.xmlToJSON()` [P3] — policy PERF-9 requires `XMLDocument2` for large XML.
   - *Fix:* Bound the loop (`while (iter.hasNext() && count++ < MAX_NODES)`), parse large XML with `XMLDocument2`, and use IntegrationHub Data Stream actions for responses larger than 10 MB.

8. **`sync_outbound_calls` — Synchronous Outbound Call in Business Rule / UI Action** [P2] (Impact: Medium)
   - *Check:* Inspect Business Rule and UI Action scripts (`BusinessRule()`, `UiAction()`, `sys_script`, `sys_ui_action`) — and the Script Includes they call — for `sn_ws.RESTMessageV2` / `SOAPMessageV2` requests sent with `.execute()`. A synchronous call holds the user's transaction for the whole network round-trip (KB0694711). In an `async` BR the call is already off the user transaction [P4].
   - *Fix:* Use `executeAsync()` and process the response asynchronously (see `wait_for_response`), or move the call to an async BR, Flow, or IntegrationHub action.

9. **`set_property` — `gs.setProperty()` in Scripts** [P2] (Impact: Medium)
   - *Check:* Search server scripts for `gs.setProperty(`. Each call flushes the system property cache, which hurts performance during the flush. False positive when the target property ships with `ignoreCache: true` (`Property()`) / `<ignore_cache>true</ignore_cache>` — justified only if it changes more than once a month and is read only from `sys_properties`.
   - *Fix:* Have admins set property values manually, or mark a frequently changing property `ignoreCache: true`. Keep runtime state in an application table, not a system property.

10. **`jexl_ssi` — JEXL Expressions inside `<g:evaluate>`** [P2] (Impact: Medium)
    - *Check:* Inspect Jelly in UI Pages (`UiPage({ html })`, `sys_ui_page` `html`) and UI Macros (`sys_ui_macro` `xml`) for `${…}` / `$[…]` inside `<g:evaluate>` / `<g2:evaluate>` (body or `expression` attribute). Substituted values turn every evaluation into a new script to compile and cache.
    - *Fix:* Add `jelly="true"` and read Jelly variables through the `jelly.` prefix:
      ```xml
      <g:evaluate var="jvar_count" jelly="true">
        var ga = new GlideAggregate(jelly.jvar_table);
      </g:evaluate>
      ```

11. **`sys_id_dot_walk` — Dot-Walking to `sys_id`** [P3] (Impact: Low)
    - *Check:* Search server scripts for `<GlideRecord>.<reference>.sys_id` (e.g. `current.caller_id.sys_id`) and `getValue('<reference>.sys_id')`. A reference field already holds the sys_id; dot-walking adds a query to fetch the referenced record. Plain JSON (`data.item.sys_id`, `response.result.sys_id`) is not a GlideRecord and is not a finding.
    - *Fix:* Use `current.getValue('caller_id')` (or `current.caller_id.toString()`).

12. **`glide_query_contains_operator` — `CONTAINS` / `ENDSWITH` Operators in Queries** [P3] (Impact: Low)
    - *Check:* Search GlideRecord / GlideAggregate `addQuery(field, op, …)` / `addOrCondition(…)`, GlideQuery `where()` / `orWhere()`, and encoded queries (`addEncodedQuery()`, `GlideQuery.parse()`) for `CONTAINS`, `DOES NOT CONTAIN`, `LIKE`, `NOT LIKE`, or `ENDSWITH`. Leading-wildcard predicates cannot use an index, so they scan the table.
    - *Fix:* Prefer `=`, `IN`, or `STARTSWITH` on indexed fields. If a substring match is required, narrow with indexed filters first and add `setLimit()`.
