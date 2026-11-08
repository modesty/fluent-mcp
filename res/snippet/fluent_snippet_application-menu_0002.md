# Application Menu API example: creating a top application menu with defined role access and an app category object and an application submenu (app module) for top application menu, with link_type as MAP
```typescript
// App scope: x_snc_example
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

export const applicationSubMenu = Record({
    $id: Now.ID['rec0'],
    table: "sys_app_module",
    data: {
        title: 'API Security',
        application: applicationMenu,
        active: true,
        hint: 'Sub menu under Application Security',
        link_type: 'MAP',
        map_page: Now.ref('cmn_map_page', '<sys_id>'), // sys_id of the existing `Critical incidents` map page, looked up on the instance
        override_menu_roles: false,
        require_confirmation: false,
        uncancelable: false
    },
})
```