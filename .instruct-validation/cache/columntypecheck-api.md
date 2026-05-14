# Function: ColumnTypeCheck(config)

Creates a column type check that scans columns of a specific content type (`scan_column_type_check`).

## Usage

```typescript
ColumnTypeCheck({
    $id: Now.ID['check-script-columns'],
    name: 'Script Column Validator',
    active: true,
    category: 'security',
    priority: '2',
    shortDescription: 'Validates script columns for common security issues',
    columnType: 'script',
})
```
## Parameters

### config

`ColumnTypeCheck`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **category** (required): `ScanCategory`
  Classifies what aspect of the instance this check evaluates

- **columnType** (required): `ColumnType`
  Content type of columns to scan

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

### Basic Column Type Check

Create an instance scan check that validates script columns for common security issues

```typescript
/**
 * @title Basic Column Type Check
 * @description Create an instance scan check that validates script columns for common security issues
 */

import { ColumnTypeCheck } from '@servicenow/sdk/core'

export const scriptColumnSecurityCheck = ColumnTypeCheck({
    $id: Now.ID['script-column-security'],
    name: 'Script Column Security Validator',
    active: true,
    category: 'security',
    priority: '2',
    shortDescription: 'Scans script columns for hardcoded credentials and injection vulnerabilities',
    columnType: 'script',
    description:
        'Inspects all script-type columns across the instance for common security anti-patterns including hardcoded passwords, SQL injection vectors, and unsafe eval usage.',
    resolutionDetails:
        'Remove hardcoded credentials and use system properties or credential records instead. Replace dynamic queries with parameterized alternatives.',
    scoreMin: 0,
    scoreMax: 100,
    scoreScale: 1,
})

export const htmlColumnXssCheck = ColumnTypeCheck({
    $id: Now.ID['html-column-xss'],
    name: 'HTML Column XSS Scanner',
    active: true,
    category: 'security',
    priority: '1',
    shortDescription: 'Detects potential cross-site scripting vulnerabilities in HTML columns',
    columnType: 'html',
})

```

