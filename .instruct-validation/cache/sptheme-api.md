# Function: SPTheme(config)

API used to create a Service Portal theme (`sp_theme`).

A Service Portal theme allows you to customize the appearance of your portal by:
- Setting custom CSS for consistent styling
- Configuring header and footer content
- Managing fixed navigation and footer positions
- Including JavaScript and CSS resources
- Mapping to Next Experience themes for consistent branding

For more information, see the ServiceNow docs.

## Parameters

### config

`SPTheme`

Configuration object for the theme

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  Display name of the theme shown in the portal designer and theme picker (required).

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **cssIncludes** (optional): `CssIncludeWithOrder[]`
  Ordered list of CSS files (`sp_css` or external URLs) loaded on every page using this theme.
  Useful for including third-party stylesheets (e.g. custom icon fonts, vendor CSS).
  Rendered in ascending `order` value.

- **customCss** (optional, default: ''): `string`
  SCSS variable definitions applied globally to all pages using this theme.
  Maps to `sp_theme.css_variables`. Define SCSS variables here to control theme-wide
  colors, fonts, and spacing (e.g. `$nav-color: #333; $brand-primary: #0070d2;`).
  Use `sp-rgb()` and `sp-rgba()` helper functions for dynamic color variable support.

- **fixedFooter** (optional, default: true): `boolean`
  Keeps the footer anchored to the bottom of the viewport as the user scrolls.
  Set to `false` to let the footer scroll with the page content.

- **fixedHeader** (optional, default: true): `boolean`
  Keeps the header anchored to the top of the viewport as the user scrolls (sticky header).
  Set to `false` to let the header scroll out of view.

- **footer** (optional): `string | SPHeaderFooter | Record<'sp_header_footer'>`
  Footer widget (`sp_header_footer`) rendered at the bottom of every portal page using this theme.
  Typically contains copyright, links, and secondary navigation.

- **header** (optional): `string | SPHeaderFooter | Record<'sp_header_footer'>`
  Header widget (`sp_header_footer`) rendered at the top of every portal page using this theme.
  Typically contains the portal logo, navigation, and search bar.

- **icon** (optional): `string | Image`
  Browser favicon / portal icon. Accepts a `user_image` sys_id string
  or a `Now.attach('path/to/icon.png')` reference for source-controlled assets.

- **jsIncludes** (optional): `JsIncludeWithOrder[]`
  Ordered list of JavaScript files (`sys_ui_script` or external URLs) loaded on every
  page using this theme. Useful for global scripts such as analytics or chat launchers.
  Rendered in ascending `order` value.

- **logo** (optional): `string | Image`
  Logo image displayed in the portal header widget.
  Accepts a `user_image` sys_id string or a `Now.attach('path/to/logo.png')` reference.

- **logoAltText** (optional): `string`
  Accessible alt text for the logo image, used by screen readers.

- **matchingNextExperienceTheme** (optional, default: ''): `string | Record<'sys_ux_theme'>`
  Links this Service Portal theme to a Next Experience (`sys_ux_theme`) theme
  for consistent branding when users switch between portal and workspace UIs.
  CSS variable values from the Next Experience theme are mapped into the portal theme.

- **turnOffScssCompilation** (optional, default: false): `boolean`
  Disables server-side SCSS compilation for the `customCss` variable definitions.
  Enable this if the variables are plain CSS custom properties rather than SCSS syntax.



## Examples

### sp-theme-basic

```typescript
// Source: packages/api/tests/service-portal/theme-plugin.test.ts

import { SPTheme } from '@servicenow/sdk/core'

export const BasicThemeExample = SPTheme({
    $id: Now.ID['roundtrip-basic'],
    name: 'Roundtrip Basic Theme',
})

```

### sp-theme-with-css

```typescript
// Source: packages/api/tests/service-portal/theme-plugin.test.ts

import { SPTheme } from '@servicenow/sdk/core'

export const ThemeWithCssExample = SPTheme({
    $id: Now.ID['cool-theme'],
    name: 'CoolTheme',
    customCss: '--primary-color: blue;',
    header: 'Cool Header',
    footer: 'Cool Footer',
    fixedHeader: false,
    fixedFooter: true,
    turnOffScssCompilation: true,
    matchingNextExperienceTheme: 'now-dark',
    icon: 'test-icon-sys-id',
    logo: 'test-logo-sys-id',
    logoAltText: 'CoolTheme Logo',
})

```

### sp-theme-with-includes

```typescript
// Source: packages/api/tests/service-portal/theme-plugin.test.ts

import { SPTheme, CssInclude, JsInclude } from '@servicenow/sdk/core'

const localCss = CssInclude({
    $id: '22bcf16da81e2bc0340c53d50d531adf',
    name: 'CoolTheme Styles',
    spCss: '50e3e32aa321b1c7d1945c5f423228bd',
})

const localJs = JsInclude({
    $id: '98239e4eadfac88b01cce7daa23b6fc3',
    name: 'CoolTheme Framework',
    sysUiScript: 'b67af05645f738df1f286bb3e9ecd55f',
})

export const ThemeWithIncludesExample = SPTheme({
    $id: Now.ID['cool-theme'],
    name: 'CoolTheme',
    customCss: '--primary-color: blue;',
    header: 'Cool Header',
    footer: 'Cool Footer',
    cssIncludes: [
        { order: 100, include: localCss },
        { order: 200, include: '94112ccb0fb3c2ed072b01d3cb401196' },
    ],
    jsIncludes: [
        { order: 100, include: localJs },
        { order: 200, include: 'f8af18a5e6c71a3702c4f2038b43cf62' },
    ],
})

```

