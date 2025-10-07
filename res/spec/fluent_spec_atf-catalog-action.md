#**Context:** This chunk focuses on catalog item management within ServiceNow using the Automated Test Framework (ATF). It provides APIs for interacting with catalog items, including opening catalog items by their system ID, adding them to the shopping cart, setting their quantity, and ordering or closing them. These steps are designed to facilitate automated testing of catalog-related transactions and workflows in ServiceNow, enhancing the efficiency and accuracy of test scenarios involving catalog items.
```typescript
// open a catalog item by sys_id
atf.catalog.openCatalogItem({
    $id: Now.ID[''], // string | guid, mandatory
    catalogItem: get_sys_id('sc_cat_item', '') // sys_id | Record&lt;'sc_cat_item'&gt;
}): void;

// Add item to Shopping Cart after a call to atf.catalog.openCatalogItem
atf.catalog.addItemToShoppingCart({
    $id: Now.ID[''], // string | guid, mandatory
    assert: '' // '' | 'form_submission_cancelled_in_browser' | 'form_submitted_to_server';
}): {
    cartItemId: '' // sys_id of the item added to the cart
};

// Sets quantity value on the current catalog item after a call to atf.catalog.openCatalogItem
atf.catalog.setCatalogItemQuantity({
    $id: Now.ID[''], // string | guid, mandatory
    quantity: '' // number | string
}): void;

// Order and close the currently opened catalog item after a call to atf.catalog.openCatalogItem, no other API calls are allowed after this
atf.catalog.orderCatalogItem({
    $id: Now.ID[''], // string | guid, mandatory
    assert: '', // 'form_submitted_to_server' | 'form_submission_cancelled_in_browser'
}): {
    requestId: '', // sys_id
    cart: ''
};

```