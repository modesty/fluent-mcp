
# Platform Views & UI Layout Control

Configure UI controls for ServiceNow platform lists and forms. Covers UI Actions (sys_ui_action), UI Policies (sys_ui_policy), and UI Formatters (sys_ui_formatter). Use this guide when configuring buttons on forms or lists, field visibility/mandatory rules, formatting a form, adding sections, activity streams, process flows, dynamic field behavior, or role-restricted actions.

## Choosing the Right Approach

| Need | Use | API |
|------|-----|-----|
| Button/link on form or list | UI Actions | `UiAction` |
| Field visibility/mandatory/read-only based on condition | UI Policies | `UiPolicy` |
| Non-field content on forms (activity, process flow) | UI Formatters | Record API |
| Configure list columns and order | Lists | `List` |
| Different form layout per role/group/persona | Views | Record API |
| Auto-switch layout when condition met | View Rules | Record API |
| Hide New/Edit buttons, role-based list actions | List Controls | Record API |

### Views vs View Rules vs UI Policies

| Scenario | Use |
|----------|-----|
| Whole form layout changes per role/group (different fields/sections) | **View** |
| Whole form layout switches automatically based on condition/device/state | **View Rule** |
| Specific fields hide/show/mandatory/read-only when condition met | **UI Policy** |
| Control list buttons (New/Edit) or disable pagination | **List Control** |

### Views vs ACLs

| Intent | Use |
|--------|-----|
| Certain fields/sections should not appear in the form for some users | **Views** -- fields absent from the form entirely |
| Restrict who can read/write/delete records or fields (data security) | **ACLs** -- security enforcement |

## Avoidance

- **Never create `sys_ui_formatter` records for Activity or Attached Knowledge** -- they already exist globally.
- **Never create custom formatters** -- not supported in Fluent.
- **Never use `disabled` in UI Policy actions** -- use `readOnly` instead (the plugin maps it).
- **Never place a formatter in a section with no other elements** -- it will not render.
- **Never have a UI Action script return a value** -- the `script` field must never return anything.
- **Never skip the view uniqueness check** -- `sys_ui_view` is global and `title` must be unique across all scopes.
- **Never create lists for tables that don't exist yet** -- define the table first.
- **Never use personal list preferences (sys_ui_list_user) in application code** -- those are user-specific.
- **Never mix basic and advanced relationship fields in view configurations** -- use one pattern or the other.
- **Never use Business Rules, Client Scripts, or UI Policies for view switching** -- always use View Rules (sysrule_view).
- **Never combine `omit_*_button: true` with `*_roles` for the same capability** -- the omit flag overrides role permissions.

---

## UI Actions

Use the `UiAction` API from `@servicenow/sdk/core`. Every UI Action must have `$id`, `table`, `name`, and `actionName`.

### Key Guidance

1. **Be explicit about placement:** Set `form.showButton`, `list.showButton`, etc. to control where the action appears. If blank, the action may not appear anywhere useful.
2. **Set visibility mode:** Use `showInsert: true` for new record forms, `showUpdate: true` for existing record forms and list views.
3. **Client vs. server scripts:** Set `client.isClient: true` for client-side execution. When `isClient` is true, use `client.onClick` for the trigger and `script` for the function definition.
4. **Set a `style`** on form/list objects -- `'primary'`, `'destructive'`, or `'unstyled'`.
5. **Use `condition`** to control when the action is visible (e.g., `current.canWrite()`).
6. **The `script` field must never return anything.**

### UI Action Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `table` | `string` | Yes | Table this UI Action is associated with |
| `name` | `string` | Yes | Display name |
| `actionName` | `string` | Yes | Unique identifier usable in scripts |
| `active` | `boolean` | No | Whether the action is available |
| `showInsert` | `boolean` | No | Show on form in insert mode (before save) |
| `showUpdate` | `boolean` | No | Show on form in update mode (after save) |
| `showQuery` | `boolean` | No | Show on list when a filter is applied |
| `showMultipleUpdate` | `boolean` | No | Allow triggering on multiple selected records |
| `condition` | `string` | No | Script/condition controlling visibility |
| `script` | `string` | No | Script to execute when triggered |
| `hint` | `string` | No | Tooltip text |
| `order` | `number` | No | Button/link position |
| `isolateScript` | `boolean` | No | Run script in isolated scope |
| `roles` | `(string or Role)[]` | No | Roles that can see/execute the action |
| `includeInViews` | `string[]` | No | Views where the action appears |
| `excludeFromViews` | `string[]` | No | Views where the action is excluded |
| `messages` | `string[]` | No | Messages for client scripts |

