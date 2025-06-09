# Instructions for Fluent Scripted REST API
Always reference the Scripted REST API specifications for more details.
1. Each Scripted REST API can contain more than one Route, each route is corresponding to HTTP verb.
2. To not `enforce_acl` set this field to be an empty array, otherwise specify a list of ACL object ot sys_ids
3. The `consumes` field contains a list of media types/resources that the API can consume, default values here are: application/json, application/xml, text/xml.
ACL objects from the fluent ACL spec.
4. The `produces` field contains a list of media types/resources that the API can produce, default values here are: application/json, application/xml, text/xml.
5. For the routes objects the `script` should be an inline ServiceNow script or an imported module
