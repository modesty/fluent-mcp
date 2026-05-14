
# Scheduled Script Guide

Create ServiceNow Scheduled Script Executions (`sysauto_script`) to run server-side logic on a time-based schedule. This guide covers all 11 frequency types, script file patterns, timezone handling, conditional execution, business calendar integration, and best practices. Supported in SDK 4.5.0 or higher.

## When to Use

- Running server-side logic at a fixed time every day, week, month, or year
- Recurring background maintenance tasks (data cleanup, archiving, cache refresh)
- Periodic data synchronization with external systems
- Generating scheduled reports or summary notifications
- Executing a script exactly once at a future date/time
- Running a script manually on-demand (no automated trigger)
- Scheduling jobs that align with business calendar entries
- Repeating at a custom interval (e.g., every 4 hours, every 30 minutes)

## Do NOT Use For

- **Structured bulk data imports** (CSV, LDAP, REST sources with transform maps)
- **Multi-step orchestrations** with branching conditions and discrete actions on a timer

## Core Principles

1. **Choose `frequency` first:** This determines which companion fields are required and which are ignored.
2. **Use `Now.include` for scripts:** The ScheduledScript API only accepts strings, so reference an external `.js` file with `Now.include('../../server/scheduled-scripts/my-job.js')`. The script must use an IIFE: `(function() { ... })();`.
3. **`timeZone`:** All times in `executionStart`, `executionEnd`, and `executionTime` are interpreted in the `timeZone` you set. Use `'floating'` to always match the platform's current system timezone. Avoid setting unless explicitly specified by the user.
4. **`executionInterval` is exclusive to `periodically`:** Setting it on any other frequency is a build error.
5. **`daysOfWeek` is required for `weekly`:** Omitting it is a build error.
6. **`businessCalendar` is required for calendar types:** Both `business_calendar_start` and `business_calendar_end` require it.
7. **`executionEnd` must allow at least one execution:** For recurring jobs, must be at least one full interval after `executionStart`.

## Quick Decision Guide

| User says | Use `frequency` | Required extra fields |
|-----------|-----------------|----------------------|
| "every day at X", "nightly", "daily" | `daily` | `executionTime` |
| "every Monday", "on Tuesdays and Fridays" | `weekly` | `daysOfWeek` (mandatory; array of lowercase names) |
| "first of the month", "every month on day X" | `monthly` | `dayOfMonth` (1-31; 31 = month-end) |
| "every N hours/minutes", "periodically" | `periodically` | `executionInterval` (mandatory), `executionStart` recommended |
| "once", "one-time", "migration" | `once` | `executionStart` |
| "manually", "on demand" | `on_demand` | (none) |
| "every year on [month] [day]" | `day_and_month_in_year` | `month` (1-12), `dayOfMonth` (1-31) |
| "second Monday of every month" | `week_in_month` | `weekInMonth` (1-6), `dayOfWeek` |
| "third Tuesday of March every year" | `day_week_month_year` | `dayOfWeek`, `weekInMonth`, `month` |
| "when business period starts" | `business_calendar_start` | `businessCalendar` |
| "when business period ends" | `business_calendar_end` | `businessCalendar` |

### Do I need `executionTime`?

- Recommended for: `daily`, `weekly`, `monthly`, `day_and_month_in_year`, `week_in_month`, `day_week_month_year`
- Not applicable: `periodically` (uses `executionInterval`), `once` (uses `executionStart`), `on_demand`

### Do I need `executionStart`?

- Recommended: `periodically`, `once`
- Optional: all other types (use to define when the first execution is eligible)
- If you do not have date/time context from the user, omit it -- Fluent will auto-populate with the current date/time during build.

## API Reference

For the full property reference, see the `scheduledscript-api` topic.

### Valid Frequency Values

`'daily'`, `'weekly'`, `'monthly'`, `'periodically'`, `'once'`, `'on_demand'`, `'day_and_month_in_year'`, `'day_week_month_year'`, `'week_in_month'`, `'business_calendar_start'`, `'business_calendar_end'`

