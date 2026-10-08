# Define a change risk assessment with risk thresholds in ServiceNow Fluent

```typescript
import { RiskAssessment } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// SDK v4.12.0+. Writes change_risk_asmt plus thresholds, categories and metrics. `table`
// (change_request) and `evaluation_method` (risk_assessment) are fixed by the build - there is no
// `table` or `evaluationMethod` property. No business rule is generated. The target instance needs
// the com.snc.change_management.risk_assessment plugin active.
RiskAssessment({
    $id: Now.ID['chg_risk_asmt'],
    name: 'Change Risk Assessment',
    condition: 'active=true', // always scope explicitly
    scaleFactor: 10, // keep it an integer - the RiskAssessment build does not check this
    thresholds: [
        // $id is mandatory on every threshold (there is no coalesce key)
        { $id: Now.ID['chg_risk_high'], risk: 'high', scoreGreaterThan: 70 },
        { $id: Now.ID['chg_risk_moderate'], risk: 'moderate', scoreGreaterThan: 30 },
        { $id: Now.ID['chg_risk_low'], risk: 'low', scoreGreaterThan: 0 },
    ],
    categories: [
        {
            $id: Now.ID['chg_risk_cat_impact'],
            name: 'Change Impact',
            weight: 100,
            order: 100,
            filter: 'active=true', // keep consistent with (a subset of) `condition`
            metrics: [
                {
                    $id: Now.ID['chg_risk_q_downtime'],
                    name: 'Downtime required',
                    question: 'Does this change require production downtime?',
                    dataType: 'yesNo',
                    scored: true,
                    weight: 60,
                    order: 100,
                    mandatory: true,
                    correctAnswerYesNo: '0', // '1' = Yes, '0' = No
                },
                {
                    $id: Now.ID['chg_risk_q_cis'],
                    name: 'Affected CIs',
                    question: 'How many configuration items are affected?',
                    dataType: 'numericScale',
                    scored: true,
                    weight: 40,
                    order: 200,
                    min: 1, // with no `definitions`, the build generates one answer option per integer 1..5
                    max: 5,
                },
            ],
        },
    ],
})
```
