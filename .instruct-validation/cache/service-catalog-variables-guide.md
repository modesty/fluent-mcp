# Service Catalog Variables

API reference and patterns for Service Catalog variables, variable sets, UI policies, and client scripts. For catalog items and record producers, see [service-catalog-guide.md](service-catalog-guide.md). Requires SDK 4.3.0 or higher.

---

## Catalog Variables API Reference

### Common Variable Properties

| Property | Type | Description |
|---|---|---|
| `question` | string | **Required.** Label text displayed to user. |
| `order` | number | Display order (use increments of 100). |
| `mandatory` | boolean | Whether field is required. Default: `false`. |
| `readOnly` | boolean | Whether field is editable. Default: `false`. |
| `hidden` | boolean | Whether field is visible. Default: `false`. |
| `tooltip` | string | Hover help text. |
| `exampleText` | string | Placeholder text. |
| `instructions` | string | Inline help text. |
| `defaultValue` | string | Pre-filled value. |
| `width` | 25 \| 50 \| 75 \| 100 | Field width percentage. |
| `readRoles` | string[] | Roles that can read the variable. |
| `writeRoles` | string[] | Roles that can write to the variable. |
| `mapToField` | boolean | Map to target table field (Record Producers). |
| `field` | string | Target field name when mapToField is true. |

### Variable Types

**Text Variables**

- **SingleLineTextVariable** -- Single line text input
- **MultiLineTextVariable** -- Multi-line text area
- **WideSingleLineTextVariable** -- Full-width single line
- **EmailVariable** -- Email address input
- **UrlVariable** -- URL input
- **IpAddressVariable** -- IPv4/IPv6 input
- **MaskedVariable** -- Masked/password input (supports `useEncryption`, `useConfirmation`)

**Choice Variables**

- **SelectBoxVariable** -- Dropdown choice list. Requires `choices` object with `{ label, sequence }`.
- **MultipleChoiceVariable** -- Radio buttons. Supports `choiceDirection: 'down'` or `'across'`.
- **YesNoVariable** -- Yes/No choice list.
- **CheckboxVariable** -- Checkbox. Use `selectionRequired: true` for mandatory.
- **NumericScaleVariable** -- Likert scale radio buttons.

**Lookup Variables**

- **LookupSelectBoxVariable** -- Dropdown from table data.
- **LookupMultipleChoiceVariable** -- Radio buttons from table data.

**Reference Variables**

- **ReferenceVariable** -- References a record in another table. Key properties: `referenceTable`, `referenceQualCondition`, `useReferenceQualifier`.
- **RequestedForVariable** -- Specifies who the request is for.
- **ListCollectorVariable** -- Select multiple records from a table.

**Date/Time Variables**

- **DateVariable** -- Date picker.
- **DateTimeVariable** -- Date and time picker.
- **DurationVariable** -- Duration input.

**Layout Variables**

- **ContainerStartVariable** / **ContainerSplitVariable** / **ContainerEndVariable** -- Multi-column layout containers. Must be properly paired.
- **LabelVariable** -- Display-only label.
- **BreakVariable** -- Horizontal line separator.

**Special Variables**

- **AttachmentVariable** -- File upload.
- **HtmlVariable** -- Rich content display.
- **RichTextLabelVariable** -- Formatted label.
- **CustomVariable** / **CustomWithLabelVariable** -- UI macro insertion.
- **UIPageVariable** -- UI page insertion.

---

## Variable Set API Reference

### Properties

