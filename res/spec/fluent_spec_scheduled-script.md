# **Context**: Scheduled Script spec: creates a Scheduled Script Execution (`sys_script_execution`) in ServiceNow using the dedicated `ScheduledScript` Fluent API.

```typescript
// Creates a new Scheduled Script Execution using the Fluent API
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
  $id: '', // string | guid, mandatory
  name: '', // string, optional - display name of the scheduled script
  script: '', // string, optional - script to execute (supports Now.include() for external files)
  active: true, // boolean, optional - whether the scheduled job is active (default: true)
  conditional: false, // boolean, optional - if true, job only runs when condition evaluates to true (default: false)
  condition: '', // string, optional - script-based condition, evaluated only when conditional is true
  frequency: '', // RunType, optional - frequency at which the job runs
    // Valid values: 'daily' | 'weekly' | 'monthly' | 'periodically' | 'once' | 'on_demand' | 'day_and_month_in_year' | 'day_week_month_year' | 'week_in_month' | 'business_calendar_start' | 'business_calendar_end'
  timeZone: '', // 'floating' | TimeZone, optional - time zone in which the job runs (default: 'floating')
  dayOfWeek: '', // 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday', optional - specific day for weekly jobs
  daysOfWeek: [], // DayOfWeek[], optional - multiple days of the week (array, at least one element)
  dayOfMonth: 1, // number (1-31), optional - day of month for monthly jobs
  weekInMonth: 1, // number (1-6), optional - week within the month (1=First through 6=Sixth)
  month: 1, // number (1-12), optional - month for yearly jobs
  executionTime: { hours: 0, minutes: 0, seconds: 0 }, // TimeOfDay, optional - time of day when the job runs ({ hours?, minutes?, seconds? })
  executionInterval: { days: 0, hours: 0, minutes: 0, seconds: 0 }, // Duration, optional - interval between runs for periodic jobs ({ days?, hours?, minutes?, seconds? })
  executionStart: '', // string, optional - date/time when the job should start running
  executionEnd: '', // string, optional - date/time when the job should stop running
  offset: { days: 0, hours: 0, minutes: 0, seconds: 0 }, // Duration, optional - offset duration from the scheduled time
  offsetType: '', // 'future' | 'past', optional - direction of offset
  runAs: '', // string | Record<'sys_user'>, optional - user whose credentials are used to execute the job
  userTimeZone: '', // TimeZone, optional - time zone context for GlideDateTime calculations inside the script
  maxDrift: { days: 0, hours: 0, minutes: 0, seconds: 0 }, // Duration, optional - maximum time the job can drift before being cancelled
  repeatEvery: 1, // number, optional - for recurring types, repeat only every Nth occurrence
  upgradeSafe: false, // boolean, optional - preserve during upgrades (default: false)
  advanced: false, // boolean, optional - whether the job can run in advanced mode (default: false)
  businessCalendar: '', // string | Record<'business_calendar'>, optional - reference to business calendar for calendar-based scheduling
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this scheduled job
})
```
