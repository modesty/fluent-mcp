
# Implementing Tests Guide

Create ServiceNow Automated Test Framework (ATF) test cases using Fluent APIs across 11 ATF categories: server, form, REST, catalog, email, app navigator, reporting, responsive dashboard, and Service Portal variants (form_SP, catalog_SP). This guide covers test strategy, category selection, step configuration, and the full API surface for each ATF namespace.

## When to Use

- Generating automated test cases for a ServiceNow application
- Testing forms, APIs, catalog items, dashboards, or server-side logic
- Building end-to-end workflow tests combining multiple ATF categories
- Validating email notifications, report visibility, or navigation menus

## Instructions

### Strategic Approach

1. **Analyze the application context** -- examine custom tables, forms, APIs, catalog items, dashboards, and business logic.
2. **Develop a test strategy** -- propose up to 3 representative test cases reflecting critical workflows before expanding coverage.
3. **Select ATF categories** -- map each test interaction to the appropriate `atf.*` namespace (see table below).
4. **Implement test steps** using the category-specific Fluent ATF APIs.

### Category Selection

| Interaction type | ATF namespace | Use for |
|-----------------|---------------|---------|
| UI navigation | `atf.applicationNavigator` | Verify menus/modules visible, navigate to modules |
| Form interactions | `atf.form` | Open/submit forms, set/validate fields, click UI actions |
| Forms in Service Portal | `atf.form_SP` | Same as form but in Service Portal context |
| REST API validation | `atf.rest` | Send HTTP requests, assert status codes/headers/payload |
| Server-side logic | `atf.server` | Impersonation, CRUD operations, record validation, logging |
| Service Catalog | `atf.catalog` | Open/order catalog items, set/validate variables |
| Catalog in Service Portal | `atf.catalog_SP` | Same as catalog but in portal -- plus order guides and multi-row variable sets |
| Email testing | `atf.email` | Validate outbound emails, generate inbound emails |
| Reporting | `atf.reporting` | Assert report visibility |
| Dashboards | `atf.responsiveDashboard` | Assert dashboard visibility and sharing |

### Test File Structure

Every ATF test file must:

```typescript
import { Test } from "@servicenow/sdk/core";
import "@servicenow/sdk/global";

Test({
  $id: Now.ID['test_id'],
  name: 'test name',
  description: 'optional description',
  failOnServerError: true
}, (atf) => {
  // Steps execute sequentially
  atf.<category>.<method>({
    $id: Now.ID['step_id'],
    ...params
  });
});
```

- `$id` must be globally unique for both the test and each step.
- Steps execute sequentially -- capture earlier step outputs in variables to pass to later steps.

### Category Selection Guidance

- Prefer UI-based categories (`atf.form`, `atf.catalog`) over `atf.server` for interactions that users normally perform through the UI.
- Use `atf.server` only when backend assertions, data setup, or server-only operations are needed.
- When the user mentions Service Portal, use the `_SP` variants (`atf.form_SP`, `atf.catalog_SP`).
- Combine categories within a single test for end-to-end workflows.

## Key Concepts

- **Test data setup**: Use `atf.server.impersonate` and `atf.server.createUser` to establish user context. Use `atf.server.recordInsert` to create prerequisite data.
- **Assertion chaining**: After `atf.form.submitForm`, follow with `atf.server.recordValidation` to verify the record was created correctly server-side.
- **Form UI flavors**: `standard_ui`, `service_operations_workspace`, `asset_workspace`, `cmdb_workspace`.
- **Navigator styles**: `ui15`, `ui16`, `polaris`.
- **Catalog variable format**: `IO:<sys_id>=<value>` joined with `^` and ending with `^EQ`.
- **Encoded queries**: Field value conditions use ServiceNow encoded query syntax (e.g., `short_description=Test^priority=1`).

## API Reference: atf.server

### Methods

| Method | Description | Key Output |
|--------|-------------|------------|
| `impersonate` | Impersonate a user for the test | `{ user }` |
| `createUser` | Create a user with roles and groups | `{ user }` |
| `log` | Log a message to test results | void |
| `recordQuery` | Query records with encoded query | `{ table, first_record }` |
| `recordInsert` | Insert a record | `{ table, record_id }` |
| `recordValidation` | Validate record meets conditions | void |
| `recordUpdate` | Update a record's fields | void |
| `recordDelete` | Delete a record | void |
| `searchForCatalogItem` | Search catalog items | `{ catalog_item_id }` |
| `checkoutShoppingCart` | Checkout cart | `{ request_id }` |
| `replayRequestItem` | Replay a previous request item | `{ table, req_item }` |

### impersonate

