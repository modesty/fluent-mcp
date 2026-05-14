# Script Includes

Guide for creating ServiceNow Script Includes using the Fluent API. Script includes bundle reusable server-side logic into classes or utilities that can be called from business rules, scheduled scripts, other script includes, and client-side code via GlideAjax.

## When to Use

- Creating reusable server-side logic (utility classes, helper functions)
- Building server-side APIs callable from client code via GlideAjax
- Sharing business logic across multiple business rules, scheduled scripts, or other server scripts
- Creating AJAX processors for UI Pages or client scripts

## Instructions

1. **Use `Now.include` for scripts:** The ScriptInclude API only accepts strings, so keep JavaScript in a standalone file and reference it with `Now.include('../../server/script-includes/file.js')`. This enables syntax highlighting and two-way sync. Note: Script Include class files (`Class.create()`) should NOT import Glide APIs — they are auto-available in the Script Include execution context.
2. **Use ES5 syntax:** Use the classic `Class.create()` pattern or plain functions. ES6 `class` syntax is not supported on the ServiceNow platform for script includes.
3. **Match `type` to class name:** In the `Class.create()` prototype, the `type` property must exactly match the class name and the `name` property in the Fluent definition. Mismatches cause runtime failures.
4. **Set `clientCallable` for GlideAjax:** If client-side code needs to call the script include, set `clientCallable: true`. Without this, GlideAjax calls will be rejected.
5. **Extend `AbstractAjaxProcessor` for AJAX:** When the script include is called via GlideAjax, extend `global.AbstractAjaxProcessor` and use `this.getParameter()` to read client parameters.
6. **Scope accessibility:** Set `accessibleFrom: 'public'` only when other scoped apps need access. Default to `'package_private'` for internal use.

## Key Concepts

### Class-Based vs Classless

- **Class-based** (most common): Use `Class.create()` with a prototype. Best for grouping related methods. The `type` property in the prototype must match the class name.
- **Classless (on-demand)**: A single function that runs when called by name. Best for one-off utility functions. The function name must match the `name` property.

### GlideAjax Pattern

To make a script include callable from client-side code:

1. Set `clientCallable: true` in the Fluent definition
2. Extend `global.AbstractAjaxProcessor` in the JavaScript
3. Use `this.getParameter('sysparm_name')` to read parameters passed from the client
4. Return data as JSON strings for structured responses

### Project Structure

```
src/
  server/
    script-includes/
      my-utils.js           <-- JavaScript business logic
  fluent/
    script-includes/
      my-utils.now.ts       <-- Fluent record definition
```

### Bridging Modules Through Script Includes

Script includes have been the standard way to write reusable server-side code in ServiceNow for years. JavaScript modules are the modern replacement, but many platform features still rely on script includes — GlideAjax, cross-scope APIs, script include-based extension points, and integrations that call script includes by name. When your logic lives in a module but needs to be accessible through one of these legacy mechanisms, create a script include that acts as a thin bridge.

**When to use this pattern:**

- You have module code that needs to be callable via GlideAjax from client scripts
- Another scoped app needs to call your logic by script include name
- A platform feature (e.g., dynamic reference qualifier, condition script) expects a script include
- You want to keep your business logic in a module (with typed imports, testability, and code reuse) while still being accessible to legacy callers

**How it works:**

1. Write your business logic in a module file with ES module syntax (`import`/`export`)
2. Create a thin Script Include wrapper that uses `require()` to load the module and delegates to it
3. Define the Fluent record pointing at the wrapper via `Now.include()`

The wrapper `.js` file uses `Class.create` and calls `require()` to pull in the bundled module from `./dist/modules/`. At build time, the SDK bundles your module into the `dist/modules/` directory using repack. At runtime on the platform, `require()` resolves to that bundled output.

**Example — exposing a module through a script include:**

Module file (`src/modules/server/string-utils.js`):

```javascript
export function capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.substring(1)
}

export function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}
```

Wrapper script (`src/server/script-includes/string-utils.js`):

