# Function: SPPage(config)

Creates a Service Portal page — a layout of widget instances organized into containers, rows, and columns (`sp_page`). Pages are the top-level navigation targets in a portal and define the visual structure users interact with.

## Parameters

### config

`SPPage`

**Properties:**

- **pageId** (required): `string`
  URL-level identifier for the page, used in routing (`?id=<pageId>`).
  Maps to `sp_page.id`. Must be unique within the portal (required).

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **category** (optional, default: 'custom'): `PageCategory`
  Groups the page in the portal designer for organisational purposes.
  Valid values: `'custom'`, `'standard'`, `'sample'`, `'sp_platform'`,
  `'kb'`, `'other'`, `'sc'`, `'sn_ex_sp_taxonomy'`.

- **containers** (optional): `SPContainer[]`
  Top-level layout sections of the page. Each container holds rows of columns
  which hold widget instances. Renders in ascending `order` value.

- **css** (optional): `string`
  Page-scoped CSS applied only when this page is rendered.

- **draft** (optional, default: false): `boolean`
  Marks the page as a draft. Draft pages are visible only to portal designers
  and admins, not to regular users.

- **dynamicTitleStructure** (optional): `string`
  Template string used to build a dynamic page `<title>` tag.
  Supports portal variable substitution.

- **humanReadableUrlStructure** (optional): `string`
  Friendly URL path pattern for the page, enabling human-readable URLs.
  Use `{variable}` placeholders to capture path segments as URL parameters.
  Must contain exactly one `/` separator.

- **internal** (optional, default: false): `boolean`
  Marks the page as an internal platform page (not user-created).
  Internal pages are hidden from the page picker in the portal designer.

- **omitWatcher** (optional, default: false): `boolean`
  Disables the AngularJS `$watch` listener for this page, improving
  performance for static or data-light pages.

- **public** (optional, default: false): `boolean`
  Makes the page accessible to unauthenticated users without login.

- **roles** (optional): `(string | Role | Record<'sys_user_role'>)[]`
  Restricts access to users with at least one of the specified roles.
  If empty, the page is accessible to all authenticated users (or all users if `public` is true).

- **seoScript** (optional): `string | ScriptIncludeOptions | Record<'sys_script_include'>`
  Server-side script (`sys_script_include`) that returns a dynamic page title
  and meta description for SEO purposes. Only used when `useSeoScript` is `true`.

- **shortDescription** (optional): `string`
  Brief admin-visible description of the page's purpose. Not displayed to end users.

- **title** (optional): `string`
  Page title displayed in the browser tab.

- **useSeoScript** (optional, default: false): `boolean`
  Enables dynamic `<title>` and meta tag generation via `seoScript`.



## Examples

### sp-page-basic

```typescript
// Source: packages/api/tests/service-portal/page-plugin.test.ts

import { SPPage } from '@servicenow/sdk/core'

export const BasicPageExample = SPPage({
    title: 'My Simple Page',
    pageId: 'simple_page',
})

```

### sp-page-draft

```typescript
// Source: packages/api/tests/service-portal/page-plugin.test.ts

import { SPPage } from '@servicenow/sdk/core'

export const PageWithDraftExample = SPPage({
    title: 'My Complete Page',
    pageId: 'complete_page',
    category: 'custom',
    draft: true,
    dynamicTitleStructure: 'Dynamic Title',
    shortDescription: 'This is a test page',
})

```

### sp-page-with-containers

```typescript
// Source: packages/api/tests/service-portal/page-plugin.test.ts

import { SPPage } from '@servicenow/sdk/core'

export const PageWithContainersExample = SPPage({
    title: 'Hierarchical Page',
    pageId: 'hierarchical_page',
    containers: [
        {
            $id: Now.ID['main-container'],
            name: 'Main Container',
            title: 'Main Container Title',
            backgroundColor: '#ffffff',
            backgroundImage: 'bg-image.jpg',
            cssClass: 'main-container',
            parentClass: 'container-fluid',
            subheader: true,
            bootstrapAlt: true,
            semanticTag: 'main',
            order: 1,
            rows: [
                {
                    $id: Now.ID['main-row'],
                    cssClass: 'main-row',
                    semanticTag: 'main',
                    order: 1,
                    columns: [
                        {
                            $id: Now.ID['main-column'],
                            size: 8,
                            sizeSm: 6,
                            sizeLg: 10,
                            sizeXs: 12,
                            cssClass: 'main-column',
                            semanticTag: 'main',
                            order: 1,
                            instances: [
                                {
                                    $id: Now.ID['widget-instance'],
                                    title: 'Widget Instance',
                                    id: 'widget-instance-1',
                                    widget: '7690d6d2ff5d3610166dffffffffff5d',
                                    widgetParameters: '{"param1": "value1"}',
                                    css: '.widget { margin: 10px; }',
                                    url: '/widget-url',
                                    glyph: 'fa-home',
                                    size: 'lg',
                                    color: 'primary',
                                    cssClass: 'widget-class',
                                    active: true,
                                    order: 1,
                                    roles: ['admin'],
                                    shortDescription: 'Widget description',
                                },
                            ],
                        },
                        {
                            $id: Now.ID['secondary-column'],
                            size: 4,
                            order: 2,
                            cssClass: '',
                            instances: [],
                        },
                    ],
                },
            ],
        },
    ],
})

```