#### Form Properties

| Property | Type | Description |
|----------|------|-------------|
| `form.showButton` | `boolean` | Add button to form |
| `form.showLink` | `boolean` | Add link to form |
| `form.showContextMenu` | `boolean` | Add to right-click menu |
| `form.style` | `string` | `'primary'`, `'destructive'`, or `'unstyled'` |

#### List Properties

| Property | Type | Description |
|----------|------|-------------|
| `list.showButton` | `boolean` | Add button to list |
| `list.showLink` | `boolean` | Add link to list |
| `list.showContextMenu` | `boolean` | Add to right-click menu |
| `list.style` | `string` | `'primary'`, `'destructive'`, or `'unstyled'` |
| `list.showListChoice` | `boolean` | Add to choice field dropdowns |
| `list.showBannerButton` | `boolean` | Add button in list banner |
| `list.showSaveWithFormButton` | `boolean` | Save form before executing |

#### Client Properties

| Property | Type | Description |
|----------|------|-------------|
| `client.isClient` | `boolean` | Script runs on client (true) or server (false) |
| `client.isUi11compatible` | `boolean` | Compatible with UI11 |
| `client.isUi16Compatible` | `boolean` | Compatible with UI16 |
| `client.onClick` | `string` | JavaScript to run when clicked |

#### Workspace Properties

| Property | Type | Description |
|----------|------|-------------|
| `workspace.isConfigurableWorkspace` | `boolean` | Enable for Configurable Workspace |
| `workspace.showFormButtonV2` | `boolean` | V2 button rendering |
| `workspace.showFormMenuButtonV2` | `boolean` | V2 menu rendering |
| `workspace.clientScriptV2` | `string` | V2 client script model code |

### UI Action Examples

#### Form button that refreshes the page

```typescript
import '@servicenow/sdk/global';
import { UiAction } from '@servicenow/sdk/core';

export const refreshAction = UiAction({
    $id: Now.ID['refresh-page'],
    table: 'test_table',
    name: 'Refresh Page',
    actionName: 'refresh_page',
    active: true,
    hint: 'Refresh the current page',
    showUpdate: true,
    showInsert: true,
    form: {
        showButton: true,
        style: 'primary',
    },
    script: `window.location.reload();`,
});
```

#### List button with info message

```typescript
import '@servicenow/sdk/global';
import { UiAction } from '@servicenow/sdk/core';

export const listAction = UiAction({
    $id: Now.ID['list-info'],
    table: 'test_table',
    name: 'Show Info',
    actionName: 'show_info',
    active: true,
    showUpdate: true,
    list: {
        showBannerButton: true,
        showButton: true,
        style: 'primary',
    },
    script: `gs.addInfoMessage('button pressed');`,
});
```

#### Conditional action with roles and multi-row update

```typescript
import '@servicenow/sdk/global';
import { UiAction } from '@servicenow/sdk/core';

export const adminAction = UiAction({
    $id: Now.ID['admin-action'],
    table: 'test_table',
    name: 'Admin Action',
    actionName: 'admin_action',
    active: true,
    showUpdate: true,
    showInsert: true,
    showMultipleUpdate: true,
    list: { showButton: true, style: 'primary' },
    form: { showButton: true, style: 'primary' },
    condition: `current.canWrite();`,
    roles: ['admin'],
});
```

#### Client-side workspace-compatible action

```typescript
import '@servicenow/sdk/global';
import { UiAction } from '@servicenow/sdk/core';

export const workspaceAction = UiAction({
    $id: Now.ID['workspace-action'],
    table: 'test_table',
    name: 'Workspace Action',
    actionName: 'workspace_action',
    active: true,
    showUpdate: true,
    showInsert: true,
    form: { showButton: true, style: 'primary' },
    client: { isClient: true, isUi16Compatible: true },
    roles: ['itil'],
    workspace: {
        showFormButtonV2: false,
        showFormMenuButtonV2: false,
        isConfigurableWorkspace: false,
    },
    script: Now.include('../../client/test.js'),
});
```

---

## UI Policies

Use the `UiPolicy` API from `@servicenow/sdk/core`. Every UI Policy must have `$id`, `table`, and `shortDescription`.

