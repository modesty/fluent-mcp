# **Context:** StateModel API spec (SDK v4.10.0+): Defines a table's **state machine** — its states, the valid transitions between them, and the conditions that gate each transition. One `StateModel()` call produces the model record plus every state, transition, condition, condition-field, and state-attribute row. Import `StateModel` from `@servicenow/sdk/core`. The build **auto-detects the model table** from `table`: `change_request` → `chg_model`, `problem` → `prb_model`, `problem_task` → `prb_task_model`, anything else → the base `sttrm_model`.

```typescript
// Creates a State Model. Child records land in sttrm_state, sttrm_state_transition,
// sttrm_transition_condition, sttrm_transition_condition_field, and sttrm_state_attribute.
StateModel({
  $id: Now.ID['state_model_1'], // Now.ID | string | number, mandatory - identity. Pass a raw 32-char sys_id to edit an OOB model in place
  name: '', // string, mandatory - model name (e.g. 'Normal', 'Emergency')
  table: 'change_request', // TableName, mandatory - table the model applies to; drives polymorphic model-table selection (see Context)
  stateField: 'state', // ChoiceFieldKeys<T> | string, optional (default 'state') - the column holding the state value.
    // Type suggestions are narrowed to real Choice dropdown columns on `table` (dropdown_with_none |
    // dropdown_without_none). Free-text 'suggestion' fields and system columns never qualify.
  active: true, // boolean, optional (default true)
  description: '', // string, optional - ONLY stored on subclass tables (chg_model / prb_model / prb_task_model); ignored on base sttrm_model
  defaultModel: false, // boolean, optional (default false) - default model for the table; maps to default_change_model / default_prb_model / default_prb_task_model

  // ── Access control ──
  readRoles: ['itil'], // (Role | string)[], optional - roles allowed to read records using this model. Stored as comma-separated role NAMES
  writeRoles: ['itil_admin'], // (Role | string)[], optional - roles allowed to write. Stored as comma-separated role NAMES
  advancedSecurity: false, // boolean, optional (default false) - MUST be true for the three User Criteria lists below to take effect
  availableFor: [], // (string | Record<'user_criteria'>)[], optional - User Criteria granting read access, in addition to readRoles
  writableFor: [], // (string | Record<'user_criteria'>)[], optional - User Criteria granting write access, in addition to writeRoles
  notAvailableFor: [], // (string | Record<'user_criteria'>)[], optional - User Criteria explicitly excluded; overrides availableFor/writableFor and matching roles

  // ── Template proposal/approval (sttrm_template); applies to all model tables, independent of advancedSecurity ──
  templateProposalAccess: 'read', // 'read' | 'write', optional - who may propose Templates. 'read' = anyone with read access; 'write' = write access only
  templateApprovalUsers: [], // (string | Record<'sys_user'>)[], optional - approvers. Stored as comma-separated SYS_IDS
  templateApprovalGroups: [], // (string | Record<'sys_user_group'>)[], optional - approver groups. Stored as comma-separated SYS_IDS

  // ── change_request (chg_model) ONLY — a hint is emitted and the value ignored on other tables ──
  availableInUI: true, // boolean, optional (default true) - show the model in UI dropdowns
  recordPreset: '', // string, optional - encoded query of template values applied when the model is assigned (also auto-sets apply_record_preset)
  color: 'green', // string, optional - Change calendar/board color ('green' or '#2E7D32')
  itilChangeProcess: 'normal', // 'standard' | 'normal' | 'emergency', optional - ITIL change process classification

  // ── problem_task (prb_task_model) ONLY ──
  taskType: 'general', // 'general' | 'rca' | 'model', optional - 'general' standard task, 'rca' root-cause analysis, 'model' template task

  // ── STATES: friendly key -> state config. Keys are what `from`/`to` reference (they are NOT stored) ──
  // Omit `states` AND `transitions` for a model-only update (see "Editing an OOB model" below).
  states: {
    new: {
      $id: Now.ID['state_new'], // Now.ID | string | number, mandatory - the platform allows two states with the same `value`, so identity is NEVER derived from `value`
      label: 'New', // string, mandatory - display label
      value: '-5', // string | number, mandatory - value stored in stateField (coerced to string). Change: '-5'..'3'; Problem: '101'..'107'; custom: whatever the ChoiceColumn defines
      sequence: 0, // number, optional (default 0) - display order
      initial: true, // boolean, optional (default false) - initial state for new records. Convention: exactly one; NOT enforced by the build
      attributes: [ // StateAttribute[], optional - per-state attribute links (sttrm_state_attribute)
        {
          $id: Now.ID['state_new_attr_1'], // Now.ID | string | number, mandatory
          attribute: 'allowImplementation', // 'allowImplementation' | 'allowCiModification' | <sttrm_attribute sys_id>, mandatory.
            // Typed as an OPEN union, but build-validated: an unknown name that is not a 32-char GUID is a hard error
          active: true, // boolean, optional (default true)
        },
      ],
    },
    assess: { $id: Now.ID['state_assess'], label: 'Assess', value: '-4', sequence: 1 },
    closed: { $id: Now.ID['state_closed'], label: 'Closed', value: '3', sequence: 2 },
  },

  // ── TRANSITIONS: valid state changes. NOTE there is no `name` property — the build computes it ──
  transitions: [
    {
      $id: Now.ID['t_new_assess'], // Now.ID | string | number, mandatory - the platform allows two transitions between the same pair, so identity is NEVER derived from from/to
      from: 'new', // string, mandatory - source state KEY (must exist in `states`, else a hard error and the transition is skipped)
      to: 'assess', // string, mandatory - target state KEY (must exist in `states`)
      automatic: false, // boolean, optional (default false) - fire automatically once conditions are met
      conditions: [ // TransitionCondition[], optional - gating conditions. THIS is how you gate a transition (never a Business Rule setAbortAction)
        {
          $id: Now.ID['cond_1'], // Now.ID | string | number, mandatory - never derived from `name` (names are display text)
          name: 'Required fields', // string, mandatory - shown to the user in the rejection message
          condition: 'short_descriptionISNOTEMPTY^EQ', // string, optional - encoded query. MUTUALLY EXCLUSIVE with conditionScript (setting both is a hard error)
          conditionScript: '', // string, optional - server-side script returning a boolean; prefer Now.include('./cond.js'). Receives `current`.
            // Must NOT call gs.addErrorMessage/gs.addInfoMessage — conditions evaluate across REST, Flow, and UI channels
          conditionType: 'Transition Condition', // optional - the platform "Requires" value. OOB names (case-sensitive):
            // 'Transition Condition' | 'Transition Script' | 'Authorized' | 'Mandatory Fields' | 'Not On hold'
            // | 'Risk evaluation' | 'Task has been through Approval' | 'Task is Approved' | 'Task is Rejected'
            // — or a custom sttrm_condition_type sys_id. Open union, but build-validated (unknown non-GUID = hard error).
            // 'Authorized', 'Not On hold', and 'Risk evaluation' are chg_model_condition_type records: change_request only
          active: true, // boolean, optional (default true)
          order: 100, // number, optional (default 100) - evaluation order, lower first
          description: '', // string, optional
          fields: [ // ConditionField[], optional - field rows (sttrm_transition_condition_field). Use with type-based conditions like 'Mandatory Fields'
            { $id: Now.ID['cond_1_f1'], name: 'justification' }, // $id mandatory (duplicate names are allowed by the platform); name = column on `table`
          ],
        },
      ],
    },
    { $id: Now.ID['t_assess_closed'], from: 'assess', to: 'closed' },
  ],

  // ── Inherited cross-cutting properties (accepted by the type; absent from the API doc's table) ──
  protectionPolicy: 'read', // 'read' | 'protected', optional - post-install edit/view access for other developers
  $override: { sys_domain: 'global' }, // Record<string, string | boolean | number>, optional - set unmodeled/sys_* columns by DB column name
  // NOTE: StateModel does NOT accept `$meta` (no installMethod, no useEsLatest) — the type has no Now.Internal.Meta.
})
```

