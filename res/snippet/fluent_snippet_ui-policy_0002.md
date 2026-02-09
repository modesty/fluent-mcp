# UiPolicy API example: UI policy with conditional scripts (scriptTrue/scriptFalse)
```typescript
import { UiPolicy } from '@servicenow/sdk/core'

UiPolicy({
	$id: Now.ID['change_type_script_policy'],
	table: 'change_request',
	shortDescription: 'Run validation scripts based on change type',
	active: true,
	onLoad: false,
	reverseIfFalse: false,
	order: 200,
	conditions: 'type=emergency',
	uiType: 'all',
	runScripts: true,
	scriptTrue: `function onCondition() {
	// When change type is emergency, set justification as mandatory and show warning
	g_form.setMandatory('justification', true);
	g_form.showFieldMsg('justification', 'Emergency changes require detailed justification', 'warning');
	g_form.setValue('approval', 'requested');
}`,
	scriptFalse: `function onCondition() {
	// When change type is not emergency, reset fields
	g_form.setMandatory('justification', false);
	g_form.hideFieldMsg('justification');
}`,
	actions: [
		{
			field: 'justification',
			visible: true,
			mandatory: true,
		},
		{
			field: 'risk',
			readOnly: true,
			value: '1',
		},
	],
})
```