| Property | Type | Description |
|---|---|---|
| `$id` | Now.ID[string] | **Required.** Unique identifier. |
| `title` | string | **Required.** Display title. |
| `internalName` | string | Internal name. Auto-generated from title if not provided. |
| `description` | string | Description of the variable set. |
| `type` | `'singleRow'` \| `'multiRow'` | Default: `'singleRow'`. |
| `layout` | `'normal'` \| `'2down'` \| `'2across'` | Default: `'normal'`. |
| `order` | number | Display order. Default: `100`. |
| `displayTitle` | boolean | Show collapsible section header. Default: `false`. |
| `setAttributes` | string | Additional config (e.g., `"max_rows=10,collapsible=true"`). |
| `readRoles` | string[] | Roles that can view the variable set. |
| `writeRoles` | string[] | Roles that can modify values. |
| `createRoles` | string[] | Roles that can create instances (for multiRow). |
| `variables` | object | Variable definitions for the set. |

### Attaching to Catalog Items

Attach variable sets via `variableSets: [{ variableSet, order }]` on a Catalog Item or Record Producer. Item-specific variables can be added alongside variable sets.

### Multi-Row Variable Set (MRVS)

Use `type: "multiRow"` for grid/table data entry (e.g., multiple team members). Configure with `setAttributes` for row limits and collapsibility.

### MRVS Unsupported Variable Types

- AttachmentVariable
- ContainerStartVariable / ContainerEndVariable / ContainerSplitVariable
- HtmlVariable
- CustomVariable / CustomWithLabelVariable
- RichTextLabelVariable
- UIPageVariable

### MRVS Limitations

- "Assign to Field" not supported
- Cannot add variables with read roles
- Set row limits using `max_rows` attribute
- Will not display if added to a container

### Role-Based Access

- `readRoles`: Roles that can view the variable set
- `writeRoles`: Roles that can modify values
- `createRoles`: Roles that can create instances (multiRow)

Set-level permissions override variable-level permissions when access is denied at the set level.

---

## Catalog UI Policy API Reference

### Properties

| Property | Type | Description |
|---|---|---|
| `$id` | Now.ID[string] | **Required.** Unique identifier. |
| `shortDescription` | string | **Required.** Description of what the policy does. |
| `catalogItem` | ref | **Required** if not using variableSet. |
| `variableSet` | ref | **Required** if not using catalogItem. |
| `appliesTo` | `'item'` \| `'set'` | Required if using variableSet. Default: `'item'`. |
| `active` | boolean | Whether the policy is active. Default: `true`. |
| `onLoad` | boolean | Run on form load. Default: `true`. |
| `reverseIfFalse` | boolean | Reverse actions when condition is false. Default: `true`. |
| `catalogCondition` | string | Condition using encoded query syntax. |
| `appliesOnCatalogItemView` | boolean | Applies to catalog item view. Default: `true`. |
| `appliesOnTargetRecord` | boolean | Applies to target record. Default: `false`. |
| `appliesOnCatalogTasks` | boolean | Applies to catalog tasks. Default: `false`. |
| `appliesOnRequestedItems` | boolean | Applies to requested items. Default: `false`. |
| `runScripts` | boolean | Execute client scripts. Default: `false`. |
| `executeIfTrue` | string | Script when condition is true. |
| `executeIfFalse` | string | Script when condition is false. |
| `runScriptsInUiType` | `'desktop'` \| `'mobileOrServicePortal'` \| `'all'` | Default: `'desktop'`. |
| `actions` | array | List of variable actions. |

### Action Properties

| Property | Type | Description |
|---|---|---|
| `variableName` | ref | **Required.** Variable reference. |
| `visible` | boolean | Show/hide the variable. |
| `mandatory` | boolean | Make variable required. |
| `readOnly` | boolean | Make variable read-only. |
| `value` | string | Value to set. |
| `valueAction` | `'clearValue'` \| `'setValue'` | How to apply the value. |
| `order` | number | Execution order. Default: `100`. |
| `variableMessage` | string | Message to display on the field. |
| `variableMessageType` | `'info'` \| `'warning'` \| `'error'` | Message severity. |

### Condition Syntax

