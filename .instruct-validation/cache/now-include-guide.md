
# Now.include

`Now.include()` populates a record field with the contents of a file at build time. It reads the file and inlines its text into the XML output, keeping source files separate for IDE support (syntax highlighting, IntelliSense, linting).

**Where an API supports it, use JavaScript modules instead for server-side scripts.** Modules support `import`/`export`, provide access to typed Glide APIs, and enable code reuse — see the `module-guide` topic. `Now.include()` is always the right choice for **client-side scripts**, **HTML**, and **CSS**, and is also required for server-side APIs whose `script` property only accepts strings.

## When to use Now.include() vs modules

Not all APIs accept module imports. Some `script` properties are typed as `string` only — attempting to pass a module import will produce a compiler or build error. For example, you might see something like `Type '() => void' is not assignable to type 'string'`, though the exact error will vary depending on your module's export shape and the API. When that happens, use `Now.include()`.

**Combining both:** You can write business logic in a module and expose it through a string-only API by creating a thin wrapper script that uses `require()` to load the module. This is common for script includes that need to bridge module code to legacy callers (GlideAjax, cross-scope APIs). See the "Bridging Modules Through Script Includes" section in the `script-include-guide` topic.

| Content type | Recommended approach |
|---|---|
| Business rules, scripted REST routes, script actions, UI actions, scheduled scripts | **Modules** — these APIs accept function types |
| Record producer scripts (`script`, `postInsertScript`) | **Modules** — these APIs accept function types |
| Script includes | **Now.include()** — these APIs only accept strings |
| Client-side scripts (client scripts, catalog client scripts, UI policy scripts) | **Now.include()** — modules are not available in the browser |
| HTML templates (UI Pages, widgets) | **Now.include()** |
| CSS / SCSS (widgets, UI Pages) | **Now.include()** |
| Record API data fields | **Now.include()** — Record data values are strings |
| Any API where a module import causes a compiler/build error | **Now.include()** — fall back when the API doesn't support functions |

## Syntax

```typescript
Now.include(filePath: string): string
```

The file path is **relative to the `.now.ts` file** that contains the call.

## How it works

1. **At build time**: The SDK reads the file and inlines its contents into the XML output field
2. **At transform time** (XML → Fluent): The SDK extracts field content into separate files and generates `Now.include()` calls in the `.now.ts` output

This enables a round-trip workflow where scripts are always maintained as standalone files.

## Supported file types

| Type | Common extensions | Use case |
|------|------------------|----------|
| JavaScript | `.js`, `.client.js` | Client scripts, UI policy scripts, catalog client scripts |
| HTML | `.html` | UI Page HTML, widget templates |
| CSS/SCSS | `.css`, `.scss` | Widget styles, UI Page styles |

## Examples

### Client Script with external file

Client scripts run in the browser where modules are not available, so `Now.include()` is the correct approach:

```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['validate-form'],
    name: 'Validate Form',
    table: 'incident',
    type: 'onSubmit',
    script: Now.include('../../client/validate-form.client.js'),
})
```

```javascript
// client/validate-form.client.js
function onSubmit() {
    var desc = g_form.getValue('short_description');
    if (!desc) {
        g_form.addErrorMessage('Short description is required');
        return false;
    }
    return true;
}
```

### UI Page with HTML, client script, and processing script

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['my-ui-page'],
    endpoint: 'my_custom_page.do',
    html: Now.include('../../server/UiPage/my-page.html'),
    clientScript: Now.include('../../server/UiPage/my-page.client-script.client.js'),
    processingScript: Now.include('../../server/UiPage/my-page.processing-script.server.js'),
})
```

### Service Portal Widget

Widgets use `Now.include()` for client scripts, HTML, and CSS. Server scripts in widgets also use `Now.include()` because the widget server script runtime does not support modules.

```typescript
import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['my-widget'],
    name: 'My Custom Widget',
    clientScript: Now.include('../../server/SPWidget/my-widget.client.js'),
    serverScript: Now.include('../../server/SPWidget/my-widget.server.js'),
    htmlTemplate: Now.include('../../server/SPWidget/my-widget.html'),
    customCss: Now.include('../../server/SPWidget/my-widget.scss'),
})
```

### Record with HTML content

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['my-record'],
    table: 'x_my_table',
    data: {
        name: 'My Record',
        description_html: Now.include('./html/description.html'),
    },
})
```

## Inline scripts (alternative)

For very short client scripts, you can use inline strings instead of `Now.include()`:

```typescript
ClientScript({
    $id: Now.ID['simple-onload'],
    name: 'Welcome Message',
    table: 'incident',
    type: 'onLoad',
    script: `function onLoad() {
        g_form.addInfoMessage('Welcome!');
    }`,
})
```

## When to use Now.include()

- **Client-side scripts** — modules are not available in the browser
- **HTML and CSS content** — templates, stylesheets, and markup
- **APIs with string-only script properties** — scheduled scripts, script includes, and others where the TypeScript type is `string` (not `string | function`)
- **Record API data fields** — all Record data values are strings
- **Widget scripts** — the SP widget runtime does not support modules
- **Fallback for any API that rejects a module import** — if the compiler or build reports a type mismatch when you pass a module import to a `script` property, the API is string-only; use `Now.include()`

For server-side scripts in APIs that accept functions (business rules, script actions, scripted REST routes, record producer scripts), prefer JavaScript modules — see the `module-guide` topic.

