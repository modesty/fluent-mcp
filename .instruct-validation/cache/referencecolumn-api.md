# Function: ReferenceColumn(config)

Defines a reference (foreign key) column that links a record to a row in another table. Use `referenceTable` to specify the target table and `cascadeRule` to control what happens to referencing records when the target is deleted.

## Parameters

### config

`C & ReferenceColumnType<RefTable, Type, Default>`

**Properties:**

- **referenceTable** (required): `RefTable`
  Reference a different table as string, escape with `` if definition not present locally (import from `@servicenow/sdk-core/global`)

- **active** (optional): `boolean`
  Indicates whether to display the field in list and forms

- **array** (optional): `boolean`
  Creates another table to store the info that will be captured by this field

- **attributes** (optional): `Record<string, string | number | boolean>`
  Pairs of any supported dictionary attributes (sys_schema_attribute)

- **audit** (optional): `boolean`
  Indicates whether to track the creation, update, and deletion of all records in the table.

- **cascadeRule** (optional): `'none' | 'delete_no_workflow' | 'cascade' | 'delete' | 'restrict' | 'clear'`
  Configure what happens to records that reference a record when that record is deleted.

- **default** (optional): `Default | string`
  Default value of the field when creating a record

- **dependent** (optional): `string`
  limit the values available to select based on the value of the dependent field

- **dynamicCreation** (optional): `boolean`
  If a reference is not found for a reference field then it allows the creation of that target

- **dynamicCreationScript** (optional): `string`
  Populate a new record from a reference field based on the field value

- **elementReference** (optional): `boolean`
  Indicates if the value of this field connotes the "element type"

- **functionDefinition** (optional): `string`
  Definition of a function that the field performs

- **help** (optional): `string`
  Help information for the field

- **hint** (optional): `string`
  Describes field in more verbose form

- **label** (optional): `string | Documentation[]`
  Unique label for the column that appears on list headers and form fields

- **mandatory** (optional): `boolean`
  Indicates whether the field must contain a value to save a record

- **maxLength** (optional): `number | string`
  Maximum length of the field value

- **plural** (optional): `string`
  Plural form of the field name

- **primary** (optional): `boolean`
  Indicates the primary key for a table

- **readOnly** (optional): `boolean`
  Indicates whether you can edit the field value

- **readOnlyOption** (optional): `readOnlyOptionType`
  Specifies the read-only behavior for the field

- **referenceFloats** (optional): `boolean`
  Referenced table's form has an "edit" button in the related list for the current table

- **referenceKey** (optional): `string`
  Sets up a many to many relationship. The value specified is the label describing the relationship.

- **referenceQual** (optional): `string`
  Filter reference based on a filter condition, referenced value, or sys_filter_option_dynamic sys_id

- **spellCheck** (optional): `boolean`
  Enables spell check for this field

- **tableReference** (optional): `boolean`
  Indicates if the value of this field is a reference to another table in the schema

- **textIndex** (optional): `boolean`
  Enables a natural language search on this field

- **unique** (optional): `boolean`
  Creates a unique index on this field

- **widget** (optional): `string`
  Style for the element type such as "radio"

- **xmlView** (optional): `boolean`
  Displays the field value as XML


## Usage

```typescript
import { Table, ReferenceColumn, StringColumn } from '@servicenow/sdk/core';

export default Table({
    name: 'x_myapp_request',
    label: 'Request',
    columns: {
        assigned_to: ReferenceColumn({ label: 'Assigned To', referenceTable: 'sys_user' }),
        category: ReferenceColumn({
            label: 'Category',
            referenceTable: 'x_myapp_category',
            cascadeRule: 'none',
        }),
    },
});
```

## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