## Run Type Details

- **`daily`** -- Runs once per day at `executionTime`.
- **`weekly`** -- Runs on specific weekdays. Requires `daysOfWeek` (array).
- **`monthly`** -- Runs on a fixed day. Requires `dayOfMonth`. If the day does not exist in a month (e.g., 31 in February), it runs on the last day instead. So `dayOfMonth: 31` effectively becomes a month-end job.
- **`periodically`** -- Repeats at a fixed interval. Requires `executionInterval`. Avoid seconds or single-digit minutes for performance. If a run is still executing when the next fires, the platform skips that trigger silently.
- **`once`** -- Runs once at `executionStart`, then stops.
- **`on_demand`** -- Never runs automatically; triggered manually.
- **`day_and_month_in_year`** -- Runs annually on a fixed date. Requires `month` + `dayOfMonth`.
- **`week_in_month`** -- Runs on a specific week ordinal. Requires `weekInMonth` + `dayOfWeek`.
- **`day_week_month_year`** -- Runs on a specific weekday in a specific week in a specific month each year.
- **`business_calendar_start`** / **`business_calendar_end`** -- Fires when calendar entries begin/end. Requires `businessCalendar`.

## Script File Pattern

The ScheduledScript API only accepts strings for its `script` property, so use `Now.include()` to reference external script files. Place script files under `src/server/` and IIFE-wrap them:

```text
src/
  server/
    scheduled-scripts/
      my-job.js              <- JavaScript logic (IIFE)
  fluent/
    scheduled-scripts/
      my-job.now.ts          <- Fluent record definition
```

The script file must use an IIFE:

```javascript
(function () {
  // your logic here
})();
```

Reference it from the `.now.ts` file:

```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
    $id: Now.ID['my-job'],
    name: 'My Job',
    script: Now.include('../../server/scheduled-scripts/my-job.js'),
    frequency: 'daily',
    executionTime: Time({ hours: 2, minutes: 0 }),
})
```

> **Note:** Unlike BusinessRule and ScriptAction, the ScheduledScript API does not accept function types. Module imports will produce a TypeScript error. Use `Now.include()` or inline strings.

### Script Best Practices

1. Always use an IIFE wrapper
2. Add try-catch blocks for error handling
3. Use `gs.info()` for success, `gs.error()` for failures, `gs.debug()` for tracing
4. Keep scripts focused -- one task per scheduled script
5. Use `setLimit()` when processing large datasets
6. Return early on failed preconditions
7. Add JSDoc comments explaining the script's purpose

## Timezone Handling

- `timeZone` -- Controls how `executionStart`, `executionEnd`, and `executionTime` are interpreted. Platform stores UTC internally.
- `'floating'` -- Always uses the platform's currently configured system timezone.
- `userTimeZone` -- Controls timezone for `GlideDateTime` calculations inside the script. Defaults to the `runAs` user's profile timezone.

## Conditional Execution

Set `conditional: true` and provide a `condition` script for dynamic per-cycle skipping:

```typescript
ScheduledScript({
  $id: Now.ID["conditional-job"],
  name: "Weekday-Only Sync",
  script: Now.include("../../server/scheduled-scripts/sync.js"),
  frequency: "daily",
  executionTime: Time({ hours: 6, minutes: 30 }),
  conditional: true,
  condition: `
    var day = gs.getDayOfWeekLocalTime();
    day >= 2 && day <= 6; // Monday (2) through Friday (6)
  `
});
```

Common use cases: weekend/holiday checks, data-driven execution (system property flags), time-specific logic.

## Protection

- `protectionPolicy: 'read'` -- Others can view but not modify
- `protectionPolicy: 'protected'` -- Others cannot view or modify
- Omit to allow full customization

## Business Calendar Best Practices

- Always reference business calendar entries by sys_id from the `business_calendar` table
- The platform provides standard entries for weeks, months, quarters, and years
- If the user provides a specific calendar name or sys_id, use that instead

