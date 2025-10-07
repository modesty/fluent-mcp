# Scripted REST API example: edit a Scripted REST API to update a route to echo back parsed JSON from the request body via PUT
```typescript
import { RestApi } from '@servicenow/sdk/core'

RestApi({
	$id: '08899e2837ac221002e674e8f2924b14',
	name: 'Echo JSON via PUT',
	serviceId: 'my_service_id_put',
	active: true,
	consumes: 'application/json',
	docLink: '',
	enforceAcl: [],
	policy: '',
	produces: 'application/json',
	routes: [
		{
			$id: '73894e2837ac221112e674e8f2924b53',
			script: `(function process(request, response) {
    try {
        // Parse the JSON from the request body
        var requestBody = request.body ? request.body.data : {};
        
        // Echo back the parsed JSON
        response.setContentType('application/json');
        response.setStatus(200);
        return requestBody;
    } catch (e) {
        // Handle any errors
        response.setContentType('application/json');
        response.setStatus(500);
        return { 
            error: e.message,
            message: "Failed to process JSON"
        };
    }
})(request, response);`,
			parameters: [],
			headers: [],
			name: 'Echo PUT',
			active: true,
			path: '/echo_put',
			shortDescription: 'Echo parsed JSON using PUT method',
			consumes: 'application/json',
			enforceAcl: [],
			produces: 'application/json',
			requestExample: '{ "name": "John", "age": 30 }',
			method: 'PUT',
			authorization: true,
			authentication: true,
			internalRole: false,
			policy: '',
			version: 1
		}
	],
	shortDescription: 'Simple API that echoes back JSON in PUT request',
	    versions: [
        {
            $id: Now.ID['v1'],
            version: 1,
        },
    ],
});
```