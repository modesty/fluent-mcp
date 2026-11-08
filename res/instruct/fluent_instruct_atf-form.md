# Instructions for Fluent ATF Form API

Always reference the `atf` instructions (`get_fluent_knowledge` kind `instruct`) and the ATF Form API specification for details.

1. Start from the shared `Test()` scaffold in the `atf` instructions (`get_fluent_knowledge` kind `instruct`).
2. Use only Form ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
