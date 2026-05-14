# Service Catalog

Guide for building ServiceNow Service Catalog components using the Fluent API -- catalog items and record producers. For variables, variable sets, UI policies, and client scripts, see [service-catalog-variables-guide.md](service-catalog-variables-guide.md). Requires SDK 4.3.0 or higher.

## When to Use

- Creating **catalog items** for ordering goods or services
- Creating **record producers** for direct task record creation (incidents, changes, problems)
- Defining **catalog variables** (form fields) for user input
- Creating **variable sets** for reusable variable groups
- Implementing **catalog UI policies** for show/hide, mandatory, read-only, and simple value setting
- Adding **catalog client scripts** for complex validation, dynamic calculations, API/async calls (GlideAjax), or form submission control (onSubmit)

## Instructions

1. **Catalog, Category & Taxonomy:** Items must be assigned to at least one catalog and category, and optionally a taxonomy topic. Use queries to find existing sys_ids.
2. **Variable Naming:** Use `snake_case` for variable names. Use `order` increments of 100.
3. **Record Producer Tables:** Only use for task-based tables (incident, change_request, problem). Never for sc_req_item, sc_request, sc_task.
4. **Field Mapping:** Use `mapToField: true` for simple mappings, scripts for complex logic.
5. **UI Policy vs Client Script:** Use UI policies for simple show/hide/mandatory. Use client scripts for validation, calculations, async calls.
6. **onChange Guard:** Always start onChange scripts with `if (isLoading) return;`.
7. **onSubmit:** Avoid GlideAjax in onSubmit (async issues). Return `false` to block submission.
8. **Variable References:** Use object references in properties (e.g., `catalogItem.variables.urgency`), strings inside script code (e.g., `g_form.getValue('urgency')`).
9. **Variable Sets:** Use for reusable variable groups. UI policies and client scripts can be scoped to a variable set with `appliesTo: 'set'`.
10. **DOM Manipulation:** Never manipulate DOM directly -- always use `g_form` API.
11. **Variable Name Conflicts:** Do not use the same variable name as a target table field name.
12. **Record Producer Scripts:** Never call `current.update()` or `current.insert()` in pre-insert script.
13. **Circular Dependency (Flow + CatalogItem):** When a flow uses `getCatalogVariables` with a catalog item's variables, the flow file imports the CatalogItem, and the CatalogItem references the flow using `Now.ref()` (NO import) to break the cycle.

## Key Concepts

### Catalog Item vs Record Producer

| Aspect | Catalog Item | Record Producer |
|---|---|---|
| **Creates** | REQ + RITM + Fulfillment Tasks | Record in target table (incident, change_request, etc.) |
| **Fulfillment** | Flow Designer / Workflow / Delivery Plan | Server-side scripts |
| **Use when** | Ordering goods/services with approvals | Creating task records directly |
| **Examples** | "Request Laptop", "Software License" | "Report Incident", "Submit HR Case" |

**Key Rule:** Ordering/requesting something --> Catalog Item. Creating a task record --> Record Producer.

### Taxonomy & Access

**Taxonomy** (`taxonomy_topic`): Hierarchical classification on catalog items. Organizes items from broad categories to specific subcategories, improving searchability and navigation -- particularly in Employee Center, where it maps items to topics and appears above the item name in search results. Assign topics to a catalog item using the `assignedTopics` property.

**Catalog & Category Assignment**: Items must belong to at least one Catalog (`sc_catalog`) and Category (`sc_category`). Categories can be nested into subcategories. Items can appear in multiple catalogs and categories simultaneously.

**Visibility**: Controlled via user criteria on the catalog item: `availableFor` grants access, `notAvailableFor` restricts it. `notAvailableFor` always overrides `availableFor` when both are present.

### UI Policy vs Client Script

| Use Case | UI Policy | Client Script |
|---|---|---|
| Show/hide variables | **Preferred** | Supported |
| Make variables mandatory | **Preferred** | Supported |
| Make variables read-only | **Preferred** | Supported |
| Set variable values | Supported | Supported |
| Complex validation | Limited | **Preferred** |
| Dynamic calculations | Limited | **Preferred** |
| API calls / async | Not supported | Supported |
| Form submission control | Not supported | Supported |

### Common Validation Scenarios

| Validation | Implementation | Script Type |
|---|---|---|
| No past dates | Client Script | onChange |
| Date range (start < end) | Client Script | onChange |
| Min/max numeric values | Client Script | onChange |
| Text min/max length | Client Script | onSubmit |
| Format validation (regex) | Client Script | onChange or onSubmit |
| Required based on another field | UI Policy (preferred) or Client Script | onChange |
| Lookup / async validation | Client Script with GlideAjax | onChange |

