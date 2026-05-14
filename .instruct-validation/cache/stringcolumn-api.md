# Function: StringColumn(config)

Defines a text column on a table for storing variable-length string values such as names, descriptions, and labels. Use `maxLength` to control the field size and `choices` to restrict input to a predefined set of text values.

## Parameters

### config

`C & StringColumnType<TChoices, Dropdown, Type, Default, ReferenceSchema>`

**Properties:**

- **active** (optional): `boolean`
  Indicates whether to display the field in list and forms

- **array** (optional): `boolean`
  Creates another table to store the info that will be captured by this field

- **attributes** (optional): `Record<string, string | number | boolean>`
  Pairs of any supported dictionary attributes (sys_schema_attribute)

- **audit** (optional): `boolean`
  Indicates whether to track the creation, update, and deletion of all records in the table.

- **choices** (optional): `TChoices`
  Choice values definitions as object literal: { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' },}

- **default** (optional): `Default | string`
  Default value of the field when creating a record

- **dependent** (optional): `string`
  limit the values available to select based on the value of the dependent field

- **dropdown** (optional): `Dropdown | choiceDropdownType`

- **dynamicValueDefinitions** (optional): `DynamicValueDefinitions<ReferenceSchema>`
  Object literal, specify type and then relevant additional parameters for reference choices and script defaults

- **elementReference** (optional): `boolean`
  Indicates if the value of this field connotes the "element type"

- **functionDefinition** (optional): `string`
  Definition of a function that the field performs

- **help** (optional): `string`
  Help information for the field

- **hint** (optional): `string`
  Describes field in more verbose form

- **isFullUTF8** (optional): `boolean`
  Whether the string should be stored as full UTF-8.
  column type will be string_full_utf8 if true

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


## Usage

```typescript
import { Table, StringColumn } from '@servicenow/sdk/core';

export default Table({
    name: 'x_myapp_request',
    label: 'Request',
    columns: {
        short_description: StringColumn({ label: 'Short Description', maxLength: 200 }),
        notes: StringColumn({ label: 'Notes', maxLength: 4000 }),
    },
});
```

## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

