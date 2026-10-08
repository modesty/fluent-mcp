# Table augment example (SDK v4.7.0+): add columns — and (SDK v4.13.0+) indexes — to the platform `incident` table without creating a new table
```typescript
import { Table, StringColumn, BooleanColumn, ChoiceColumn } from '@servicenow/sdk/core'

// Augment mode: only `augments`, `schema` and (SDK v4.13.0+) `index` are allowed. Added column names must use the current
// app's ownership prefix: `<scope>_` in an `x_` scope (as `x_acme_` does here), or `u_`
// in global — the build rejects anything else.
// The exported variable name matches the augmented table name.
export const incident = Table({
	augments: 'incident',
	schema: {
		x_acme_escalation_reason: StringColumn({
			label: 'Escalation Reason',
			maxLength: 500,
		}),
		x_acme_reviewed: BooleanColumn({
			label: 'Reviewed',
			default: false,
		}),
		x_acme_risk_tier: ChoiceColumn({
			label: 'Risk Tier',
			choices: {
				low: { label: 'Low' },
				medium: { label: 'Medium' },
				high: { label: 'High' },
			},
		}),
	},
	// SDK v4.13.0+: index columns you add, optionally combined with pre-existing columns of the target table
	index: [
		{ name: 'idx_acme_risk_tier', unique: false, element: 'x_acme_risk_tier' },
		{ unique: false, element: ['x_acme_reviewed', 'sys_created_on'] },
	],
})
```
