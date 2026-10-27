# Reusable ATF test (isReusable + inputs/outputs) called from another test with atf.executeTest in ServiceNow Fluent

```typescript
import { Test, StringColumn, ReferenceColumn } from '@servicenow/sdk/core'

// ── 1. The reusable test: isReusable/inputs/outputs all go in ARG 1 (the config) ──
// Writes sys_atf_test_callable (not sys_atf_test) + one atf_input_variable_callable /
// atf_output_variable_callable row per declared column. Export it so callers can reference it.
export const createIncidentForCaller = Test(
    {
        $id: Now.ID['atf_reusable_create_incident'],
        name: 'Reusable: create an incident for a caller',
        description: 'Inserts an incident for the supplied caller and returns its sys_id',
        isReusable: true, // literal `true` selects the reusable overload
        inputs: {
            caller: ReferenceColumn({ referenceTable: 'sys_user', label: 'Caller' }),
            shortDescription: StringColumn({ label: 'Short description', maxLength: 160 }),
        },
        outputs: {
            incidentId: StringColumn({ label: 'Incident sys_id', maxLength: 32 }), // StringColumn, not ReferenceColumn: a Reference
            // output's type (string | Record | ExplicitKey | TableBrand) is NOT assignable to a step's recordId (TS2322).
            // maxLength is required in practice: unset, the platform truncates the sys_id to 30 characters
        },
    },
    // Body takes THREE params. Read inputs directly (compiles to {{callable_input['<sys_id>'].name}}).
    // `outputs` is only a schema handle for setReusableTestOutputs — never read it.
    (atf, inputs, outputs) => {
        const inserted = atf.server.recordInsert({
            $id: Now.ID['atf_reusable_create_incident_insert'],
            table: 'incident',
            fieldValues: { caller_id: inputs.caller, short_description: inputs.shortDescription },
            assert: 'record_successfully_inserted',
            enforceSecurity: true,
        })
        // A plain atf.* method (no namespace). Writes a "Set Output Variables" sys_atf_step.
        atf.setReusableTestOutputs(
            outputs,
            { $id: Now.ID['atf_reusable_create_incident_outputs'] },
            { incidentId: inserted.record_id } // → {{step['<insert step sys_id>'].record_id}}
        )
    }
)

// ── 2. A standard test that calls it as ONE step ──
Test(
    {
        $id: Now.ID['atf_reusable_caller'],
        name: 'Incident: create via reusable test and verify',
        failOnServerError: true,
    },
    (atf) => {
        const tester = atf.server.createUser({
            $id: Now.ID['atf_reusable_caller_user'],
            firstName: 'ATF',
            lastName: 'Caller',
            impersonate: true,
        })
        // Typed overload: every declared input is required, no extra keys; result is typed
        // from the reusable test's outputs. Writes a sys_atf_step_callable row.
        const created = atf.executeTest(
            createIncidentForCaller,
            { $id: Now.ID['atf_reusable_caller_execute'] },
            { caller: tester.user, shortDescription: 'Created by a reusable ATF test' }
        )
        atf.server.recordValidation({
            $id: Now.ID['atf_reusable_caller_verify'],
            table: 'incident',
            recordId: created.incidentId, // → {{step['<executeTest step sys_id>'].incidentId}}
            fieldValues: 'active=true^short_descriptionLIKEreusable',
            assert: 'record_validated',
            enforceSecurity: true,
        })
    }
)
```
