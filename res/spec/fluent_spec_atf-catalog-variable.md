#**Context:** This chunk focuses on APIs in the Automated Test Framework (ATF) for interacting with Catalog Items and Record Producers within ServiceNow. These APIs facilitate setting variable values on Catalog Items or Record Producer pages, opening Record Producers, and submitting them as part of automated tests. They are intended for use when automating ServiceNow's catalog-related functionalities.
```typescript
// Sets variable values on the current Catalog Item or Record Producer page or a form containing variable editor
atf.catalog.setVariableValue({
    $id: Now.ID[''], // string | guid, mandatory
    catalogItem: get_sys_id('sc_cat_item', ''), // sys_id | Record&lt;'sc_cat_item'&gt;
    variableValues: "IO:get_sys_id('item_option_new', '')=value" // string of variable sys_ids and the value to set them to. If multiple, each has 'IO:' before and joined with ^, example: "IO:get_sys_id('item_option_new', '')=true^IO:get_sys_id('item_option_new', '')=none"
}): void;

// Opens a Record Producer for a catalog item
atf.catalog.openRecordProducer({
    $id: Now.ID[''], // string | guid, mandatory
    catalogItem: get_sys_id('sc_cat_item_producer', '') // sys_id | Record&lt;'sc_cat_item_producer'&gt;;
}): void;

// Submit currently opened Record Producer after a call to atf.catalog.openRecordProducer, no other API calls are allowed after this
atf.catalog.submitRecordProducer({
    $id: Now.ID[''], // string | guid, mandatory
    assert: '' // '' | 'form_submitted_to_server' | 'form_submission_cancelled_in_browser'
}): {
    record_id: '' // sys_id
};
```