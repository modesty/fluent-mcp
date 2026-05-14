
# Platform Views, Lists & Relationships

Guide for configuring ServiceNow views, view rules, lists, list controls, and relationships using the Fluent API.

---

## Views (sys_ui_view)

Views define which fields, sections, and layout appear on a form or list for a given table. A view definition alone is non-functional -- it must be combined with form/list components.

### Choosing the View Type

| If User Says | View Type | Action |
|--------------|-----------|--------|
| "simple", "basic", "default", "standard" | **Default** | `import { default_view } from '@servicenow/sdk/core'` -- no Record needed |
| "admins", "managers", "ITIL", "role" | **Role-based** | Set `roles` array |
| "team", "department", "group" | **Group-based** | Set `group` reference |
| "portal", "mobile app", "API", "hidden" | **Hidden** | Set `hidden: true` |
| Named individual ("John", "Dr. Smith") | **User-specific** | Set `user` reference |
| "everyone", "all users", "no restrictions" | **Public** | Omit access control fields |

### CRITICAL: Uniqueness Check

Both `name` and `title` must each be globally unique across all scopes. Query before creating:

```
table: sys_ui_view
query: name=<proposed_name>^ORtitle=<proposed_title>
```

If results > 0, change **both** name and title and re-query. Scope prefixes do not guarantee uniqueness.

### UI View Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `table` | `string` | Yes | Must be `"sys_ui_view"` |
| `data.name` | `string` | Yes | Unique technical name (max 80) |
| `data.title` | `string` | Yes | Unique display name (max 80) |
| `data.roles` | `string[]` | No | Array of role name strings |
| `data.user` | `string` | No | sys_id or reference to sys_user |
| `data.group` | `string` | No | sys_id or reference to sys_user_group |
| `data.hidden` | `boolean` | No | Hide from platform view selector |

### View Examples

#### Public view

```typescript
import { Record } from '@servicenow/sdk/core';

export const mobileView = Record({
    $id: Now.ID['mobile-view'],
    table: 'sys_ui_view',
    data: {
        name: 'incident_mobile',
        title: 'Mobile View',
    },
});
```

#### Role-based view

```typescript
import { Record } from '@servicenow/sdk/core';

export const adminView = Record({
    $id: Now.ID['admin-view'],
    table: 'sys_ui_view',
    data: {
        name: 'incident_admin',
        title: 'Admin View',
        roles: ['admin'],
    },
});
```

#### Group-based view

```typescript
import { Record } from '@servicenow/sdk/core';

export const supportGroup = Record({
    $id: Now.ID['support-group'],
    table: 'sys_user_group',
    data: { name: 'support_team', description: 'Support Team', active: true },
});

export const supportView = Record({
    $id: Now.ID['support-view'],
    table: 'sys_ui_view',
    data: {
        name: 'incident_support_team',
        title: 'Support Team View',
        group: supportGroup,
    },
});
```

#### Hidden view (Portal/API)

```typescript
import { Record } from '@servicenow/sdk/core';

export const portalView = Record({
    $id: Now.ID['portal-view'],
    table: 'sys_ui_view',
    data: {
        name: 'sp_incident_customer',
        title: 'Customer Portal View',
        hidden: true,
    },
});
```

#### Using default_view

```typescript
import { default_view } from '@servicenow/sdk/core';
import { Record } from '@servicenow/sdk/core';

export const section = Record({
    $id: Now.ID['disaster-report-section'],
    table: 'sys_ui_section',
    data: {
        name: 'u_disaster_report',
        view: default_view,
    },
});
```

### Forms Integration with Views

**Hierarchy:** UI View -> Form -> Sections -> Elements (fields/formatters/related lists)

A form requires explicit linking between forms and sections using the `sys_ui_form_section` join table. **Without `sys_ui_form_section` records, your form will appear EMPTY.**

#### Complete form with multiple sections

