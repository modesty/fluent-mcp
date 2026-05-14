# Application Menus

Guide for creating ServiceNow Application Menus and Modules using the Fluent API. Application menus define top-level sections in the ServiceNow navigator sidebar, and modules define the clickable items within them.

## When to Use

- Adding an application to the ServiceNow navigator ("All" menu)
- Creating menu items that link to tables, UI pages, reports, or URLs
- Organizing navigation with separators and sub-menus
- Restricting menu visibility to specific roles

## Instructions

1. **Create both parts:** An application menu requires two records: an `ApplicationMenu` for the top-level entry in the navigator, and one or more `Record` entries in `sys_app_module` for the child menu items. Neither works alone.
2. **Link modules to their menu:** Set `application: applicationMenu.$id` on each module Record to associate it with the parent menu.
3. **Choose the right `link_type`:** This determines what the module links to -- see the link_type reference below.
4. **Set `order` for positioning:** Lower numbers appear higher in the navigator. Use increments of 100 to leave room for future items.
5. **Restrict with roles:** Set `roles` on both the ApplicationMenu (array of Role objects or names) and modules (comma-separated role names) to control visibility.

## Key Concepts

### Common link_type Values

- **`LIST`** -- Shows a list of records from a table. Set `name` to the table name.
- **`NEW`** -- Opens a new record form. Set `name` to the table name.
- **`DIRECT`** -- Links to a URL. Set `query` to the relative path (e.g., `my_page.do`).
- **`SEPARATOR`** -- Creates a sub-folder/divider to group subsequent modules.
- **`REPORT`** -- Links to a report. Set `report` to the report identifier.
- **`FILTER`** -- Shows a filtered list. Set `name` to the table and `filter` to the encoded query.

All valid link_type values: `LIST`, `FILTER`, `NEW`, `DIRECT`, `SEPARATOR`, `TIMELINE`, `DETAIL`, `HTML`, `ASSESSMENT`, `SCRIPT`, `CONTENT_PAGE`, `SEARCH`, `SURVEY`, `DOC_LINK`, `MAP`, `REPORT`.

### Menu Categories

Use the Record API with table `sys_app_category` to define a category with custom styling. Reference the category from the `ApplicationMenu` to apply a visual style to the menu section.

## Avoidance

- **Never create modules without a parent ApplicationMenu** -- orphaned modules will not appear in the navigator
- **Never forget to set `active: true` on modules** -- modules default to `active: false` and will not appear
- **Avoid hardcoding sys_ids in `query` or `filter`** -- use encoded queries or relative references instead

## API Reference

For the full property reference, see the `applicationmenu-api` topic.

## Examples

### Complete Application Menu with Modules

```typescript
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

// Define a menu category for custom styling
export const appCategory = Record({
    table: 'sys_app_category',
    $id: Now.ID[9],
    data: {
        name: 'example',
        style: 'border-color: #a7cded; background-color: #e3f3ff;',
    },
})

// Create the top-level Application Menu
const applicationMenu = ApplicationMenu({
    $id: Now.ID['my_app_menu'],
    title: 'My App Menu',
    hint: 'This is a hint',
    description: 'This is a description',
    category: appCategory,
    roles: ['admin'],
    active: true,
})

// Module: link to a table list
const tableSubMenu = Record({
    $id: Now.ID['my_app_module_1'],
    table: 'sys_app_module',
    data: {
        title: 'My Table',
        application: applicationMenu.$id,
        link_type: 'LIST',
        name: 'x_snc_example_to_do',
        hint: 'Link to my table',
        roles: 'admin,itil',
        active: true,
        order: 100,
    },
})

// Module: separator to group items
const separatorSubMenu = Record({
    $id: Now.ID['my_app_module_separator'],
    table: 'sys_app_module',
    data: {
        title: 'UI Pages',
        application: applicationMenu.$id,
        link_type: 'SEPARATOR',
        roles: 'admin,itil',
        active: true,
        order: 200,
    },
})

// Module: direct link to a UI page
const uiPageSubMenu = Record({
    $id: Now.ID['my_app_module_2'],
    table: 'sys_app_module',
    data: {
        title: 'My UI Page',
        application: applicationMenu,
        link_type: 'DIRECT',
        query: 'my_ui_page.do',
        hint: 'Link to my UI Page',
        roles: 'admin,itil',
        active: true,
        order: 300,
    },
})
```

