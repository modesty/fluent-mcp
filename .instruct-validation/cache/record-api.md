# Function: Record(config)

Create a record in any table. This is a low-level function typically used as
a fallback when the specific record type or metadata does not have its own
dedicated API. When possible, prefer using other, dedicated APIs to generate
metadata as those APIs will often have better type safety and will be easier
to use.

## Parameters

### config

**Type:** `object`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`
  `Now.ID` should be used to define the value. See the `keys-file-guide` topic for more details.

- **data** (required): `object`
  Fields and their values in the table.

- **table** (required): `string`
  The name of the table to which the record belongs.

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances. Always use "demo" for sample/demo data.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'

## See

- https://docs.servicenow.com/csh?topicname=record-api-now-ts.html&version=latest

## Examples

### Basic Example Record

Create a simple record on an example table

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['example-1'],
    table: 'sys_example_table',
    data: {
        name: 'John',
        age: 24,
        internal: true,
    },
})
```

### Incident Sample Record

Create a sample/demo record on the incident table

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['incident-1'],
    $meta: { installMethod: 'demo' },
    table: 'incident',
    data: {
        number: 'INC0010001',
        active: true,
        description: 'This is a sample incident description',
        priority: 3,
    },
})

```

