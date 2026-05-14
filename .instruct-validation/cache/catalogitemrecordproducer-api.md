# Function: CatalogItemRecordProducer(config)

Creates a Record Producer (`sc_cat_item_producer`) — a catalog item that creates a record in a
specified table when submitted. Extends CatalogItem with record creation and script capabilities.

## Parameters

### config

`CatalogItemRecordProducer<V> & object`

Record Producer configuration — target table, variables, fulfillment scripts, and catalog settings.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  Name to appear in the catalog. Required.

- **table** (required): `TableName | Table`
  Target table name where the record will be created (Required)

- **active** (optional, default: true): `boolean`
  Check box to make the item active (available to be ordered)

- **allowEdit** (optional, default: false): `boolean`
  Whether to allow editing of the generated record after creation

- **assignedTopics** (optional): `(string | Record<'topic'>)[]`
  The assigned topics for the catalog item

- **availability** (optional, default: 'desktopOnly'): `'both' | 'desktopOnly' | 'mobileOnly'`
  The availability of the catalog item

- **availableFor** (optional): `(string | Record<'user_criteria'>)[]`
  The users/groups this item is available for

- **canCancel** (optional, default: false): `boolean`
  Whether the user can cancel the record producer submission

- **catalogs** (optional): `(string | Record<'sc_catalog'>)[]`
  The catalogs the catalog item belongs to

- **categories** (optional): `(string | Record<'sc_category'>)[]`
  Category for the item. Categories can only be selected after the Catalogs field is populated.

- **checkedOut** (optional): `boolean`
  The checked out for the catalog item

- **description** (optional): `string`
  The detailed description of the catalog item

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

- **image** (optional): `string`
  The image for the catalog item

- **makeItemNonConversational** (optional, default: false): `boolean`
  Whether to make the item non conversational

- **mandatoryAttachment** (optional): `boolean`
  Whether mandatory attachments are required for the catalog item

- **meta** (optional): `string[]`
  Search tags for the catalog item

- **mobilePicture** (optional): `string`
  The mobile picture for the catalog item

- **mobilePictureType** (optional, default: 'desktopPicture'): `'desktopPicture' | 'mobilePicture' | 'noPicture'`
  Whether to use the mobile picture type

- **model** (optional): `string | Record<'cmdb_model'>`
  The model of the catalog item

- **notAvailableFor** (optional): `(string | Record<'user_criteria'>)[]`
  The users/groups this item is not available for

- **order** (optional, default: 0): `number`
  The order of the catalog item

- **owner** (optional): `string | Record<'sys_user'>`
  The owner for the catalog item

- **picture** (optional): `string`
  The picture for the catalog item

- **postInsertScript** (optional): `string | (producer: RecordProducerContext, current: GlideRecord, cat_item: RecordProducerDefinition) => void`
  Script executed AFTER the record is generated.
  Safe to use current.update() here.
  Use `producer.var_name` to access variables.
  Use `cat_item` to access the Record Producer definition.

- **redirectUrl** (optional, default: 'generatedRecord'
Options: 'generatedRecord', 'catalogHomePage'): `'generatedRecord' | 'catalogHomePage'`
  Where to redirect after record creation

- **roles** (optional): `(string | Role)[]`
  Roles for a catalog item

- **saveOptions** (optional): `string`
  Options for saving the record producer (advanced configuration)

- **saveScript** (optional): `string | (producer: RecordProducerContext, current: GlideRecord, cat_item: RecordProducerDefinition) => void`
  Script executed at every step save in Catalog Builder.
  Executed BEFORE the main script.
  Use `current` to access the GlideRecord.

- **script** (optional): `string | (producer: RecordProducerContext, current: GlideRecord) => void`
  Server-side script executed BEFORE the record is generated.
  Use `producer.var_name` to access variables.
  Use `current` to access the GlideRecord being produced.
  Do NOT use current.update() or current.insert().

- **shortDescription** (optional): `string`
  A short description of the catalog item

- **showVariableHelpOnLoad** (optional, default: false): `boolean`
  Whether to show variable help on load

- **startClosed** (optional, default: false): `boolean`
  Whether to start closed

- **state** (optional): `State`
  The state for the catalog item

- **variables** (optional): `Record<string, AnyVariable>`
  The variables for the catalog item

- **variableSets** (optional): `{ variableSet: string | VariableSet; order: number }[]`
  The variable sets the catalog item belongs to

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


## See

- https://docs.servicenow.com/csh?topicname=c_CreatingARecordProducer.html&version=latest


## Examples

### Basic Record Producer

Create a record producer with checkbox variables and pricing

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/record-producer-variables/create/checkbox.now.ts
/**
 * @title Basic Record Producer
 * @description Create a record producer with checkbox variables and pricing
 */

