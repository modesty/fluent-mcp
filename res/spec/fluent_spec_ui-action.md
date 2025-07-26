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
        table: get_table_name(''), // string, mandatory
        action_name: '', // string, mandatory , should always begin with 'sysverb_'
        active: true, //boolean
        client: false, //boolean. Default is false. Set to true only when onclick function specified
        form_action: false, // boolean
        form_button: false, // boolean
        form_button_v2: false, // boolean
        form_context_menu: false, // boolean
        form_link: false, // boolean
        form_menu_button_v2: false, // boolean
        format_for_configurable_workspace: false, // boolean
        isolate_script: false, // boolean
        list_action: false, // boolean
        list_banner_button: false, // boolean
        list_button: false, // boolean
        list_choice: false, // boolean
        list_context_menu: false, // boolean
        list_link: false, // boolean
        list_save_with_form_button: false, // boolean
        show_insert: false, // boolean
        show_multiple_update: false, // boolean
        show_query: false, // boolean
        show_update: false, // boolean
        ui16_compatible: false, // boolean
        client_script_v2: '', // ServiceNow script to fullfil the functional request in scripting, // string, inline ServiceNow client side scripting, function to be referenced for onClick action. The script is based on devrequest. Example of function deinifition
            /*
                function onClickFunction(g_form) {}
            */
        comments: '', // string, max length is 4000 characters
        condition: '', // String, max length 254 characters, condition string is inline glide scripting expression or logic, ex: current.active == true && current.type == 'internal' && new sn_ais.StatusApi().isAisEnabled() 
        hint: '', // string, max length is 254 characters
        messages: '', //string, max length is 4000 characters
        onclick: '', // a referenced function defined in current module under client_script_v2 or script, based on devrequest. eg. onClickFunction() 
        sys_overrides: '', // string | guid
        order: 100, // Integer, default is 100
        sys_policy: '', //string, 'read' | 'protected'. This is the protection policy.
    },
})
```