```typescript
// Simple condition
catalogCondition: `${catalogItem.variables.priority}=high^EQ`;

// Multiple conditions with AND
catalogCondition: `${catalogItem.variables.env}=prod^${catalogItem.variables.critical}=true^EQ`;

// Multiple conditions with OR
catalogCondition: `${catalogItem.variables.env}=prod^OR${catalogItem.variables.critical}=true^EQ`;

// Not empty check
catalogCondition: `${catalogItem.variables.reference}ISNOTEMPTY^EQ`;
```

### Priority Rules

1. **Mandatory** has highest priority
2. If a variable is mandatory and has no value, readonly/hide actions **do not work**
3. If a variable set/container has a mandatory variable without value, the entire set **cannot be hidden**
4. "Clear value" action does not work on variable sets and containers

### Variable Type Limitations

| Policy Type | Not Applicable To |
|---|---|
| Mandatory | Fraction, Container Split, Container End, UI Macro, Label, UI Page |
| Read-only | Fraction, Container Split, Container End, UI Macro, Label, UI Page |
| Visibility | Fraction, Container Split, Container End |

### Policy with Client Scripts

Set `runScripts: true` and provide `executeIfTrue` / `executeIfFalse` scripts via `Now.include(...)`. These scripts run client-side in the browser where modules are not available, so `Now.include()` is the correct approach. Scripts must be wrapped in `function onCondition() {}`.

---

## Catalog Client Script API Reference

### Properties

| Property | Type | Description |
|---|---|---|
| `$id` | Now.ID[string] | **Required.** Unique identifier. |
| `name` | string | **Required.** Name of the script. |
| `script` | string | Inline script or `Now.include()` reference. These are client-side scripts — modules are not available. |
| `type` | `'onLoad'` \| `'onChange'` \| `'onSubmit'` | Script trigger type. |
| `uiType` | `'desktop'` \| `'mobileOrServicePortal'` \| `'all'` | Default: `'desktop'`. |
| `active` | boolean | Whether the script is enabled. Default: `true`. |
| `catalogItem` | ref | **Required** if not using variableSet. |
| `variableSet` | ref | **Required** if not using catalogItem. |
| `appliesTo` | `'item'` \| `'set'` | Required if using variableSet. Default: `'item'`. |
| `variableName` | ref | **Required** for onChange. The variable that triggers the script. |
| `appliesOnCatalogItemView` | boolean | Applies on catalog item view. Default: `true`. |
| `appliesOnRequestedItems` | boolean | Applies on requested items. Default: `false`. |
| `appliesOnCatalogTasks` | boolean | Applies on catalog tasks. Default: `false`. |
| `appliesOnTargetRecord` | boolean | Applies on target record. Default: `false`. |

### Script Types

**onLoad** -- Runs when the form loads. Use for initial setup (field states, defaults, visibility).

**onChange** -- Runs when a specific variable changes. Always guard with `if (isLoading) return;` to prevent execution during form load.

**onSubmit** -- Runs on form submission. Return `false` to block submission. Avoid GlideAjax here -- async calls will not complete before the form submits.

### g_form API Reference

| Method | Description |
|---|---|
| `getValue(fieldName)` | Get variable value |
| `setValue(fieldName, value)` | Set variable value |
| `setDisplay(fieldName, display)` | Show/hide variable |
| `setMandatory(fieldName, mandatory)` | Set mandatory state |
| `setReadOnly(fieldName, readOnly)` | Set read-only state |
| `clearValue(fieldName)` | Clear variable value |
| `hasField(fieldName)` | Check if field exists |
| `showFieldMsg(fieldName, message, type, scrollForm)` | Show field message |
| `hideFieldMsg(fieldName, clearAll)` | Hide field message |
| `addErrorMessage(message)` | Add banner error message |
| `clearOptions(fieldName)` | Clear all select options |
| `addOption(fieldName, value, label)` | Add a select option |
| `getReference(fieldName, callback)` | Get referenced record (legacy) |

Note on `getReference`: Legacy convenience method. Works for simple lookups but `GlideAjax` is preferred for complex server-side logic. May make synchronous calls in some versions, which can freeze the UI.