```typescript
import { Record } from '@servicenow/sdk/core';
import { managerView } from './views';

// 1. Create Form
export const managerForm = Record({
    $id: Now.ID['manager-form'],
    table: 'sys_ui_form',
    data: { name: 'incident', view: managerView, active: true },
});

// 2. Create Sections
export const detailsSection = Record({
    $id: Now.ID['details-section'],
    table: 'sys_ui_section',
    data: { name: 'incident', view: managerView, caption: 'Case Details', position: 0 },
});

export const assignmentSection = Record({
    $id: Now.ID['assignment-section'],
    table: 'sys_ui_section',
    data: { name: 'incident', view: managerView, caption: 'Assignment', position: 1 },
});

// 3. CRITICAL: Link Sections to Form
export const formDetailsLink = Record({
    $id: Now.ID['form-details-link'],
    table: 'sys_ui_form_section',
    data: { sys_ui_form: managerForm, sys_ui_section: detailsSection, position: 0 },
});

export const formAssignmentLink = Record({
    $id: Now.ID['form-assignment-link'],
    table: 'sys_ui_form_section',
    data: { sys_ui_form: managerForm, sys_ui_section: assignmentSection, position: 1 },
});

// 4. Add Fields to Sections
export const numberField = Record({
    $id: Now.ID['number-field'],
    table: 'sys_ui_element',
    data: { element: 'number', sys_ui_section: detailsSection, position: 0, type: 'element' },
});

export const assignedToField = Record({
    $id: Now.ID['assigned-to-field'],
    table: 'sys_ui_element',
    data: { element: 'assigned_to', sys_ui_section: assignmentSection, position: 0, type: 'element' },
});
```

#### Form element types

| Type | Description |
|------|-------------|
| `element` | Standard field |
| `formatter` | Custom formatter |
| `list` | Related list |
| `.begin_split` | Open 2-column area |
| `.split` | Column divider |
| `.end_split` | Close 2-column area |
| `.space` | Empty space |

#### Column layout with splits

Use splits for short fields (state, priority, category). Never split text areas (description, work_notes) or related lists -- these should be full width after `.end_split`.

```
.begin_split  -> opens 2-column area
  [left column fields]
.split        -> column divider
  [right column fields]
.end_split    -> closes 2-column area
[full-width content: text areas, related lists]
```

**Positioning:** Use increments of 10 (0, 10, 20...) to allow easy insertion later.

---

## View Rules (sysrule_view)

View Rules automatically switch the form layout based on conditions, device type, or script logic. They require existing views -- views must exist in `sys_ui_view` first.

### Three Switching Approaches

1. **Device-Based:** Set `device_type` (`'mobile'`, `'tablet'`, `'browser'`)
2. **Condition-Based:** Set `condition` with encoded query (MUST end with `^EQ`)
3. **Script-Based:** Set `advanced: true` with custom `script`

### Evaluation Order

1. Active rules only (`active: true`)
2. Device type match
3. Condition satisfied
4. Script execution (if `advanced: true`)
5. First match wins
6. User preference (unless `overrides_user_preference: true`)

### CRITICAL: Encoded Query Requirements

- **Must end with `^EQ`** -- all encoded queries must terminate with `^EQ`.
- **Use backend field names** -- element names from `sys_dictionary`, not labels.
- **Use internal values** -- values from `sys_choice`, not display labels.

| WRONG | CORRECT | Why |
|-------|---------|-----|
| `Priority=1^EQ` | `priority=1^EQ` | Field name lowercase |
| `priority=Critical^EQ` | `priority=1^EQ` | Use internal value |
| `state=Closed^EQ` | `state=7^EQ` | Use state number |
| `priority=1` | `priority=1^EQ` | Must end with ^EQ |

### CRITICAL: One Advanced Rule Per Device Type

When multiple advanced (script-based) View Rules share the same table AND device_type, only the rule with the lowest `order` value is evaluated. Others are skipped. **Solution:** Combine all role/condition checks into a single script.

### View Rule Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `table` | `string` | Yes | Must be `"sysrule_view"` |
| `data.name` | `string` | Yes | Descriptive name |
| `data.table` | `string` | Yes | Target table name |
| `data.view` | `string` | No | View name (from `sys_ui_view.name`, not title). Required unless using script |
| `data.condition` | `string` | No | Encoded query ending with `^EQ` |
| `data.device_type` | `string` | No | `'browser'`, `'mobile'`, or `'tablet'` |
| `data.active` | `boolean` | No | Default: `true` |
| `data.overrides_user_preference` | `boolean` | No | Override manual selection. Default: `true` |
| `data.advanced` | `boolean` | No | Enable custom script. Default: `false` |
| `data.script` | `string` | No | JavaScript logic (when `advanced: true`) |
| `data.order` | `number` | No | Evaluation order (lower first). Default: `100` |

### Advanced Script Variables

