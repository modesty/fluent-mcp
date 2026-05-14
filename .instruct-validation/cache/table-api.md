# Function: Table(table)

Defines a database table (`sys_db_object`) in a scoped application with typed column schemas, auto-numbering, access controls, and table inheritance.

## Parameters

### table

`T & Table<S, E>`

**Properties:**

- **name** (required): `string`
  Name of the table. Must be lowercase and include the application scope

- **schema** (required): `Record<string, Column>`
  Array of column references that define the table's schema

- **accessibleFrom** (optional): `'public' | 'package_private'`
  Application scopes that can access the table.

- **actions** (optional): `('read' | 'update' | 'delete' | 'create')[]`
  List of access options for the table.

- **allowClientScripts** (optional): `boolean`
  Indicates whether to allow design time configuration of client scripts on the table from other application scopes.

- **allowNewFields** (optional): `boolean`
  Indicates whether to allow design time configuration of new fields on the table from other application scope.

- **allowUiActions** (optional): `boolean`
  Indicates whether to allow design time configuration of UI Actions on the table from other application scopes.

- **allowWebServiceAccess** (optional): `boolean`
  Indicates whether web services can make calls to the table.

- **attributes** (optional): `Record<string, string | number | boolean>`
  Pairs of any supported dictionary attributes (sys_schema_attribute).

- **audit** (optional): `boolean`
  Indicates whether to track the creation, update, and deletion of all records in the table.

- **autoNumber** (optional): `object`
  Auto-increment configuration for the tables with a 'number' column. Do not use if table does not have (or inherit) a 'number' column.
  - **number**: `number`

  - **numberOfDigits**: `number`

  - **prefix**: `string`


- **callerAccess** (optional): `'none' | 'tracking' | 'restricted'`
  Access level for cross-scope requests.

- **display** (optional): `string`
  Default display column. Use a column name from the schema.

- **extends** (optional): `keyof Tables`
  The name of any other table on which this table is based.

- **extensible** (optional): `boolean`
  Indicates whether other tables can extend this table.

- **index** (optional): `object[]`
  A list of column references to generate indexes in the metadata XML of the table.

- **label** (optional): `string | Documentation[]`
  A unique label for the table on list and form views.

- **licensingConfig** (optional): `LicensingConfig`
  Configuration for table licensing.

- **liveFeed** (optional): `boolean`
  Indicates if live feeds are available for records in the table.

- **readOnly** (optional): `boolean`
  Indicates whether users can edit fields in the table.

- **scriptableTable** (optional): `boolean`
  Indicates whether the table is a remote table that uses data retrieved from an external source.

- **textIndex** (optional): `boolean`
  Indicates whether search engines index the text in a table.


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest


## Examples

### To-Do Table Example

```typescript
import { Table, StringColumn, DateColumn, IntegerColumn } from '@servicenow/sdk/core'

// Variable name MUST match the name property
export const x_snc_example_to_do = Table({
  name: 'x_snc_example_to_do',
  label: 'My To Do Table',
  display: 'title', // Use the 'title' column as the display column
  schema: {
    title: StringColumn({ mandatory: true }),
    deadline: DateColumn({ label: 'Deadline' }),
    status: StringColumn({
      label: 'Status',
      choices: {
        ready: 'Ready',
        in_progress: 'In Progress',
        completed: 'Completed',
      },
    }),
  },
})
```

### Extending Task Example

```typescript
import { Table, StringColumn, DateColumn, IntegerColumn } from '@servicenow/sdk/core'

// Variable name MUST match the name property
export const x_snc_example_task = Table({
  name: 'x_snc_example_color_task',
  label: 'My Color Task',
  extends: 'task', // Inherit columns from the 'task' table
  schema: {
    color: StringColumn({
      label: 'Color',
      choices: {
        red: 'Red',
        blue: 'Blue',
        green: 'Green',
      },
    }),
  },

  // Configure auto-incrementation for the inherited 'number' column from the parent 'task' table (e.g. CLR0000001, CLR0000002, etc)
  autoNumber: {
    prefix: 'CLR',
    number: 2000,
    numberOfDigits: 7,
  },
})
```

### Override Inherited Columns

```typescript
/**
 * @title Override Inherited Columns
 * @description Examples of overriding inherited column properties in child tables
 */
import { Table, OverrideColumn, StringColumn, ReferenceColumn } from '@servicenow/sdk/core'

// Example 2: Override multiple properties
export const x_override_multiple = Table({
    name: 'x_override_multiple',
    extends: 'task',
    schema: {
        priority: OverrideColumn({
            baseTable: 'task',
            mandatory: true,
            default: '1',
        }),
        state: OverrideColumn({
            baseTable: 'task',
            mandatory: true,
            readOnlyOption: 'display_read_only',
        }),
        description: OverrideColumn({
            baseTable: 'task',
            display: false,
        }),
    },
})
```
