```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID[''], // fill in a valid GUID string or the name of the test
  name: 'Check Conflicts for CI Already Scheduled', // string
  description: 'Test to validate conflicts for CI Already Scheduled', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  // Insert a record into 'cmdb_ci' with Name = 'Before I wake'
  const cmdbCiInsert = atf.server.recordInsert({
    table: 'cmdb_ci',
    fieldValues: { 'name': 'Before I wake' },
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
  })

  // Insert a record into 'change_request' with Configuration item = the configuration item from previous step and Planned start date = '2019-07-25 05:30:00', Planned end date = '2019-07-25 05:40:00', Short description = 'CI Already Scheduled'
  const changeRequestInsert1 = atf.server.recordInsert({
    table: 'change_request',
    fieldValues: {
      'cmdb_ci': cmdbCiInsert.record_id,
      'planned_start_date': '2019-07-25 05:30:00',
      'planned_end_date': '2019-07-25 05:40:00',
      'short_description': 'CI Already Scheduled'
    },
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
  })

  // Insert another record into 'change_request' with Configuration item = the configuration item from previous step and Planned start date = '2019-07-25 05:30:00', Planned end date = '2019-07-25 05:40:00', Short description = 'CI Already Scheduled'
  const changeRequestInsert2 = atf.server.recordInsert({
    table: 'change_request',
    fieldValues: {
      'cmdb_ci': cmdbCiInsert.record_id,
      'planned_start_date': '2019-07-25 05:30:00',
      'planned_end_date': '2019-07-25 05:40:00',
      'short_description': 'CI Already Scheduled'
    },
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
  })

  // Validate there is at least one record in 'conflict' matching query: Change = change from previous step and Type = CI Already Scheduled
  atf.server.recordQuery({
    table: 'conflict',
    fieldValues: `change=${changeRequestInsert2.record_id}^type=CI Already Scheduled`,
    enforceSecurity: false,
    assertType: 'records_match_query',
  })
})
```