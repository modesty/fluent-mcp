# Function: SPMenu(config)

Configures a Service Portal menu with hierarchical navigation items (`sp_instance_menu`). Menus define the navigation structure within a portal, supporting page links, knowledge base links, catalog items, filtered lists, and scripted menu items.

SPMenu extends the SPInstance type. The properties below include inherited instance properties alongside menu-specific configuration.

## Parameters

### config

`SPMenu`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional, default: true): `boolean`
  Whether this instance is rendered on the page.
  Set to `false` to hide the instance without deleting it.

- **advancedPlaceholderDimensions** (optional, default: false): `boolean`
  Enables fine-grained control over placeholder width and height via
  `placeholderDimensions`. Only relevant when `asyncLoad` is `true`.

- **asyncLoad** (optional, default: false): `boolean`
  Defers rendering of this widget until the async trigger condition is met.
  Use with `asyncLoadTrigger` to control when loading begins.

- **asyncLoadDeviceType** (optional): `string`
  Comma-separated list of device types for which async loading is applied.

- **asyncLoadTrigger** (optional, default: 'viewport'): `'viewport' | 'parallel'`
  Controls when async loading is triggered:
  - `'viewport'` — loads the widget when it is scrolled into the visible viewport.
  - `'parallel'` — loads the widget immediately in parallel with other page content.

- **color** (optional, default: 'default'): `BootstrapColor`
  Bootstrap contextual color applied to the instance header band.
  Valid values: `'default'`, `'primary'`, `'success'`, `'info'`, `'warning'`, `'danger'`.

- **column** (optional): `string | Record<'sp_column'>`
  Reference to the `sp_column` record this instance belongs to (used internally).

- **css** (optional): `string`
  CSS scoped to this widget instance, applied in addition to the widget's own CSS.

- **cssClass** (optional): `string`
  Additional CSS class name added to the instance wrapper element.

- **glyph** (optional): `string`
  FontAwesome icon class (without the `fa-` prefix) shown alongside the instance title.

- **id** (optional): `string`
  Unique string identifier for the instance record (`sp_instance.id`).

- **items** (optional): `SPMenuItem[]`
  The menu items for the instance (maps to sp_rectangle_menu_item).

  **SPMenuItem properties:**

  - **$id** (required): `string | number | ExplicitKey<string>`
  - **label** (required): `string` — Display text shown in the portal navigation.
  - **type** (optional, default: 'page'): `MenuType` — What the item links to. Values: `'page'`, `'url'`, `'sc_category'`, `'sc_cat_item'`, `'kb_topic'`, `'kb_article'`, `'kb_category'`, `'filtered'`, `'scripted'`.
  - **page** (optional): `string | Record<'sp_page'> | SPPage` — Portal page to navigate to. Required for page, catalog, and KB types.
  - **url** (optional): `string` — Destination URL (only for type `'url'`).
  - **kbTopic** (optional): `Topic` — Knowledge Base topic (`'Policies'`, `'Applications'`, `'General'`, `'FAQ'`, `'Desktop'`, `'News'`, `'Email'`).
  - **kbArticle** (optional): `string | Record<'kb_knowledge'>` — Specific knowledge article reference.
  - **kbCategory** (optional): `string | Record<'kb_category'>` — Knowledge Base category reference.
  - **scCategory** (optional): `string | Record<'sc_category'>` — Service Catalog category reference.
  - **catItem** (optional): `string | Record<'sc_cat_item'>` — Service Catalog item reference.
  - **script** (optional): `string | function` — Server-side script for dynamically generated child items (type `'scripted'`).
  - **childItems** (optional): `LeafMenuItem[]` — Nested child menu items (one level of nesting supported).
  - **order** (optional, default: 100): `number` — Sort order within the level. Lower values appear first.
  - **glyph** (optional): `string` — FontAwesome icon class (without the `fa-` prefix).
  - **roles** (optional): `(string | Role | Record<'sys_user_role'>)[]` — Restricts visibility to users with specified roles.
  - **filter** (optional): `string` — Encoded query string to filter records from `table` (type `'filtered'`).
  - **table** (optional): `TableName` — Table to query for filtered record items (type `'filtered'`).
  - **display1** (optional): `string` — Field from `table` to use as the primary label for filtered records.
  - **display2** (optional): `string` — Field from `table` to use as a secondary label for filtered records.
  - **displayDate** (optional): `'sys_created_on' | 'sys_updated_on' | ''` — Date field from `table` to display alongside each filtered record.
  - **urlTarget** (optional): `string` — HTML `<a target>` attribute for URL items (e.g. `'_blank'`). Only used when `type` is `'url'`.
  - **hint** (optional): `string` — Tooltip text shown on hover over the menu item.
  - **shortDescription** (optional): `string` — Admin-facing description of the menu item's purpose.
  - **color** (optional): `BootstrapColor` — Bootstrap contextual color (`'default'`, `'primary'`, `'success'`, `'info'`, `'warning'`, `'danger'`).
  - **active** (optional): `boolean` — Whether the menu item is rendered. Set to `false` to hide without deleting.
  - **condition** (optional): `string` — Encoded query condition evaluated server-side to control visibility

