# Instance Scan API example: LinterCheck for detecting hardcoded credentials
```typescript
import { LinterCheck } from '@servicenow/sdk/core'

LinterCheck({
	$id: Now.ID['scan_hardcoded_credentials'],
	name: 'Detect Hardcoded Credentials',
	shortDescription: 'Finds potential hardcoded passwords, tokens, or API keys in scripts',
	description: 'Scans all server-side and client-side scripts for patterns that suggest hardcoded credentials, API keys, or secrets',
	active: true,
	category: 'security',
	priority: '1',
	script: `
		(function(engine) {
			var gr = new GlideRecord('sys_script');
			gr.addActiveQuery();
			gr.query();
			while (gr.next()) {
				var script = gr.getValue('script') || '';
				if (/(password|passwd|secret|api_key|apikey|token)\s*[=:]\s*['"][^'"]{4,}/.test(script)) {
					engine.finding(gr, 'Potential hardcoded credential detected. Replace with system properties or credential records.');
				}
			}
		})(engine);
	`,
	resolutionDetails: 'Replace hardcoded credentials with system properties or credential records',
})
```
