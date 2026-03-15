# Define two incident SLAs: Priority 1 (4-hour response, 8-hour resolution) and Priority 2 (8-hour response, 24-hour resolution), both using business hours schedule

```typescript
import { Sla, Duration } from '@servicenow/sdk/core'

// Priority 1 Response SLA — 4-hour window during business hours
export const incidentP1ResponseSla = Sla({
    $id: Now.ID['incident_p1_response_sla'],
    name: 'P1 Incident Response',
    table: 'incident',
    type: 'SLA',
    target: 'response',
    duration: Duration({ hours: 4 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16', // 8x5 business hours schedule sys_id
    conditions: {
        start: 'priority=1^state!=6',
        stop: 'state=6',
        pause: 'state=3', // On Hold
    },
    whenTo: {
        resume: 'on_condition',
        cancel: 'on_condition',
    },
    conditions: {
        start: 'priority=1^state!=6',
        stop: 'state=6',
        pause: 'state=3',
        resume: 'state!=3',
        cancel: 'priority!=1',
    },
})

// Priority 1 Resolution SLA — 8-hour window
export const incidentP1ResolutionSla = Sla({
    $id: Now.ID['incident_p1_resolution_sla'],
    name: 'P1 Incident Resolution',
    table: 'incident',
    type: 'SLA',
    target: 'resolution',
    duration: Duration({ hours: 8 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16',
    conditions: {
        start: 'priority=1^state!=6',
        stop: 'state=6',
        pause: 'state=3',
        resume: 'state!=3',
        cancel: 'priority!=1',
    },
})

// Priority 2 Resolution SLA — 24-hour window with retroactive start from record creation
export const incidentP2ResolutionSla = Sla({
    $id: Now.ID['incident_p2_resolution_sla'],
    name: 'P2 Incident Resolution',
    table: 'incident',
    type: 'SLA',
    target: 'resolution',
    duration: Duration({ hours: 24 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16',
    conditions: {
        start: 'priority=2^state!=6',
        stop: 'state=6',
    },
    retroactive: {
        start: true,
        setStartTo: 'opened_at',
        pause: true,
    },
})
```
