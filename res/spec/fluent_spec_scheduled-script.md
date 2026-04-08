# **Context**: Scheduled Script spec: creates a Scheduled Script Execution (`sysauto_script`) in ServiceNow. SDK v4.5.0 introduces a dedicated `ScheduledScript` Fluent API alongside the existing Record API approach.

## ScheduledScript Fluent API (SDK v4.5.0)

```typescript
// Creates a new Scheduled Script Execution (`sysauto_script`) using the dedicated Fluent API
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: '', // string | guid, mandatory
	name: '', // string, mandatory - display name of the scheduled script
	active: true, // boolean, optional - whether the scheduled script is active
	conditional: false, // boolean, optional - whether execution depends on a condition script
	condition: '', // string, optional - server-side script that returns a boolean, mandatory only if `conditional` is `true`
	runType: 'daily', // string, mandatory - execution schedule type
	  // Valid values: 'daily' | 'weekly' | 'monthly' | 'periodically' | 'once' | 'on_demand' | 'business_calendar_start' | 'business_calendar_end'
	timeZone: '', // string, optional - the time zone for the job, mandatory if `runType` is `daily`, `weekly`, or `monthly`
	runDayofweek: 1, // number, optional - day of week (1=Monday to 7=Sunday), mandatory if `runType` is `weekly`
	runDayofmonth: 1, // number, optional - day of month (1-31), mandatory if `runType` is `monthly`
	runPeriod: '1970-01-01 00:00:00', // string, optional - repeat interval as datetime offset from epoch, mandatory if `runType` is `periodically`
	runStart: '', // string, optional - job starting time (YYYY-MM-DD HH:MM:SS), mandatory if `runType` is `periodically` or `once`
	runTime: '1970-01-01 00:00:00', // string, optional - execution time per occurrence (YYYY-MM-DD HH:MM:SS), mandatory if `runType` is `daily`, `weekly`, or `monthly`
	businessCalendar: '', // string, optional - sys_id of business_calendar, mandatory if `runType` is `business_calendar_start` or `business_calendar_end`
	script: '', // string, mandatory - ServiceNow server-side script to execute
})
```

## Record API approach (legacy, still supported)

```typescript
// Creates a new Scheduled Script Execution (`sysauto_script`) using the Record API
Record({
	$id: '', // string | guid, mandatory
	table: 'sys_auto_script',
	data: {
		name: '', // string
		active: true, // boolean
		conditional: false, // boolean
		condition: '', // string, a ServiceNow server side script that returns a boolean (i.e. `GlidePluginManager.isActive('sn_generative_ai');`), mandatory only if `conditional` is `true`
		runType: 'daily', // string
		timeZone: '', // string, the time zone for the job, mandatory only if `runType` is `daily` or `weekly` or `monthly`
		runDayofweek: 1, // number, mandatory if `runType` is `weekly`
		runDayofmonth: 1, // number, mandatory if `runType` is `monthly`, can take any number between `1` and `31` which represents the specific calender day
		runPeriod: '1970-01-01 00:00:00', // string, mandatory only if `runType` is `periodically`
		runStart: '', // string, job starting time, default value should be the user's current time, mandatory if `runType` is `periodically` or `once`
		runTime: '1970-01-01 00:00:00', // string, the execution time per job occurence, mandatory only if `runType` is `daily`, `weekly`, or `monthly`
		businessCalendar: get_sys_id('business_calendar', ''), // string, mandatory only if `runType` is `business_calendar_start` or `business_calendar_end`
		script: '', // ServiceNow script to fullfil the functional request in scripting,
	}
})
```
