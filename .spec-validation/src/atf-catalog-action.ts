// open a catalog item by sys_id
atf.catalog.openCatalogItem({
    $id: Now.ID[''], // string | guid, mandatory
    catalogItem: get_sys_id('sc_cat_item', '') // sys_id | Record&lt;'sc_cat_item'&gt;
});

// Add item to Shopping Cart after a call to atf.catalog.openCatalogItem
atf.catalog.addItemToShoppingCart({
    $id: Now.ID[''], // string | guid, mandatory
    assert: '' // '' | 'form_submission_cancelled_in_browser' | 'form_submitted_to_server';
});

// Sets quantity value on the current catalog item after a call to atf.catalog.openCatalogItem
atf.catalog.setCatalogItemQuantity({
    $id: Now.ID[''], // string | guid, mandatory
    quantity: '' // number | string
});

// Order and close the currently opened catalog item after a call to atf.catalog.openCatalogItem, no other API calls are allowed after this
atf.catalog.orderCatalogItem({
    $id: Now.ID[''], // string | guid, mandatory
    assert: '', // 'form_submitted_to_server' | 'form_submission_cancelled_in_browser'
});
