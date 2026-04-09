# Instructions on Scheduled Script API
Always reference the Scheduled Script API specifications for more details.
1. Import `ScheduledScript` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`. This creates a `sys_script_execution` record.
2. The `frequency` property defines the execution schedule. Valid values: `daily` | `weekly` | `monthly` | `periodically` | `once` | `on_demand` | `day_and_month_in_year` | `day_week_month_year` | `week_in_month` | `business_calendar_start` | `business_calendar_end`.
3. The `dayOfWeek` property takes a day name string: `'monday'` | `'tuesday'` | `'wednesday'` | `'thursday'` | `'friday'` | `'saturday'` | `'sunday'`. Use for weekly jobs. For multiple days, use `daysOfWeek` array instead.
4. The `dayOfMonth` property takes a number from `1` to `31` for monthly jobs. The `weekInMonth` property takes `1` to `6` (1=First through 6=Sixth). The `month` property takes `1` to `12` for yearly frequency types.
5. `executionTime` is a `TimeOfDay` object: `{ hours?: number, minutes?: number, seconds?: number }`. Example: `executionTime: { hours: 15, minutes: 0, seconds: 0 }`. `executionStart` and `executionEnd` are date/time strings for job start/stop bounds.
6. `executionInterval` is a `Duration` object: `{ days?: number, hours?: number, minutes?: number, seconds?: number }`. Example: a job that runs every 1.5 days uses `executionInterval: { days: 1, hours: 12 }`. `offset` and `maxDrift` also use the `Duration` type.
7. For `frequency: 'weekly'`, the SDK requires `daysOfWeek` (array of day name strings, at least one element), not `dayOfWeek` (single day). Example: `daysOfWeek: ['monday', 'thursday']`.
8. The second parameter of the `get_sys_id` function for `businessCalendar` should always query for both `calendar_name` and `label` field. Valid values: `Year`, `Quarter`, `Month`, `Week`. Example: `calendar_name=Month^ORlabel=Month`.
9. `timeZone` defaults to `'floating'` (system time zone). Other values include: `'US/Pacific'` | `'US/Mountain'` | `'US/Central'` | `'US/Eastern'` | `'GMT'` | `'Europe/London'` | `'Europe/Amsterdam'` | `'Europe/Berlin'` | `'Europe/Paris'` | and other standard IANA time zones.
10. Use `runAs` to specify which user's credentials execute the job. Use `offset` and `offsetType` ('future'|'past') to shift execution relative to the scheduled time.
11. Use `script` with `Now.include('./script.js')` for file-based editing with full IDE support (recommended), or provide an inline script string.