| Variable | Type | Availability | Description |
|----------|------|--------------|-------------|
| `view` | string | Always | Current view name |
| `is_list` | boolean | Always | true for lists, false for forms |
| `current` | GlideRecord | Forms only | Current record (undefined for lists) |
| `answer` | string/null | Always | Set to view name to switch |
| `gs` | GlideSystem | Always | GlideSystem API |

**Always check** `!is_list && typeof current !== 'undefined'` before accessing `current`.

### View Rule Examples

#### Device-based switching

```typescript
import { Record } from '@servicenow/sdk/core';

export const mobileRule = Record({
    $id: Now.ID['mobile-rule'],
    table: 'sysrule_view',
    data: {
        name: 'Mobile View Rule',
        table: 'incident',
        view: 'mobile',
        device_type: 'mobile',
        active: true,
        overrides_user_preference: true,
    },
});
```

#### Condition-based switching

```typescript
export const criticalRule = Record({
    $id: Now.ID['critical-rule'],
    table: 'sysrule_view',
    data: {
        name: 'Critical Priority Rule',
        table: 'incident',
        view: 'critical',
        condition: 'priority=1^ORpriority=2^EQ',
        active: true,
        overrides_user_preference: true,
    },
});
```

#### Role-based switching (advanced script)

```typescript
export const roleRule = Record({
    $id: Now.ID['role-rule'],
    table: 'sysrule_view',
    data: {
        name: 'Role-Based View Rule',
        table: 'incident',
        view: null,
        advanced: true,
        active: true,
        overrides_user_preference: true,
        script: `(function overrideView(view, is_list) {
      var user = gs.getUser();
      if (user.hasRole('admin')) {
        answer = 'admin_view';
      } else if (user.hasRole('manager')) {
        answer = 'manager_view';
      } else if (user.hasRole('agent')) {
        answer = 'agent_view';
      } else {
        answer = 'ess';
      }
    })(view, is_list);`,
    },
});
```

#### Complex conditional logic (forms only)

```typescript
export const complexRule = Record({
    $id: Now.ID['complex-rule'],
    table: 'sysrule_view',
    data: {
        name: 'Complex Conditional Rule',
        table: 'incident',
        view: null,
        advanced: true,
        active: true,
        overrides_user_preference: true,
        script: `(function overrideView(view, is_list) {
      if (!is_list && typeof current !== 'undefined') {
        var priority = current.priority.toString();
        var state = current.state.toString();
        if (priority === '1' && state === '2') {
          answer = 'critical_active_view';
        } else if (priority === '1' && state === '7') {
          answer = 'critical_closed_view';
        } else {
          answer = null;
        }
      }
    })(view, is_list);`,
    },
});
```

---

## Lists (sys_ui_list)

Use the `List` API from `@servicenow/sdk/core`. Requires `table`, `view`, and `columns`.

### List Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `table` | `string` | Yes | Table name for the list |
| `view` | Reference | Yes | UI view variable or `default_view` |
| `columns` | `array` | Yes | List of ListElement objects (or string shorthand) |
| `parent` | `TableName` | No | Parent table for related lists |
| `relationship` | `sys_relationship` | No | Custom relationship for related lists |
| `$meta` | `object` | No | Installation metadata (`demo`, `first install`) |

### List Element Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `element` | `string` | Yes | Field name (supports dot-walking, e.g., `"caller_id.name"`) |
| `position` | `number` | No | Display position (defaults to array order) |
| `sum` | `boolean` | No | Show sum aggregate |
| `averageValue` | `boolean` | No | Show average aggregate |
| `minValue` | `boolean` | No | Show minimum aggregate |
| `maxValue` | `boolean` | No | Show maximum aggregate |

### List Examples

#### Basic list with column objects

```typescript
import { List } from '@servicenow/sdk/core';

const serverList = List({
    table: 'cmdb_ci_server',
    view: app_task_view,
    columns: [
        { element: 'name', position: 0 },
        { element: 'business_unit', position: 1 },
        { element: 'vendor', position: 2 },
        { element: 'cpu_type', position: 3 },
    ],
});
```

#### Related list with simple reference

When a simple reference field exists (e.g., `table.field`), no relationship sys_id is needed:

```typescript
import { List, default_view } from '@servicenow/sdk/core';

List({
    table: 'project_task',
    view: default_view,
    parent: 'project',
    columns: ['assigned_to', 'short_description', 'due_date', 'state'],
});
```

#### Related list with explicit relationship

When no simple reference field exists, import the relationship and reference it:

