#**Context:** Application Menu spec: Used to create top application menus (`sys_app_application`) in application navigator. Also used to create application sub menus (`sys_app_module`) under top application menus using Record API. Application submenu is also known as app module or application module at Servicenow platform application navigator. Works closely with Role API to define visibility, and Record API to define navigation menu style.
```typescript
// Creates a new top Application Menu (`sys_app_application`) in application navigator
const applicationMenu = ApplicationMenu({
    $id: '', // string | guid, mandatory
    title: '', // string, mandatory
    active: true, // boolean, mandatory, indicates whether menu appears
    roles: [], // array of role names | Role objects, for example ['admin', 'itil_user']
    category: get_sys_id('sys_app_category', ''), // String, guid, second paramter is the category specified in user instructions or prompts or devrequest
    hint: '', // string, defines the tooltip text that appears when a user hovers over the menu
    description: '', // string
    name: '', // string
    order: 100, // number
}): ApplicationMenu // returns a Application Menu object

// Creates Application Submenu ('sys_app_module') under top Application Menu
const applicationSubMenu = Record({
    $id: '', // string | guid, mandatory
    table: 'sys_app_module', // string, mandatory, should always be 'sys_app_module'
    data: {
        title: '', // string, max length is 80 characters
        active: true, //default is true, unless specified to make it inactive
        application: applicationMenu, // applicationMenu object
        assessment: get_sys_id('asmt_metric_type', ''), // String, guid, second paramemter as per user instructions or prompts or devrequest
        device_type: '', // '' | 'any' | 'browser' | 'mobile'
        filter: '', // String, conditions applied to list view for visibility in application navigator, Servicenow encoded query
        hint: '', // String, max length is 255 characters
        link_type: '', // '' | 'SEPARATOR' | 'TIMELINE' | 'DETAIL' | 'HTML' | 'ASSESSMENT' | 'LIST' | 'FILTER' | 'SCRIPT' | 'CONTENT_PAGE' | 'SEARCH' | 'SURVEY' | 'DOC_LINK' | 'NEW' | 'MAP' | 'REPORT' | 'DIRECT'
        map_page: get_sys_id('cmn_map_page', ''), // String, guid, second paramemter as per user instructions or prompts or devrequest
        mobile_title: '', // String, max length is 80 characters
        mobile_view_name: '', // String, max length is 40 characters
        name: get_table_name(''), // table name
        order: 100, // number
        override_menu_roles: false, // boolean, default false
        query: '', // String, max length is 3500 characters, is link type arguments
        require_confirmation: true, // boolean, default is true
        uncancelable: false, // boolean, default is false
        view_name: '', // String
        window_name: '', // String
        report: '', // String
        timeline_page: get_sys_id('cmn_timeline_page', ''), // String, guid, second paramemter as per user instructions or prompts or devrequest
    }
})
```
