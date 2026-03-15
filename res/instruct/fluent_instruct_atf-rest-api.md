# Instructions for Fluent ATF REST API

Always reference `fluent_instruct_atf.md` and the ATF REST API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use `atf.rest.sendRestRequest` before response assertions, and keep request fields aligned with the REST API step spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture outputs only when later assertions depend on them.
