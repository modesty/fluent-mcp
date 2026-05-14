# trigger

Trigger definitions for starting a Flow. Pass a trigger as the first argument to `wfa.trigger()`.

## trigger.record

Triggers that fire in response to record lifecycle events.

| Key | Description |
|-----|-------------|
| `created` | Fires when a record is created on the specified table. |
| `createdOrUpdated` | Fires when a record is created or updated on the specified table. |
| `updated` | Fires when a record is updated on the specified table. |

## trigger.scheduled

Triggers that fire on a time-based schedule.

| Key | Description |
|-----|-------------|
| `daily` | Fires once per day at the specified time. |
| `monthly` | Fires once per month at the specified day and time. |
| `repeat` | Fires repeatedly at a configured interval. |
| `runOnce` | Fires once at a specific date and time. |
| `weekly` | Fires once per week at the specified day and time. |

## trigger.application

Application-specific event triggers.

| Key | Description |
|-----|-------------|
| `inboundEmail` | Fires when an inbound email is received. |
| `knowledgeManagement` | Fires on a Knowledge Management lifecycle event. |
| `remoteTableQuery` | Fires when a remote table query is executed. |
| `serviceCatalog` | Fires when a Service Catalog request item is submitted. |
| `slaTask` | Fires on an SLA task event. |
