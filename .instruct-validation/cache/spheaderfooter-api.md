# Function: SPHeaderFooter(config)

API used to create a Service Portal header or footer (`sp_header_footer`).
Headers and footers are special widgets that extend `sp_widget` with positioning
capabilities for consistent placement across portal pages.

## Parameters

### config

`SPHeaderFooter`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  The name of the widget (required)

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **angularProviders** (optional): `(string | Record<'sp_angular_provider'> | SPAngularProvider)[]`
  Array of Angular providers for the widget

- **category** (optional): `'standard' | 'custom' | 'sample' | 'otherApplications' | 'knowledgeBase' | 'servicePortal' | 'serviceCatalog'`
  The category of the widget (default is 'custom')

- **clientScript** (optional): `string`
  The client script for the widget

- **controllerAs** (optional): `string`
  The controller for the widget (default is 'c')

- **customCss** (optional): `string`
  The custom CSS for the widget

- **dataTable** (optional): `'sp_instance'`
  The data table for the widget (default is 'sp_instance')

- **demoData** (optional): `JsonSerializable`
  The demo data for the widget

- **dependencies** (optional): `(string | SPWidgetDependency | Record<'sp_dependency'>)[]`
  Array of widget dependencies

- **description** (optional): `string`
  The description of the widget

- **docs** (optional): `string | Record<'sp_documentation'>`
  The documentation for the widget

- **fields** (optional): `('active' | 'sys_package' | 'sys_scope' | 'sp_widget' | 'sp_column' | SystemColumns | 'id' | 'class_name' | 'order' | 'sys_class_name' | 'sys_name' | 'sys_policy' | 'sys_update_name' | 'roles' | 'title' | 'color' | 'short_description' | 'url' | 'glyph' | 'css' | 'widget_parameters' | 'preserve_placeholder_size' | 'placeholder_dimensions' | 'async_load_device_type' | 'placeholder_dimensions_script' | 'advanced_placeholder_dimensions' | 'async_load_trigger' | 'size' | 'placeholder_template' | 'async_load')[]`
  The fields for the widget

- **hasPreview** (optional): `boolean`
  Show the preview pane in the Service Portal editor

- **htmlTemplate** (optional): `string`
  The HTML template for the widget

- **id** (optional): `string`
  The unique id for the widget. Must contain alphanumeric, -, or _ characters

- **internal** (optional): `boolean`
  internal field used by ServiceNow developers

- **linkScript** (optional): `string`
  The link script for the widget (client-side)

- **optionSchema** (optional): `WidgetOption[]`
  The option schema for the widget

- **public** (optional): `boolean`
  Whether the widget is public

- **roles** (optional): `(string | Role | Record<'sys_user_role'>)[]`
  The roles that can access the widget

- **serverScript** (optional): `string`
  The server script for the widget

- **servicenow** (optional): `boolean`
  Built by ServiceNow. On build, can only be true if scope has sn_ or snc_ prefix

- **static** (optional, default: false): `boolean`
  Whether this header/footer is static (rendered on every page).
  When true, the header/footer will appear on all portal pages.
  When false, it can be selectively placed on specific pages.

- **templates** (optional): `SPTemplate[]`
  Array of widget templates



## Examples

### Basic Service Portal Header

Create a basic header with inline HTML template and scripts

```typescript
/**
 * @title Basic Service Portal Header
 * @description Create a basic header with inline HTML template and scripts
 */
import { SPHeaderFooter } from '@servicenow/sdk/core'

SPHeaderFooter({
    $id: Now.ID['basic-header'],
    name: 'Basic Header',
    id: 'basic-header',
    htmlTemplate: '<div class="navbar navbar-default"><div class="container">{{data.title}}</div></div>',
    serverScript: Now.include('./server-script.js'),
    clientScript: Now.include('./client-script.js'),
    static: true,
})

```

### Dynamic Footer for Specific Pages

Create a non-static footer that can be placed on specific portal pages

```typescript
/**
 * @title Dynamic Footer for Specific Pages
 * @description Create a non-static footer that can be placed on specific portal pages
 */
import { SPHeaderFooter } from '@servicenow/sdk/core'

SPHeaderFooter({
    $id: Now.ID['dynamic-footer'],
    name: 'Dynamic Footer',
    id: 'dynamic-footer',
    description: 'A footer that can be selectively placed on specific pages',
    htmlTemplate: '<footer class="footer"><div class="container"><p>&copy; 2024 My Company</p></div></footer>',
    serverScript: Now.include('./server-script.js'),
    customCss: Now.include('./styles.css'),
    static: false,
    hasPreview: true,
})

```

### Static Header for All Pages

Create a static header that appears on all portal pages

```typescript
/**
 * @title Static Header for All Pages
 * @description Create a static header that appears on all portal pages
 */
import { SPHeaderFooter } from '@servicenow/sdk/core'

SPHeaderFooter({
    $id: Now.ID['static-header'],
    name: 'Static Portal Header',
    id: 'static-header',
    description: 'A static header that appears on all portal pages',
    htmlTemplate:
        '<nav class="navbar navbar-default navbar-fixed-top"><div class="container"><div class="navbar-header"><span class="navbar-brand">{{data.portalName}}</span></div></div></nav>',
    serverScript: Now.include('./server-script.js'),
    clientScript: Now.include('./client-script.js'),
    customCss: Now.include('./styles.css'),
    static: true,
    hasPreview: true,
})

```

