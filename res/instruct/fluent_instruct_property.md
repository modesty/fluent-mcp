# Instructions for Fluent Property API
Always reference the Property API specifications for more details.
1. The `value` field should be stored as a string, but the corresponding type should always match the `type` field.
2. The read / write roles are defined by an array consisting of Role objects or role names that already exist on the platform.
3. The name of the property should be prefixed by the application scope in the following format: `<scope>.<name>`.
