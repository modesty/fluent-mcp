# Function: CatalogItem(config)

Creates a Service Catalog Item (`sc_cat_item`) — a requestable item in the ServiceNow Service Catalog.

## Parameters

### config

`CatalogItem<V> & object`

Catalog item configuration — name, description, variables, fulfillment process, and visibility settings.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  Name to appear in the catalog. Required.

- **accessType** (optional, default: 'restricted'): `'restricted' | 'delegated'`
  Option to specify if a request can be submitted for a user who does not have access to the catalog item

- **active** (optional, default: true): `boolean`
  Check box to make the item active (available to be ordered)

- **assignedTopics** (optional): `(string | Record<'topic'>)[]`
  The assigned topics for the catalog item

- **availability** (optional, default: 'desktopOnly'): `'both' | 'desktopOnly' | 'mobileOnly'`
  The availability of the catalog item

- **availableFor** (optional): `(string | Record<'user_criteria'>)[]`
  The users/groups this item is available for

- **billable** (optional, default: false): `boolean`
  The billable status of the catalog item

- **catalogs** (optional): `(string | Record<'sc_catalog'>)[]`
  The catalogs the catalog item belongs to

- **categories** (optional): `(string | Record<'sc_category'>)[]`
  Category for the item. Categories can only be selected after the Catalogs field is populated.

- **checkedOut** (optional): `boolean`
  The checked out for the catalog item

- **cost** (optional, default: 0): `number`
  The cost of the catalog item

- **customCart** (optional): `string | Record<'sys_ui_macro'>`
  The custom cart for the catalog item

- **deliveryPlanScript** (optional): `string`
  The delivery plan script for the catalog item

- **deliveryTime** (optional): `Duration`
  The delivery time for the catalog item

- **description** (optional): `string`
  The detailed description of the catalog item

- **displayPriceProperty** (optional): `string`
  The display price property for the catalog item

- **entitlementScript** (optional): `string`
  The entitlement script for the catalog item

- **executionPlan** (optional): `string | Record<'sc_cat_item_delivery_plan'>`
  The execution plan for the catalog item. Mutually exclusive with flow and workflow.

- **flow** (optional): `string | Record<'sys_hub_flow'> | Flow()`
  Flow that defines how the item request is fulfilled. Accepts a sys_id string, a Record reference, or a Flow() return value. Mutually exclusive with executionPlan and workflow.

- **fulfillmentAutomationLevel** (optional, default: 'unspecified'): `'unspecified' | 'manual' | 'semiAutomated' | 'fullyAutomated'`
  The fulfillment automation level for the catalog item

- **fulfillmentGroup** (optional): `string | Record<'sys_user_group'>`
  The fulfillment group for the catalog item

- **hideAddToCart** (optional, default: false): `boolean`
  Whether add to cart is hidden for the catalog item

- **hideAddToWishList** (optional, default: false): `boolean`
  Whether wishlist is hidden for the catalog item

- **hideAttachment** (optional): `boolean`
  Whether attachments are hidden - cannot be true when mandatoryAttachment is true

- **hideDeliveryTime** (optional, default: false): `boolean`
  Whether delivery time is hidden for the catalog item

- **hideQuantitySelector** (optional, default: false): `boolean`
  Whether quantity selector is hidden for the catalog item

- **hideSaveAsDraft** (optional, default: false): `boolean`
  Whether save as draft is hidden for the catalog item

- **hideSP** (optional, default: false): `boolean`
  Whether to hide item from Service Portal

- **icon** (optional): `string`
  The icon for the catalog item

- **ignorePrice** (optional, default: true): `boolean`
  Whether to ignore the price

- **image** (optional): `string`
  The image for the catalog item

- **location** (optional): `string | Record<'cmn_location'>`

- **makeItemNonConversational** (optional, default: false): `boolean`
  Whether to make the item non conversational

- **mandatoryAttachment** (optional): `boolean`
  Whether mandatory attachments are required for the catalog item

- **meta** (optional): `string[]`
  Search tags for the catalog item

- **mobileHidePrice** (optional, default: false): `boolean`
  Whether to hide the price on mobile

