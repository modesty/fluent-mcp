# Application Menu API example: creating a top application menu with defined role access and a app category object
```typescript
import { ApplicationMenu, Record, Role } from "@servicenow/sdk/core";

const customRole = Role({
    $id: Now.ID['custom_role'],
    name: 'x_snc_example.custom_role'
})

const appCategory = Record({
    table: 'sys_app_category',
    $id: Now.ID[9],
    data: {
        name: 'example',
        style: 'border-color: #a7cded; background-color: #e3f3ff;',
    },
})

const exAppMenu = ApplicationMenu({
    $id: 0,
    title: 'Example Application menu',
    hint: 'this is an example application menu',
    description: 'a random description',
    category: appCategory,
    roles: ['admin', customRole],
    active: true,
    order: 100,
})
```