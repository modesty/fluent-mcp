# Function: ScriptOnlyCheck(config)

Creates a script-only check that executes a standalone script with no table binding (`scan_script_only_check`).

## Usage

```typescript
ScriptOnlyCheck({
    $id: Now.ID['check-admin-overuse'],
    name: 'Admin Role Overuse',
    active: true,
    category: 'security',
    priority: '1',
    shortDescription: 'Detects excessive admin role assignments',
    script: Now.include('./check-admin-overuse.js'),
})
```
## Parameters

### config

`ScriptOnlyCheck`

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

- **active** (optional): `boolean`
  Controls whether this check runs during scans. Defaults to true

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



## Examples

### Basic Script Only Check

Create instance scan checks that run standalone scripts without table bindings

```typescript
/**
 * @title Basic Script Only Check
 * @description Create instance scan checks that run standalone scripts without table bindings
 */

import { ScriptOnlyCheck } from '@servicenow/sdk/core'

export const adminRoleOveruseCheck = ScriptOnlyCheck({
    $id: Now.ID['check-admin-overuse'],
    name: 'Admin Role Overuse',
    active: true,
    category: 'security',
    priority: '1',
    shortDescription: 'Detects excessive admin role assignments across user accounts',
    script: Now.include('./check-admin-overuse.js'),
    description:
        'Queries sys_user_has_role to identify accounts with admin privileges and flags instances where more than 5% of active users hold the admin role.',
    resolutionDetails: 'Review admin role assignments and replace with more granular roles where possible.',
})

export const orphanedRecordCheck = ScriptOnlyCheck({
    $id: Now.ID['check-orphaned-records'],
    name: 'Orphaned Update Set Records',
    active: true,
    category: 'manageability',
    priority: '4',
    shortDescription: 'Finds update set records referencing deleted metadata',
    scoreMin: 0,
    scoreMax: 50,
    scoreScale: 2,
})

```

**check-admin-overuse.js**

```javascript
;(function checkAdminOveruse() {
    var gr = new GlideAggregate('sys_user_has_role')
    var adminCount = 0
    gr.addQuery('role.name', 'admin')
    gr.addQuery('user.active', true)
    gr.addAggregate('COUNT')
    gr.query()

    if (gr.next()) {
        adminCount = parseInt(gr.getAggregate('COUNT'))
        if (adminCount > 10) {
            finding.increment()
        }
    }
})()
```

