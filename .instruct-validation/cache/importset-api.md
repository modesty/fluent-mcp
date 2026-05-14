# Function: ImportSet(config)

Creates an Import Set: defines how rows in a staging/source table are transformed and loaded into a target table (`sys_transform_map`).

## Parameters

### config

`ImportSet`

an object containing the following properties:

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  Display name of the import set

- **sourceTable** (required): `keyof Tables`
  Source staging table name

- **targetTable** (required): `keyof Tables`
  Target table to insert/update records

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`
  Whether this import set is active

- **copyEmptyFields** (optional): `boolean`
  Copy empty fields from source to target

- **createOnEmptyCoalesce** (optional): `boolean`
  Create new record if coalesce finds no match

- **enforceMandatoryFields** (optional): `'no' | 'onlyMappedFields' | 'allFields'`
  Mandatory field enforcement level
  - 'no': do not enforce target table mandatory fields during transform
  - 'onlyMappedFields': enforce mandatory only for fields you map in `fields`
  - 'allFields': enforce all target table mandatory fields; unmapped required fields must still be provided or the row will be rejected

- **fields** (optional): `{ [targetField: string]: string | ImportSetFieldValue }`
  Field mappings: targetField -> sourceField or configuration object.
  - Simple string: direct field mapping
  - Object (`ImportSetFieldValue`): advanced mapping with the following properties:
    - **sourceField** (optional): `string` -- Name of the source column to map from
    - **coalesce** (optional): `boolean` -- Mark this field as a match key for update-or-insert behavior
    - **coalesceCaseSensitive** (optional): `boolean` -- Whether coalesce matching is case-sensitive
    - **coalesceEmptyFields** (optional): `boolean` -- Whether empty source values participate in coalesce matching
    - **choiceAction** (optional): `'reject' | 'ignore' | 'create'` -- How to handle source values that do not match an existing choice
    - **dateFormat** (optional): `DateFormat` -- Parse dates using a specific format (e.g., `'yyyy-MM-dd'`, `'MM-dd-yyyy HH:mm:ss'`)
    - **referenceValueField** (optional): `string` -- Alternate source column used to resolve reference field values
    - **useSourceScript** (optional): `boolean` -- Enable a per-field transform script instead of direct mapping
    - **sourceScript** (optional): `string | ImportSetEntrySourceFn` -- A function `(source) => string` or string script executed before mapping when `useSourceScript` is true

- **order** (optional): `number`
  Execution order (lower numbers run first)

- **runBusinessRules** (optional): `boolean`
  Run business rules on target table

- **runScript** (optional): `boolean`
  Whether to run the top-level transform map script during import

- **script** (optional): `string | ImportSetTransformMapFn`
  Content of the top-level transform map script, executed when `runScript` is true. Accepts a string script body or a typed function `(source, target, map, log, isUpdate) => void`

- **scripts** (optional): `ImportSetScript[]`
  Transform scripts for various lifecycle hooks



## Examples

### Basic Import Set

Create a simple transform map for importing user data

```typescript
/**
 * @title Basic Import Set
 * @description Create a simple transform map for importing user data
 */
import { ImportSet } from '@servicenow/sdk/core'

ImportSet({
    $id: Now.ID['1cd7e04a2a92440c977b31236326f151'],
    name: 'Honda User Data Import Set',
    targetTable: 'sys_user',
    sourceTable: 'x_snc_employee_3am_honda_users_import',
    runScript: false,
})

```

### Import Set with Field Mapping

Create a transform map with custom field mappings and transformation scripts

```typescript
/**
 * @title Import Set with Field Mapping
 * @description Create a transform map with custom field mappings and transformation scripts
 */
import { ImportSet } from '@servicenow/sdk/core'

ImportSet({
    $id: Now.ID['1cd7e04a2a92440c977b31236326f151'],
    name: 'Honda User Data Import Set',
    targetTable: 'sys_user',
    sourceTable: 'x_snc_employee_3am_honda_users_import',
    active: true,
    fields: {
        first_name: {
            sourceField: 'first_name',
            sourceScript: `answer = (function transformEntry(source) {
    // Add your code here
    return source.first_name.toUpperCase();
})(source);`,
            useSourceScript: true,
        },
        last_name: {
            sourceField: 'last_name',
        },
        mobile_phone: {
            sourceField: 'mobile_number',
        },
    },
    runScript: false,
})

```

### Import Set with Transform Scripts

Create a transform map with onBefore validation scripts

```typescript
/**
 * @title Import Set with Transform Scripts
 * @description Create a transform map with onBefore validation scripts
 */
import { ImportSet } from '@servicenow/sdk/core'

ImportSet({
    $id: Now.ID['1cd7e04a2a92440c977b31236326f151'],
    name: 'Honda User Data Import Set',
    targetTable: 'sys_user',
    sourceTable: 'x_snc_employee_3am_honda_users_import',
    active: true,
    scripts: [
        {
            $id: Now.ID['5d5c371eb0624773893d0f128e80cff2'],
            when: 'onBefore',
            script: `(function runTransformScript(source, map, log, target /*undefined until onAfter*/) {
    // Validate source data before import
    if (!source.first_name || !source.last_name) {
        ignore = true;
        log.error('Missing required name fields');
    }
})(source, map, log, target);`,
        },
    ],
    runScript: false,
})

```