- **mobilePicture** (optional): `string`
  The mobile picture for the catalog item

- **mobilePictureType** (optional, default: 'desktopPicture'): `'desktopPicture' | 'mobilePicture' | 'noPicture'`
  Whether to use the mobile picture type

- **model** (optional): `string | Record<'cmdb_model'>`
  The model of the catalog item

- **noCart** (optional, default: false): `boolean`
  Whether to hide the cart (legacy)

- **noOrder** (optional, default: false): `boolean`
  Whether to hide the order (legacy)

- **noOrderNow** (optional, default: false): `boolean`
  Whether to hide the order now (legacy)

- **noProceedCheckout** (optional, default: false): `boolean`
  Whether to hide the proceed checkout (legacy)

- **noQuantity** (optional, default: false): `boolean`
  Whether to hide the quantity (legacy)

- **noSearch** (optional, default: false): `boolean`
  Whether to hide the search (legacy)

- **notAvailableFor** (optional): `(string | Record<'user_criteria'>)[]`
  The users/groups this item is not available for

- **omitPrice** (optional, default: false): `boolean`
  Whether to omit the price

- **order** (optional, default: 0): `number`
  The order of the catalog item

- **owner** (optional): `string | Record<'sys_user'>`
  The owner for the catalog item

- **picture** (optional): `string`
  The picture for the catalog item

- **pricingDetails** (optional): `PricingDetail[]`
  The pricing details for the catalog item

- **recurringFrequency** (optional): `Frequency`
  The recurring frequency for the catalog item

- **requestMethod** (optional, default: 'order'): `'order' | 'request' | 'submit'`
  Setting that controls the label displayed for the Order Now button and the order submission experience

- **roles** (optional): `(string | Role)[]`
  Roles for a catalog item

- **shortDescription** (optional): `string`
  A short description of the catalog item

- **showVariableHelpOnLoad** (optional, default: false): `boolean`
  Whether to show variable help on load

- **startClosed** (optional, default: false): `boolean`
  Whether to start closed

- **state** (optional): `State`
  The state for the catalog item

- **useScLayout** (optional, default: true): `boolean`
  Whether to use the service catalog layout

- **variables** (optional): `Record<string, AnyVariable>`
  The variables for the catalog item

- **variableSets** (optional): `{ variableSet: string | VariableSet; order: number }[]`
  The variable sets the catalog item belongs to

- **vendor** (optional): `string | Record<'core_company'>`

- **version** (optional, default: 1): `number`
  The version of the catalog item

- **view** (optional): `string | Record<'sys_ui_view'>`
  The view for the catalog item

- **visibleBundle** (optional, default: true): `boolean`
  Whether the bundle is visible

- **visibleGuide** (optional, default: true): `boolean`
  Whether the guide is visible

- **visibleStandalone** (optional, default: true): `boolean`
  Whether the standalone is visible

- **workflow** (optional): `string | Record<'wf_workflow'>`
  Workflow that defines how the item request is fulfilled. Mutually exclusive with executionPlan and flow.


## See

- https://docs.servicenow.com/csh?topicname=service-catalog-api-now-ts.html&version=latest


## Examples

### Basic CatalogItem

Create a catalog item with checkbox variables and pricing

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/catalog-item-variables/create/checkbox.now.ts
/**
 * @title Basic CatalogItem
 * @description Create a catalog item with checkbox variables and pricing
 */

import { CatalogItem, CheckboxVariable } from '@servicenow/sdk/core'

export const BasicCatalogItem = CatalogItem({
    $id: Now.ID['checkbox_pricing_item'],
    name: 'Checkbox Pricing Test',
    shortDescription: 'Test checkbox with pricing',
    description: 'Catalog item with checkbox variables and pricing details',
    flow: '30f3d26187e92300e0ef0cf888cb0b91',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'],
    variables: {
        premiumSupport: CheckboxVariable({
            question: 'Premium Support',
            order: 1,
            selectionRequired: true,
            pricingDetails: [
                {
                    amount: 100,
                    currencyType: 'USD',
                    field: 'price_if_checked',
                },
            ],
        }),
        rushDelivery: CheckboxVariable({
            question: 'Rush Delivery',
            order: 2,
            selectionRequired: false,
        }),
    },
})