### Decision Tree

1. Ordering goods/services --> Catalog Item with variables and Flow Designer
2. Creating task records (incident, change, problem) --> Record Producer with field mapping
3. Reusable form fields across items --> Variable Set (singleRow or multiRow)
4. Simple show/hide/mandatory logic --> Catalog UI Policy
5. Complex validation, calculations, async calls --> Catalog Client Script
6. Grid/table data entry --> Multi-Row Variable Set (MRVS)

## Avoidance

- Never use catalog items for creating task records directly (use Record Producers)
- Never create record producers for `sc_request`, `sc_req_item`, `sc_task`
- Never call `current.update()` or `current.insert()` in pre-insert scripts
- Never call `current.setAbortAction()` in Record Producer scripts
- Never use GlideAjax in onSubmit scripts (async issues)
- Never manipulate DOM directly -- always use `g_form` API
- Never use the same variable name as a target table field name
- Never skip the `order` property on variables
- Never skip catalogs or categories assignment
- Never hard-code sys_ids without documenting their source
- Variables without names cannot be accessed by client scripts
- Mandatory variables without values cannot be hidden by UI policies
- Multi-row variable sets have restrictions on certain variable types (no attachments, containers, HTML, macros)
- Container variables must be properly paired (Start/Split/End)

---

## Catalog Item API Reference

### Properties

| Property | Type | Description |
|---|---|---|
| `$id` | Now.ID[string] | **Required.** Unique identifier. |
| `name` | string | **Required.** Name to appear in the catalog. |
| `shortDescription` | string | Brief summary shown in catalog listings. |
| `description` | string | Detailed description shown on the item page. |
| `catalogs` | string[] | sys_ids of existing catalogs. |
| `categories` | string[] | sys_ids of existing categories. |
| `assignedTopics` | string[] | sys_ids of existing topics. Controls ESC portal visibility. |
| `accessType` | `'restricted'` \| `'unrestricted'` | Controls who can request the item. Default: `'restricted'`. |
| `availableFor` | string[] | sys_ids of user criteria for availability. |
| `notAvailableFor` | string[] | sys_ids of user criteria for restrictions (overrides availableFor). |
| `roles` | string[] | Roles for catalog item access. |
| `active` | boolean | Whether the item is active. Default: `true`. |
| `availability` | `'desktopOnly'` \| `'both'` \| `'mobileOnly'` | Platform availability. Default: `'desktopOnly'`. |
| `requestMethod` | `'order'` \| `'request'` \| `'submit'` | Submission button label. Default: `'order'`. |
| `flow` | string | Flow Designer flow for fulfillment (recommended). |
| `workflow` | string | Legacy workflow for fulfillment. |
| `executionPlan` | string | Delivery plan for fulfillment. |
| `fulfillmentAutomationLevel` | `'unspecified'` \| `'manual'` \| `'semiAutomated'` \| `'fullyAutomated'` | Automation level. |
| `fulfillmentGroup` | string | Group responsible for delivery. |
| `deliveryTime` | Duration | Estimated delivery time `{ days, hours }`. |
| `pricingDetails` | array | Pricing breakdown: `{ amount, currencyType, field }`. |
| `recurringFrequency` | string | Required when pricingDetails contains `'recurring_price'`. |
| `variables` | object | Variable definitions for the form. |
| `variableSets` | array | Variable set references: `{ variableSet, order }`. |

### UI Display Options

| Property | Type | Description |
|---|---|---|
| `hideAddToCart` | boolean | Hides "Add to Cart" button |
| `hideAttachment` | boolean | Hides attachment section |
| `hideDeliveryTime` | boolean | Hides delivery time |
| `hideQuantitySelector` | boolean | Hides quantity selection |
| `hideSaveAsDraft` | boolean | Hides "Save as Draft" |
| `hideSP` | boolean | Hides from Service Portal |
| `hideAddToWishList` | boolean | Hides "Add to Wishlist" |
| `ignorePrice` | boolean | Ignores price display |
| `omitPrice` | boolean | Omits price entirely |
| `mandatoryAttachment` | boolean | Requires attachment |
| `makeItemNonConversational` | boolean | Prevents virtual agent ordering |
| `showVariableHelpOnLoad` | boolean | Shows help text by default |

### Fulfillment Configuration

**Flow Designer** (`flow`) -- Recommended fulfillment method. Use `Now.ref()` to reference a project-defined flow or provide a sys_id string for an existing platform flow:

