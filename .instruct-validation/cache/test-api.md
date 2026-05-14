# Function: Test(input, configurationFunction)

Creates an Automated Test Framework test (`sys_atf_test`).

## Parameters

### input

`TestSetup`

**Properties:**

- **$id** (required): `ExplicitKey | string | number`
  Unique identifier for the record

- **name** (required): `string`
  Test name

- **active** (optional): `boolean`
  Whether the test is active

- **description** (optional): `string`
  Test description

- **failOnServerError** (optional): `boolean`
  Whether the test should fail on server error


### configurationFunction

`(atf: ATFTestRun) => unknown`

arrow function that receives the ATF step builder and defines
  test steps by calling methods on its categories, e.g.:
  * `atf.server.log({ log: 'message' })`
  * `atf.form.openForm({ table: 'incident', ... })`
  * `atf.rest.send({ ... })`

**Function Parameters:**

- **atf**: `ATFTestRun`
  - **applicationNavigator** (required)
    Application Navigator
    - **applicationMenuVisibility**
      Verifies visibility of application menus in the left navigation bar
    - **moduleVisibility**
      Verifies visibility of modules in the left navigation bar.
    - **navigateToModule**
      Navigates to a module, as if a user had clicked on it. In order to navigate to a module, it must be visible in the application navigator to the currently executing user.
  - **catalog** (required)
    - **addItemToShoppingCart**
      Add item to Shopping Cart
    - **openCatalogItem**
      Opens a catalog item.
    - **openRecordProducer**
      Opens a Record Producer.
    - **orderCatalogItem**
      Click Order Now to order a catalog item
    - **setCatalogItemQuantity**
      Sets quantity value on the current catalog item.
    - **setVariableValue**
      Sets variable values on the current Catalog Item or Record Producer page or a form containing variable editor
    - **submitRecordProducer**
      Submit currently opened Record Producer
    - **validatePriceAndRecurringPrice**
      Step to validate price and recurring price of a Catalog Item
    - **validateVariableValue**
      Validates variable values on the Catalog Item, Record Producer pages or a page containing a variable editor.
    - **variableStateValidation**
      Validates states of the desired variables.
  - **catalog_SP** (required)
    Service Catalog in Service Portal
    - **addItemtoShoppingCart**
      Add item to Shopping Cart
    - **addOrderGuidetoShoppingCart**
      Add order Guide to Shopping Cart
    - **addRowToMultiRowVariableSet**
      This is step is used to add a row to multi-row variable set on current catalog item in Service Portal.
    - **navigatewithinOrderGuide**
      Use this step to navigate within an Order Guide
    - **openCatalogItem**
      Opens a catalog item in portal
    - **openOrderGuide**
      Opens an order guide in portal
    - **openRecordProducer**
      Opens a Record Producer in portal.
    - **orderCatalogItem**
      Click Order Now to order a catalog item
    - **reviewIteminOrderGuide**
      Review individual items in the Order Guide and choose to include the item or not
    - **reviewOrderGuideSummary**
      Review Order Guide Summary in Service Portal
    - **saveCurrentRowOfMultiRowVariableSet**
      This is step is used to save current row of a multi-row variable set on current catalog item in Service Portal.
    - **setCatalogItemQuantity**
      Sets quantity value on the currently open catalog item.
    - **setVariableValue**
      Sets variable values on the current Catalog Item or Record Producer page
    - **submitOrderGuide**
      Click Order Now to order an Order Guide
    - **submitRecordProducer**
      Submit currently opened Record Producer
    - **validateOrderGuideItem**
      Validate items included in the Order Guide
    - **validatePriceAndRecurringPrice**
      Step to validate price and recurring price of a Catalog Item in Service Portal.
    - **validateVariableValue**
      Validates variable values on the current Catalog Item or Record Producer
    - **variableStateValidation**
      Validates states of the desired variables.
  - **email** (required)
    Email
    - **generateInboundEmail**
      Generates an Email [sys_email] record that looks like a new inbound email. This step also creates an email.read event upon step completion.
    - **generateInboundReplyEmail**
      Generates an Email [sys_email] record that looks like an email sent in reply to a system notification. This step also creates an email.read event upon step completion.
    - **generateRandomString**
      Generates a string that can be used as test data for another test step. By default, the string is 10 characters long. The maximum length of the string is 10,000 characters.
    - **validateOutboundEmail**
      Filters the Email [sys_email] table to find an email that was sent during testing.
    - **validateOutboundEmailGeneratedByFlow**
      Filters the Email [sys_email] table to find an email that was sent from a flow during testing.
    - **validateOutboundEmailGeneratedByNotification**
      Filters the Email [sys_email] table to find an email that was sent from a notification during testing.
  - **form** (required)
    Form
    - **addAttachmentsToForm**
      Adds attachments to the current form. At least one attachment is required.
    - **clickDeclarativeAction**
      Clicks a declarative action on the current form.
    - **clickModalButton**
      Clicks a button within a modal in the specified Form UI. Optionally sets field values for modals in a workspace UI.
    - **clickUIAction**
      Clicks a UI action on the current form.
    - **declarativeActionVisibility**
      Validates whether a declarative action is visible on the current form.
    - **fieldStateValidation**
      Validates states of the desired fields.
    - **fieldValueValidation**
      Validates field values on the current form.
    - **openExistingRecord**
      Opens an existing record it the selected table and Form UI.
    - **openNewForm**
      Opens a new form for the selected table and Form UI.
    - **setFieldValue**
      Sets field values on the current form.
    - **submitForm**
      Submits the current form.
    - **uiActionVisibility**
      Validates whether a UI Action is visible on the current form.
  - **form_SP** (required)
    Forms in Service Portal
    - **addAttachmentsToForm**
      Adds attachments to the current form in portal. At least one attachment is required.
    - **clickUIAction**
      Clicks a UI Action on the current form.
    - **fieldStateValidation**
      Validates states of fields on a form within a Service Portal page.
    - **fieldValueValidation**
      Validates field values on the current form.
    - **openNewForm**
      Define a Service Portal form and portal to open it in.
    - **openServicePortalPage**
      Opens a Service Portal page
    - **setFieldValue**
      In order to use this step you must have already opened a page using the "Open a Page (SP)" steps.
    - **submitForm**
      Submits the current form on a Service Portal page.
    - **uiActionVisibilityValidation**
      Validates whether a UI Action is visible or not on the current form.
  - **reporting** (required)
    Reporting
    - **reportVisibility**
      Confirm a report can or cannot be viewed by the test user
  - **responsiveDashboard** (required)
    Responsive Dashboards
    - **responsiveDashboardSharing**
      Confirm a dashboard can or cannot be shared by the test user
    - **responsiveDashboardVisibility**
      Confirm a dashboard is or is not visible to the test user
  - **rest** (required)
    REST
    - **assertJsonResponsePayloadElement**
      Assert the JSON response payload element. Specify the JSON SNC path and select the comparison operation to use against the supplied expected element value.
    - **assertResponseHeader**
      Assert an HTTP response header. Select the comparison operation and specify the expected value of the header.
    - **assertResponseJSONPayloadIsValid**
      Assert the JSON response payload is valid.
    - **assertResponsePayload**
      Assert the HTTP response payload is equals to or contains a specified value. Select the comparison operation and specify the expected value of the response payload.
    - **assertResponseTime**
      Assert the HTTP response time is less than or greater than a specified value. Select the comparison operation and specify the expected value of the response time.
    - **assertResponseXMLPayloadIsWellFormed**
      Assert the XML response payload is a well-formed.
    - **assertStatusCode**
      Assert the HTTP response status code. Select the comparison operation and specify the numeric value of the expected status code.
    - **assertStatusCodeName**
      Assert the HTTP response status code name is equals to or contains a specified value. Select the comparison operation and specify the expected value of the status code name.
    - **assertXMLResponsePayloadElement**
      Assert the XML response payload element. Specify the XML XPath and select the comparison operation to use against the supplied expected element value.
    - **sendRestRequest**
      Send a REST request to the current instance. Specify an HTTP method, path, query parameters, request headers and body if needed.
  - **server** (required)
    Server
    - **addAttachmentsToExistingRecord**
      Adds attachments to the specified record. At least one attachment is required.
    - **checkoutShoppingCart**
      Checkout the Shopping Cart and generates a new request.
    - **createUser**
      Create a user with specified roles and groups. Optionally impersonate the user in the current session for the duration of the test or until another user is impersonated.
    - **impersonate**
      Impersonates the specified user in the current session for the duration of the test or until another user is impersonated.
    - **log**
      Logs a message that can contain a variable or other information pertaining to the test. This message will be stored as a step result upon test completion.
    - **recordDelete**
      Deletes a record in a table.
    - **recordInsert**
      Inserts a record into a table. Specify the field values to set on the new record.
    - **recordQuery**
      Perform a database query to verify if a record matching the conditions set in this step are met.
    - **recordUpdate**
      Changes field values on a record on the server.
    - **recordValidation**
      Validates that a record meets the specified conditions on the server-side.
    - **replayRequestItem**
      Replays a previously created request item with the same values and options.
    - **runServerSideScript**
      Runs a script on the server. Typically used to run Jasmine tests.
    - **searchForCatalogItem**
      Perform search for a Catalog Item or Record Producer in the specified Catalog and Category
    - **setOutputVariables**
      Sets the output variables for the current reusable test.