```

### CatalogItem with Reference Variables

Create a catalog item with reference and requested-for variables

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/catalog-item-variables/create/reference.now.ts
/**
 * @title CatalogItem with Reference Variables
 * @description Create a catalog item with reference and requested-for variables
 */

import { CatalogItem, ReferenceVariable, RequestedForVariable } from '@servicenow/sdk/core'

export const ReferenceCatalogItem = CatalogItem({
    $id: Now.ID['reference_test_item'],
    name: 'Reference Test',
    shortDescription: 'Test reference variables',
    description: 'Catalog item with reference variables',
    flow: '30f3d26187e92300e0ef0cf888cb0b91',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'],
    variables: {
        simpleRef: ReferenceVariable({
            question: 'Simple Reference',
            order: 1,
            referenceTable: 'sys_user',
            referenceQualCondition: 'active=true',
        }),
        dynamicRef: ReferenceVariable({
            question: 'Dynamic Reference',
            order: 2,
            referenceTable: 'sys_user',
            useReferenceQualifier: 'dynamic',
            dynamicRefQual: 'c5056264d711210032d7a3b20e610375',
        }),
        advancedRef: ReferenceVariable({
            question: 'Advanced Reference',
            order: 3,
            referenceTable: 'sys_user',
            useReferenceQualifier: 'advanced',
            referenceQual: 'active=true',
        }),
        requestedFor: RequestedForVariable({
            question: 'Requested For',
            order: 4,
            referenceQualCondition: 'active=true',
            enableAlsoRequestFor: true,
            rolesToUseAlsoRequestFor: ['admin', 'itil'],
        }),
    },
})

```

### CatalogItem with Multiple Variable Types

Create a catalog item showcasing various variable types

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/catalog-item-variables/create/basic.now.ts
/**
 * @title CatalogItem with Multiple Variable Types
 * @description Create a catalog item showcasing various variable types
 */

import {
    CatalogItem,
    CheckboxVariable,
    DateVariable,
    DateTimeVariable,
    EmailVariable,
    MultiLineTextVariable,
    SelectBoxVariable,
    SingleLineTextVariable,
    UrlVariable,
    YesNoVariable,
} from '@servicenow/sdk/core'

export const MultiVariableCatalogItem = CatalogItem({
    $id: Now.ID['software_install_item'],
    name: 'Software Installation',
    shortDescription: 'Request software installation',
    description: 'Use this form to request installation of software on your company device.',
    meta: ['software', 'installation', 'IT'],
    flow: '30f3d26187e92300e0ef0cf888cb0b91',
    variables: {
        checkbox: CheckboxVariable({
            question: 'Agree to Terms',
            order: 1,
            pricingDetails: [
                {
                    amount: 100,
                    currencyType: 'USD',
                    field: 'price_if_checked',
                },
            ],
        }),
        date: DateVariable({
            question: 'Preferred Install Date',
            order: 2,
        }),
        dateTime: DateTimeVariable({
            question: 'Scheduled Date/Time',
            order: 3,
        }),
        email: EmailVariable({
            question: 'Contact Email',
            order: 4,
        }),
        multilineText: MultiLineTextVariable({
            question: 'Additional Notes',
            order: 5,
        }),
        selectBox: SelectBoxVariable({
            question: 'Priority',
            order: 6,
            choices: {
                high: {
                    label: 'High',
                    sequence: 1,
                    inactive: false,
                },
                medium: {
                    label: 'Medium',
                    sequence: 2,
                    inactive: false,
                },
                low: {
                    label: 'Low',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
        singleLineText: SingleLineTextVariable({
            question: 'Software Name',
            order: 7,
        }),
        url: UrlVariable({
            question: 'Software Download URL',
            order: 8,
        }),
        yesNo: YesNoVariable({
            question: 'Is this urgent?',
            includeNone: true,
            order: 9,
        }),
    },
})

```

