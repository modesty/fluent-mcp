# Scripted REST API example: create a scripted REST endpoint that has 4 routes (GET, POST, PUT, DELETE), scripts are enclosed in the `script` property to allow for inline syntax highlighting for server code
 
```typescript
import { RestApi } from '@servicenow/sdk/core'

RestApi({
    $id: Now.ID['fluent_sample_rest_api'],
    name: 'rest api fluent sample',
    service_id: 'restapi_hello',
    consumes: 'application/json',
    routes: [
        {
            $id: Now.ID['restapi-hello-get'],
            name: 'get',
            method: 'GET',
            script: get_glide_script(
                    'sys_ws_operation', 
                    'create script to set body message Hello, World.', 
                    ''),
        },
        {
            $id: Now.ID['restapi-hello-post'],
            name: 'post',
            method: 'POST',
            script: get_glide_script(
                    'sys_ws_operation', 
                    'create script toa Scripted REST API script that reads the incoming JSON request body, parses it, and returns it in the response.', 
                    ''),
        },
        {
            $id: Now.ID['restapi-hello-put'],
            name: 'put',
            method: 'PUT',
            script: get_glide_script(
                    'sys_ws_operation', 
                    'Create a Scripted REST API that parses the request body JSON and returns', 
                    ''),
        },
        {
            $id: Now.ID['restapi-hello-delete'],
            name: 'delete',
            method: 'DELETE',
            script: get_glide_script(
                    'sys_ws_operation', 
                    'Create a Scripted REST API that that responds with delete and msg DELETED', 
                    ''),
        },
    ],
})
```