### Catalog Client Script vs Standard Client Script

| Aspect | Catalog Client Script | Standard Client Script |
|---|---|---|
| Scope | Catalog item or variable set | Table (e.g., Incident) |
| onChange target | Links to a **variable** | Links to a **field** |
| Context | Catalog ordering, RITM, Catalog Task forms | Table forms |
| Variable access | Direct by variable name | Use `variables.variable_name` prefix |
| Applies to | `item` or `set` | Specific table |

### Scripts on Variable Sets

Scope scripts to a variable set using `variableSet` and `appliesTo: 'set'` so they apply to **all** catalog items using that set. Always use `hasField()` checks since the variable may not exist on every item that includes the set.

When multiple variable sets are attached to a catalog item, scripts execute in the order the variable sets are listed on the item. If both a variable set script and an item-level script target the same variable, the item-level script runs last and takes precedence.

### GlideAjax

Use `GlideAjax` to call server-side Script Includes from client scripts. The client sends a request, the Script Include processes it, and returns a result via a callback.

**Method comparison:**

| Method | Execution | Use When | Avoid When |
|---|---|---|---|
| `getXMLAnswer()` | **Async** | Simple lookups, returning a single value/string | You need the full XML response object |
| `getXML()` | **Async** | Need full XML response, complex response parsing | Simple value returns (use getXMLAnswer) |
| `getXMLWait()` | **Sync** | Almost never -- legacy/global scope only | Scoped apps, any production code |

**Parameter rules:** All custom parameters must start with `sysparm_`. The first `addParam` call must always be `sysparm_name` with the method name.

```javascript
ga.addParam("sysparm_name", "methodName"); // REQUIRED: always first
ga.addParam("sysparm_user_id", userSysId); // Custom param: prefix with sysparm_
```

### Script Include (Server-Side Companion)

Every `GlideAjax` call requires a corresponding **Script Include** on the server. The Script Include must extend `AbstractAjaxProcessor` and be marked **Client Callable**.

| Property | Value |
|---|---|
| Name | Must match the string in `new GlideAjax('ClassName')` |
| Client callable | **Checked** (required for GlideAjax access) |
| Extends | `global.AbstractAjaxProcessor` |
| Retrieve params | Use `this.getParameter('sysparm_param_name')` |
| Return data | Use `return` (simple string) or `return JSON.stringify(obj)` for objects |

**Security:** Client callable Script Includes run in the logged-in user's session context. ACLs still apply to GlideRecord queries. Always validate parameters from `this.getParameter()`. Never trust client-side input.

---

## Examples

### Variable Examples

**Text variables:**

```typescript
SingleLineTextVariable({ question: "Employee Name", order: 100, mandatory: true, exampleText: "John Smith" });
MultiLineTextVariable({ question: "Description", order: 200, mandatory: true, width: 100 });
EmailVariable({ question: "Email Address", order: 300, mandatory: true });
MaskedVariable({ question: "Enter Password", order: 400, useEncryption: true });
```

**Choice variables:**

```typescript
SelectBoxVariable({
  question: "Priority Level",
  order: 100,
  choices: {
    high: { label: "High", sequence: 1 },
    medium: { label: "Medium", sequence: 2 },
    low: { label: "Low", sequence: 3 }
  },
  includeNone: true
});

MultipleChoiceVariable({
  question: "Services Required",
  choiceDirection: "down",
  choices: {
    install: { label: "Installation", sequence: 1 },
    config: { label: "Configuration", sequence: 2 },
    training: { label: "Training", sequence: 3 }
  },
  order: 200
});

CheckboxVariable({ question: "I agree to the terms", order: 400, selectionRequired: true });
```

**Reference variables:**

```typescript
ReferenceVariable({
  question: "Point of Contact",
  referenceTable: "sys_user",
  referenceQualCondition: "active=true",
  order: 100
});

ListCollectorVariable({
  question: "Team Members",
  listTable: "sys_user",
  referenceQual: "active=true",
  order: 300,
  mandatory: true
});
```

