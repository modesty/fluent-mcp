# **Context:** CatalogItem API spec: Used to create a Service Catalog Item (`sc_cat_item`) — an orderable item in the ServiceNow Service Catalog. Users submit requests for catalog items, which are then fulfilled via a flow, execution plan, or workflow

```typescript
import { CatalogItem } from '@servicenow/sdk/core'

// Creates a new Service Catalog Item (`sc_cat_item`)
CatalogItem({
    $id: Now.ID['my_catalog_item'], // string | Now.ID key, mandatory — unique identifier

    // ─── Core / required ───
    name: '',               // string, mandatory — display name in the catalog

    // ─── Basic fields ───
    shortDescription: '',   // string, optional — brief one-line description shown in catalog listings
    description: '',        // string, optional — detailed HTML description shown on the request form
    active: true,           // boolean, optional — whether the item is available to order, default: true
    state: 'published',     // 'published' | 'draft' | 'publishing' | 'in_review' | 'reviewed', optional
    order: 0,               // number, optional — display order within category, default: 0
    version: 1,             // number, optional — version number, default: 1
    icon: '',               // string, optional — icon reference
    image: '',              // string, optional — image attachment path
    picture: '',            // string, optional — desktop picture
    mobilePicture: '',      // string, optional — mobile picture
    mobilePictureType: 'desktopPicture', // 'desktopPicture' | 'mobilePicture' | 'noPicture', optional
    meta: [],               // string[], optional — search tags for discovery
    owner: '',              // string | Record<'sys_user'>, optional — item owner
    roles: [],              // (string | Role)[], optional — roles required to view/order
    view: '',               // string | Record<'sys_ui_view'>, optional — view for the request form
    showVariableHelpOnLoad: false, // boolean, optional — show variable help on form load, default: false
    startClosed: false,     // boolean, optional — start variable sets collapsed, default: false

    // ─── Fulfillment — exactly one of: flow, executionPlan, or workflow ───
    flow: '',               // string | Record<'sys_hub_flow'> | FlowInstance, optional — Flow that fulfills the request
    executionPlan: '',      // string | Record<'sc_cat_item_delivery_plan'>, optional — execution plan sys_id
    workflow: '',           // string | Record<'wf_workflow'>, optional — legacy workflow sys_id
    fulfillmentGroup: '',   // string | Record<'sys_user_group'>, optional — default fulfillment group
    fulfillmentAutomationLevel: 'unspecified', // 'unspecified' | 'manual' | 'semiAutomated' | 'fullyAutomated', optional

    // ─── Catalogs, categories, and availability ───
    catalogs: [],           // (string | Record<'sc_catalog'>)[], optional — catalogs to publish in
    categories: [],         // (string | Record<'sc_category'>)[], optional — categories (requires catalogs to be set)
    availableFor: [],       // (string | Record<'user_criteria'>)[], optional — user criteria that can see/order
    notAvailableFor: [],    // (string | Record<'user_criteria'>)[], optional — user criteria excluded from ordering
    assignedTopics: [],     // (string | Record<'topic'>)[], optional — help topics

    // ─── Variables (inline) ───
    variables: {            // Record<string, VariableType>, optional — inline variable definitions
        // key = variable internal name, value = a variable function call
        // See catalog-variable spec for all variable types
    },

    // ─── Variable sets (reusable) ───
    variableSets: [         // optional — attach pre-defined VariableSets
        {
            variableSet: variableSetObject, // string | VariableSet — reference to a VariableSet
            order: 100,                     // number — display order for this set on the form
        }
    ],

    // ─── Portal / UI settings ───
    requestMethod: 'order', // 'order' | 'request' | 'submit', optional — label on the order button, default: 'order'
    hideSaveAsDraft: false, // boolean, optional — hide "Save as Draft" option, default: false
    hideAddToCart: false,   // boolean, optional — default: false
    hideAddToWishList: false, // boolean, optional
    hideDeliveryTime: false,  // boolean, optional
    hideQuantitySelector: false, // boolean, optional
    hideSP: false,          // boolean, optional — hide from Service Portal
    mandatoryAttachment: false, // boolean, optional — require attachment on submit
    hideAttachment: false,  // boolean, optional — cannot be true when mandatoryAttachment is true
    useScLayout: true,      // boolean, optional — use service catalog form layout, default: true
    customCart: '',         // string | Record<'sys_ui_macro'>, optional — custom cart macro
    noCart: false,          // boolean, optional — legacy cart visibility flag
    noOrder: false,         // boolean, optional — legacy order visibility flag
    noOrderNow: false,      // boolean, optional — legacy order-now visibility flag
    noProceedCheckout: false, // boolean, optional — legacy checkout visibility flag
    noQuantity: false,      // boolean, optional — legacy quantity selector visibility flag
    noSearch: false,        // boolean, optional — legacy search visibility flag
    makeItemNonConversational: false, // boolean, optional
    visibleBundle: true,    // boolean, optional — visible in bundles, default: true
    visibleGuide: true,     // boolean, optional — visible in guided tours, default: true
    visibleStandalone: true, // boolean, optional — visible as standalone, default: true
    availability: 'desktopOnly', // 'desktopOnly' | 'both' | 'mobileOnly', optional, default: 'desktopOnly'

    // ─── Pricing ───
    cost: 0,                // number, optional — cost of the item, default: 0
    billable: false,        // boolean, optional — whether the item is billable, default: false
    ignorePrice: true,      // boolean, optional — default: true
    omitPrice: false,       // boolean, optional
    displayPriceProperty: '', // string, optional — display price property override
    mobileHidePrice: false, // boolean, optional — hide price on mobile
    recurringFrequency: 'monthly', // 'daily' | 'weekly' | 'weekly2' | 'monthly' | 'monthly2' | 'quarterly' | 'semiannual' | 'yearly', optional
    pricingDetails: [],     // PricingDetail[], optional — { amount: number, currencyType: string, field: string }[]

    // ─── Delivery ───
    deliveryTime: Duration({ days: 1 }), // Duration, optional — expected fulfillment time
    deliveryPlanScript: '',  // string, optional — script for determining delivery plan
    entitlementScript: '',   // string, optional — script for entitlement check

    // ─── Access / delegation ───
    accessType: 'restricted', // 'restricted' | 'delegated', optional, default: 'restricted'
    location: '',            // string | Record<'cmn_location'>, optional
    vendor: '',              // string | Record<'core_company'>, optional
    model: '',               // string | Record<'cmdb_model'>, optional
    checkedOut: false,       // boolean, optional
}): CatalogItem // returns a CatalogItem object (with merged variables from variableSets)
```