```typescript
// Reference a project-defined flow (avoids circular dependency)
flow: Now.ref("sys_hub_flow", "my_fulfillment_flow");

// Reference an existing flow by sys_id
flow: "e0d08b13c3330100c8b837659bba8fb4";
```

### Pricing Configuration

Use `pricingDetails` array with `{ amount, currencyType, field }` objects. Supported `field` values: `price`, `recurring_price`. When using `recurring_price`, `recurringFrequency` is required (`monthly`, `yearly`, etc.).

### Circular Dependency Resolution (Flow + CatalogItem)

When a flow needs to use `getCatalogVariables` with the catalog item's variables:

1. **Flow** --> imports CatalogItem (can use `getCatalogVariables` with variables)
2. **CatalogItem** --> uses `Now.ref()` to reference Flow (NO import)

```typescript
// catalog-item.now.ts - Uses Now.ref(), does NOT import flow
export const myCatalogItem = CatalogItem({
  $id: Now.ID["my_catalog_item"],
  flow: Now.ref("sys_hub_flow", "my_flow"), // No import needed
  variables: { ... }
});

// flow.now.ts - Imports catalog item for getCatalogVariables
import { myCatalogItem } from "../catalog-item.now";

export const myFlow = Flow(
  { $id: Now.ID["my_flow"] },
  wfa.trigger(trigger.application.serviceCatalog, ...),
  _params => {
    const vars = wfa.action(action.core.getCatalogVariables, {
      template_catalog_item: `${myCatalogItem}`,
      catalog_variables: [myCatalogItem.variables.field1, ...]
    });
  }
);
```

---

## Record Producer API Reference

### Properties

| Property | Type | Description |
|---|---|---|
| `$id` | Now.ID[string] | **Required.** Unique identifier. |
| `table` | TableName | **Required.** Target table (e.g., `'incident'`, `'change_request'`). |
| `name` | string | **Required.** Name to appear in the catalog. |
| `script` | string | Server-side script before record creation. |
| `postInsertScript` | string | Script after record creation. Safe to call `current.update()`. |
| `saveScript` | string | Script on step save in Catalog Builder. |
| `redirectUrl` | `'generatedRecord'` \| `'catalogHomePage'` | Redirect after creation. Default: `'generatedRecord'`. |
| `allowEdit` | boolean | Allow editing after creation. Default: `false`. |
| `canCancel` | boolean | Allow user to cancel. Default: `false`. |
| `variables` | object | Variable definitions for the form. |
| `variableSets` | array | Variable set references. |

All catalog item properties (catalogs, categories, accessType, etc.) also apply to record producers.

### Field Mapping Methods

| Scenario | Recommended Method |
|---|---|
| Simple text/choice mapping | `mapToField: true` |
| System values (gs.getUserID()) | Script |
| Conditional logic | Script |
| Calculated values | Script |
| Variables in Variable Sets | Script |

### Script Types

| Script | Timing | Can call update()? |
|---|---|---|
| `script` | Before insert | **No** |
| `postInsertScript` | After insert | **Yes** |
| `saveScript` | On step save | No |

### Available Script Objects

| Object | Description |
|---|---|
| `current` | GlideRecord of the record being created |
| `producer.var_name` | Form variable values |
| `cat_item` | Record Producer definition (postInsertScript only) |
| `gs` | GlideSystem |

### Script Rules

- **Never** call `current.update()` or `current.insert()` in pre-insert script
- **Never** call `current.setAbortAction()`
- **Never** set `current.sys_class_name`
- Use `postInsertScript` for post-creation updates, related records, notifications

### Unsupported Tables

Do **not** create record producers for `sc_request`, `sc_req_item`, `sc_task` -- use Catalog Items instead.

---

## Examples

### Basic Catalog Item with Variables

```typescript
import { CatalogItem } from "@servicenow/sdk/core";

const serviceCatalog = "e0d08b13c3330100c8b837659bba8fb4";
const hardwareCategory = "d258b953c611227a0146101fb1be7c31";
const hardwareTopic = "782413a7c3053010069aec4b7d40ddf1";
const itilUsers = "2f137fb2eb303010e0ef83c45e52287c";
const guestUsers = "76f09af6cb1200108ad442fcf7076dbf";

export const laptopRequest = CatalogItem({
  $id: Now.ID["laptop_request"],
  name: "Laptop Request",
  shortDescription: "Request a new laptop for work",
  description: "Submit a request for a new laptop with configuration options.",

  catalogs: [serviceCatalog],
  categories: [hardwareCategory],
  assignedTopics: [hardwareTopic],
  availableFor: [itilUsers],
  notAvailableFor: [guestUsers],

  pricingDetails: [{ amount: 1299, currencyType: "USD", field: "price" }],

  variables: {
    laptopType: SelectBoxVariable({
      question: "Laptop Type",
      choices: {
        standard: { label: "Standard Laptop", sequence: 1 },
        developer: { label: "Developer Workstation", sequence: 2 }
      },
      mandatory: true,
      order: 100
    }),
    justification: MultiLineTextVariable({
      question: "Business Justification",
      mandatory: true,
      order: 200
    })
  },

  flow: "523da512c611228900811a37c97c2014",
  fulfillmentAutomationLevel: "semiAutomated",
  deliveryTime: { days: 7, hours: 0 },
  accessType: "restricted",
  availability: "both",
  requestMethod: "order"
});
```

