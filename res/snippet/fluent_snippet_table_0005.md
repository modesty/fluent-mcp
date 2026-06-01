# Table augment example (SDK v4.7.0+): add columns to the platform `incident` table without creating a new table
```typescript
import { Table, StringColumn, BooleanColumn, ChoiceColumn } from '@servicenow/sdk/core'

// Augment mode: only `augments` + `schema` are allowed. Added columns must be prefixed with `u_`.
// The exported variable name matches the augmented table name.
export const incident = Table({
	augments: 'incident',
	schema: {
		u_escalation_reason: StringColumn({
			label: 'Escalation Reason',
			maxLength: 500,
		}),
		u_reviewed: BooleanColumn({
			label: 'Reviewed',
			default: false,
		}),
		u_risk_tier: ChoiceColumn({
			label: 'Risk Tier',
			choices: {
				low: { label: 'Low' },
				medium: { label: 'Medium' },
				high: { label: 'High' },
			},
		}),
	},
})
```
