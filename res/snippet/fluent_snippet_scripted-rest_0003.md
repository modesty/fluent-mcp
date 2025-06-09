# Scripted REST API example: edit a Scripted REST API to update a route to echo back parsed JSON from the request body via PUT
```typescript
import { RestApi } from '@servicenow/sdk/core'

RestApi({
	$id: '08899e2837ac221002e674e8f2924b14', 
	name: 'Echo JSON via PUT',
	service_id: 'my_service_id_put',
	active: true,
	consumes: 'application/json',
	doc_link: '',
	enforce_acl: [],
	policy: '',
	produces: 'application/json',
	routes: [
		{
			$id: '73894e2837ac221112e674e8f2924b53',
			script: get_glide_script(
				'sys_ws_operation',
				'update a script to echoes back parsed JSON from request body via PUT',
				'var jsonString = "{"name":"John", "age":30, "city":"New York"}";gs.info(jsonString); '
			),
			parameters: [],
			headers: [],
			name: 'Echo PUT',
			active: true,
			path: '/echo_put',
			short_description: 'Echo parsed JSON using PUT method',
			consumes: 'application/json',
			enforce_acl: [],
			produces: 'application/json',
			request_example: '{ "name": "John", "age": 30 }',
			method: 'PUT',
			authorization: true,
			authentication: true,
			internalRole: false,
			policy: '',
			version: 1
		}
	],
	short_description: 'Simple API that echoes back JSON in PUT request',
	    versions: [
        {
            $id: Now.ID['v1'],
            version: 1,
        },
    ],
});
```