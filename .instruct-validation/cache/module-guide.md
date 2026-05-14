# JavaScript Modules

JavaScript modules are the **modern, preferred approach** for all server-side code in Fluent projects. Modules support `import`/`export`, provide access to typed Glide APIs via `@servicenow/glide`, enable code reuse across your application, and integrate with third-party npm libraries.

## When to Use

Use modules for server-side scripts in APIs that accept function types. Not all APIs support modules — some `script` properties only accept strings. If the compiler or build rejects a module import (for example, a type error such as `Type '() => void' is not assignable to type 'string'`, or a similar diagnostic), the API does not support modules and you should use `Now.include()` instead (see the `now-include-guide` topic). The exact error will vary depending on the structure of your module export and the API you're targeting.

**APIs that support modules (accept functions):**
- BusinessRule, ScriptAction, UiAction — `script` property
- RestApi route handlers — `script` property
- CatalogItemRecordProducer — `script` and `postInsertScript` properties
- ScheduledScript — `script` property

**APIs that require Now.include() or inline strings:**
- ScriptInclude, ClientScript — `script` is string-only
- CatalogClientScript, CatalogUiPolicy, UiPolicy — script fields are string-only
- SPWidget — all script fields are string-only
- Record API — data values are strings

### Additional use cases

- Organizing reusable server-side code into importable files
- Importing Glide APIs (`gs`, `GlideRecord`, etc.) for use in module files
- Adding third-party npm libraries to an application

## Instructions

1. **Import Glide APIs explicitly:** In module files, `gs`, `GlideRecord`, and other Glide APIs are NOT automatically available. You must import them from `@servicenow/glide`. Analyze your script for ALL ServiceNow APIs used and import each one.
2. **Exception -- Script Include classes:** When writing Script Include class files (`Class.create` pattern), do NOT import Glide APIs. They are automatically available in Script Include execution context. Only import other Script Include classes from `@servicenow/glide/<scopeName>`.
3. **Use `export`/`import` in modules, `require` in scripts:** Modules use ES module syntax (`export`/`import`). Business rules, script includes, and other server scripts use `require` to consume module exports.
4. **Declare dependencies in package.json:** Third-party npm libraries must be declared in `dependencies`. Never modify versions of existing dependencies unless explicitly requested.
5. **Verify Glide API methods exist:** Only use methods explicitly defined in `@servicenow/glide` type definitions. Do not assume methods exist based on naming conventions.
6. **Use `GlideDateTime` instead of `gs.nowDateTime()`** -- `gs.nowDateTime()` is not allowed in scoped applications.

## Key Concepts

### Import Patterns

- **Glide APIs in modules:** `import { gs, GlideRecord } from '@servicenow/glide'`
- **Namespaced APIs:** `import { RESTAPIRequest } from '@servicenow/glide/sn_ws_int'`
- **Script Include classes:** `import { MyClass } from '@servicenow/glide/x_my_scope'`
- **Module code in scripts:** `const { myFunction } = require('path/to/module')`

### Script Include Module Rules

This is the most common source of errors:

- **Module files with normal functions** -- MUST import Glide APIs from `@servicenow/glide`
- **Module files with Script Include classes (`Class.create`)** -- must NOT import Glide APIs (they are auto-available)
- **Consuming Script Include classes from other modules** -- import from `@servicenow/glide/<scopeName>`

### Exposing Modules Through Script Includes

Many platform features still require script includes — GlideAjax, cross-scope APIs, and extension points that call script includes by name. When your logic lives in a module but needs to be accessible through these mechanisms, create a script include that acts as a thin bridge using `require()`. See the "Bridging Modules Through Script Includes" section in the `script-include-guide` topic for the full pattern and examples.

### Subpath Imports

Use subpaths in `package.json` to create shorthand imports:

```json
{
    "imports": {
        "#calc": "calculus",
        "#derivative": "calculus/derivative"
    },
    "dependencies": {
        "calculus": "1.0.0"
    }
}
```

Then use the shorthand:

```javascript
import { derivative } from '#derivative'
import * as calculus from '#calc'
```

### Limitations

- Modules work only within the application scope -- no cross-scope module sharing
- Node.js APIs are not supported
- Third-party libraries cannot access ServiceNow APIs
- CommonJS modules from third-party libs are not supported unless they define exports
- Only a subset of ECMAScript features are supported

## Avoidance

- **Never use Glide APIs without importing them in module files** -- they are NOT globally available in module context
- **Never import Glide APIs in Script Include class files** -- they ARE globally available in that context
- **Never use methods not in `@servicenow/glide` type definitions** -- ServiceNow's Glide objects have specific, limited APIs
- **Never modify existing dependency versions in package.json** -- only add new dependencies
- **Never use `gs.nowDateTime()` in scoped apps** -- use `new GlideDateTime().getDisplayValue()` instead

## Examples

### Full Pattern: Business Rule with Module

This is the recommended pattern for server-side scripts. Write the logic in a module file and import it in the `.now.ts` definition:

**Fluent definition** (`src/fluent/business-rules/validate-request.now.ts`):

```typescript
import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { validateRequest } from '../../server/business-rules/validate-request'

BusinessRule({
    $id: Now.ID['validate-request'],
    name: 'Validate Request',
    table: 'x_myapp_request',
    when: 'before',
    action: ['insert', 'update'],
    script: validateRequest,
})
```

**Module file** (`src/server/business-rules/validate-request.js`):

```javascript
import { gs } from '@servicenow/glide'

export function validateRequest(current, previous) {
    var title = current.getValue('short_description');
    if (!title) {
        gs.addErrorMessage('Short description is required');
        current.setAbortAction(true);
    }
}
```

### Exporting from a Module

```javascript
// Named exports for multiple features
export { myFunction, myVariable }
```

### Importing in Another Module

```javascript
import { feature } from 'path/to/module'
```

### Importing in a Server Script (Business Rule, etc.)

```javascript
const { feature } = require('path/to/module')
```

### Importing Glide APIs in a Module

```javascript
import { gs } from '@servicenow/glide'
import { GlideRecord } from '@servicenow/glide'

// Namespaced APIs
import { RESTAPIRequest, RESTAPIResponse } from '@servicenow/glide/sn_ws_int'
```

### Using Script Include Classes from Modules

```javascript
import { RecordUtils } from '@servicenow/glide/x_my_scope'

export function onRecordInsert(current, previous) {
    var recordUtils = new RecordUtils()
}
```

### Adding Dependencies in package.json

```json
{
    "name": "test",
    "version": "1.0.0",
    "dependencies": {
        "math": "1.0.0"
    }
}
```

When adding new dependencies, NEVER modify the versions of existing dependencies. Only add the new entry.