## Common Step Parameters

Below are parameter details for the most frequently used steps. For complete step parameter details, see the TypeScript type definitions in `packages/core/src/app/Test.ts`.

### atf.server.log(inputs)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `log` | `string` | Yes | Message to log. Can contain variables or other test information. Stored as a step result upon test completion. |

### atf.server.recordInsert(inputs)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `table` | `TableName` | Yes | | Target table to insert the record into. |
| `fieldValues` | `Partial<Data<T>>` | Yes | | Field values to set on the new record. |
| `assert` | `'record_successfully_inserted' \| 'record_not_inserted'` | No | `'record_successfully_inserted'` | Expected assertion result. |
| `enforceSecurity` | `boolean` | No | `true` | Whether to enforce ACL security during the insert. |

**Returns:** `{ table: TableName, record_id: string }`

### atf.server.recordUpdate(inputs)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `table` | `TableName` | Yes | | Target table containing the record. |
| `recordId` | `string \| Record<T>` | Yes | | sys_id or Record reference of the record to update. |
| `fieldValues` | `Partial<Data<T>>` | Yes | | Field values to change on the record. |
| `assert` | `'record_successfully_updated' \| 'record_not_updated'` | No | `'record_successfully_updated'` | Expected assertion result. |
| `enforceSecurity` | `boolean` | No | `true` | Whether to enforce ACL security during the update. |

