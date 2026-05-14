# Client Scripts

Guide for creating ServiceNow Client Scripts using the Fluent API. Client scripts run JavaScript in the browser on form events to configure forms, fields, and field values while the user is interacting with them.

## When to Use

- Adding client-side behavior to forms (show/hide fields, set values, validate input)
- Responding to form events: load, submit, field change, or cell edit
- Configuring dynamic form behavior based on user interaction
- Adding client-side validation before form submission

## Instructions

1. **Choose the type first:** Select the correct event type based on when the script should run.
2. **Use `Now.include` for scripts:** Reference external script files rather than inline scripts for anything non-trivial. Client scripts run in the browser where JavaScript modules are not available, so `Now.include()` is the correct approach here (unlike server-side scripts which should use modules).
3. **Set the `field` property for onChange/onCellEdit:** Required when `type` is `onChange` or `onCellEdit` -- specifies which field triggers the script. Does not apply to `onLoad` or `onSubmit`.
4. **No module imports:** JavaScript module imports and third-party libraries are not supported in client scripts. Use only the `g_form` API and standard browser JavaScript.
5. **Table scoping:** Always use the full scoped table name.

## Key Concepts

### Choosing the Right Type

- **`onLoad`** -- Runs when the form is first displayed. Use for initial form setup: hiding fields, setting defaults, showing messages.
- **`onChange`** -- Runs when a specific field value changes. Use for reactive behavior: updating one field based on another, showing/hiding sections. Requires the `field` property.
- **`onSubmit`** -- Runs when the user submits the form. Use for validation: confirming required fields, checking data consistency, prompting confirmation. Return `false` to cancel submission.
- **`onCellEdit`** -- Runs when a cell is edited in a list view. Use for inline list editing validation. Requires the `field` property.

### Script File Pattern

Client scripts reference external files using `Now.include`:

```typescript
script: Now.include('../client/my-script.js')
```

This enables syntax highlighting and two-way synchronization -- changes from the platform UI sync to the file and vice versa.

## Avoidance

- **Never import JavaScript modules or third-party libraries** -- client scripts do not support module imports
- **Never use `onChange` or `onCellEdit` without setting the `field` property** -- the script won't know which field to watch
- **Avoid heavy logic in `onLoad`** -- it runs every time the form opens and delays form display
- **Never assume `onSubmit` will always run** -- programmatic saves or API calls may bypass client scripts

## API Reference

For the full property reference, see the `clientscript-api` topic.

## Examples

### onLoad -- Initial Form Setup

```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['incident-onload'],
    name: 'Configure New Incident Form',
    table: 'incident',
    type: 'onLoad',
    uiType: 'all',
    script: Now.include('../client/incident-onload.js'),
})
```

```javascript
// client/incident-onload.js
function onLoad() {
    if (g_form.isNewRecord()) {
        g_form.setValue('priority', '3')
        g_form.setDisplay('resolution_notes', false)
    }
}
```

### onChange -- Reactive Field Behavior

```typescript
ClientScript({
    $id: Now.ID['priority-change'],
    name: 'Update SLA on Priority Change',
    table: 'incident',
    type: 'onChange',
    field: 'priority',
    script: Now.include('../client/priority-change.js'),
})
```

```javascript
// client/priority-change.js
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) return
    if (newValue === '1') {
        g_form.setValue('sla_due', 'P1 - 4 Hour Response')
        g_form.flash('sla_due', '#ff0000', 0)
    }
}
```

### onSubmit -- Form Validation

```typescript
ClientScript({
    $id: Now.ID['validate-submit'],
    name: 'Validate Before Submit',
    table: 'x_myapp_request',
    type: 'onSubmit',
    script: Now.include('../client/validate-submit.js'),
})
```

```javascript
// client/validate-submit.js
function onSubmit() {
    var description = g_form.getValue('description')
    if (!description || description.length < 10) {
        g_form.addErrorMessage('Description must be at least 10 characters')
        return false // cancel submission
    }
    return true
}
```