**Container layout (multi-column):**

```typescript
variables: {
  contact_container_start: ContainerStartVariable({
    question: "Contact Information",
    layout: "2across",
    displayTitle: true,
    order: 100
  }),
  first_name: SingleLineTextVariable({
    question: "First Name",
    mandatory: true,
    order: 110
  }),
  contact_split: ContainerSplitVariable({ order: 200 }),
  email: EmailVariable({
    question: "Email Address",
    mandatory: true,
    order: 210
  }),
  contact_container_end: ContainerEndVariable({ order: 300 })
}
```

**Variables with pricing:**

```typescript
premiumSupport: CheckboxVariable({
  question: "Premium Support (+$150)",
  pricingDetails: [
    { amount: 150, currencyType: "USD", field: "price_if_checked" },
    { amount: 30, currencyType: "USD", field: "rec_price_if_checked" }
  ],
  order: 500
});

hardwareType: SelectBoxVariable({
  question: "Hardware Type",
  choices: {
    laptop: {
      label: "Business Laptop (Base)",
      sequence: 1,
      pricingDetails: [{ amount: 0, currencyType: "USD", field: "misc" }]
    },
    workstation: {
      label: "Developer Workstation (+$800)",
      sequence: 2,
      pricingDetails: [{ amount: 800, currencyType: "USD", field: "misc" }]
    }
  },
  mandatory: true,
  order: 600
});
```

### Single-Row Variable Set

```typescript
import { VariableSet, EmailVariable, SingleLineTextVariable, ReferenceVariable } from "@servicenow/sdk/core";

export const contactInfoSet = VariableSet({
  $id: Now.ID["contact_info_set"],
  title: "Contact Information",
  description: "Standard contact information fields",
  type: "singleRow",
  layout: "2across",
  order: 100,
  displayTitle: true,
  variables: {
    email: EmailVariable({ question: "Email Address", mandatory: true, order: 100 }),
    phone: SingleLineTextVariable({ question: "Phone Number", mandatory: true, order: 200 }),
    department: ReferenceVariable({
      question: "Department",
      referenceTable: "cmn_department",
      referenceQualCondition: "active=true",
      order: 300
    })
  }
});
```

### Multi-Row Variable Set (MRVS)

```typescript
export const teamMembersSet = VariableSet({
  $id: Now.ID["team_members_set"],
  title: "Team Members",
  description: "Add multiple team members who need access",
  type: "multiRow",
  layout: "2across",
  displayTitle: true,
  setAttributes: "max_rows=10,collapsible=true",

  readRoles: ["admin", "manager"],
  writeRoles: ["admin"],

  variables: {
    user: ReferenceVariable({
      question: "User",
      referenceTable: "sys_user",
      referenceQualCondition: "active=true",
      mandatory: true,
      order: 100
    }),
    accessLevel: SelectBoxVariable({
      question: "Access Level",
      choices: {
        read: { label: "Read Only", sequence: 1 },
        write: { label: "Write", sequence: 2 },
        admin: { label: "Admin", sequence: 3 }
      },
      mandatory: true,
      order: 200
    }),
    startDate: DateVariable({ question: "Access Start Date", mandatory: true, order: 300 })
  }
});
```

### Attaching Variable Sets to a Catalog Item

```typescript
export const accessRequest = CatalogItem({
  $id: Now.ID["access_request"],
  name: "Team Access Request",
  shortDescription: "Request access for team members",
  catalogs: [serviceCatalog],
  categories: [itServicesCategory],

  variableSets: [
    { variableSet: contactInfoSet, order: 100 },
    { variableSet: teamMembersSet, order: 200 }
  ],

  variables: {
    notes: MultiLineTextVariable({ question: "Additional Notes", order: 100 })
  },

  flow: "523da512c611228900811a37c97c2014"
});
```

