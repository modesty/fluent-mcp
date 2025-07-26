#**Context:** Script Include API spec: Create script includes to store JavaScript functions and classes for use by server scripts. Each script include defines either an object class or a function. Although Script Inlcudes are primarily intended for server side usage, they can be used at client level IF `client_callable` is true.
```typescript
// spec to create a script include in Fluent using the Record plugin
Record({
    $id: '',// string, unique id for the record, typically using Now.ID["value"]
    table: 'sys_script_include', // string, must always leave as 'sys_script_include'
    data: {
        name: '', // string, the name of the script include
        sys_name: '', // string, optional, the system name of the script include. Default is same as name
        api_name: '', // string, optional, the API path to call the script include. Default is [app_name].[sys_name]
        description: '', // string, optional, short description of the script include
        script: '', // ServiceNow script to fullfil the functional request in scripting,
        access: 'package_private', // string, optional, 'public'|'package_private', 'public' if the script include is accessible from all application scopes, 'package_private' if accessible from this application scope only
        caller_access: '', // string, optional, '1' for caller tracking, '2' for caller restriction, '' for none
        active: true, // boolean, optional, default true
        client_callable: false, // boolean, optional, whether Glide AJAX is enabled, default false
        mobile_callable: false, // boolean, optional, whether the script include is callable from mobile, default false
        sandbox_callable: false, // boolean, optional, whether the script include is callable from sandbox, default false
        sys_policy: '', // string, optional, protection policy: ''|'read'|'protected', 'read' for read-only, 'protected' for protected
    },
})
```
