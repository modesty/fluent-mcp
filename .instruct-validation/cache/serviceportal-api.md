# Function: ServicePortal(config)

Creates a Service Portal — a self-service web experience for end users built with AngularJS and Bootstrap 3 (`sp_portal`). Portals aggregate pages, widgets, themes, knowledge bases, and service catalogs into a branded, responsive interface.

## Parameters

### config

`ServicePortal`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **title** (required): `string`
  Portal display name shown in the browser tab and portal header (required)

- **urlSuffix** (required): `string`
  URL path suffix used to access the portal. For example, a value of `'esc'`
  makes the portal accessible at `/<instance>/esc`. Must be lowercase, may
  contain hyphens and underscores, and cannot start/end with an underscore.

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **alternatePortal** (optional): `string | Record<'sp_portal'>`
  Portal to redirect users to when this portal is `inactive`.
  Only applies when `inactive` is `true`.

- **catalog** (optional): `string | Record<'sc_catalog'>`
  Default service catalog for the portal.
  References a `sc_catalog` record.
  Deprecated — use `catalogs` (array) instead. `catalog` and `catalogs` are mutually exclusive.

- **catalogHomePage** (optional): `string | SPPage | Record<'sp_page'>`
  Page displayed as the Service Catalog home/landing page.

- **catalogs** (optional, default: []): `object[]`
  Ordered list of service catalogs (`sc_catalog`) available in the portal.
  Controls which catalogs appear in catalog browsing and ordering. `active` controls visibility.

- **categoryHomePage** (optional): `string | SPPage | Record<'sp_page'>`
  Page displayed when browsing Service Catalog categories (`sc_category`).
  Typically the catalog category listing page.

- **chatQueue** (optional): `string | Record<'chat_queue'>`
  Chat queue (`chat_queue`) used for Virtual Agent or live chat integration.
  When set, the portal header may display a chat launcher button.

- **communicationChannels** (optional): `string[]`
  Array of sys_ids referencing communication channel records used for
  Virtual Agent or ITSM chat integration in this portal.

- **cssVariables** (optional): `string`
  JSON string defining portal-level CSS custom properties (variables).
  These override theme variables and apply across all pages in the portal.

- **darkTheme** (optional): `string | SPTheme | Record<'sp_theme'>`
  Dark mode theme applied when the user selects dark mode. References an `sp_theme` record.

- **defaultPortal** (optional, default: false): `boolean`
  Makes this the default portal, used when navigating via `/?id=<pageId>`
  without an explicit portal suffix.

- **embeddableMacroponents** (optional): `string[]`
  Array of sys_ids referencing Next Experience macroponent records
  (`sys_ux_macroponent`) that can be embedded within this portal.

- **enableAiSearch** (optional, default: false): `boolean`
  Enables the AI-powered search experience (Unified Search / NLU).
  Requires a configured `searchApplication` and `searchResultsConfiguration`.

- **enableCertificateBasedAuthentication** (optional, default: false): `boolean`
  Enables certificate-based authentication for portal access.
  When true, users must present a valid client certificate.

- **enableFavorites** (optional, default: false): `boolean`
  Enables the Quick Start / Favorites panel, allowing users to pin
  frequently used catalog items, knowledge articles, and pages.

- **enableWebEmbeddables** (optional, default: false): `boolean`
  Allows Next Experience web components (macroponents) to be embedded
  within Service Portal widgets and pages.

- **hidePortalName** (optional, default: false): `boolean`
  Hides the portal title text in the header navigation bar.
  Useful when the logo already conveys the portal name.

- **homePage** (optional): `string | SPPage | Record<'sp_page'>`
  Default landing page shown when a user navigates to the portal root URL.

- **icon** (optional): `string`
  Browser favicon for the portal. Accepts a sys_id string of a `user_image` attachment.

- **inactive** (optional, default: false): `boolean`
  Deactivates the portal, making it inaccessible to users. Users
  attempting to access it are redirected to `alternatePortal` if set.

- **knowledgeBase** (optional): `string | Record<'kb_knowledge_base'>`
  Default knowledge base for knowledge search and filtering.
  References a `kb_knowledge_base` record.
  Deprecated — use `knowledgeBases` (array) instead. `knowledgeBase` and `knowledgeBases` are mutually exclusive.

- **knowledgeBases** (optional, default: []): `object[]`
  Ordered list of knowledge bases (`kb_knowledge_base`) available in the portal.
  Used to scope KB search and article browsing. `active` controls visibility.

- **knowledgeHomePage** (optional): `string | Record<'sp_page'>`
  Page displayed as the Knowledge Management home/landing page.

- **loginPage** (optional): `string | SPPage | Record<'sp_page'>`
  Page shown to unauthenticated users instead of the requested page.

