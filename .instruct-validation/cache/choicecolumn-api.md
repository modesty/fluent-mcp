# Function: ChoiceColumn(config)

Defines a column that restricts input to a predefined set of options rendered as a dropdown, radio buttons, or other selection widget. Use `choices` to declare the allowed values and `defaultValue` to set the initial selection.

## Parameters

### config

`C & ChoiceColumnType<TChoices, Type, Default, ReferenceSchema, Dropdown>`

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
import { Table, ChoiceColumn } from '@servicenow/sdk/core';

export default Table({
    name: 'x_myapp_request',
    label: 'Request',
    columns: {
        priority: ChoiceColumn({
            label: 'Priority',
            choices: [
                { label: 'Critical', value: '1' },
                { label: 'High', value: '2' },
                { label: 'Medium', value: '3' },
                { label: 'Low', value: '4' },
            ],
            defaultValue: '3',
        }),
    },
});
```

## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