### Catalog UI Policy -- Show/Hide Based on Condition

```typescript
import { CatalogUiPolicy } from "@servicenow/sdk/core";
import { hardwareRequestItem } from "./catalog-items/HardwareRequest.now";

export const managerApprovalPolicy = CatalogUiPolicy({
  $id: Now.ID["manager_approval_policy"],
  shortDescription: "Show manager approval when high priority selected",
  catalogItem: hardwareRequestItem,
  catalogCondition: `${hardwareRequestItem.variables.priority}=high^EQ`,
  actions: [
    {
      variableName: hardwareRequestItem.variables.manager_approval,
      visible: true,
      mandatory: true
    }
  ]
});
```

### Catalog UI Policy -- Read-Only with Value

```typescript
export const readOnlyPolicy = CatalogUiPolicy({
  $id: Now.ID["readonly_license_policy"],
  shortDescription: "Make license type read-only for standard software",
  catalogItem: softwareRequestItem,
  catalogCondition: `${softwareRequestItem.variables.software_type}=standard^EQ`,
  actions: [
    {
      variableName: softwareRequestItem.variables.license_type,
      readOnly: true,
      value: "standard_license",
      valueAction: "setValue"
    }
  ]
});
```

### Catalog UI Policy -- With Client Scripts

```typescript
CatalogUiPolicy({
  $id: Now.ID["vm_prod_controls_policy"],
  shortDescription: "VM: Prod/BizCritical Controls",
  catalogItem: cloudVmRequest,
  catalogCondition: `${cloudVmRequest.variables.environment}=prod^OR${cloudVmRequest.variables.business_critical}=true^EQ`,
  active: true,
  onLoad: true,
  reverseIfFalse: true,
  runScripts: true,
  runScriptsInUiType: "all",

  actions: [
    {
      variableName: cloudVmRequest.variables.backup_required,
      value: "true",
      valueAction: "setValue",
      readOnly: true,
      order: 100
    },
    {
      variableName: cloudVmRequest.variables.cost_center,
      mandatory: true,
      order: 200
    }
  ],

  executeIfTrue: Now.include("../../scripts/vm-production-controls.js"),
  executeIfFalse: Now.include("../../scripts/vm-development-controls.js")
});
```

**vm-production-controls.js:**

```javascript
function onCondition() {
  var PROD_REGIONS = [
    ["AP-South-1", "AP-South-1 (Mumbai)"],
    ["EU-West-1", "EU-West-1 (Ireland)"]
  ];

  g_form.clearOptions("region");
  PROD_REGIONS.forEach(function (pair) {
    g_form.addOption("region", pair[0], pair[1]);
  });

  g_form.showFieldMsg(
    "environment",
    "Production VMs enforce backup and require cost center.",
    "info"
  );
}
```

### Catalog UI Policy -- Applied to Variable Set

```typescript
export const internationalShippingPolicy = CatalogUiPolicy({
  $id: Now.ID["international_shipping_policy"],
  shortDescription: "Show customs fields for international shipping",
  variableSet: shippingVariableSet,
  appliesTo: "set",
  catalogCondition: `${shippingVariableSet.variables.shipping_country}!=US^EQ`,
  appliesOnCatalogItemView: true,
  appliesOnRequestedItems: true,
  actions: [
    {
      variableName: shippingVariableSet.variables.customs_declaration,
      visible: true,
      mandatory: true,
      variableMessage: "Required for international shipping",
      variableMessageType: "warning"
    }
  ]
});
```

### Catalog Client Script -- onLoad

```typescript
import { CatalogClientScript } from "@servicenow/sdk/core";
import { laptopRequest } from "../catalog-items/laptop-request.now";

CatalogClientScript({
  $id: Now.ID["laptop_onload"],
  name: "Laptop Request - OnLoad",
  script: Now.include("../../client/laptop-onload.js"),
  type: "onLoad",
  catalogItem: laptopRequest,
  active: true,
  appliesOnCatalogItemView: true
});
```

