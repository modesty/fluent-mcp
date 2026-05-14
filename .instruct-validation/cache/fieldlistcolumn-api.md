# Function: FieldListColumn(config)

A Column for a field list type field.
Contains a list of field names from a specified table, supporting dot-walk notation.
Accepts string values (use fieldList() helper for arrays).

Table context must be provided via one of:
- `dependent` - references another column that provides the table at runtime
- `attributes.table` - specifies the table statically

## Usage

```typescript
// Using dependent for runtime table context
const displayFields = FieldListColumn({
    label: 'Display Fields',
    dependent: 'referenced_table',
    default: fieldList<'sc_cat_item'>(['name', 'description', 'cost']),
})

// Using attributes.table for static table context
const staticFields = FieldListColumn({
    label: 'Forecast Fields',
    attributes: { table: 'sn_sales_forecast_header' },
})
```
## Parameters

### config

`C & FieldListColumnType<T, Type, Default>`

**Properties:**

- **active** (optional): `boolean`
  Indicates whether to display the field in list and forms

- **array** (optional): `boolean`
  Creates another table to store the info that will be captured by this field

- **attributes** (optional): `Record<string, string | number | boolean>`
  Pairs of any supported dictionary attributes (sys_schema_attribute)

- **audit** (optional): `boolean`
  Indicates whether to track the creation, update, and deletion of all records in the table.

- **default** (optional): `Default | string`
  Default value of the field when creating a record

- **dependent** (optional): `string`
  limit the values available to select based on the value of the dependent field

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


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

