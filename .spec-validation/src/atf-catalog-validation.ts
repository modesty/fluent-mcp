// Step to validate price and recurring price of a Catalog Item after a call to atf.catalog.openCatalogItem. Can not be used with Record Producers
atf.catalog.validatePriceAndRecurringPrice({
    $id: Now.ID[''], // string | guid, mandatory
    price: '', // number | string
    recurringPrice: '', // number | string
    frequency: '', // '' | 'weekly' | 'quarterly' | 'weekly2' | 'semiannual' | 'monthly' | 'yearly' | 'daily' | 'monthly2';
});

// Validates variable values on the Catalog Item, Record Producer pages or a page containing a variable editor. can be used only in-between atf.catalog.openCatalogItem step and atf.catalog.orderCatalogItem step
atf.catalog.validateVariableValue({
    $id: Now.ID[''], // string | guid, mandatory
    catalogItem: get_sys_id('sc_cat_item', ''), // sys_id | Record&lt;'sc_cat_item'&gt;
    catalogConditions: "IO:get_sys_id('item_option_new', '')=value" // string of variable sys_ids and the value to validate. If multiple, each has 'IO:' before and joined with ^, example: "IO:get_sys_id('item_option_new', '')=true^IO:get_sys_id('item_option_new', '')LIKEnone"
});

// Validates states of the desired variables.
atf.catalog.variableStateValidation({ // each of the following props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    catalogItem: get_sys_id('sc_cat_item', ''), // sys_id | Record&lt;'sc_cat_item'&gt;
    visible: [get_sys_id('item_option_new', '')], // array of sys_id | Record&lt;'item_option_new'&gt;
    notVisible: [get_sys_id('item_option_new', '')], // array of sys_id | Record&lt;'item_option_new'&gt;
    readOnly: [get_sys_id('item_option_new', '')], // array of sys_id | Record&lt;'item_option_new'&gt;
    notReadOnly: [get_sys_id('item_option_new', '')], // array of sys_id | Record&lt;'item_option_new'&gt;
    mandatory: [get_sys_id('item_option_new', '')], // array of sys_id | Record&lt;'item_option_new'&gt;
    notMandatory: [get_sys_id('item_option_new', '')], // array of sys_id | Record&lt;'item_option_new'&gt;
});