import { CatalogItemRecordProducer, CheckboxVariable } from '@servicenow/sdk/core'

export const BasicRecordProducer = CatalogItemRecordProducer({
    $id: Now.ID['checkbox_pricing_rp'],
    name: 'Checkbox Pricing Test',
    table: 'task',
    shortDescription: 'Test checkbox with pricing',
    description: 'Record producer with checkbox variables and pricing details',
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

### Record Producer with SelectBox Variables

Create a record producer with selectbox variables using table-based and custom choices

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/record-producer-variables/create/selectbox.now.ts
/**
 * @title Record Producer with SelectBox Variables
 * @description Create a record producer with selectbox variables using table-based and custom choices
 */

import { CatalogItemRecordProducer, SelectBoxVariable } from '@servicenow/sdk/core'

export const SelectBoxRecordProducer = CatalogItemRecordProducer({
    $id: Now.ID['selectbox_test_rp'],
    name: 'SelectBox Test',
    table: 'task',
    shortDescription: 'Test selectbox with choices and pricing',
    description: 'Record producer with selectbox variables',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'],
    variables: {
        // SelectBox sourced from an existing table/field
        priorityFromTable: SelectBoxVariable({
            question: 'Priority (From Table)',
            order: 1,
            choiceTable: 'task',
            choiceField: 'priority',
        }),
        // SelectBox with custom choices and pricing details
        supportLevel: SelectBoxVariable({
            question: 'Support Level',
            order: 2,
            choices: {
                basic: {
                    label: 'Basic Support',
                    sequence: 1,
                    inactive: false,
                    pricingDetails: [
                        {
                            field: 'misc',
                            amount: 50,
                            currencyType: 'USD',
                        },
                    ],
                },
                standard: {
                    label: 'Standard Support',
                    sequence: 2,
                    inactive: false,
                    pricingDetails: [
                        {
                            field: 'misc',
                            amount: 100,
                            currencyType: 'USD',
                        },
                        {
                            field: 'rec_misc',
                            amount: 25,
                            currencyType: 'USD',
                        },
                    ],
                },
                premium: {
                    label: 'Premium Support',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
        // SelectBox with simple choices (no pricing)
        deliveryMethod: SelectBoxVariable({
            question: 'Delivery Method',
            order: 3,
            choices: {
                email: {
                    label: 'Email',
                    sequence: 1,
                    inactive: false,
                },
                download: {
                    label: 'Download',
                    sequence: 2,
                    inactive: false,
                },
                physical: {
                    label: 'Physical Media',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
    },
})

```

### Record Producer with Multiple Variable Types

Create a record producer showcasing various variable types

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/record-producer-variables/create/basic.now.ts
/**
 * @title Record Producer with Multiple Variable Types
 * @description Create a record producer showcasing various variable types
 */

import {
    CatalogItemRecordProducer,
    CheckboxVariable,
    DateVariable,
    DateTimeVariable,
    EmailVariable,
    ListCollectorVariable,
    MaskedVariable,
    MultiLineTextVariable,
    ReferenceVariable,
    SelectBoxVariable,
    SingleLineTextVariable,
    UrlVariable,
    YesNoVariable,
} from '@servicenow/sdk/core'

export const MultiVariableRecordProducer = CatalogItemRecordProducer({
    $id: Now.ID['software_install_rp'],
    name: 'Software Installation',
    table: 'task',
    shortDescription: 'Request software installation',
    description: 'Use this form to request installation of software on your company device.',
    meta: ['software', 'installation', 'IT'],
    variables: {
        checkbox: CheckboxVariable({
            question: 'Agree to Terms',
            order: 1,
        }),
        date: DateVariable({
            question: 'Preferred Date',
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
        listCollector: ListCollectorVariable({
            question: 'Notify Users',
            order: 5,
            listTable: 'sys_user',
            referenceQual: 'active=true',
        }),
        masked: MaskedVariable({
            question: 'License Key',
            order: 6,
            useConfirmation: false,
            useEncryption: true,
        }),
        multilineText: MultiLineTextVariable({
            question: 'Additional Notes',
            order: 7,
        }),
        reference: ReferenceVariable({
            question: 'Assigned To',
            order: 8,
            referenceTable: 'sys_user',
            referenceQualCondition: 'active=true^EQ',
        }),
        selectBox: SelectBoxVariable({
            question: 'Priority',
            order: 9,
            choiceTable: 'task',
            choiceField: 'state',
        }),
        singleLineText: SingleLineTextVariable({
            question: 'Software Name',
            order: 10,
        }),
        url: UrlVariable({
            question: 'Download URL',
            order: 11,
        }),
        yesNo: YesNoVariable({
            question: 'Is this urgent?',
            includeNone: true,
            order: 12,
        }),
    },
})

```