| Name | Type | Mandatory | Description |
|------|------|-----------|-------------|
| `user` | `string \| Record<'sys_user'>` | Yes | User to impersonate |

### createUser

| Name | Type | Mandatory | Description |
|------|------|-----------|-------------|
| `firstName` | `string` | Yes | First name |
| `lastName` | `string` | Yes | Last name |
| `fieldValues` | `Partial<Data<'sys_user'>>` | Yes | Additional user fields (JSON) |
| `groups` | `Array<string>` | Yes | Group sys_ids |
| `roles` | `Array<string>` | Yes | Role sys_ids |
| `impersonate` | `boolean` | Yes | Whether to impersonate after creation |

### recordInsert / recordUpdate

| Name | Type | Mandatory | Description |
|------|------|-----------|-------------|
| `table` | `TableName` | Yes | Target table |
| `fieldValues` | `Partial<Data<T>>` | Yes | Field-value map (snake_case keys) |
| `assert` | `string` | No | `'record_successfully_inserted'` / `'record_not_inserted'` / `'record_successfully_updated'` / `'record_not_updated'` |
| `enforceSecurity` | `boolean` | No | Default: `true` |
| `recordId` | `string` | Yes (update only) | sys_id of record to update |

### recordValidation

| Name | Type | Mandatory | Description |
|------|------|-----------|-------------|
| `table` | `TableName` | Yes | Table to validate against |
| `recordId` | `string` | Yes | sys_id of record |
| `fieldValues` | `string` | Yes | Encoded query condition |
| `assert` | `string` | No | `'record_validated'` / `'record_not_found'` |

## API Reference: atf.form

### Methods

`openNewForm`, `openExistingRecord`, `submitForm`, `setFieldValue`, `fieldValueValidation`, `fieldStateValidation`, `uiActionVisibility`, `clickUIAction`, `clickModalButton`, `declarativeActionVisibility`, `clickDeclarativeAction`

### Key Properties

**openNewForm**: `table` (required), `view`, `formUI` (default: `"standard_ui"`)

**setFieldValue**: `table` (required), `fieldValues` (required, JSON object), `formUI`

**submitForm**: `assert` (`""`, `"form_submitted_to_server"`, `"form_submission_canceled_in_browser"`), `formUI`. Returns `{ table, record_id }`.

**fieldValueValidation**: `table`, `conditions` (encoded query), `formUI`

**fieldStateValidation**: `table`, `visible[]`, `notVisible[]`, `readOnly[]`, `notReadOnly[]`, `mandatory[]`, `notMandatory[]`, `formUI`

**clickUIAction**: `table`, `uiAction` (sys_id), `assert`, `actionType` (`"ui_action"` or `"declarative_action"`), `formUI`

## API Reference: atf.rest

### Methods

`sendRestRequest`, `assertStatusCodeName`, `assertStatusCode`, `assertResponseTime`, `assertResponseHeader`, `assertResponsePayload`, `assertResponseJSONPayloadIsValid`, `assertJsonResponsePayloadElement`, `assertResponseXMLPayloadIsWellFormed`, `assertXMLResponsePayloadElement`

### sendRestRequest

| Name | Type | Mandatory | Description |
|------|------|-----------|-------------|
| `path` | `string` | Yes | API path (e.g., `/api/now/table/incident`) |
| `body` | `string` | Yes | JSON string request body |
| `auth` | `string` | Yes | `'basic'`, `'mutual'`, or `''` |
| `method` | `string` | No | `'get'`, `'post'`, `'put'`, `'delete'`, `'patch'` |
| `queryParameters` | `object` | No | Key-value query params |
| `headers` | `object` | No | Key-value request headers |

### Assert Methods

- `assertStatusCode`: `statusCode` (number), `operation` (`'equals'`, `'not_equals'`, `'less_than'`, etc.)
- `assertResponsePayload`: `responseBody` (string), `operation` (`'contains'`, `'equals'`, etc.)
- `assertJsonResponsePayloadElement`: `elementName` (JSON path), `elementValue`, `operation`

## API Reference: atf.catalog

### Methods

`openCatalogItem`, `addItemToShoppingCart`, `setCatalogItemQuantity`, `orderCatalogItem`, `validatePriceAndRecurringPrice`, `validateVariableValue`, `variableStateValidation`, `setVariableValue`, `openRecordProducer`, `submitRecordProducer`

### Key Properties

**openCatalogItem**: `catalogItem` (sys_id, required)

**setVariableValue**: `catalogItem` (sys_id), `variableValues` (format: `IO:<sys_id>=<value>^IO:<sys_id>=<value>^EQ`)

**orderCatalogItem**: `assert` (`'form_submitted_to_server'` or `'form_submission_cancelled_in_browser'`). Returns `{ request_id, cart }`.

