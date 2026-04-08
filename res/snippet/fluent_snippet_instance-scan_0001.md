# Instance Scan API example: LinterCheck for detecting hardcoded credentials
```typescript
import { LinterCheck } from '@servicenow/sdk/core'

LinterCheck({
	$id: Now.ID['scan_hardcoded_credentials'],
	name: 'Detect Hardcoded Credentials',
	description: 'Finds potential hardcoded passwords, tokens, or API keys in scripts',
	active: true,
	category: 'Security',
	findType: 'regex',
	findPattern: '(password|passwd|secret|api_key|apikey|token)\\s*[=:]\\s*["\'][^"\']{4,}',
	scriptLanguage: 'javascript',
})
```