```typescript
import { List, default_view } from '@servicenow/sdk/core';
import { skillMatchedPlayersRelationship } from '../relationships/game_allotment_relationships.now';

export const skillList = List({
    table: 'sn_sportshub_players',
    view: default_view,
    parent: 'sn_sportshub_sports',
    relationship: skillMatchedPlayersRelationship,
    columns: [
        { element: 'first_name', position: 0 },
        { element: 'gender', position: 1 },
        { element: 'email', position: 2 },
        { element: 'skill_level', position: 3 },
    ],
});
```

---

## List Controls (sys_ui_list_control)

List Controls configure UI options on table lists and related lists -- role-based New/Edit button visibility, disable pagination, conditional button hiding.

### Key Guidance

1. Each list control needs a unique `$id`, `table: 'sys_ui_list_control'`, and valid `name` (target table).
2. For related lists, use `related_list` in `table.field` or `REL:sys_id` format.
3. **Do not combine `omit_*_button: true` with `*_roles`** -- the omit flag overrides role permissions.
4. **Button visibility is OR logic**: hidden if `omit_*_button == true` OR `*_condition` evaluates to true.
5. Use `omit_count: true` for large tables (>10,000 records) for performance.
6. Condition scripts use `Now.include()` for external files.

### List Control Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | `TableName` | Yes | | Target table name |
| `related_list` | `string` | No | | `table.field` or `REL:sys_id` format |
| `label` | `string` | No | | Display label for list |
| `omit_new_button` | `boolean` | No | `false` | Hide New button for everyone |
| `omit_edit_button` | `boolean` | No | `true` | Hide Edit button for everyone |
| `omit_links` | `boolean` | No | `false` | Hide reference links |
| `omit_drilldown_link` | `boolean` | No | `false` | Disable first-column drilldown link |
| `omit_filters` | `boolean` | No | `false` | Hide filters/breadcrumbs |
| `omit_if_empty` | `boolean` | No | `false` | Hide related list when empty |
| `omit_count` | `boolean` | No | `false` | Remove pagination count |
| `omit_related_list_count` | `boolean` | No | `false` | Remove related list count in Workspace |
| `new_roles` | `string[]` | No | | Roles that can see New button |
| `edit_roles` | `string[]` | No | | Roles that can see Edit button |
| `filter_roles` | `string[]` | No | | Roles that can see filters |
| `link_roles` | `string[]` | No | | Roles that can see links |
| `new_condition` | Script | No | | Condition script to hide New button |
| `edit_condition` | Script | No | | Condition script to hide Edit button |
| `list_edit_type` | `string` | No | | `'save_by_row'`, `'disabled'`, or omit for default |
| `list_edit_ref_qual_tag` | `string` | No | | Tag passed to reference qualifier scripts |
| `hierarchical_lists` | `boolean` | No | `false` | Enable hierarchical list display |
| `disable_nlq` | `boolean` | No | `false` | Disable Natural Language Query |
| `active` | `boolean` | No | `true` | Whether control is active |

### Condition Script Pattern

```javascript
var answer;
if (parent.state == 6 || parent.state == 7) {
    answer = true; // hide button
} else {
    answer = false; // show button
}
answer;
```

- `parent` provides access to parent record fields.
- `answer = true` hides the button; `answer = false` shows it.

### List Control Examples

#### Performance optimization for large table

```typescript
import { Record } from '@servicenow/sdk/core';

export const auditControl = Record({
    $id: Now.ID['audit-list-control'],
    table: 'sys_ui_list_control',
    data: {
        name: 'sys_audit',
        omit_count: true,
        omit_related_list_count: true,
    },
});
```

#### Role-based button access

```typescript
import { Record } from '@servicenow/sdk/core';

export const roleControl = Record({
    $id: Now.ID['role-based-access'],
    table: 'sys_ui_list_control',
    data: {
        name: 'incident',
        new_roles: ['admin', 'itil'],
        edit_roles: ['admin'],
    },
});
```

#### Conditional button hiding on related list

```typescript
import { Record } from '@servicenow/sdk/core';

export const conditionalControl = Record({
    $id: Now.ID['incident-conditional-button'],
    table: 'sys_ui_list_control',
    data: {
        name: 'incident',
        related_list: 'incident.parent_incident',
        new_condition: Now.include('../scripts/hideForClosedIncident.js'),
        edit_condition: Now.include('../scripts/hideForClosedIncident.js'),
    },
});
```

#### Hide related list when empty

