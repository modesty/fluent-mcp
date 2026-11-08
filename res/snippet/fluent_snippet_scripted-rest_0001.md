# Scripted REST API example: creating a new Scripted REST endpoint in ServiceNow to return a GUID via http GET
```typescript
// App scope: x_snc_example
import { RestApi, Acl, Role } from '@servicenow/sdk/core'

// Declare the roles and the ACL before the RestApi that references them
const apiUserRole = Role({ name: 'x_snc_example.guid_api_user' })
const apiAdminRole = Role({ name: 'x_snc_example.guid_api_admin', containsRoles: [apiUserRole] })

// The ACL referenced by the API and its route. A 'rest_endpoint' ACL must use operation 'execute'.
const restAcl = Acl({
    $id: Now.ID['get_guid_rest_api_acl'],
    name: 'get_guid_api_access',
    type: 'rest_endpoint',
    operation: 'execute',
    active: true,
    adminOverrides: false,
    roles: [apiAdminRole, apiUserRole],
})

export const getGuidApi = RestApi({
    $id: Now.ID['get_guid_rest_api'],
    name: 'Get GUID',
    serviceId: 'custom_api',
    consumes: 'application/json,application/xml,text/xml',
    produces: 'application/json,application/xml,text/xml',
    routes: [
        {
            $id: Now.ID['route1'],
            method: 'GET',
            path: '/guid', // relative to the API base path: /api/x_snc_example/v1/custom_api/guid
            script: `(function process(request, response) {
    try {
        // Generate a new sys_id (GUID)
        var newGuid = gs.generateGUID();

        // Set response content type
        response.setContentType('application/json');

        // Set response status
        response.setStatus(200);

        // Return the new GUID in the response body
        response.setBody({
            "notificationGuid": newGuid,
            "timestamp": new GlideDateTime().getDisplayValue()
        });
    } catch (e) {
        response.setStatus(500);
        response.setBody({
            "error": e.message,
            "status": "error"
        });
    }
})(request, response);`,
            parameters: [],
            headers: [],
            authorization: true,
            authentication: true,
            enforceAcl: [restAcl],
            version: 1,
        },
    ],
    enforceAcl: [restAcl],
    versions: [
        {
            $id: Now.ID['v1'],
            version: 1,
        },
    ],
})
```
