```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['Assessment_ATFUser_Test'],
  name: 'Assessment ATF User Test',
  description: 'Create a user, build an assessment type, category and stakeholder record with server record steps, check the Assessment Metric Type form, and verify the user can read their stakeholder record.',
  active: true,
  failOnServerError: true
}, (atf) => {
  // createUser returns the snake_case output `user` (the new sys_user sys_id)
  const createdUser = atf.server.createUser({
    $id: Now.ID['0001'],
    fieldValues: { 'user_name': 'assessment.atfuser' },
    groups: [],
    roles: [
      '282bf1fac6112285017366cb5f867469', // sys_user_role sys_ids the assessment user needs, looked up on the instance
      '3b008fafef1110002d4274341b22564b'
    ],
    impersonate: false, // the setup steps below run as the test runner; the user is impersonated at the end
    firstName: 'Assessment',
    lastName: 'ATFUser'
  })

  // Assessment type (asmt_metric_type) that evaluates incidents
  const metricType = atf.server.recordInsert({
    $id: Now.ID['0002'],
    table: 'asmt_metric_type',
    fieldValues: {
      'name': 'ATF Incident Assessment',
      'table': 'incident',
      'evaluation_method': 'assessment',
      'active': 'true'
    },
    assert: 'record_successfully_inserted',
    enforceSecurity: true
  })

  // Category (asmt_metric_category) of that type: metric_type references the record inserted above
  const category = atf.server.recordInsert({
    $id: Now.ID['0003'],
    table: 'asmt_metric_category',
    fieldValues: {
      'name': 'ATF Incident Handling',
      'metric_type': metricType.record_id, // input camelCase, output snake_case
      'weight': '10'
    },
    assert: 'record_successfully_inserted',
    enforceSecurity: true
  })

  // Stakeholder (asmt_m2m_category_user): links the created user to the category
  const stakeholder = atf.server.recordInsert({
    $id: Now.ID['0004'],
    table: 'asmt_m2m_category_user',
    fieldValues: {
      'category': category.record_id,
      'user': createdUser.user
    },
    assert: 'record_successfully_inserted',
    enforceSecurity: true
  })

  // Change the category weight, then validate the change on the same record
  atf.server.recordUpdate({
    $id: Now.ID['0005'],
    table: 'asmt_metric_category',
    recordId: category.record_id,
    fieldValues: { 'weight': '20' },
    assert: 'record_successfully_updated',
    enforceSecurity: true
  })

  atf.server.recordValidation({
    $id: Now.ID['0006'],
    table: 'asmt_metric_category',
    recordId: category.record_id,
    fieldValues: `weight=20^metric_type=${metricType.record_id}`,
    assert: 'record_validated',
    enforceSecurity: true
  })

  // Open the Assessment Metric Type form on the type inserted above and check its values
  atf.form.openExistingRecord({
    $id: Now.ID['0007'],
    table: 'asmt_metric_type',
    recordId: metricType.record_id,
    formUI: 'standard_ui',
    view: '',
    selectedTabIndex: 0
  })

  atf.form.fieldValueValidation({
    $id: Now.ID['0008'],
    table: 'asmt_metric_type',
    conditions: 'name=ATF Incident Assessment^table=incident',
    formUI: 'standard_ui'
  })

  // Verify access: as the created user, the stakeholder record is visible under ACLs
  atf.server.impersonate({
    $id: Now.ID['0009'],
    user: createdUser.user
  })

  atf.server.recordQuery({
    $id: Now.ID['0010'],
    table: 'asmt_m2m_category_user',
    fieldValues: `sys_id=${stakeholder.record_id}^user=${createdUser.user}`,
    enforceSecurity: true, // recordQuery defaults to false; true runs the query with the impersonated user's access
    assert: 'records_match_query'
  })

  atf.server.log({
    $id: Now.ID['0011'],
    log: `User ${createdUser.user} can read stakeholder record ${stakeholder.record_id}`
  })
})
```