- **order** (optional): `number`
  Sort order within the column. Lower values appear higher/earlier.

- **placeholderConfigurationScript** (optional): `string`
  Server-side script that returns placeholder dimension config dynamically.
  Evaluated on page load before the widget is asynchronously loaded.

- **placeholderDimensions** (optional): `JsonSerializable`
  JSON object specifying explicit width/height for the async placeholder.
  Only used when `advancedPlaceholderDimensions` is `true`.

- **placeholderTemplate** (optional): `string`
  AngularJS HTML template rendered as the placeholder while async content loads.

- **preservePlaceholderSize** (optional, default: false): `boolean`
  Maintains the placeholder element's height while async content is loading,
  preventing layout shift (CLS). Only relevant when `asyncLoad` is `true`.

- **roles** (optional): `(string | Role | Record<'sys_user_role'>)[]`
  Restricts visibility of this instance to users with at least one of the specified roles.
  If empty, the instance is visible to all users who can access the page.

- **shortDescription** (optional): `string`
  Brief admin-facing description of the instance's purpose. Not displayed to end users.

- **size** (optional, default: 'md'): `SPInstanceSize`
  Visual size of the instance card in the portal designer.
  Valid values: `'sm'`, `'md'`, `'lg'`, `'xl'`.

- **title** (optional): `string`
  Heading text displayed above the widget instance in the portal UI.

- **url** (optional): `string`
  URL override applied to the instance link/title.

- **widget** (optional): `string | Record<'sp_widget'> | SPWidget`
  The widget (`sp_widget`) to render at this position on the page.

- **widgetParameters** (optional): `JsonSerializable`
  JSON key-value pairs passed to the widget's server and client scripts
  as `options`. Keys correspond to the widget's `optionSchema` property names.



## Examples

### sp-menu-basic

```typescript
// Source: packages/api/tests/service-portal/menu-plugin.test.ts

import { SPMenu } from '@servicenow/sdk/core'

export const BasicMenuExample = SPMenu({
    $id: Now.ID['menu-id'],
    title: 'Test Menu',
    widget: '5ef595c1cb12020000f8d856634c9c6e',
    roles: ['admin', 'itil'],
    items: [
        {
            $id: Now.ID['item-1'],
            type: 'page',
            label: 'Home',
            page: 'bf4aec5377014caca47b4845858ed506',
        },
    ],
})

```

### sp-menu-nested

```typescript
// Source: packages/api/tests/service-portal/menu-plugin.test.ts

import { SPMenu } from '@servicenow/sdk/core'

export const NestedMenuExample = SPMenu({
    $id: Now.ID['menu-id'],
    title: 'Nested Menu',
    widget: '5ef595c1cb12020000f8d856634c9c6e',
    items: [
        {
            $id: Now.ID['parent-item'],
            type: 'page',
            label: 'Parent',
            page: 'page-id-1',
            childItems: [
                {
                    $id: Now.ID['child-item'],
                    type: 'kb_topic',
                    label: 'Child',
                    kbTopic: 'FAQ',
                    page: 'page-id-2',
                },
            ],
        },
    ],
})

```

### sp-menu-with-roles

```typescript
// Source: packages/api/tests/service-portal/menu-plugin.test.ts

import { SPMenu } from '@servicenow/sdk/core'

export const MenuWithRolesExample = SPMenu({
    $id: Now.ID['menu-id'],
    title: 'Test Menu',
    widget: '5ef595c1cb12020000f8d856634c9c6e',
    roles: ['admin', 'itil'],
    active: true,
    size: 'md',
    color: 'default',
    order: 1,
    items: [
        {
            $id: Now.ID['item-1'],
            type: 'page',
            label: 'Home',
            page: 'page-sys-id',
            order: 100,
            active: true,
            glyph: 'empty',
            color: 'default',
        },
    ],
})

```