**laptop-onload.js:**

```javascript
function onLoad() {
  g_form.setReadOnly("estimated_cost", true);
  g_form.setValue("estimated_cost", "$0");
  g_form.setMandatory("justification", true);
}
```

### Catalog Client Script -- onChange

```typescript
CatalogClientScript({
  $id: Now.ID["laptop_type_change"],
  name: "Laptop Type - onChange",
  script: Now.include("../../client/laptop-type-change.js"),
  type: "onChange",
  catalogItem: laptopRequest,
  variableName: laptopRequest.variables.laptopType,
  active: true
});
```

**laptop-type-change.js:**

```javascript
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return; // Always guard against initial load

  if (newValue === "developer") {
    g_form.setDisplay("accessories", true);
  } else {
    g_form.setDisplay("accessories", false);
    g_form.clearValue("accessories");
  }
}
```

### Catalog Client Script -- onSubmit Validation

```typescript
CatalogClientScript({
  $id: Now.ID["laptop_validation"],
  name: "Laptop Request - Validation",
  script: Now.include("../../client/laptop-validation.js"),
  type: "onSubmit",
  catalogItem: laptopRequest,
  active: true
});
```

**laptop-validation.js:**

```javascript
function onSubmit() {
  var justification = (g_form.getValue("justification") || "").trim();

  if (justification.length < 20) {
    g_form.showFieldMsg("justification", "Please provide at least 20 characters.", "error", true);
    g_form.addErrorMessage("Justification is too short.");
    return false;
  }

  return true;
}
```

### Catalog Client Script -- onChange with GlideAjax

```typescript
CatalogClientScript({
  $id: Now.ID["asset_tag_lookup"],
  name: "Asset Tag - Warranty Lookup",
  script: Now.include("../../client/asset-tag-lookup.js"),
  type: "onChange",
  catalogItem: equipmentRepairItem,
  variableName: equipmentRepairItem.variables.asset_tag,
  active: true
});
```

**asset-tag-lookup.js:**

```javascript
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return;

  if (!newValue) {
    g_form.clearValue("warranty_status");
    return;
  }

  var ga = new GlideAjax("global.AssetLookupUtil");
  ga.addParam("sysparm_name", "getWarrantyStatus");
  ga.addParam("sysparm_asset_tag", newValue);
  ga.getXMLAnswer(function (response) {
    if (!response) return;
    var info = JSON.parse(response);
    g_form.setValue("warranty_status", info.status);
  });
}
```

### Catalog Client Script -- Scoped to Variable Set

```typescript
import { requesterInfoSet } from "./variable-sets/requester-info-set.now";

CatalogClientScript({
  $id: Now.ID["department_change_script"],
  name: "Department Change - Clear Manager",
  type: "onChange",
  variableSet: requesterInfoSet,
  appliesTo: "set",
  variableName: requesterInfoSet.variables.department,
  script: Now.include("../../client/department-change.js"),
  active: true,
  uiType: "all"
});
```

**department-change.js:**

```javascript
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return;
  g_form.clearValue("manager");
  if (!newValue) return;
  g_form.showFieldMsg("manager", "Please select a manager from the new department", "info", false);
}
```

### GlideAjax -- Dynamic Options Based on Selection

**Client script (onChange on 'department' variable):**

```javascript
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return;

  g_form.clearOptions("category");
  g_form.addOption("category", "", "-- Select --");

  if (!newValue) return;

  var ga = new GlideAjax("CatalogOptionLoader");
  ga.addParam("sysparm_name", "getCategoriesByDept");
  ga.addParam("sysparm_department", newValue);

  ga.getXMLAnswer(function (answer) {
    if (!answer) return;
    var categories = JSON.parse(answer);
    categories.forEach(function (cat) {
      g_form.addOption("category", cat.value, cat.label);
    });
  });
}
```

