# Instructions for Fluent ATF REST API

Always reference the `atf` instructions (`get_fluent_knowledge` kind `instruct`) and the ATF REST API specification for details.

1. Start from the shared `Test()` scaffold in the `atf` instructions (`get_fluent_knowledge` kind `instruct`).
2. Use `atf.rest.sendRestRequest` before response assertions, and keep request fields aligned with the REST API step spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture outputs only when later assertions depend on them.
