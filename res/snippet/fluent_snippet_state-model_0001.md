# Define a change request state model with a gated transition in ServiceNow Fluent

```typescript
import { StateModel } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// One StateModel() call writes the model row plus every state, transition, condition and
// condition-field row. `table: 'change_request'` makes the build target chg_model.
StateModel({
  $id: Now.ID['simple_change_model'],
  name: 'Simple Change Model',
  table: 'change_request',
  stateField: 'state',
  description: 'Three-step change flow that cannot close until the required fields are filled in',
  itilChangeProcess: 'normal', // chg_model only
  readRoles: ['itil'],
  writeRoles: ['itil_admin'],

  // Keys ('new', 'assess', 'closed') are local aliases referenced by transitions — they are not stored.
  // The `value`s below are the OOB change states; confirm real values against sys_choice with `now-sdk query`.
  states: {
    new: {
      $id: Now.ID['simple_change_state_new'],
      label: 'New',
      value: '-5',
      initial: true, // mark exactly one initial state (a convention the build does not enforce)
    },
    assess: {
      $id: Now.ID['simple_change_state_assess'],
      label: 'Assess',
      value: '-4',
      sequence: 1,
    },
    closed: {
      $id: Now.ID['simple_change_state_closed'],
      label: 'Closed',
      value: '3',
      sequence: 2,
      attributes: [
        {
          $id: Now.ID['simple_change_state_closed_attr'],
          attribute: 'allowCiModification', // OOB sttrm_attribute name — build-validated
        },
      ],
    },
  },

  transitions: [
    // Ungated: New -> Assess is always allowed.
    { $id: Now.ID['simple_change_t_new_assess'], from: 'new', to: 'assess' },

    // Gated: Assess -> Closed requires an encoded-query condition AND specific fields.
    // Gate transitions here — never with a Business Rule calling current.setAbortAction(true).
    {
      $id: Now.ID['simple_change_t_assess_closed'],
      from: 'assess',
      to: 'closed',
      conditions: [
        {
          $id: Now.ID['simple_change_cond_described'],
          name: 'Short description provided',
          condition: 'short_descriptionISNOTEMPTY^EQ', // mutually exclusive with conditionScript
          conditionType: 'Transition Condition',
          order: 100,
        },
        {
          $id: Now.ID['simple_change_cond_required_fields'],
          name: 'Required closure fields',
          conditionType: 'Mandatory Fields', // pair this type with `fields`
          fields: [
            { $id: Now.ID['simple_change_field_justification'], name: 'justification' },
            { $id: Now.ID['simple_change_field_impl_plan'], name: 'implementation_plan' },
          ],
          order: 200,
        },
      ],
    },
  ],
})
```