## Examples

### Basic Daily Job

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["close-resolved-incidents"],
  name: "Close Resolved Incidents",
  script: Now.include("../../server/scheduled-scripts/close-resolved-incidents.js"),
  frequency: "daily",
  executionTime: Time({ hours: 2, minutes: 0 }),
  runAs: "6816f79cc0a8016401c5a33be04be441",
});
```

**Script file** (`src/server/scheduled-scripts/close-resolved-incidents.js`):

```javascript
(function () {
  var gr = new GlideRecord("incident");
  gr.addEncodedQuery("state=6^sys_updated_onRELATIVELT@dayofweek@ago@30");
  gr.query();

  var count = 0;
  while (gr.next()) {
    gr.state = 7;
    gr.update();
    count++;
  }
  gs.info("Closed " + count + " resolved incidents older than 30 days");
})();
```

### Weekly Job

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["weekly-sla-report"],
  name: "Weekly SLA Report",
  script: Now.include("../../server/scheduled-scripts/weekly-sla-report.js"),
  frequency: "weekly",
  daysOfWeek: ["monday", "friday"],
  executionTime: Time({ hours: 7, minutes: 0 }),
});
```

### Periodically (Every 4 Hours)

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["periodic-sync"],
  name: "Periodic Data Sync",
  script: Now.include("../../server/scheduled-scripts/sync.js"),
  frequency: "periodically",
  executionInterval: Duration({ hours: 4 }),
  advanced: true,
});
```

### One-Time Migration

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["one-time-migration"],
  name: "Data Migration Script",
  script: Now.include("../../server/scheduled-scripts/migration.js"),
  frequency: "once",
  executionStart: "2026-06-15 02:00:00",
});
```

### On-Demand

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["manual-cache-refresh"],
  name: "Manual Cache Refresh",
  script: Now.include("../../server/scheduled-scripts/cache-refresh.js"),
  frequency: "on_demand",
});
```

### Monthly (Last Day)

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["monthly-report"],
  name: "Monthly Report Generator",
  script: Now.include("../../server/scheduled-scripts/monthly-report.js"),
  frequency: "monthly",
  dayOfMonth: 31,
  executionTime: Time({ hours: 23, minutes: 0 }),
});
```

### Annual Job

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["annual-license-review"],
  name: "Annual License Review",
  script: Now.include("../../server/scheduled-scripts/license-review.js"),
  frequency: "day_and_month_in_year",
  month: 1,
  dayOfMonth: 15,
  executionTime: Time({ hours: 9, minutes: 0 }),
});
```

### Week-in-Month Job

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["second-monday-report"],
  name: "Second Monday Report",
  script: Now.include("../../server/scheduled-scripts/biweekly-report.js"),
  frequency: "week_in_month",
  weekInMonth: 2,
  dayOfWeek: "monday",
  executionTime: Time({ hours: 8, minutes: 0 }),
});
```

### Daily with Inline Script

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["daily-notification"],
  name: "Daily Morning Notification",
  script: `(function() {
    gs.eventQueue('x_myapp.daily.notification', null, gs.nowDateTime(), gs.getUserID());
    gs.info('Daily notification sent at ' + gs.nowDateTime());
  })()`,
  frequency: "daily",
  executionTime: Time({ hours: 9, minutes: 0 }),
});
```

### Daily with Bounded Execution Period

```typescript
import "@servicenow/sdk/global";
import { ScheduledScript } from "@servicenow/sdk/core";

ScheduledScript({
  $id: Now.ID["q1-daily-report"],
  name: "Q1 Daily Status Report",
  script: Now.include("../../server/scheduled-scripts/q1-daily-report.js"),
  frequency: "daily",
  executionTime: Time({ hours: 8, minutes: 0 }),
  executionStart: "2026-01-01 08:00:00",
  executionEnd: "2026-03-31 23:59:59",
});
```

