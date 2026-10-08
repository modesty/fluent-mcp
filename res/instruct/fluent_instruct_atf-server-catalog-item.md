# Instructions for Fluent ATF Server Catalog Item API

Always reference `fluent_instruct_atf.md` and the ATF Server Catalog Item API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use only Server Catalog Item ATF step APIs documented in this metadata spec.
3. Give every ATF step a unique `$id` and keep step order deterministic.
4. Capture step outputs in variables only when later steps need them.
5. Step OUTPUT keys are snake_case: read `searchForCatalogItem` as `result.catalog_item_id` and `checkoutShoppingCart` as `result.request_id` — the camelCase spellings "catalogItemId" / "requestId" do not exist and fail to compile.
6. `replayRequestItem` is the one step here whose INPUT is snake_case: pass `request_item`, not "requestItem". It expects an `sc_req_item` sys_id; `request_id` from `checkoutShoppingCart` identifies an `sc_request`, so never chain one into the other.
7. **SDK v4.13.0** — `searchForCatalogItem` `catalog` and `category` are optional (they were mandatory); omit them to search across every catalog/category instead of passing empty strings. `searchInPortal` defaults to `false` and `assert` to `'assert_item_present'`.
