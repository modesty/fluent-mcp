#**Context:** Scripted REST API spec: Used to create a new Scripted REST API in ServiceNow, it is closely related to the Route API for its route property definition. Each Route will have a script property that defines what the scripted REST endpoint does.
```typescript
// spec to create RestApi in Fluent
const specRestApi = RestApi({
    $id: '', // string | guid, mandatory
	name: '', // string, mandatory
	serviceId: '', // string, mandatory
    active: true, // boolean
	consumes: '', // string, comma delimited MIME types, ex. 'application/json,application/xml,text/xml'
	docLink: '', // string
	enforceAcl: [], // array of strings that represent sys_ids of ACLs to enforce | array of ACL objects (see ACL object spec) to enforce
	policy: '', // '' | 'read' | 'protected'
	produces: '', // string, comma delimited MIME types, ex. 'application/json,application/xml,text/xml'
	routes: [], // array of Routes, see the Route spec
	shortDescription, '', // string
	versions: [], // array of Versions, see the Version spec
}): RestApi; // returns a RestApi object

// spec to create Routes in Fluent
const Route = {
	$id: '', // string | guid, mandatory
	script: '', // ServiceNow script to fullfil the functional request in scripting,
	parameters: [], // array of Parameters, see the ParameterAndHeader spec
	headers: [], // array of Headers, see the ParameterAndHeader spec
	name: '', // string, defaults to the value of the path property
	active: true, // boolean
	path: '/', // string, path of the resource relative to the base API path, can contain parameters, for example: '/abc/{id}'
	shortDescription: '', // string
	consumes: '', // string, defines what the route will consume, defaults to the `consumes` property of the RestApi object
	enforceAcl, [], // array of strings that represent sys_ids of ACLs to enforce | array of ACL objects (see ACL object spec) to enforce
	produces: '', // string, ist of media types that the resource can produce, defaults to the `produces` property of the RestApi object
	requestExample: '', // string, valid sample request body payload for the route
	method: 'GET', // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	authorization: true, // boolean, determines whether users must be authenticated to access the route
	authentication: true, // boolean, determines whether ACLs are enforced when accessing the route
	internalRole: true, // boolean, determines whether the route requires the user to have the 'snc_internal' role
	policy: '', // '' | 'read' | 'protected'
	version: 0, // number, this is required if the `versions` property of the RestApi is populated, used to generate the URI with a version, for example this would be generated is version = 1: '/api/management/v1/table/{tableName}'
}

// spec to create Parameters and Headers in Fluent
const specParameterAndHeader = {
	$id: '', // string | guid, mandatory
	name: '', // string, name of the parameter or header, mandatory
	required: false, // boolean
	exampleValue: '', // string, example of a valid value
	shortDescription: '', // string
}

// spec to create Versions in Fluent
const specVersion = {
	$id: '', // string | guid, mandatory
	version: 0, // number, version of the rest api, mandatory
	active: true, // boolean
	deprecated: false, // boolean
	shortDescription: '', // string
	isDefault: false, // boolean, determines if this version is the default for the rest api
}
```
