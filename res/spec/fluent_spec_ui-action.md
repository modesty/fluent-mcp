#**Context:** UI Action spec: define UI Actions [sys_ui_action] to enhance interactivity and customization in user interfaces. UI Actions include buttons, context menu items and related links of forms.
```typescript
// Creates a new UI Action (`sys_ui_action`)
const uiAction = Record({
    $id: '', // string | guid, mandatory
    table: 'sys_ui_action', // string, mandatory, should always be 'sys_ui_action'
    data: {
        name: '', // string, mandatory
        script: '', // ServiceNow script to fullfil the functional request in scripting, // string, inline ServiceNow client side scripting, function to be referenced for onClick action for workspace form button and workspace form menu. The script is based on devrequest. Example of function definition
            /*
                function onClickFunction(g_form) {}
            */
        table: '', // string, mandatory
        actionName: '', // string, mandatory , should always begin with 'sysverb_'
        active: true, //boolean
        client: false, //boolean. Default is false. Set to true only when onclick function specified
        formAction: false, // boolean
        formButton: false, // boolean
        formButtonV2: false, // boolean
        formContextMenu: false, // boolean
        formLink: false, // boolean
        formMenuButtonV2: false, // boolean
        formatForConfigurableWorkspace: false, // boolean
        isolateScript: false, // boolean
        listAction: false, // boolean
        listBannerButton: false, // boolean
        listButton: false, // boolean
        listChoice: false, // boolean
        listContextMenu: false, // boolean
        listLink: false, // boolean
        listSaveWithFormButton: false, // boolean
        showInsert: false, // boolean
        showMultipleUpdate: false, // boolean
        showQuery: false, // boolean
        showUpdate: false, // boolean
        ui16Compatible: false, // boolean
        clientScriptV2: '', // ServiceNow script to fullfil the functional request in scripting, // string, inline ServiceNow client side scripting, function to be referenced for onClick action. The script is based on devrequest. Example of function deinifition
            /*
                function onClickFunction(g_form) {}
            */
        comments: '', // string, max length is 4000 characters
        condition: '', // String, max length 254 characters, condition string is inline glide scripting expression or logic, ex: current.active == true && current.type == 'internal' && new sn_ais.StatusApi().isAisEnabled()
        hint: '', // string, max length is 254 characters
        messages: '', //string, max length is 4000 characters
        onclick: '', // a referenced function defined in current module under clientScriptV2 or script, based on devrequest. eg. onClickFunction()
        sysOverrides: '', // string | guid
        order: 100, // Integer, default is 100
        sysPolicy: '', //string, 'read' | 'protected'. This is the protection policy.
    },
})
```