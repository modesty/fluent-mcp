# Define conditional field styles for list and form views in ServiceNow Fluent

```typescript
import { Record } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// One record per (table, field, trigger value) — a three-state colour scheme is three records.
// A static `value` applies in LIST view only, when the field equals it.
Record({
  $id: Now.ID['style_incident_priority_critical'],
  table: 'sys_ui_style',
  data: {
    name: 'incident',
    element: 'priority',
    value: '1',
    style: 'background-color:tomato;',
    // Paired themed_style so Polaris-themed instances render with a design token.
    themed_style: 'background-color: RGB(var(--now-color_alert--critical-0, 226,63,74))',
    alt: 'Critical priority',
  },
})

Record({
  $id: Now.ID['style_incident_priority_high'],
  table: 'sys_ui_style',
  data: {
    name: 'incident',
    element: 'priority',
    value: '2',
    style: 'background-color:orange;',
    themed_style: 'background-color: RGB(var(--now-color_alert--high-0, 240,148,42))',
    alt: 'High priority',
  },
})

// Text styling with no background colour at all — `style` is not limited to background-color.
// A javascript: expression also applies in LIST view only, when it returns true.
Record({
  $id: Now.ID['style_incident_overdue_text'],
  table: 'sys_ui_style',
  data: {
    name: 'incident',
    element: 'due_date',
    // Only ONE javascript: entry is supported, so both conditions live in a single expression.
    value: 'javascript:current.due_date < gs.nowDateTime() && current.state != 7',
    style: 'color:red;font-weight:bold;',
  },
})

// Layout style that must apply to EVERY row. An empty `value` would apply only to blank cells,
// so use the always-true idiom instead.
Record({
  $id: Now.ID['style_incident_number_width'],
  table: 'sys_ui_style',
  data: {
    name: 'incident',
    element: 'number',
    value: 'javascript:1==1;',
    style: 'width:120px;text-align:left;',
  },
})
```
