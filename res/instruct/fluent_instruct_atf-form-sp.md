# Instructions for Fluent ATF Service Portal Form API

Always reference `fluent_instruct_atf.md` and the ATF Service Portal Form API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use only Service Portal form ATF step APIs (`atf.form_SP.*`) documented in this metadata spec — these target Service Portal pages, not the platform UI (`atf.form.*`).
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
