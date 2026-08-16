# Test related-list visibility, filtering, membership and list UI Actions in ServiceNow ATF

```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['atf-list_0001'], // fill in a valid GUID string or the name of the test
  name: 'Incident: Parent Tasks related list behavior', // string
  description: 'Opens an incident, asserts the Task -> Parent related list is visible, filters it to active tasks, then checks membership, navigation, and list UI Action visibility', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  // A valid form must be open before any atf.list step runs.
  atf.form.openExistingRecord({
    $id: Now.ID['atf-list_0001_step1'],
    table: 'incident',
    recordId: '9d385017c611228701d22104cc95c371', // a real incident sys_id; look one up rather than inventing it
    formUI: 'standard_ui',
    view: '',
    selectedTabIndex: 0,
  })

  // 'task.parent' is the platform-generated related-list value (<child_table>.<field>).
  // Look real values up per table with: new ATFRelatedListUtil().getRelatedLists('incident')  (Global scope)
  atf.list.relatedListVisibility({
    $id: Now.ID['atf-list_0001_step2'],
    table: 'incident',
    visible: ['task.parent'],
  })

  // Narrow the related list to active child tasks; first_record feeds the steps below.
  const filterResult = atf.list.applyFilterToList({
    $id: Now.ID['atf-list_0001_step3'],
    table: 'incident', // the table whose form is open
    relatedList: 'task.parent',
    relatedListTable: 'task', // the table the list's RECORDS live in — first_record is typed against this
    filterConditions: 'active=true^EQ',
    assert: 'records_match_filter',
  })

  atf.list.recordPresentInList({
    $id: Now.ID['atf-list_0001_step4'],
    table: 'incident',
    relatedList: 'task.parent',
    relatedListTable: 'task',
    recordId: filterResult.first_record,
    assert: 'record_present',
  })

  atf.list.openRecordInList({
    $id: Now.ID['atf-list_0001_step5'],
    table: 'incident',
    relatedList: 'task.parent',
    relatedListTable: 'task',
    recordId: filterResult.first_record,
  })

  // Read-only check of which list UI Actions the current user can see.
  // Note clickListUIAction is deliberately omitted: it really executes the action and
  // navigates away, so no further form/list step could follow it.
  atf.list.listUIActionVisibility({
    $id: Now.ID['atf-list_0001_step6'],
    table: 'incident',
    relatedList: 'task.parent',
    relatedListTable: 'task',
    visible: ['Update'],
  })
})
```