```javascript
var StringUtils = Class.create()

StringUtils.prototype = {
    initialize: function () {
        this._mod = require('./dist/modules/server/string-utils.js')
    },

    capitalize: function (text) {
        return this._mod.capitalize(text)
    },

    truncate: function (text, maxLength) {
        return this._mod.truncate(text, maxLength)
    },

    type: 'StringUtils',
}
```

Fluent definition (`src/fluent/script-includes/string-utils.now.ts`):

```typescript
import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['StringUtils'],
    name: 'StringUtils',
    script: Now.include('../../server/script-includes/string-utils.js'),
    description: 'Bridge to string utility module',
})
```

**Key rules for the wrapper:**

- Keep the wrapper as thin as possible — it should only `require()` the module and delegate. All business logic belongs in the module.
- The wrapper uses `Class.create` and must NOT import Glide APIs (they are auto-available in Script Include context).
- The module file MUST import Glide APIs from `@servicenow/glide` (they are NOT auto-available in module context).
- The `require()` path points to `./dist/modules/...` — this is the bundled output location. Match the path structure of your module source file under `src/modules/`.
- The `type` property, class name, and Fluent `name` must all match exactly.

## Avoidance

- **Never use ES6 `class` syntax** -- the ServiceNow server runtime does not support it for script includes
- **Never mismatch `type` and class name** -- the `type` property in the prototype, the `Class.create()` variable name, and the `name` in the Fluent definition must all match exactly
- **Never forget `clientCallable: true` for GlideAjax** -- client calls will silently fail without it
- **Avoid inline scripts** for anything beyond a one-liner -- use `Now.include()` for maintainability and syntax highlighting

## API Reference

For the full property reference, see the `scriptinclude-api` topic.

## Examples

### Basic Script Include

Fluent definition (`src/fluent/script-includes/math-utils.now.ts`):

```typescript
import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

export const MathUtils = ScriptInclude({
    $id: Now.ID['MathUtils'],
    name: 'MathUtils',
    script: Now.include('../../server/script-includes/math-utils.js'),
    description: 'Basic math utility functions',
    accessibleFrom: 'package_private',
})
```

JavaScript logic (`src/server/script-includes/math-utils.js`):

> **Important:** Script Include class files (`Class.create` pattern) must NOT import Glide APIs — they are auto-available in the Script Include execution context. See the `module-guide` topic.

```javascript
var MathUtils = Class.create()
MathUtils.prototype = {
    initialize: function () {},

    multiply: function (a, b) {
        return a * b
    },

    type: 'MathUtils', // IMPORTANT: must match the class name
}
```

### GlideAjax Script Include (Client-Callable)

Fluent definition (`src/fluent/script-includes/todo-ajax.now.ts`):

```typescript
import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

export const TodoAjax = ScriptInclude({
    $id: Now.ID['TodoAjax'],
    name: 'TodoAjax',
    script: Now.include('../../server/script-includes/todo-ajax.js'),
    description: 'AJAX processor for to-do operations',
    clientCallable: true,
    accessibleFrom: 'public',
})
```

JavaScript logic (`src/server/script-includes/todo-ajax.js`):

```javascript
var TodoAjax = Class.create()

TodoAjax.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
    getTasks: function () {
        var tasks = []
        var gr = new GlideRecord('x_snc_todo_item')
        gr.query()

        while (gr.next()) {
            tasks.push({
                sys_id: gr.getUniqueValue(),
                task: gr.getValue('task'),
                state: gr.getValue('state'),
            })
        }

        return JSON.stringify(tasks)
    },

    addTask: function () {
        var task = this.getParameter('sysparm_task')
        var state = this.getParameter('sysparm_state') || 'ready'

        var gr = new GlideRecord('x_snc_todo_item')
        gr.initialize()
        gr.setValue('task', task)
        gr.setValue('state', state)
        var sysId = gr.insert()

        return JSON.stringify({
            success: true,
            task: { sys_id: sysId, task: task, state: state },
        })
    },

    type: 'TodoAjax',
})
```

