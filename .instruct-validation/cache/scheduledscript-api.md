# Function: ScheduledScript(config)

Creates a Scheduled Script Execution: a server-side script that runs automatically
on a defined schedule (`sys_script_execution`).

## Parameters

### config

`ScheduledScript`

Configuration for the scheduled script

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **active** (optional, default: true): `boolean`
  Indicates whether the scheduled job is active and will run

- **advanced** (optional, default: false): `boolean`
  Indicates whether this job can run in advanced mode

- **businessCalendar** (optional): `string | Record<'business_calendar'>`
  Reference to a business calendar for calendar-based scheduling (sys_id of business_calendar) or new calendar record

- **condition** (optional): `string`
  Script-based condition that must evaluate to true for the job to run.
  Only evaluated when conditional is true.

- **conditional** (optional, default: false): `boolean`
  If true, the job only runs when the condition script evaluates to true.
  Allows conditional execution of the job.

- **dayOfMonth** (optional): `DayOfMonth`
  Day of the month when the job runs (1-31)

- **dayOfWeek** (optional): `DayOfWeek`
  Specific day of the week when the job runs (for weekly jobs)

- **daysOfWeek** (optional): `[DayOfWeek, ...DayOfWeek[]]`
  Days of the week when the job runs (array of day names)

- **executionEnd** (optional): `string`
  Date and time when the job should stop running. Jobs with ending values in the past are marked inactive

- **executionInterval** (optional): `Duration`
  Interval between runs for periodic jobs

- **executionStart** (optional): `string`
  Date and time when the job should start running

- **executionTime** (optional): `TimeOfDay`
  Time of day when the job runs

- **frequency** (optional): `RunType`
  Frequency at which the job runs.

- **maxDrift** (optional): `Duration`
  Maximum time the job can drift from its scheduled time before being cancelled

- **month** (optional): `MonthOfYear`
  Month when the job runs (1-12, for yearly jobs)

- **name** (optional): `string`
  Name of the scheduled script execution job

- **offset** (optional): `Duration`
  Offset duration from the scheduled time

- **offsetType** (optional): `'future' | 'past'`
  Direction of offset from the scheduled time.
  - **future**: Job runs after the scheduled time
  - **past**: Job runs before the scheduled time

- **protectionPolicy** (optional): `'read' | 'protected'`
  The policy determines whether someone can view or edit the scheduled job after the application is installed.
  - **read**: Allow other developers to see the script logic, but not change it
  - **protected**: Prevent other developers from changing this scheduled job
  - **undefined**: Allow other developers to customize the scheduled job

- **repeatEvery** (optional): `number`
  For recurring trigger types, repeat only every Nth occurrence (e.g., 3 means every 3rd occurrence)

- **runAs** (optional): `string | Record<'sys_user'>`
  User whose credentials are used to execute the scheduled job (sys_id or username)

- **script** (optional): `string | (...args: any[]) => void`
  Script to be executed when the job runs.
  Use `Now.include('./script.js')` for file-based editing with full IDE support (recommended),
  or provide an inline string. Module imports are not supported (string-only property)

- **timeZone** (optional, default: 'floating'): `'floating' | TimeZone`
  Time zone in which the job runs. Accepts `'floating'` for system time zone,
  or any IANA timezone identifier (e.g. `'UTC'`, `'US/Pacific'`, `'America/New_York'`).
  Standard ServiceNow platform timezones provide autocomplete; custom timezone strings are also accepted

- **upgradeSafe** (optional, default: false): `boolean`
  Indicates if this scheduled job should be preserved during upgrades

- **userTimeZone** (optional): `string`
  Time zone context for any GlideDateTime or relative date calculations inside the script.
  Defaults to the time zone defined in the user profile of the user specified in the "Run as" field.

- **weekInMonth** (optional): `WeekInMonth`
  Week within the month when the job runs (1=First, 2=Second, 3=Third, 4=Fourth, 5=Fifth, 6=Sixth)

## See

- <https://docs.servicenow.com/bundle/latest-platform-administration/page/administer/time/concept/scheduled-jobs.html>

## Examples

### Basic Daily Scheduled Script

Create a simple scheduled script that runs daily at a specific time

```typescript
/**
 * @title Basic Daily Scheduled Script
 * @description Create a simple scheduled script that runs daily at a specific time
 */

import { ScheduledScript } from '@servicenow/sdk/core'

export const DailyMaintenanceJob = ScheduledScript({
    $id: Now.ID['daily_maintenance'],
    name: 'Daily Maintenance Job',
    frequency: 'daily',
    executionTime: { hours: 2, minutes: 0, seconds: 0 },
    script: `
