#**Context:** The chunk is part of the ServiceNow Automated Test Framework (ATF) API documentation focusing on catalog and shopping cart functionalities such as searching for catalog items or record producers, adding them to a shopping cart, checking out the cart to create requests, and replaying request items. These APIs are used to automate the testing of catalog-related processes within ServiceNow applications.
```typescript
// Perform search for a Catalog Item or Record Producer in the specified Catalog and Category
// Inputs are camelCase; the OUTPUT key is snake_case (`catalog_item_id`), like every ATF step output.
atf.server.searchForCatalogItem({
    $id: Now.ID[''], // string | guid, mandatory
    searchTerm: '', // string, mandatory
    assertItem: get_sys_id('sc_cat_item', ''), // sys_id | Record&lt;'sc_cat_item'&gt;, mandatory
    catalog: get_sys_id('sc_catalog', ''), // sys_id | Record&lt;'sc_catalog'&gt;, optional (SDK v4.13.0+; was mandatory) — omit to search every catalog
    category: get_sys_id('sc_category', ''), // sys_id | Record&lt;'sc_category'&gt;, optional (SDK v4.13.0+; was mandatory) — omit to search every category
    searchInPortal: false, // boolean, optional, default: false
    assert: 'assert_item_present', // 'assert_item_present' | 'assert_item_not_present', optional, default: 'assert_item_present'
}): { catalog_item_id: string; };

// Checkout the Shopping Cart and generates a new request.
atf.server.checkoutShoppingCart({
    $id: Now.ID[''], // string | guid, mandatory
    requestedFor: get_sys_id('sys_user', ''), // sys_id | Record&lt;'sys_user'&gt;, mandatory
    deliveryAddress: '123 main st', // string, mandatory
    specialInstructions: 'none', // string, mandatory
    assert: 'checkout_successfull', // 'empty_cart' | 'checkout_successfull', optional, default: 'checkout_successfull'
}): { request_id: string; }; // the sys_id of the new `sc_request` (NOT a request item)

// Replays a previously created request item with the same values and options.
// NOTE: this step's input is snake_case `request_item` (an exception to the camelCase-input rule) and it takes
// an `sc_req_item` sys_id — do not pass checkoutShoppingCart's `request_id`, which identifies an `sc_request`.
atf.server.replayRequestItem({
    $id: Now.ID[''], // string | guid, mandatory
    request_item: get_sys_id('sc_req_item', ''), // sys_id | Record&lt;'sc_req_item'&gt;, mandatory
}): {
    table: string;
    reqItem: any;
};
```