```typescript
import { Record } from '@servicenow/sdk/core';

export const hideIfEmpty = Record({
    $id: Now.ID['omit-if-empty'],
    table: 'sys_ui_list_control',
    data: {
        name: 'incident',
        related_list: 'incident.parent_incident',
        omit_if_empty: true,
    },
});
```

#### Filter and link role restrictions

```typescript
import { Record } from '@servicenow/sdk/core';

export const filterRoles = Record({
    $id: Now.ID['filter-role-control'],
    table: 'sys_ui_list_control',
    data: {
        name: 'incident',
        filter_roles: ['admin', 'report_viewer'],
        link_roles: ['admin', 'itil', 'user'],
    },
});
```

#### Disable list editing

```typescript
import { Record } from '@servicenow/sdk/core';

export const disableEdit = Record({
    $id: Now.ID['disable-list-edit'],
    table: 'sys_ui_list_control',
    data: {
        name: 'x_snc_financial_records',
        list_edit_type: 'disabled',
    },
});
```

#### List control on custom relationship

```typescript
import '@servicenow/sdk/global';
import { Record } from '@servicenow/sdk/core';
import { activeHighPriorityRelationship } from '../relationships/game_allotment_relationships.now';

export const customRelControl = Record({
    $id: Now.ID['sports_table_list_control'],
    table: 'sys_ui_list_control',
    data: {
        name: 'sn_sportshub_sports',
        related_list: `REL:${activeHighPriorityRelationship.$id}`,
        omit_related_list_count: 'true',
    },
});
```

---

## Relationships (sys_relationship)

Relationships define how tables relate for related lists and cross-table queries.

### Relationship Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | No | Descriptive name |
| `basic_apply_to` | `TableName` | No | Table where relationship is defined (basic) |
| `basic_query_from` | `TableName` | No | Table being referenced (basic) |
| `reference_field` | `FieldName` | No | Field containing the reference |
| `query_with` | Script | No | Script to refine the query |
| `advanced` | `boolean` | No | Whether this is an advanced relationship |
| `simple_reference` | `boolean` | No | Whether this is a simple reference |
| `apply_to` | Script | No | Script for advanced: which table applies |
| `query_from` | Script | No | Script for advanced: which table to query |

Either use basic fields (`basic_apply_to`, `basic_query_from`) or advanced fields (`apply_to`, `query_from`) -- never both.

### Related List Configuration

Related lists use two tables:
- `sys_ui_related_list` -- container for a table's related lists in a view
- `sys_ui_related_list_entry` -- individual entries linking to relationships

For referential relationships: use `table.reference_field` format in the entry.
For non-referential relationships: use `REL:<relationship_sys_id>` format.

### Relationship Examples

#### Basic relationship between custom tables

```typescript
import { Record } from '@servicenow/sdk/core';

export const deptAllocation = Record({
    $id: Now.ID['department_rel_id'],
    table: 'sys_relationship',
    data: {
        advanced: false,
        basic_apply_to: 'sn_foo_department',
        basic_query_from: 'sn_foo_student',
        name: 'Department Allocation Relationship',
        query_with: `(function refineQuery(current, parent) {
    current.addQuery('department', parent.id);
})(current, parent);`,
        simple_reference: false,
    },
});
```

#### Related list container with entries

```typescript
import { Record } from '@servicenow/sdk/core';

const deptRelatedList = Record({
    $id: Now.ID['department_related_list_id'],
    table: 'sys_ui_related_list',
    data: {
        calculated_name: 'Department - Default view',
        name: 'sn_foo_department',
        view: 'Default view',
    },
});

Record({
    $id: Now.ID['department_related_list_entry_id'],
    table: 'sys_ui_related_list_entry',
    data: {
        list_id: deptRelatedList.$id,
        position: '0',
        related_list: `REL:${deptAllocation.$id}`,
    },
});
```

#### Multiple related lists on one table

```typescript
const productContainer = Record({
    $id: Now.ID['products_related_lists'],
    table: 'sys_ui_related_list',
    data: { name: 'sn_product_life_products', view: 'Default view' },
});

Record({
    $id: Now.ID['feature_requests_entry'],
    table: 'sys_ui_related_list_entry',
    data: {
        list_id: productContainer.$id,
        position: 0,
        related_list: 'feature_requests.product',
    },
});

Record({
    $id: Now.ID['testing_reports_entry'],
    table: 'sys_ui_related_list_entry',
    data: {
        list_id: productContainer.$id,
        position: 1,
        related_list: 'testing_reports.product',
    },
});
```

