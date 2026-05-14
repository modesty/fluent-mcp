# Function: Applicability(config)

Creates an applicability configuration for controlling visibility based on roles

## Parameters

### config

`Applicability`

an object containing the following properties:

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  Display name for the applicability configuration.

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`
  Whether this applicability rule is enabled. Defaults to true.

- **description** (optional): `string`
  Human-readable description of when this rule applies.

- **roleNames** (optional): `string`
  Comma-separated role names as a string, alternative to the `roles` array.

- **roles** (optional): `string[] | Role[]`
  Array of Role references or sys_id strings that this applicability targets.

> **Note:** Use either `roleNames` (comma-separated string) or `roles` (typed array) -- not both.



## Examples

### applicability-basic

```typescript
// Source: examples/workspace/src/fluent/index.now.ts
import { Applicability, Role } from '@servicenow/sdk/core'

const userRole = Role({
    name: 'x_snc_works_7.user',
    containsRoles: ['canvas_user'],
})

const adminRole = Role({
    name: 'x_snc_works_7.admin',
    containsRoles: ['canvas_admin'],
})

Applicability({
    $id: Now.ID['workspace_applicability'],
    name: 'Workspace Audience',
    roles: [userRole, adminRole],
})

```

### applicability-minimal

```typescript
// Source: examples/workspace/src/fluent/index.now.ts

import { Applicability, Role } from '@servicenow/sdk/core'

const role = Role({
    name: 'x_snc_app.user',
    containsRoles: ['canvas_user'],
})

export const MinimalApplicabilityExample = Applicability({
    $id: Now.ID['minimal_applicability'],
    name: 'Minimal Audience',
    roles: [role],
})

```

### applicability-role-names

```typescript
// Source: packages/core/src/uxf/Applicability.ts (type definition)
import { Applicability } from '@servicenow/sdk/core'

Applicability({
    $id: Now.ID['itil_applicability'],
    name: 'ITIL Users',
    description: 'Visible to ITIL and admin roles',
    roleNames: 'itil,admin',
})

```

### applicability-with-description

```typescript
// Source: packages/core/src/uxf/Applicability.ts (type definition)
import { Applicability } from '@servicenow/sdk/core'

Applicability({
    $id: Now.ID['admin_only_applicability'],
    name: 'Admin Only Access',
    description: 'Restricts visibility to admin users',
    roles: ['admin'],
})

```

### applicability-with-role-refs

```typescript
// Source: examples/workspace/src/fluent/index.now.ts

import { Applicability, Role } from '@servicenow/sdk/core'

const role1 = Role({
    name: 'x_snc_uxlist.user',
    containsRoles: ['canvas_user'],
})

const role2 = Role({
    name: 'x_snc_uxlist.admin',
    containsRoles: ['canvas_admin'],
})

export const ApplicabilityWithRoleRefsExample = Applicability({
    $id: Now.ID['list_applicability'],
    name: 'List Audience',
    roles: [role1, role2],
})

```

