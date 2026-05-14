
# Data Helpers

Fluent provides global helper functions for creating typed values in `Record()` data fields. These functions are available globally — no import needed.

## Duration()

Creates a duration value in ServiceNow format. Used with `DurationColumn` fields.

```typescript
Duration({ days: 1, hours: 6, minutes: 30, seconds: 15 })
// Serialized to: '1970-01-02 06:30:15'
```

### Parameters

| Property | Type | Description |
|----------|------|-------------|
| `days` | `number` | Optional. Number of days |
| `hours` | `number` | Optional. Number of hours |
| `minutes` | `number` | Optional. Number of minutes |
| `seconds` | `number` | Optional. Number of seconds |

### Example

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['my-sla-record'],
    table: 'contract_sla',
    data: {
        name: 'Priority 1 SLA',
        duration: Duration({ days: 0, hours: 4 }),
    },
})
```

## Time()

Creates a time-of-day value in ServiceNow format (UTC). Used with `TimeColumn` fields.

The time is converted from the specified timezone to UTC. If no timezone is provided, the system timezone is used.

```typescript
// System timezone (default)
Time({ hours: 14, minutes: 30, seconds: 0 })

// Explicit timezone — 14:30 EST converts to 19:30 UTC
Time({ hours: 14, minutes: 30, seconds: 0 }, 'America/New_York')

// UTC (no conversion)
Time({ hours: 9, minutes: 0, seconds: 0 }, 'UTC')
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value.hours` | `number` | Optional. Hour (0-23) |
| `value.minutes` | `number` | Optional. Minutes (0-59) |
| `value.seconds` | `number` | Optional. Seconds (0-59) |
| `timeZone` | `string` | Optional. IANA timezone (e.g., `'America/New_York'`, `'UTC'`). Defaults to system timezone |

### Example

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['daily-job'],
    table: 'sysauto_script',
    data: {
        name: 'Daily Data Processing',
        run_time: Time({ hours: 9, minutes: 0, seconds: 0 }, 'UTC'),
    },
})
```

## TemplateValue()

Creates a template value serialized as a ServiceNow encoded query string. Used with `TemplateValueColumn` fields.

Supports a generic table parameter for type-safe field IntelliSense.

```typescript
// Generic — accepts any key/value pairs
TemplateValue({ cost: 100, description: 'Item', active: true })
// Serialized to: 'cost=100^description=Item^active=true^EQ'

// Table-specific — provides IntelliSense for sc_cat_item fields
TemplateValue<'sc_cat_item'>({ cost: 100, description: 'Item', category: 'Hardware' })
```

### Example

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['onboarding-task'],
    table: 'sc_cat_item',
    data: {
        name: 'New Laptop Request',
        template: TemplateValue<'sc_req_item'>({
            short_description: 'Laptop setup',
            priority: 2,
            assignment_group: 'IT Hardware',
        }),
    },
})
```

## FieldList()

Creates a comma-separated list of field names. Used with `FieldListColumn` and `SlushBucketColumn` fields.

Supports a generic table parameter for type-safe field IntelliSense, including dot-walk paths.

```typescript
// Generic — accepts any strings
FieldList(['name', 'description', 'cost'])
// Serialized to: 'name,description,cost'

// Table-specific — provides IntelliSense and dot-walk support
FieldList<'sc_cat_item'>(['name', 'description', 'cost', 'category', 'assigned_to.name'])
```

### Example

```typescript
import { Table, FieldListColumn, TableNameColumn } from '@servicenow/sdk/core'

Table({
    name: 'x_myapp_config',
    label: 'Config',
    schema: {
        target_table: TableNameColumn({ label: 'Target Table' }),
        display_fields: FieldListColumn({ label: 'Display Fields', dependent: 'target_table' }),
    },
})

Record({
    $id: Now.ID['config-record'],
    table: 'x_myapp_config',
    data: {
        target_table: 'sc_cat_item',
        display_fields: FieldList<'sc_cat_item'>(['name', 'description', 'cost', 'availability']),
    },
})
```

