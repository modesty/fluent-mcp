# Function: List(config)

Creates a list view for tables (`sys_ui_list`)

## Parameters

### config

`List<keyof Tables>`

an object containing the following properties:

**Properties:**

- **$id** (optional, deprecated): `string | number | ExplicitKey<string>`
  Deprecated -- List IDs are now derived from other fields. You can omit `$id`.

- **table** (required): `keyof Tables`
  Name of the table for the list

- **columns** (required): `(string | ListElement<keyof Tables> | TableSchemaDotWalk<keyof Tables>)[]`
  An array of columns in the table to display in the list. Each element can be a field name string or a `ListElement` object with the following properties:
  - **element** (required): `string` -- field to display in the column
  - **position** (optional): `number` -- column display order
  - **sum** (optional): `boolean` -- show sum aggregate for this column
  - **maxValue** (optional): `boolean` -- show maximum value aggregate for this column
  - **minValue** (optional): `boolean` -- show minimum value aggregate for this column
  - **averageValue** (optional): `boolean` -- show average value aggregate for this column

- **view** (required): `string | Record<'sys_ui_view'>`
  The UI view (sys_ui_view) to apply to the list (reference record or name of the UI View)

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **parent** (optional): `TableName`
  The table on which the related list appears

- **relationship** (optional): `string | Record<'sys_relationship'>`
  The relationship to apply to the related list


## See

- https://docs.servicenow.com/csh?topicname=list-api-now-ts.html&version=latest


## Examples

### Basic List Configuration

Create a list layout for CMDB server records with a custom view

```typescript
/**
 * @title Basic List Configuration
 * @description Create a list layout for CMDB server records with a custom view
 */
import { Record, List } from '@servicenow/sdk/core'

const llama_task_view_1 = Record({
    table: 'sys_ui_view',
    $id: Now.ID['llama_task_view_1'],
    data: {
        name: 'llama_task_view_1',
        title: 'llama_task_view_1',
    },
})

List({
    table: 'cmdb_ci_server',
    view: llama_task_view_1,
    columns: [
        { element: 'name', position: 0 },
        { element: 'business_unit', position: 1 },
        { element: 'vendor', position: 2 },
        { element: 'cpu_type', position: 3 },
    ],
})

```

### Incident List Configuration

Create a list layout for incident records with common columns

```typescript
/**
 * @title Incident List Configuration
 * @description Create a list layout for incident records with common columns
 */
import { Record, List } from '@servicenow/sdk/core'
const incident_view = Record({
    table: 'sys_ui_view',
    $id: Now.ID['incident_view'],
    data: {
        name: 'incident_view',
        title: 'Incident View',
    },
})

// Create a list view for incidents
List({
    table: 'incident',
    view: incident_view,
    columns: [
        { element: 'number', position: 0 },
        { element: 'short_description', position: 1 },
        { element: 'priority', position: 2 },
        { element: 'state', position: 3 },
        { element: 'assigned_to', position: 4 },
    ],
})

```

### Mobile List View

Create a minimal list layout for mobile devices with essential columns

```typescript
/**
 * @title Mobile List View
 * @description Create a minimal list layout for mobile devices with essential columns
 */
import { Record, List } from '@servicenow/sdk/core'
const mobile_view = Record({
    table: 'sys_ui_view',
    $id: Now.ID['mobile_incident_view'],
    data: {
        name: 'mobile_incident',
        title: 'Mobile Incident View',
    },
})

// Create a list for mobile view with minimal columns
List({
    table: 'incident',
    view: mobile_view,
    columns: [
        { element: 'number', position: 0 },
        { element: 'short_description', position: 1 },
        { element: 'state', position: 2 },
    ],
})

```