### atf.form.openNewForm(inputs)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `table` | `TableName` | Yes | | Table to open a new form for. |
| `view` | `string` | No | `''` | Form view name. Only accessible views for the current user can be used. |
| `formUI` | `FormUIType` | No | `'standard_ui'` | Form UI type: `'standard_ui'`, a workspace name, or a UX page registry reference. |
| `recordPath` | `string` | No | | Record path for workspace contexts. |

### atf.form.setFieldValue(inputs)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `table` | `TableName` | Yes | | Table of the currently opened form. |
| `fieldValues` | `Partial<Data<T>>` | Yes | | Field name/value pairs to set on the form. |
| `formUI` | `FormUIType` | No | `'standard_ui'` | Form UI type for the current form. |

### atf.form.submitForm(inputs)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `assert` | `'' \| 'form_submitted_to_server' \| 'form_submission_canceled_in_browser'` | No | `''` | Expected assertion result after submission. |
| `formUI` | `FormUIType` | No | `'standard_ui'` | Form UI type for the current form. |

**Returns:** `{ table: TableName, record_id: string }`

### atf.rest.sendRestRequest(inputs)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | `string` | Yes | | REST endpoint path on the current instance. |
| `body` | `string` | No | | Request body content. |
| `auth` | `'' \| 'basic' \| 'mutual'` | No | `'basic'` | Authentication type. |
| `mutualAuth` | `string \| Record<'sys_certificate'>` | No | `''` | Mutual authentication certificate reference. |
| `basicAuthentication` | `string \| Record<'sys_auth_profile_basic'>` | No | `''` | Basic authentication profile reference. |
| `method` | `'get' \| 'post' \| 'put' \| 'delete' \| 'patch'` | No | `'get'` | HTTP method. |
| `queryParameters` | `Record<string, string>` | No | `{}` | Query parameters as key-value pairs. |
| `headers` | `Record<string, string>` | No | `{}` | Request headers as key-value pairs. |


## See

- https://docs.servicenow.com/csh?topicname=atf-test-now-ts.html&version=latest


## Examples

### Basic ATF Test Example

Create an automated test that verifies server-side logic using ATF steps

```typescript
/**
 * @title Basic ATF Test Example
 * @description Create an automated test that verifies server-side logic using ATF steps
 */

import { Test } from '@servicenow/sdk/core'

export const verifyIncidentCreation = Test(
    {
        $id: Now.ID['verify_incident_creation'],
        name: 'Verify Incident Creation',
        description: 'Checks that a new incident record can be created with required fields',
        active: true,
        failOnServerError: true,
    },
    (atf) => {
        atf.server.log({
            $id: Now.ID['log_start'],
            log: 'Starting incident creation test',
        })
    }
)

```

