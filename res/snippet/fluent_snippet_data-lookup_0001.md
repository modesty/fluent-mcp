# DataLookup API example: copy impact onto a task by matching its priority against a lookup table
```typescript
import { DataLookup } from '@servicenow/sdk/core'

// The matcher table `dl_u_priority` must be created separately with
// Table({ extends: 'dl_matcher', ... }) in the same scope, and its rows must have active = true.
DataLookup({
	$id: Now.ID['priority-impact-lookup'],
	name: 'Priority Impact Lookup',
	sourceTable: 'task',
	matcherTable: 'dl_u_priority',
	runOnInsert: true,
	runOnUpdate: true,
	matchRules: [
		{ $id: Now.ID['priority-impact-match-priority'], sourceField: 'priority', matcherField: 'priority', exactMatch: true },
	],
	setRules: [
		{ $id: Now.ID['priority-impact-set-impact'], targetField: 'impact', matcherField: 'impact', alwaysReplace: false },
	],
})
```
