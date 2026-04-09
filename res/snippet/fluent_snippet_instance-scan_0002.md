# Instance Scan API example: ScriptOnlyCheck for validating business rule best practices
```typescript
import { ScriptOnlyCheck } from '@servicenow/sdk/core'

ScriptOnlyCheck({
	$id: Now.ID['scan_br_async_check'],
	name: 'Business Rules Should Use Async When Possible',
	shortDescription: 'Identifies synchronous business rules that could be converted to async',
	description: 'Identifies synchronous business rules that could be converted to async for better performance',
	active: true,
	category: 'performance',
	priority: '3',
	script: `
		(function(engine) {
			var gr = new GlideRecord('sys_script');
			gr.addQuery('when', 'before');
			gr.addQuery('active', true);
			gr.query();
			while (gr.next()) {
				var script = gr.getValue('script') || '';
				if (script.indexOf('current.update()') === -1 && script.indexOf('current.insert()') === -1) {
					engine.finding(gr, 'Consider converting to async business rule for better performance');
				}
			}
		})(engine);
	`,
})
```
