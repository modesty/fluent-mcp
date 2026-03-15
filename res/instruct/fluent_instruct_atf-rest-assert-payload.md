# Instructions for Fluent ATF REST Assert Payload API

Always reference `fluent_instruct_atf.md` and the ATF REST Assert Payload specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use payload assertions only after a REST request step has executed in the same test.
3. Match assertion method to payload type (`JSON`/`XML`) and use exact operation names from the API spec.
4. Give every ATF step a unique `$id` and keep step order deterministic.
