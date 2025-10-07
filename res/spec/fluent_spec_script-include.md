#**Context:** Script Include API spec: Define a Script Include to store JavaScript functions and classes that can be resued in different script modules. Each script include defines either an object class or a function. Although Script Inlcudes are primarily intended for server side usage, they can be used at client IF `clientCallable` is true.
```typescript
import { ScriptInclude } from '@servicenow/sdk/core';

ScriptInclude({
    $id: '',// string, unique id for the record, typically using Now.ID["value"]
    name: '', // string, the name of the script include
    apiName: '', // string, optional, the API path to call the script include. Default is [scope].[sysName]
    description: '', // string, optional, short description of the script include
    script: '', // ServiceNow script to fullfil the functional request in scripting,
    accessibleFrom: 'package_private', // string, optional, 'public'|'package_private', 'public' if the script include is accessible from all application scopes, 'package_private' if accessible from this application scope only
    callerAccess: '', // string, optional, 'tracking' for caller tracking, 'restriction' for caller restriction, '' for none
    active: true, // boolean, optional, default true
    clientCallable: false, // boolean, optional, whether GlideAJAX is enabled to enable it runnable from browser client, default false
    mobileCallable: false, // boolean, optional, whether the script include is callable from mobile, default false
    sandboxCallable: false, // boolean, optional, whether the script include is callable from sandbox, default false
})
```