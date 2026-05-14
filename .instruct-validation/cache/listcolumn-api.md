# Function: ListColumn(config)

A Column for a list type field.

## Parameters

### config

`C & Column<Type, Default> & object`

**Properties:**

- **choices** (optional): `Choices<string>`
  Choice values definitions as object literal: { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }

- **dropdown** (optional): `'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none' | 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'`
  How a list of choices displays for users of your form

- **referenceTable** (optional): `keyof Tables`
  Table containing possible values for this list (for reference-based lists)


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