### Key Guidance

1. **Use encoded query syntax for `conditions`** -- e.g., `"priority=1^state!=6"`.
2. **Action properties use `boolean | 'ignore'`** -- use `true`/`false` to set, `'ignore'` to leave unchanged.
3. **Use `readOnly` (not `disabled`)** -- it maps directly to ServiceNow's `disabled` field.
4. **Prefer declarative `actions` over scripts** -- better performance and less error-prone.
5. **`reverseIfFalse` defaults to `true`** -- when conditions are false, actions are automatically inverted.
6. **Choice fields use stored values** -- use the `Value` column, not the `Label` column. Right-click field > Show Choice List to find stored values.

### UI Policy Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | `Now.ID[string]` | Yes | | Unique identifier |
| `table` | `string` | Yes | | Table the policy applies to |
| `shortDescription` | `string` | Yes | | Brief description |
| `active` | `boolean` | No | `true` | Whether policy is active |
| `global` | `boolean` | No | `true` | Apply to all views |
| `onLoad` | `boolean` | No | `false` | Run when form loads |
| `reverseIfFalse` | `boolean` | No | `true` | Invert actions when condition is false |
| `inherit` | `boolean` | No | `false` | Apply to extending tables |
| `order` | `number` | No | `100` | Execution order (lower first) |
| `conditions` | `string` | No | | Encoded query for when policy applies |
| `runScripts` | `boolean` | No | `false` | Enable script execution |
| `scriptTrue` | `string` | No | | JS when condition is true (wrap in `function onCondition() {}`) |
| `scriptFalse` | `string` | No | | JS when condition is false |
| `uiType` | `string` | No | `'desktop'` | `'desktop'`, `'mobile-service-portal'`, or `'all'` |
| `isolateScript` | `boolean` | No | `false` | Run scripts in isolated scope |
| `actions` | `array` | No | | Field actions (see below) |
| `relatedListActions` | `array` | No | | Related list visibility controls (see below) |

#### Field Action Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `field` | `string` | Yes | | Target field name |
| `visible` | `boolean \| 'ignore'` | No | `'ignore'` | Show/hide field |
| `readOnly` | `boolean \| 'ignore'` | No | `'ignore'` | Read-only/editable (maps to ServiceNow `disabled`) |
| `mandatory` | `boolean \| 'ignore'` | No | `'ignore'` | Required/optional |
| `cleared` | `boolean` | No | `false` | Clear field value when condition met |
| `value` | `string` | No | | Set field to specific value |
| `fieldMessage` | `string` | No | | Message to display near field |
| `fieldMessageType` | `string` | No | `'none'` | `'info'`, `'warning'`, `'error'`, or `'none'` |

#### Related List Action Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `list` | `string` | Yes | Related list ID: plain GUID or `table.field` format |
| `visible` | `boolean \| 'ignore'` | No | Show/hide the related list |

The plugin automatically adds/removes the `REL:` prefix for GUIDs when transforming to/from ServiceNow.

### Condition Syntax

**AND operator (`^`)** -- all conditions must be true:

```
conditions: "priority=1^state=2"
```

**OR operator (`^OR`)** -- at least one must be true:

```
conditions: "priority=1^ORpriority=2"
```

**Common operators:** `=`, `!=`, `>`, `>=`, `<`, `<=`, `IN`, `LIKE`, `NOT LIKE`, `STARTSWITH`, `ANYTHING`, `EMPTYSTRING`, `SAMEAS`, `NSAMEAS`, `BETWEEN`

**Choice field patterns:**

| Pattern | Condition Example |
|---------|-------------------|
| Specific value | `category=hardware` |
| Multiple values (OR) | `categoryINhardware,software` |
| Not a value | `category!=hardware` |
| Any value selected | `category!=NULL` |
| No value selected | `category=NULL` |

### UI Policy Examples

#### Progressive disclosure

```typescript
import { UiPolicy } from '@servicenow/sdk/core';

export const categoryPolicy = UiPolicy({
    $id: Now.ID['incident_category_policy'],
    table: 'incident',
    shortDescription: 'Show subcategory when category is selected',
    onLoad: true,
    conditions: 'category!=NULL',
    actions: [
        { field: 'subcategory', visible: true, mandatory: true },
    ],
});
```

#### State-based read-only

