#**Context:** ATF List / Related List step APIs (SDK v4.10.0+). This chunk is part of the broader ATF (Automated Test Framework) documentation for ServiceNow, covering the `atf.list.*` steps that exercise **list and related-list UI behavior**: which related lists are visible on a form, filtering a list down to matching records, asserting a record's presence, opening a record from a list, and checking or clicking list-level UI Actions. Use these steps only when a client script, UI policy, or an app-defined relationship actually drives the list's visibility, membership, or filtering — not for default platform related lists. Reach the steps through the `atf` callback of `Test()` (`import { Test } from '@servicenow/sdk/core'`). Every step also accepts the standard step values (`active`, `description`, `notes`, `timeout`, `warning`). Note `relatedList` values are **platform-generated and not guessable** — format `<child_table>.<field>` (e.g. `task.parent`), or `REL:<sys_id>` for relationship-based lists.

```typescript
// Validates the visibility of the selected related lists on a form. A valid form must be open.
// The ONLY atf.list step that takes neither `listType` nor `relatedList`.
atf.list.relatedListVisibility({
  $id: Now.ID[''], // string | guid, mandatory
  table: 'incident', // TableName, mandatory - the table whose form is open
  visible: ['task.parent'], // string[], optional (default []) - related lists asserted VISIBLE
  notVisible: [], // string[], optional (default []) - related lists asserted NOT visible
}): void;

// Applies a filter to a list, narrowing it to matching records. Clears any existing filter on the list.
// A list module, or a form with related lists, must be open.
const filterResult = atf.list.applyFilterToList({
  $id: Now.ID[''], // string | guid, mandatory
  listType: 'related_list', // 'related_list' | 'list', optional (default 'related_list')
  table: 'incident', // TableName, mandatory - the table whose form/list is open
  relatedList: 'task.parent', // Record&lt;'sys_relationship'&gt; | string, mandatory - '&lt;child_table&gt;.&lt;field&gt;' or 'REL:&lt;sys_id&gt;'
  relatedListTable: 'task', // TableName, mandatory - table the LIST'S RECORDS live in; first_record/recordId are typed against THIS table, not `table`
  filterConditions: 'active=true^EQ', // string, mandatory - encoded query
  assert: 'records_match_filter', // '' | 'exactly_one_match' | 'no_records_match_filter' | 'records_match_filter', optional (default '')
}): { first_record: string | Record&lt;relatedListTable&gt; }; // capture only when a later step needs it

// Validates the presence (or absence) of a specified record in a list.
atf.list.recordPresentInList({
  $id: Now.ID[''], // string | guid, mandatory
  table: 'incident', // TableName, mandatory
  listType: 'related_list', // 'related_list' | 'list', optional (default 'related_list')
  relatedList: 'task.parent', // Record&lt;'sys_relationship'&gt; | string, mandatory
  relatedListTable: 'task', // TableName, mandatory
  recordId: filterResult.first_record, // string | Record&lt;relatedListTable&gt;, mandatory
  assert: 'record_present', // 'no_record_present' | 'record_present', optional (default 'record_present')
}): void;

// Opens a specified record in a list.
atf.list.openRecordInList({
  $id: Now.ID[''], // string | guid, mandatory
  listType: 'related_list', // 'related_list' | 'list', optional (default 'related_list')
  table: 'incident', // TableName, mandatory
  relatedList: 'task.parent', // Record&lt;'sys_relationship'&gt; | string, mandatory
  relatedListTable: 'task', // TableName, mandatory
  recordId: filterResult.first_record, // string | Record&lt;relatedListTable&gt;, mandatory
}): void;

// Validates the visibility of UI Actions in a list. Assert any number as visible or not visible.
// The default visible UI Actions vary with the currently impersonated user.
// NOTE: this is the one atf.list step where `relatedListTable` is OPTIONAL.
atf.list.listUIActionVisibility({
  $id: Now.ID[''], // string | guid, mandatory
  listType: 'related_list', // 'related_list' | 'list', optional (default 'related_list')
  table: 'incident', // TableName, mandatory
  relatedList: 'task.parent', // Record&lt;'sys_relationship'&gt; | string, mandatory
  relatedListTable: 'task', // TableName, OPTIONAL here
  visible: ['Update'], // string[], optional (default []) - UI Action names asserted visible
  notVisible: [], // string[], optional (default []) - UI Action names asserted not visible
}): void;

// Clicks a UI Action on a list. HAS REAL SIDE EFFECTS — it executes the action.
// After this step, do NOT use further steps against the current form or list: it will likely navigate away.
atf.list.clickListUIAction({
  $id: Now.ID[''], // string | guid, mandatory
  listType: 'related_list', // 'related_list' | 'list', optional (default 'related_list')
  table: 'incident', // TableName, mandatory
  relatedList: 'task.parent', // Record&lt;'sys_relationship'&gt; | string, mandatory
  relatedListTable: 'task', // TableName, mandatory
  listAction: get_sys_id('sys_ui_action', ''), // string | Record&lt;'sys_ui_action'&gt;, mandatory - the UI Action on the CHILD table
  actionType: 'list_banner_button', // 'list_banner_button' | 'list_bottom_button' | 'list_context_menu' | 'list_choice' | 'list_link', mandatory
  applyTo: '', // '' | 'single_record' | 'all_records', optional (default '')
  recordId: filterResult.first_record, // string | Record&lt;relatedListTable&gt;, optional - required when applyTo is 'single_record'
  assert: '', // '' | 'page_reloaded_or_redirected', optional (default '')
}): void;
```
