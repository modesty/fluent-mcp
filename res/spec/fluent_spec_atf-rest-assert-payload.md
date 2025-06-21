#**Context:** The chunk is part of the ServiceNow Automated Test Framework (ATF) focusing on REST API testing. It details steps for validating response payloads from REST API requests, including assertions for HTTP response body values, JSON payload elements, XML payload structure, and elements. These API steps are crucial for ensuring that REST endpoints function correctly during automated tests by verifying expected data structures and values in responses.
```typescript
// Assert the HTTP response payload is equals to or contains a specified value
atf.rest.assertResponsePayload({ 
  $id: Now.ID[''], // string | guid, mandatory
  responseBody: '', // string, expected response body 
  operation: 'equals' // 'equals' | 'not_equals' | 'exists' | 'contains' | 'does_not_contain'
}): void

// Assert the JSON response payload is valid.
atf.rest.assertResponseJSONPayloadIsValid({
  $id: Now.ID[''], // string | guid, mandatory
}): void // input object with no properties

// Assert the JSON response payload element 
atf.rest.assertJsonResponsePayloadElement({
  $id: Now.ID[''], // string | guid, mandatory
  elementName: '', // string, JSON SNC path of the element
  operation: 'contains', // 'contains' | 'does_not_contain' | 'equals' | 'not_equals' | 'exists'
  elementValue: '' // string, value to compare
}): void

// Assert the REST API's XML response payload is well-formed
atf.rest.assertResponseXMLPayloadIsWellFormed({
  $id: Now.ID[''], // string | guid, mandatory
}): void // input object with no properties

// Assert the REST API's XML response payload element
atf.rest.assertXMLResponsePayloadElement({
  $id: Now.ID[''], // string | guid, mandatory
  elementPath: '', // xpath to the element
  operation: 'contains', // 'contains' | 'does_not_contain' | 'equals' | 'not_equals' | 'exists'
  elementValue: '' // string, value to compare
}): void

```