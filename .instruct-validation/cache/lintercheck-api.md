# Function: LinterCheck(config)

Creates a linter check that runs linting rules against instance code (`scan_linter_check`).

## Usage

```typescript
LinterCheck({
    $id: Now.ID['lint-gs-print'],
    name: 'Detect gs.print Usage',
    active: true,
    category: 'upgradability',
    priority: '3',
    shortDescription: 'Flags usage of gs.print which is deprecated',
})
```
## Parameters

### config

`LinterCheck`

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

### Basic Linter Check

Create instance scan linter checks that enforce coding standards

```typescript
/**
 * @title Basic Linter Check
 * @description Create instance scan linter checks that enforce coding standards
 */

import { LinterCheck } from '@servicenow/sdk/core'

export const deprecatedApiCheck = LinterCheck({
    $id: Now.ID['lint-deprecated-api'],
    name: 'Deprecated API Usage',
    active: true,
    category: 'upgradability',
    priority: '3',
    shortDescription: 'Flags usage of deprecated GlideRecord and GlideSystem APIs',
    description:
        'Scans server-side scripts for calls to deprecated APIs that may be removed in future platform releases.',
    resolutionDetails:
        'Replace deprecated API calls with their recommended alternatives as documented in the ServiceNow API reference.',
    documentationUrl: 'https://docs.servicenow.com',
})

export const performanceLintCheck = LinterCheck({
    $id: Now.ID['lint-performance'],
    name: 'GlideRecord in Client Scripts',
    active: true,
    category: 'performance',
    priority: '2',
    shortDescription: 'Detects synchronous GlideRecord calls in client-side scripts',
})

```