### Catalog Item with Variable Sets and Recurring Pricing

```typescript
export const softwareLicenseRequest = CatalogItem({
  $id: Now.ID["software_license_request"],
  name: "Software License Request",
  shortDescription: "Request a software license",

  catalogs: [serviceCatalog],
  categories: [softwareCategory],

  variableSets: [
    { variableSet: contactInfoSet, order: 100 },
    { variableSet: approvalInfoSet, order: 200 }
  ],

  variables: {
    software_name: SingleLineTextVariable({
      question: "Software Name",
      mandatory: true,
      order: 100
    }),
    license_type: SelectBoxVariable({
      question: "License Type",
      choices: {
        individual: { label: "Individual", sequence: 1 },
        team: { label: "Team (5 seats)", sequence: 2 },
        enterprise: { label: "Enterprise (unlimited)", sequence: 3 }
      },
      mandatory: true,
      order: 200
    })
  },

  pricingDetails: [
    { amount: 0, currencyType: "USD", field: "price" },
    { amount: 99, currencyType: "USD", field: "recurring_price" }
  ],
  recurringFrequency: "monthly",

  flow: "523da512c611228900811a37c97c2014",
  deliveryTime: { days: 3, hours: 0 }
});
```

### Record Producer with Field Mapping

```typescript
import { CatalogItemRecordProducer } from "@servicenow/sdk/core";
import { rpPreInsert } from "../../modules/record-producers/rp-pre-insert";
import { rpPostInsert } from "../../modules/record-producers/rp-post-insert";

const serviceCatalog = "e0d08b13c3330100c8b837659bba8fb4";
const itServicesCategory = "d258b953c611227a0146101fb1be7c31";

export const incidentProducer = CatalogItemRecordProducer({
  $id: Now.ID["comprehensive_incident_producer"],
  name: "Report Incident with Full Configuration",
  shortDescription: "Complete incident producer with variables and scripts",
  table: "incident",

  catalogs: [serviceCatalog],
  categories: [itServicesCategory],

  variables: {
    short_description: SingleLineTextVariable({
      question: "Brief Summary",
      mandatory: true,
      mapToField: true,
      field: "short_description",
      order: 100
    }),
    urgency: SelectBoxVariable({
      question: "Urgency",
      mandatory: true,
      mapToField: true,
      field: "urgency",
      choices: {
        "1": { label: "High", sequence: 1 },
        "2": { label: "Medium", sequence: 2 },
        "3": { label: "Low", sequence: 3 }
      },
      order: 200
    }),
    assignment_group: ReferenceVariable({
      question: "Assignment Group",
      mapToField: true,
      field: "assignment_group",
      referenceTable: "sys_user_group",
      order: 300
    })
  },

  script: rpPreInsert,
  postInsertScript: rpPostInsert,
  redirectUrl: "generatedRecord",
  view: "ess",
  allowEdit: true
});
```

**modules/record-producers/rp-pre-insert.js:**

```javascript
import { gs } from '@servicenow/glide'

export function rpPreInsert(current, producer) {
  current.impact = 3;
  current.contact_type = "self-service";
  current.caller_id = gs.getUserID();

  if (producer.urgency === "1") {
    current.priority = 1;
    current.assignment_group = "Hardware Team";
  }
  // Do NOT use current.update() or current.insert() here
}
```

**modules/record-producers/rp-post-insert.js:**

```javascript
import { gs, GlideRecord } from '@servicenow/glide'

export function rpPostInsert(current, producer) {
  current.work_notes = "Created via Service Catalog at " + gs.nowDateTime();
  current.update();

  var task = new GlideRecord("sc_task");
  task.initialize();
  task.request = current.sys_id;
  task.short_description = "Follow up on incident: " + current.short_description;
  task.insert();
}
```

