# Instructions for Fluent ATF App Navigation API

Always reference the `atf` instructions (`get_fluent_knowledge` kind `instruct`) and the ATF App Navigation API specification for details.

1. Start from the shared `Test()` scaffold in the `atf` instructions (`get_fluent_knowledge` kind `instruct`).
2. Use only App Navigation ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
