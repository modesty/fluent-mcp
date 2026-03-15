# Instructions for Fluent ATF Reporting API

Always reference `fluent_instruct_atf.md` and the ATF Reporting API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use only Reporting ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
