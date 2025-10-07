# **Context**: Scheduled Script spec: Used to create a new Scheduled Script Execution [sysauto_script] in ServiceNow using the Record API
```typescript
// Creates a new Scheduled Script Execution (`sysauto_script`)
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