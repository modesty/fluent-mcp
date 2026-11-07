#**Context:** Application Menu spec: Used to create top application menus (`sys_app_application`) in application navigator. Also used to create application sub menus (`sys_app_module`) under top application menus using Record API. Application submenu is also known as app module or application module at Servicenow platform application navigator. Works closely with Role API to define visibility, and Record API to define navigation menu style.
```typescript
// Creates a new top Application Menu (`sys_app_application`) in application navigator
const applicationMenu = ApplicationMenu({
    $id: '', // string | guid, mandatory
    title: '', // string, mandatory
    active: true, // boolean, mandatory, indicates whether menu appears
    roles: [], // array of role names | Role objects, for example ['admin', 'itil_user']
    category: Now.ref('sys_app_category', '<sys_id>'), // Record<'sys_app_category'> | string: a Record({ table: 'sys_app_category' }) const, an existing category by sys_id, or by name with Now.ref('sys_app_category', { name: '<category>' }); a plain name string is written verbatim and does not resolve
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
        assessment: Now.ref('asmt_metric_type', '<sys_id>'), // String, guid: the sys_id of the existing asmt_metric_type record named in user instructions or prompts or devrequest, looked up on the instance
        deviceType: '', // '' | 'any' | 'browser' | 'mobile'
        filter: '', // String, conditions applied to list view for visibility in application navigator, Servicenow encoded query
        hint: '', // String, max length is 255 characters
        linkType: '', // '' | 'SEPARATOR' | 'TIMELINE' | 'DETAIL' | 'HTML' | 'ASSESSMENT' | 'LIST' | 'FILTER' | 'SCRIPT' | 'CONTENT_PAGE' | 'SEARCH' | 'SURVEY' | 'DOC_LINK' | 'NEW' | 'MAP' | 'REPORT' | 'DIRECT'
        mapPage: Now.ref('cmn_map_page', '<sys_id>'), // String, guid: the sys_id of the existing cmn_map_page record named in user instructions or prompts or devrequest, looked up on the instance
        mobileTitle: '', // String, max length is 80 characters
        mobileViewName: '', // String, max length is 40 characters
        name: '', // table name
        order: 100, // number
        overrideMenuRoles: false, // boolean, default false
        query: '', // String, max length is 3500 characters, is link type arguments
        requireConfirmation: true, // boolean, default is true
        uncancelable: false, // boolean, default is false
        viewName: '', // String
        windowName: '', // String
        report: '', // String
        timelinePage: Now.ref('cmn_timeline_page', '<sys_id>'), // String, guid: the sys_id of the existing cmn_timeline_page record named in user instructions or prompts or devrequest, looked up on the instance
    }
})
```