**Script Include (CatalogOptionLoader, Client callable = true):**

```javascript
var CatalogOptionLoader = Class.create();
CatalogOptionLoader.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  getCategoriesByDept: function () {
    var deptId = this.getParameter("sysparm_department");
    var categories = [];

    var gr = new GlideRecord("sc_category");
    gr.addQuery("department", deptId);
    gr.addQuery("active", true);
    gr.orderBy("title");
    gr.query();

    while (gr.next()) {
      categories.push({ value: gr.getUniqueValue(), label: gr.getValue("title") });
    }
    return JSON.stringify(categories);
  },

  type: "CatalogOptionLoader"
});
```

### GlideAjax -- Server-Side Validation (getXML)

**Client script (onChange on 'asset_tag' variable):**

```javascript
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return;
  g_form.hideFieldMsg("asset_tag", true);

  if (!newValue) {
    g_form.clearValue("configuration_item");
    return;
  }

  var ga = new GlideAjax("AssetValidator");
  ga.addParam("sysparm_name", "validateAssetTag");
  ga.addParam("sysparm_asset_tag", newValue);

  ga.getXML(function (response) {
    var answer = response.responseXML.documentElement.getAttribute("answer");
    if (!answer) {
      g_form.showFieldMsg("asset_tag", "Unable to validate. Try again.", "error");
      return;
    }

    var result = JSON.parse(answer);
    if (result.found) {
      g_form.setValue("configuration_item", result.ci_sys_id);
      g_form.showFieldMsg("asset_tag", "Found: " + result.ci_name, "info");
    } else {
      g_form.clearValue("configuration_item");
      g_form.showFieldMsg("asset_tag", "Asset tag not found in CMDB.", "error");
    }
  });
}
```

**Script Include (AssetValidator, Client callable = true):**

```javascript
var AssetValidator = Class.create();
AssetValidator.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  validateAssetTag: function () {
    var assetTag = this.getParameter("sysparm_asset_tag");

    if (!assetTag) {
      return JSON.stringify({ found: false, error: "No asset tag provided" });
    }

    var gr = new GlideRecord("cmdb_ci");
    gr.addQuery("asset_tag", assetTag);
    gr.setLimit(1);
    gr.query();

    if (gr.next()) {
      return JSON.stringify({
        found: true,
        ci_sys_id: gr.getUniqueValue(),
        ci_name: gr.getDisplayValue("name"),
        ci_class: gr.getDisplayValue("sys_class_name")
      });
    }
    return JSON.stringify({ found: false });
  },

  type: "AssetValidator"
});
```

### Script Include -- Multi-Method Pattern

```javascript
var CatalogUtils = Class.create();
CatalogUtils.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  getItemPrice: function () {
    var itemId = this.getParameter("sysparm_item_id");
    var gr = new GlideRecord("sc_cat_item");
    if (gr.get(itemId)) {
      return gr.getValue("price");
    }
    return "0";
  },

  getManagerName: function () {
    var userId = this.getParameter("sysparm_user_id");
    var gr = new GlideRecord("sys_user");
    if (gr.get(userId)) {
      return JSON.stringify({
        manager_sys_id: gr.getValue("manager"),
        manager_name: gr.getDisplayValue("manager"),
        department: gr.getDisplayValue("department")
      });
    }
    return JSON.stringify({ error: "User not found" });
  },

  type: "CatalogUtils"
});
```

### Script Include -- Input Validation

```javascript
getUserInfo: function() {
    var userId = this.getParameter('sysparm_user_id');

    // Validate: check it looks like a sys_id
    if (!userId || userId.length !== 32) {
        return JSON.stringify({ error: 'Invalid user ID' });
    }

    var gr = new GlideRecord('sys_user');
    if (gr.get(userId)) {
        return JSON.stringify({ name: gr.getDisplayValue('name') });
    }
    return JSON.stringify({ error: 'User not found' });
}
```

