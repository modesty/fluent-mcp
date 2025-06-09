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
		run_type: 'daily', // string
		time_zone: '', // string, the time zone for the job, mandatory only if `run_type` is `daily` or `weekly` or `monthly`
		run_dayofweek: 1, // number, mandatory if `run_type` is `weekly`
		run_dayofmonth: 1, // number, mandatory if `run_type` is `monthly`, can take any number between `1` and `31` which represents the specific calender day
		run_period: '1970-01-01 00:00:00', // string, mandatory only if `run_type` is `periodically`
		run_start: '', // string, job starting time, default value should be the user's current time, mandatory if `run_type` is `periodically` or `once`
		run_time: '1970-01-01 00:00:00', // string, the execution time per job occurence, mandatory only if `run_type` is `daily`, `weekly`, or `monthly`
		business_calendar: get_sys_id('business_calendar', ''), // string, mandatory only if `run_type` is `business_calendar_start` or `business_calendar_end`
		script: get_glide_script(
			'sysauto_script', // string, always 'sysauto_script'
			'', // string, same as devrequest
			'' // string, extracted ServiceNow script code from devrequest
		),
	}
})
```