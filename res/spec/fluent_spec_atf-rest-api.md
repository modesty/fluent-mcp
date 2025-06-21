#**Context:** This chunk is part of the ServiceNow Automated Test Framework (ATF) documentation and focuses on REST API testing. It includes APIs for sending HTTP requests using various methods with specific headers and bodies, and making assertions on response status codes, response times, headers, and payloads. These APIs are crucial for validating the behavior and performance of REST APIs during testing within the ATF environment.
```typescript
// Send a REST API request to glide instance with specified HTTP method, path, query parameters, request headers and body.
atf.rest.sendRestRequest({ // each of the following props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  path: '', // string, ex. '/api/now/table/incident'
  body: '', // string, ex. "{data_one: 'value1', data_field: 'value2', data_three: 'value3'}"
  mutualAuth: get_sys_id('sys_certificate',''), // sys_id | Record&lt;'sys_certificate'&gt;
  auth: '',// '' | 'basic' | 'mutual'
  mutualAuth: get_sys_id('sys_certificate',''), // sys_id | Record&lt;'sys_certificate'&gt;
  basicAuthentication: get_sys_id('sys_auth_profile_basic', ''), // sys_id | Record&lt;'sys_auth_profile_basic'&gt;
  method: 'get', // 'get' | 'post' | 'put' | 'delete' | 'patch'
  queryParameters: {}, // object, snake_case name value pairs, ex.: { field_one: 'value1', field_two: 'value2' }
  headers: {}, // object, snake_case name value pairs, ex.: { header_one: 'value1', header_two: 'value2' }
}): void

// Assert the REST API's HTTP response status code name
atf.rest.assertStatusCodeName({ 
  $id: Now.ID[''], // string | guid, mandatory
  operation: 'equals', // 'contains' | 'does_not_contain' | 'equals' | 'not_equals'
  codeName: '', // string, ex. 'OK' 
}): void

// Assert the HTTP response status code
atf.rest.assertStatusCode({ 
  $id: Now.ID[''], // string | guid, mandatory
  operation: 'equals',// 'equals' | 'not_equals' | 'less_than' | 'greater_than' | 'less_than_equals' |'greater_than_equals' 
  statusCode: 200, // number 
}): void

// Assert the HTTP response time
atf.rest.assertResponseTime({
  $id: Now.ID[''], // string | guid, mandatory
  operation: 'less_than', // 'less_than' | 'greater_than'
  responseTime: 3000, // number, in milliseconds 
}): void

// Assert an HTTP response header. Select the comparison operation and specify the expected value of the header.
atf.rest.assertResponseHeader({
  $id: Now.ID[''], // string | guid, mandatory
  headerName: '', // string
  operation: 'equals', // 'equals' | 'not_equals' | 'exists' | 'contains' | 'does_not_contain'
  headerValue: '', // string
}): void

```