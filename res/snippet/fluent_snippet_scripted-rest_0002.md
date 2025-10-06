# Scripted REST API example: create a scripted REST endpoint that has 4 routes (GET, POST, PUT, DELETE), scripts are enclosed in the `script` property to allow for inline syntax highlighting for server code
 
```typescript
import { RestApi } from '@servicenow/sdk/core'

RestApi({
    $id: Now.ID['fluent_sample_rest_api'],
    name: 'rest api fluent sample',
    serviceId: 'restapi_hello',
    consumes: 'application/json',
    routes: [
        {
            $id: Now.ID['restapi-hello-get'],
            name: 'get',
            method: 'GET',
            script: `(function process(request, response) {
    // Set response content type
    response.setContentType('application/json');
    
    // Set response status
    response.setStatus(200);
    
    // Return the response body
    return {
        "message": "Hello, World."
    };
})(request, response);`,
        },
        {
            $id: Now.ID['restapi-hello-post'],
            name: 'post',
            method: 'POST',
            script: `(function process(request, response) {
    try {
        // Read and parse the incoming JSON request body
        var requestBody = request.body ? request.body.data : {};
        
        // Set response content type
        response.setContentType('application/json');
        
        // Set response status
        response.setStatus(201);
        
        // Return the parsed request body in the response
        return {
            "received": requestBody,
            "status": "success"
        };
    } catch (e) {
        response.setStatus(400);
        return {
            "error": e.message,
            "status": "error"
        };
    }
})(request, response);`,
        },
        {
            $id: Now.ID['restapi-hello-put'],
            name: 'put',
            method: 'PUT',
            script: `(function process(request, response) {
    try {
        // Parse the request body JSON
        var requestBody = request.body ? request.body.data : {};
        
        // Set response content type
        response.setContentType('application/json');
        
        // Set response status
        response.setStatus(200);
        
        // Return the parsed request body
        return {
            "updated": true,
            "data": requestBody
        };
    } catch (e) {
        response.setStatus(400);
        return {
            "updated": false,
            "error": e.message
        };
    }
})(request, response);`,
        },
        {
            $id: Now.ID['restapi-hello-delete'],
            name: 'delete',
            method: 'DELETE',
            script: `(function process(request, response) {
    // Set response content type
    response.setContentType('application/json');
    
    // Set response status for successful deletion
    response.setStatus(200);
    
    // Return success response
    return {
        "status": "success",
        "msg": "DELETED"
    };
})(request, response);`,
        },
    ],
})
```