- **logo** (optional): `string`
  Logo image displayed in the portal header. Accepts a sys_id string of a
  `user_image` attachment or a `Now.attach()` reference.

- **logoAltText** (optional): `string`
  Accessible alt text for the logo image, used by screen readers.

- **mainMenu** (optional): `string | Record<'sp_instance_menu'> | SPMenu`
  Navigation menu rendered in the portal header. References an `sp_instance_menu` record.

- **notFoundPage** (optional): `string | SPPage | Record<'sp_page'>`
  Page rendered when a route cannot be matched (HTTP 404 equivalent).

- **quickStartConfig** (optional): `string`
  JSON string configuring the Quick Start / Favorites feature appearance.
  Controls favorite icon styles (e.g. checked/unchecked icon names and colors).

- **searchApplication** (optional): `string | Record<'sys_search_application'>`
  Search application (`sys_search_application`) that defines which content
  sources (tables, KB, catalog) are included in portal search.

- **searchResultsConfiguration** (optional): `string | Record<'sys_ux_composite_definition'>`
  Unified Search composite definition (`sys_ux_composite_definition`) that controls
  how search results are rendered. Used when AI Search or Unified Search is enabled.

- **searchSources** (optional, default: []): `object[]`
  Ordered list of search sources (`sp_search_source`) available in portal search.
  Each entry's `order` controls its position in search result grouping.

- **supportRightToLeftLanguages** (optional, default: false): `boolean`
  Enables right-to-left (RTL) text layout for languages such as Arabic and Hebrew.
  When true, the portal layout mirrors horizontally.

- **taxonomies** (optional, default: []): `object[]`
  Ordered list of taxonomy entries for portal navigation and content classification.
  `active` controls whether the taxonomy is visible to portal users.

- **textIndexGroup** (optional): `string | Record<'ts_index_group'>`
  Full-text search index group (`ts_index_group`) used to scope portal
  search to specific content. Controls what text is indexed and searched.

- **theme** (optional): `string | SPTheme | Record<'sp_theme'>`
  Light mode theme applied to all pages in the portal. References an `sp_theme` record.



## Examples

### service-portal-basic

```typescript
// Source: packages/api/tests/service-portal/portal-plugin.test.ts

import { ServicePortal } from '@servicenow/sdk/core'

export const BasicPortalExample = ServicePortal({
    $id: Now.ID['test-portal'],
    title: 'Employee Center',
    urlSuffix: 'esc',
})

```

### service-portal-with-catalogs

```typescript
// Source: packages/api/tests/service-portal/portal-plugin.test.ts

import { ServicePortal } from '@servicenow/sdk/core'

export const PortalWithCatalogsExample = ServicePortal({
    $id: Now.ID['test-portal-m2m'],
    title: 'Employee Center',
    urlSuffix: 'esc',
    logo: 'a99f9564ff212210a6f3ffffffffff74',
    theme: 'ee2e485f9c0b5250f877097911a1a148',
    homePage: '0987d9aa53331210b8f2ddeeff7b129d',
    enableAiSearch: true,
    defaultPortal: true,
    enableFavorites: true,
    taxonomies: [
        {
            taxonomy: '1f5d5a40c3203010069aec4b7d40dd93',
            order: 100,
            active: true,
        },
    ],
    knowledgeBases: [
        {
            knowledgeBase: 'kb123',
            order: 100,
            active: true,
        },
    ],
    catalogs: [
        {
            catalog: 'cat123',
            order: 100,
            active: true,
        },
    ],
    searchSources: [
        {
            searchSource: 'search123',
            order: 100,
        },
    ],
})

```

### service-portal-with-pages

```typescript
// Source: packages/api/tests/service-portal/portal-plugin.test.ts

import { ServicePortal } from '@servicenow/sdk/core'

export const PortalWithPagesExample = ServicePortal({
    $id: Now.ID['employee-center'],
    title: 'Employee Center',
    urlSuffix: 'esc',
    logo: 'a99f9564ff212210a6f3ffffffffff74',
    theme: 'ee2e485f9c0b5250f877097911a1a148',
    mainMenu: '493d01365368301056c1ddeeff7b1207',
    homePage: '0987d9aa53331210b8f2ddeeff7b129d',
    loginPage: '6995a144cb11120000f8d856634c9c25',
    notFoundPage: '3c2c9063cb11020000f8d856634c9c1f',
    catalogHomePage: 'c221e520b7602300d0ac9277ee11a960',
    knowledgeHomePage: 'f8b574a0b7202300d0ac9277ee11a91d',
    enableAiSearch: true,
    defaultPortal: true,
    enableFavorites: true,
})

```

