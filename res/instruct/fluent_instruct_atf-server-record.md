# Instructions for Fluent ATF Server Record API

Always reference the `atf` instructions (`get_fluent_knowledge` kind `instruct`) and the ATF Server Record API specification for details.

1. Start from the shared `Test()` scaffold in the `atf` instructions (`get_fluent_knowledge` kind `instruct`).
2. Use only Server Record ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
5. Note: `enforceSecurity` defaults to `true` in SDK v4.5.0 on `recordInsert`, `recordUpdate`, `recordDelete` and `recordValidation`, but to **`false` on `recordQuery`** — set `enforceSecurity: true` explicitly there. Never set it to `false`: test as a dedicated user with the app's role, and report an access failure instead of bypassing ACLs (see the `atf` instruct).
