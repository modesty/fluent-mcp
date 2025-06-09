# Instructions for Fluent Cross-Scope Privilege API
Always reference the Cross-Scope Privilege API specifications for more details.
1. If target is a table (`target_type` is `sys_db_object`), the supported operations are `create`, `read`, `write`, and `delete`. If target is a script or script include, the only supported operation is `execute`.
2. The status `requested` occurs when an application attempts to access a resource set to Caller Restriction, and requires an admin user to manually change to `allowed` or `denied`.