// Daily maintenance script
gs.info('Running daily maintenance...');
`,
})

```

### Monthly Scheduled Script with Conditions

Create a monthly scheduled script with conditional execution and date range

```typescript
/**
 * @title Monthly Scheduled Script with Conditions
 * @description Create a monthly scheduled script with conditional execution and date range
 */

import { ScheduledScript } from '@servicenow/sdk/core'

export const MonthlyBillingJob = ScheduledScript({
    $id: Now.ID['monthly_billing'],
    name: 'Monthly Billing Process',
    active: true,
    frequency: 'monthly',
    dayOfMonth: 1,
    executionTime: { hours: 0, minutes: 0, seconds: 0 },
    executionStart: '2024-01-01 00:00:00',
    executionEnd: '2025-12-31 23:59:59',
    timeZone: 'UTC',
    conditional: true,
    condition: `
// Only run if billing is enabled
var billingEnabled = gs.getProperty('billing.enabled', 'false');
answer = billingEnabled === 'true';
`,
    script: `
// Process monthly billing
gs.info('Processing monthly billing for: ' + new GlideDateTime().getDisplayValue());
`,
})

```

### Periodic Scheduled Script

Create a scheduled script that runs at regular intervals

```typescript
/**
 * @title Periodic Scheduled Script
 * @description Create a scheduled script that runs at regular intervals
 */

import { ScheduledScript } from '@servicenow/sdk/core'

export const PeriodicCheckJob = ScheduledScript({
    $id: Now.ID['periodic_check'],
    name: 'Periodic System Check',
    active: true,
    frequency: 'periodically',
    executionInterval: { hours: 4, minutes: 0, seconds: 0 },
    executionStart: '2024-01-01 00:00:00',
    timeZone: 'UTC',
    script: `
// Run periodic system checks every 4 hours
gs.info('Running system check at: ' + new GlideDateTime().getDisplayValue());
`,
})

```

### Weekly Scheduled Script

Create a scheduled script that runs on specific days of the week

```typescript
/**
 * @title Weekly Scheduled Script
 * @description Create a scheduled script that runs on specific days of the week
 */

import { ScheduledScript } from '@servicenow/sdk/core'

export const WeeklyReportJob = ScheduledScript({
    $id: Now.ID['weekly_report'],
    name: 'Weekly Report Generation',
    active: true,
    frequency: 'weekly',
    daysOfWeek: ['monday', 'wednesday', 'friday'],
    executionTime: { hours: 9, minutes: 0, seconds: 0 },
    timeZone: 'America/New_York',
    script: `
// Generate weekly reports
gs.info('Generating reports for: ' + new GlideDateTime().getDisplayValue());
`,
})

```

### Scheduled Script with External File

Create a scheduled script that uses an external JavaScript file for better IDE support

```typescript
/**
 * @title Scheduled Script with External File
 * @description Create a scheduled script that uses an external JavaScript file for better IDE support
 */

import { ScheduledScript } from '@servicenow/sdk/core'

export const DataCleanupJob = ScheduledScript({
    $id: Now.ID['data_cleanup'],
    name: 'Data Cleanup Job',
    active: true,
    frequency: 'daily',
    executionTime: { hours: 3, minutes: 30, seconds: 0 },
    timeZone: 'America/Los_Angeles',
    script: Now.include('./cleanup-script.js'),
})

```

**cleanup-script.js**

```javascript
(function () {
    gs.info('Starting data cleanup process...')

    var gr = new GlideRecord('sys_audit_delete')
    gr.addQuery('sys_created_on', '<', gs.daysAgo(90))
    gr.query()
    var deletedCount = 0

    while (gr.next()) {
        gr.deleteRecord()
        deletedCount++
    }

    gs.info('Data cleanup completed. Deleted ' + deletedCount + ' records.')
})()
```

### Scheduled Script with Offset

Create a scheduled script that runs with an offset from the scheduled time

```typescript
/**
 * @title Scheduled Script with Offset
 * @description Create a scheduled script that runs with an offset from the scheduled time
 */

import { ScheduledScript } from '@servicenow/sdk/core'

export const DelayedNotificationJob = ScheduledScript({
    $id: Now.ID['delayed_notification'],
    name: 'Delayed Notification Job',
    active: true,
    frequency: 'daily',
    executionTime: { hours: 12, minutes: 0, seconds: 0 },
    offset: { hours: 2, minutes: 30, seconds: 0 },
    offsetType: 'future',
    timeZone: 'America/Chicago',
    script: `
// Send delayed notifications
// This runs at 2:30 PM (12:00 PM + 2.5 hours offset)
gs.info('Sending notifications at: ' + new GlideDateTime().getDisplayValue());
`,
})

```