**Important sequencing**: `openCatalogItem` must precede `orderCatalogItem`. `openRecordProducer` must precede `submitRecordProducer`.

## API Reference: atf.email

### Methods

| Method | Description |
|--------|-------------|
| `validateOutboundEmail` | Filter sys_email table for sent emails |
| `validateOutboundEmailGeneratedByNotification` | Filter by notification source |
| `validateOutboundEmailGeneratedByFlow` | Filter by flow source |
| `generateInboundEmail` | Generate a new inbound email |
| `generateInboundReplyEmail` | Generate an inbound reply |
| `generateRandomString` | Generate test data string |

### generateInboundEmail

`from`, `to`, `subject`, `body` (all required strings). Returns `{ output_email_record }`.

## API Reference: atf.applicationNavigator

### Methods

- `moduleVisibility`: Check if modules are visible in navigation. `navigator` (`'ui15'`, `'ui16'`, `'polaris'`), `visibleModules[]`, `notVisibleModules[]`.
- `navigateToModule`: Navigate to a module. `module` (sys_id).
- `applicationMenuVisibility`: Check if app menus are visible. `visible[]`, `notVisible[]`.

## API Reference: atf.reporting

### reportVisibility

`report` (sys_id of `sys_report`), `assert` (`'can_view_report'` or `'cannot_view_report'`).

## API Reference: atf.responsiveDashboard

### responsiveDashboardVisibility

`dashboard` (sys_id of `pa_dashboards`), `assert` (`'dashboard_is_visible'` or `'dashboard_is_not_visible'`).

### responsiveDashboardSharing

`dashboard` (sys_id), `assert` (`'can_share_dashboard'` or `'cannot_share_dashboard'`).

## Service Portal Variants

### atf.form_SP

Same methods as `atf.form` with additional `portal` and `page` properties plus `openServicePortalPage` method. Uses `form_SP` namespace.

### atf.catalog_SP

Same methods as `atf.catalog` with additional `portal` and `page` properties, plus: `openOrderGuide`, `navigatewithinOrderGuide`, `validateOrderGuideItem`, `reviewOrderGuideSummary`, `saveCurrentRowOfMultiRowVariableSet`, `addRowToMultiRowVariableSet`.

## Avoidance

1. Do not overuse `atf.server` for tasks that form or catalog APIs handle directly.
2. Do not hardcode `sys_id` values -- always look them up.
3. Do not skip mandatory fields when using `setFieldValue` or `recordInsert`.
4. Do not call sequence-dependent steps out of order.
5. Do not create generic or template-based tests -- each test should reflect real usage scenarios.

## Example: End-to-End Form Test

```javascript
import "@servicenow/sdk/global";
import { Test } from "@servicenow/sdk/core";

Test({
  $id: Now.ID["validate_incident_form"],
  name: "Create and Validate Incident",
  description: "Opens a new incident form, sets fields, submits, and validates",
  failOnServerError: true
}, (atf) => {
  atf.form.openNewForm({
    $id: Now.ID["open_new_incident"],
    table: "incident",
    formUI: "standard_ui"
  });

  atf.form.setFieldValue({
    $id: Now.ID["set_fields"],
    table: "incident",
    fieldValues: {
      short_description: "Email server is down"
    },
    formUI: "standard_ui"
  });

  const result = atf.form.submitForm({
    $id: Now.ID["submit_form"],
    assert: "form_submitted_to_server",
    formUI: "standard_ui"
  });

  atf.server.recordValidation({
    $id: Now.ID["validate_record"],
    table: "incident",
    recordId: result.record_id,
    fieldValues: "short_description=Email server is down",
    assert: "record_validated"
  });
});
```

## Example: REST API Test

```javascript
import "@servicenow/sdk/global";
import { Test } from "@servicenow/sdk/core";

Test({
  $id: Now.ID["scaffold_api_test"],
  name: "Scaffold API Test",
  failOnServerError: true
}, (atf) => {
  atf.rest.sendRestRequest({
    $id: Now.ID["send_request"],
    path: "/api/now/fluent/scaffold",
    body: "",
    auth: "basic",
    method: "get",
    queryParameters: { new: "true" },
    headers: {}
  });

  atf.rest.assertStatusCode({
    $id: Now.ID["assert_status"],
    operation: "equals",
    statusCode: 200
  });

  atf.rest.assertResponseJSONPayloadIsValid({
    $id: Now.ID["assert_json_valid"]
  });

  atf.rest.assertJsonResponsePayloadElement({
    $id: Now.ID["assert_result"],
    elementName: "result",
    operation: "equals",
    elementValue: "success"
  });
});
```

