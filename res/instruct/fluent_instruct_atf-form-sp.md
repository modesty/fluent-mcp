# Instructions for Fluent ATF Service Portal Form API

Always reference `fluent_instruct_atf.md` and the ATF Service Portal Form API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use only Service Portal form ATF step APIs (`atf.form_SP.*`) documented in this metadata spec — these target Service Portal pages, not the platform UI (`atf.form.*`).
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
5. **SDK v4.13.0** — `atf.form_SP.clickUIAction` no longer requires `assert`; when you set it, use only `'form_submitted_to_server'` or `'form_submission_canceled_in_browser'` ("page_reloaded_or_redirected" is not a valid value for this step). The standard-UI `atf.form.clickUIAction` still requires `assert`.
6. Outputs are snake_case: `clickUIAction` and `submitForm` return `{ table, record_id }`, so chain `result.record_id`, never "recordId".
