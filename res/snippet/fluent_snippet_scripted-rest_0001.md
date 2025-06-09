# Scripted REST API example: creating a new Scripted REST endpoint in ServiceNow to return a GUID via http GET
```typescript
import { RestApi, Acl } from '@servicenow/sdk/core'

RestApi({
    $id: Now.ID['get_guid_rest_api'],
    name: 'Get GUID',
    service_id: 'custom_api',
    consumes: 'application/json,application/xml,text/xml',
	produces: 'application/json,application/xml,text/xml',
    routes: [
        {
            $id: Now.ID['route1'],
            path: '/api/sn_aes_notificatio/notifications/guid',
            script: get_glide_script(
                    'sys_ws_operation', 
                    'create script to set new sys id to response body notificationGuid.', 
                    ''),
            parameters: [],
            headers: [],
			authorization: true,
			authentication: true,
            enforce_acl: [restAcl],
            version: 1,
        },
    ],
    enforce_acl: [restAcl],
    versions: [
        {
            $id: Now.ID['v1'],
            version: 1,
        },
    ],
})

const devRole = Role({ name: 'dev' });
const adminRole = Role({ name: 'admin', contains_roles: [devRole] });

// The ACL referenced is defined using the ACL object:
const restAcl = Acl({
    $id: Now.ID['get_guid_rest_api_acl'],
    name: 'Get GUID ACL',
    type: 'rest_endpoint',
    script: ``,
    active: true,
    admin_overrides: false,
    operations: ['execute'],
	roles: [adminRole, devRole],
})
```