**Editing an out-of-box model.** `$id` is the **sole** identity mechanism for every row — there is no coalesce fallback anywhere. Set `$id` to the **real OOB sys_id** on the model and on each state/transition/condition you want to update in place (look them up with `now-sdk query`); the build emits an `INSERT_OR_UPDATE` carrying that sys_id. Any entry declared with a fresh `Now.ID[...]` is always **inserted** as a new record — that is how you add a new state or transition to an existing OOB model. ⚠️ **Clobber caveat:** every declared row is fully re-written, and each omitted field is reset to its platform default — so restate the OOB values you want to keep (`availableInUI`, `defaultModel`, a state's `sequence`/`initial`, a transition's `automatic`), and declare only the rows you need to reach. To remove an OOB row use `Now.del('sttrm_state_transition', '<sys_id>')`.

**Making the model actually take effect.** On `change_request` / `problem` / `problem_task` the platform enforces transitions out of the box. On **any other table** the model is inert until you add both (1) a `ReferenceColumn({ referenceTable: 'sttrm_model' })` on the table plus a `before/insert` `BusinessRule` that assigns the model, and (2) a generic `evaluateTransition` Business Rule — otherwise every transition condition is silently ignored. A `change_request` model with an `Assess` (`-4`) or `Authorize` (`-3`) state must also ship a companion `Flow` that requests CAB approval, with the trigger scoped to that model (`chg_model=<sys_id>`); `StateModel` never sets `approval` itself, so the record would otherwise stick.
