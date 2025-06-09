# Application Menu API example: creating a top application menu with defined role access and a app category object and an application submenu (application module) for top application menu, with link_type as DIRECT and query as form of a path
```typescript
import { ApplicationMenu, Record, Role } from "@servicenow/sdk/core";

const secureAppUserRole = Role({
    $id: Now.ID['secure_app_user'],
    name: 'x_snc_example.secure_app_user'
})

const appCategory = Record({
    table: 'sys_app_category',
    $id: Now.ID[10],
    data: {
        name: 'Security',
        style: 'border-color: #a7cded; background-color: #e3f3ff;',
    },
})

const applicationMenu = ApplicationMenu({
    $id: 1,
    title: 'Application Security menu',
    hint: 'This is an example application security menu',
    description: 'Provides security options for the application',
    category: appCategory,
    roles: ['admin', secureAppUserRole],
    active: true,
    order: 100,
})

const applicationSubMenu = Record({
    $id: Now.ID['rec2'],
    table: "sys_app_module",
    data: {
        title: 'My Assets Analytics',
        application: applicationMenu,
        active: true,
        link_type: 'DIRECT',
        query: 'now/platform-analytics-workspace/dashboards/params/edit/false/sys-id/272ecbceaef925b16972c10aaa456d2b'
    },
})
```