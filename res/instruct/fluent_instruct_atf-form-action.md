# Instructions for Fluent ATF Form Action API

Always reference `fluent_instruct_atf.md` and the ATF Form Action API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use only Form Action ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
