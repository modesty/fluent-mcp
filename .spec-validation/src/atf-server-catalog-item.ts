// Perform search for a Catalog Item or Record Producer in the specified Catalog and Category
atf.server.searchForCatalogItem({ // all props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    searchInPortal: true, // boolean;
    searchTerm: '', // string
    catalog: get_sys_id('sc_catalog', ''), // sys_id | Record&lt;'sc_catalog'&gt;;
    category: get_sys_id('sc_category', ''), // sys_id | Record&lt;'sc_category'&gt;;
    assertItem: get_sys_id('sc_cat_item', ''), // sys_id | Record&lt;'sc_cat_item'&gt;;
    assert: '', // 'assert_item_present' | 'assert_item_not_present';
});

// Checkout the Shopping Cart and generates a new request.
atf.server.checkoutShoppingCart({ // all props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    assert: '', // 'empty_cart' | 'checkout_successfull'
    requestedFor: get_sys_id('sys_user', ''), // sys_id | Record&lt;'sys_user'&gt;
    deliveryAddress: '123 main st', // string
    specialInstructions: 'none', // string
});

// Replays a previously created request item with the same values and options.
atf.server.replayRequestItem({ 
    $id: Now.ID[''], // string | guid, mandatory
    requestItem: get_sys_id('sc_req_item', ''), // sys_id | Record&lt;'sc_req_item'&gt;;
});