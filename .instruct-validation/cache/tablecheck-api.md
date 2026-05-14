# Function: TableCheck(config)

Creates a table check that scans records in a specific table (`scan_table_check`).

Supports three modes:
- Condition-only: use `conditions` to filter records (default)
- Script-only: set `advanced: true` and provide a `script`
- Combined: set `advanced: true` with both `conditions` and `script`

## Usage

```typescript
// Condition-based check
TableCheck({
    $id: Now.ID['check-inactive-users'],
    name: 'Inactive Users with Roles',
    active: true,
    category: 'security',
    priority: '2',
    shortDescription: 'Finds inactive users that still have active roles',
    table: 'sys_user',
    conditions: 'active=false^roles!=',
})

// Advanced script-based check
TableCheck({
    $id: Now.ID['check-large-attachments'],
    name: 'Large Attachment Detector',
    active: true,
    category: 'performance',
    priority: '3',
    shortDescription: 'Identifies records with oversized attachments',
    table: 'sys_attachment',
    advanced: true,
    script: Now.include('./check-large-attachments.js'),
})

// Combined conditions and script check
TableCheck({
    $id: Now.ID['check-stale-incidents'],
    name: 'Stale Incident Detector',
    active: true,
    category: 'manageability',
    priority: '2',
    shortDescription: 'Finds incidents that are open and stale',
    table: 'incident',
    advanced: true,
    conditions: 'state!=6^state!=7',
    script: Now.include('./check-stale-incidents.js'),
})
```
## Parameters

### config

`TableCheck<keyof Tables>`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **category** (required): `ScanCategory`
  Classifies what aspect of the instance this check evaluates

- **name** (required): `string`
  Unique name identifying this check

- **priority** (required): `ScanPriority`
  Severity level: 1=Critical, 2=High, 3=Moderate, 4=Low

- **shortDescription** (required): `string`
  Brief summary displayed in scan results

- **table** (required): `keyof Tables`
  Table to scan

- **active** (optional): `boolean`
  Controls whether this check runs during scans. Defaults to true

- **advanced** (optional): `boolean`
  Enables custom script mode instead of condition-based scanning

- **conditions** (optional): `string`
  Encoded query filtering which records to evaluate

- **description** (optional): `string`
  Full explanation of what this check evaluates and why

- **documentationUrl** (optional): `string`
  Link to external documentation for this check

- **findingType** (optional): `unknown`
  Table where findings are stored. Defaults to scan_finding

- **resolutionDetails** (optional): `string`
  Guidance on how to remediate findings from this check

- **runCondition** (optional): `string`
  Encoded query condition that must be met before this check runs

- **scoreMax** (optional): `number`
  Maximum number of findings for scoring calculation

- **scoreMin** (optional): `number`
  Minimum number of findings before scoring applies

- **scoreScale** (optional): `number`
  Multiplier applied to the finding count for scoring

- **script** (optional): `string`
  Server-side script executed when the check runs

- **useManifest** (optional): `boolean`
  Uses the upgrade manifest to scope findings to changed records



## Examples

### Basic Table Check

Create instance scan checks that scan records in specific tables using conditions or advanced scripts

```typescript
/**
 * @title Basic Table Check
 * @description Create instance scan checks that scan records in specific tables using conditions or advanced scripts
 */

import { TableCheck } from '@servicenow/sdk/core'

export const inactiveUsersWithRoles = TableCheck({
    $id: Now.ID['check-inactive-users-roles'],
    name: 'Inactive Users with Roles',
    active: true,
    category: 'security',
    priority: '2',
    shortDescription: 'Finds inactive users that still have active role assignments',
    table: 'sys_user',
    conditions: 'active=false^roles!=',
    description:
        'Identifies user accounts that have been deactivated but still retain role assignments, which may pose a security risk if the accounts are reactivated.',
    resolutionDetails:
        'Remove role assignments from inactive user accounts or confirm the roles are intentionally retained for reactivation.',
})

export const largeAttachmentCheck = TableCheck({
    $id: Now.ID['check-large-attachments'],
    name: 'Large Attachment Detector',
    active: true,
    category: 'performance',
    priority: '3',
    shortDescription: 'Identifies records with oversized attachments that impact performance',
    table: 'sys_attachment',
    advanced: true,
    script: Now.include('./check-large-attachments.js'),
    useManifest: true,
})

export const staleIncidentCheck = TableCheck({
    $id: Now.ID['check-stale-incidents'],
    name: 'Stale Incident Detector',
    active: true,
    category: 'manageability',
    priority: '2',
    shortDescription: 'Finds incidents that are open and stale',
    table: 'incident',
    advanced: true,
    conditions: 'state!=6^state!=7',
    script: Now.include('./check-stale-incidents.js'),
})

```

**check-large-attachments.js**

```javascript
;(function checkLargeAttachments(current) {
    if (current.size_bytes > 10485760) {
        finding.increment()
    }
})(current)
```

**check-stale-incidents.js**

```javascript
;(function checkStaleIncidents(current) {
    var lastUpdated = new GlideDateTime(current.sys_updated_on)
    var now = new GlideDateTime()
    var diff = GlideDateTime.subtract(lastUpdated, now)

    if (diff.getNumericValue() > 7776000000) {
        finding.increment()
    }
})(current)
```

