# Instructions for Fluent ATF Server API

Always reference `fluent_instruct_atf.md` and the ATF Server API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use only Server ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
5. `enforceSecurity` defaults to `true` (SDK v4.5.0+) on `recordInsert`, `recordUpdate`, `recordDelete` and `recordValidation`, but to **`false` on `recordQuery`** — set `enforceSecurity: true` explicitly on every `recordQuery`. Leave it on everywhere: never set it to `false` to get past an access failure, and never switch to admin to insert or validate. Report the access gap instead.
6. Start every test with `atf.server.createUser` for a dedicated test user carrying the app's role; it impersonates the new user by default. Pass the role as the app's `Role()` record or a role sys_id. A role name string (`'x_app.user'`) is not resolved, so the user would be created with no role. Never impersonate an existing user (admin or anyone else) unless asked to.
7. Server step outputs are snake_case: `recordInsert` returns `record_id`, `recordQuery` returns `first_record`, `createUser` / `impersonate` return `user`. Reading `.recordId` or `.firstRecord` is a type error.
8. The step setOutputVariables was removed in SDK v4.14.0 (TS2339). To return values from a test, make it a reusable test and use `atf.setReusableTestOutputs` (see the `atf` instruct, items 17–23).