```typescript
import { UiPolicy } from '@servicenow/sdk/core';

export const closedPolicy = UiPolicy({
    $id: Now.ID['closed_incident_policy'],
    table: 'incident',
    shortDescription: 'Make fields read-only for closed incidents',
    onLoad: true,
    conditions: 'state=7',
    actions: [
        { field: 'short_description', readOnly: true },
        { field: 'description', readOnly: true },
        { field: 'priority', readOnly: true },
        { field: 'assignment_group', readOnly: true },
    ],
});
```

#### Field clearing on condition change

```typescript
import { UiPolicy } from '@servicenow/sdk/core';

export const reopenPolicy = UiPolicy({
    $id: Now.ID['incident_reopen_policy'],
    table: 'incident',
    shortDescription: 'Clear resolution fields when incident is reopened',
    onLoad: true,
    conditions: 'state!=6^state!=7',
    actions: [
        { field: 'resolution_code', cleared: true },
        { field: 'close_notes', cleared: true },
        { field: 'resolved_at', cleared: true },
        { field: 'resolved_by', cleared: true },
    ],
});
```

#### Default values with field messages

```typescript
import { UiPolicy } from '@servicenow/sdk/core';

export const securityPolicy = UiPolicy({
    $id: Now.ID['security_incident_policy'],
    table: 'incident',
    shortDescription: 'Set defaults for security incidents',
    onLoad: true,
    conditions: 'categoryLIKEsecurity',
    actions: [
        {
            field: 'priority',
            value: '2',
            readOnly: true,
            fieldMessage: 'Priority automatically set to High for security incidents',
            fieldMessageType: 'info',
        },
        {
            field: 'assignment_group',
            mandatory: true,
            fieldMessage: 'Security incidents must be assigned immediately',
            fieldMessageType: 'warning',
        },
    ],
});
```

#### Combined field and related list control

```typescript
import { UiPolicy } from '@servicenow/sdk/core';

export const highPriorityPolicy = UiPolicy({
    $id: Now.ID['high_priority_policy'],
    table: 'incident',
    shortDescription: 'Show additional details for high priority incidents',
    onLoad: true,
    conditions: 'priority=1^ORpriority=2',
    actions: [
        { field: 'work_notes', visible: true, mandatory: true },
        { field: 'impact', mandatory: true },
    ],
    relatedListActions: [
        { $id: Now.ID['show_tasks'], list: 'incident_task.parent', visible: true },
        { $id: Now.ID['show_cis'], list: 'task_ci.task', visible: true },
    ],
});
```

### UI Policy Scripts

Set `runScripts: true` to enable scripts. Scripts execute client-side and have access to `g_form`, `g_user`, `g_scratchpad`, and other client APIs.

All scripts must be wrapped in `function onCondition() { ... }` format.

**Best practices:**
- Prefer field actions over scripts for simple behaviors.
- Always provide both `scriptTrue` and `scriptFalse` to properly reverse behaviors.
- Clear messages in `scriptFalse` to avoid stale messages.
- Set `isolateScript: true` to avoid variable conflicts.

**Common g_form methods:**

```javascript
g_form.setVisible('field_name', true);
g_form.setMandatory('field_name', true);
g_form.setReadOnly('field_name', true);
g_form.setValue('field_name', 'value');
g_form.getValue('field_name');
g_form.clearValue('field_name');
g_form.addInfoMessage('message');
g_form.addErrorMessage('message');
g_form.showFieldMsg('field_name', 'text', 'info');
g_form.hideFieldMsg('field_name');
g_form.clearMessages();
```

**Example with scripts:**

```typescript
import { UiPolicy } from '@servicenow/sdk/core';

export const validationPolicy = UiPolicy({
    $id: Now.ID['incident_validation_policy'],
    table: 'incident',
    shortDescription: 'Validate fields based on priority',
    onLoad: true,
    conditions: 'priority=1',
    runScripts: true,
    uiType: 'all',
    isolateScript: true,
    scriptTrue: `function onCondition() {
    g_form.setMandatory('justification', true);
    g_form.setMandatory('business_service', true);
    g_form.showFieldMsg('priority', 'High priority requires justification', 'info');
    if (g_form.getValue('urgency') == '') {
        g_form.setValue('urgency', '1');
    }
  }`,
    scriptFalse: `function onCondition() {
    g_form.setMandatory('justification', false);
    g_form.setMandatory('business_service', false);
    g_form.hideFieldMsg('priority');
  }`,
});
```

### Related List Visibility

