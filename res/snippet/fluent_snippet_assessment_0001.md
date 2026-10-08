# Define a scored service security assessment with a conditional question in ServiceNow Fluent

```typescript
import { Assessment } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// SDK v4.12.0+. Scored assessment (evaluationMethod 'assessment' is the default): `table` and an
// integer `scaleFactor` are REQUIRED by a build diagnostic, not by the type. The build also writes a
// trigger and a delete business rule on cmdb_ci_service.
Assessment({
    $id: Now.ID['svc_security_assessment'],
    name: 'Service Security Assessment',
    evaluationMethod: 'assessment',
    table: 'cmdb_ci_service',
    condition: 'operational_status=1', // always scope explicitly - empty means every record
    scaleFactor: 10,
    scoringType: 'percentage',
    userField: 'owned_by',
    assessmentDuration: Duration({ days: 7 }),
    categories: [
        {
            $id: Now.ID['svc_security_cat_access'],
            name: 'Access Control',
            weight: 100,
            order: 100,
            filter: 'operational_status=1', // keep consistent with (a subset of) `condition`
            metrics: [
                {
                    $id: Now.ID['svc_security_q_mfa'],
                    name: 'MFA enforced',
                    question: 'Is multi-factor authentication enforced for privileged accounts?',
                    dataType: 'yesNo',
                    scored: true,
                    weight: 60,
                    order: 100,
                    mandatory: true,
                    correctAnswerYesNo: '1', // '1' = Yes, '0' = No
                },
                {
                    $id: Now.ID['svc_security_q_review'],
                    name: 'Access review cadence',
                    question: 'How often are access reviews performed?',
                    dataType: 'choice',
                    scored: true,
                    weight: 40,
                    order: 200,
                    // Keys are the stored numeric values - integer strings only; no $id on definitions
                    definitions: {
                        '1': { label: 'Quarterly', normalizationInput: 100 },
                        '2': { label: 'Annually', normalizationInput: 50 },
                        '3': 'Never',
                    },
                },
                {
                    $id: Now.ID['svc_security_q_mfa_gap'],
                    name: 'MFA gap details',
                    question: 'Describe why MFA is not enforced.',
                    dataType: 'string',
                    stringOption: 'multiline',
                    order: 300,
                    // Reference the sibling with Now.ref (not Now.ID), and reveal it only on a "No" answer
                    dependsOn: Now.ref('asmt_metric', 'svc_security_q_mfa'),
                    displayedWhenYesNo: '0',
                },
            ],
        },
    ],
})
```