Related list actions control visibility of related lists on forms. The `list` property identifies which related list to control:

- **GUID format** (system relationships): `"b9edf0ca0a0a0b010035de2d6b579a03"` -- plugin auto-adds `REL:` prefix.
- **Table.Field format** (reference fields): `"incident.caller_id"`
- **Table.Table format** (parent-child): `"change_request.change_task"`

**Finding related list GUIDs:**

```javascript
var gr = new GlideRecord('sys_ui_related_list');
gr.addQuery('name', 'CONTAINS', 'your_table_name');
gr.query();
while (gr.next()) {
    gs.print(gr.name + ' -> ' + gr.sys_id);
}
```

---

## UI Formatters

Formatters add non-field content to forms (activity streams, process flows, checklists). Custom formatters are **not** supported in Fluent -- always use built-in formatters.

### Built-In Formatters

| Formatter | Macro | When to Use | Position |
|-----------|-------|-------------|----------|
| Activity | `activity.xml` | Journal entries, comments, work notes | Last in section |
| Process Flow | `process_flow` | Lifecycle stage visualization | First in section |
| CI Relations | `ui_ng_relation_formatter.xml` | CMDB relationship maps | First in section |
| Parent Breadcrumb | `parent_crumbs` | Parent hierarchy trail | First in section |
| Contextual Search | `cxs_table_search.xml` | Auto-suggest knowledge articles | Below search context field |
| Variables Editor | `com_glideapp_questionset_default_question_editor` | Record producer variables | -- |
| Checklist | `inline_checklist_macro` | Sub-task tracking | Last in section |
| Attached Knowledge | `attached_knowledge` | Linked knowledge articles | Last in section |

### Key Rules

1. **Activity and Attached Knowledge formatters already exist globally** -- never create `sys_ui_formatter` records for them. Skip straight to adding the `sys_ui_element`.
2. **A formatter requires a section** -- it must reside in a `sys_ui_section`, and the section must have at least one non-formatter element.
3. **Parent Breadcrumb requires a field named exactly `parent`** -- no variations like `parent_task` or `parent_record`.
4. **Process Flow requires stage configuration** -- verify `sys_process_flow` records exist for the target table.
5. **Position matters** -- Process Flow and Parent Breadcrumb go first; Activity and Checklist go last.

### Sequential Steps to Add a Formatter

1. **Check formatter exists** (`sys_ui_formatter`): For Activity and Attached Knowledge, skip to step 4. For others, query `sys_ui_formatter` for the target table, then global, then the extended-from table.
2. **If Process Flow**: Verify/create stage records in `sys_process_flow`.
3. **If Contextual Search**: Verify/create search config in `cxs_table_config`.
4. **Check section exists** (`sys_ui_section`): Query for the target table and view. Create if missing.
5. **Add formatter element** (`sys_ui_element`): Create with `type: 'formatter'` and reference to the section and formatter.
6. **Ensure at least one non-formatter element** exists in the section.

### Formatter Examples

#### Add Activity Formatter (no formatter record needed)

```typescript
import { Record } from '@servicenow/sdk/core';

Record({
    $id: Now.ID['activity_formatter_element'],
    table: 'sys_ui_element',
    data: {
        sys_ui_section: section.$id,
        element: 'activity.xml',
        type: 'formatter',
        position: 99,
    },
});
```

#### Create Process Flow Formatter

```typescript
import { Record } from '@servicenow/sdk/core';

export const processFlowFormatter = Record({
    $id: Now.ID['process_flow_formatter'],
    table: 'sys_ui_formatter',
    data: {
        name: 'Process Flow Formatter',
        type: 'formatter',
        formatter: 'process_flow.xml',
        table: 'table_name',
        active: true,
    },
});
```

#### Add stages for Process Flow

```typescript
import { Record } from '@servicenow/sdk/core';

Record({
    $id: Now.ID['flow-stage-new'],
    table: 'sys_process_flow',
    data: {
        active: true,
        condition: 'state=new^EQ',
        label: 'New',
        name: 'Task Flow - New State',
        order: '100',
        table: 'table_name',
    },
});

Record({
    $id: Now.ID['flow-stage-progress'],
    table: 'sys_process_flow',
    data: {
        active: true,
        condition: 'state=in_progress^EQ',
        label: 'In Progress',
        name: 'Task Flow - In Progress',
        order: '200',
        table: 'table_name',
    },
});
```

