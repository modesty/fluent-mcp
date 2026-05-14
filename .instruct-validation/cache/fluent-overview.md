# ServiceNow Fluent Overview

ServiceNow Fluent is a domain-specific language (DSL) based on TypeScript for defining the metadata files [sys_metadata] that make up applications. It includes APIs for tables, roles, ACLs, business rules, Automated Test Framework tests, and more.

Developers define metadata in a few lines of code instead of through a form or builder tool user interface. Applications created or converted with ServiceNow platform tools or the ServiceNow SDK support developing in ServiceNow Fluent.

ServiceNow Fluent supports two-way synchronization, which allows changes to metadata to be synced from other Now Platform user interfaces into source code and changes to source code to be synced back to metadata across the instance.

## File Structure

Fluent metadata is defined in `.now.ts` files. A typical project structure:

```
src/
    fluent/
        business-rules/
            log-state-change.now.ts
        tables/
            to-do.now.ts
    server/
        show-state-update.js
now.config.json
package.json
```

## Usage

In `.now.ts` files, import APIs from `@servicenow/sdk/core` and define metadata:

```typescript
import { Table, StringColumn, DateColumn, BooleanColumn } from '@servicenow/sdk/core'

export const x_snc_example_to_do = Table({
    name: 'x_snc_example_to_do',
    schema: {
        deadline: DateColumn({ label: 'deadline' }),
        task: StringColumn({ label: 'Task', maxLength: 120, mandatory: true }),
        active: BooleanColumn({ label: 'Active' }),
        state: StringColumn({
            label: 'State',
            choices: {
                ready: 'Ready',
                in_progress: 'In Progress',
                completed: 'Completed',
            },
        }),
    },
})
```

For sample/demo data, use the Record API, and be sure to set `installMethod: 'demo'` via the `$meta` property:

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['example_id0'],
    $meta: { installMethod: 'demo' },
    table: 'x_snc_example_to_do',
    data: {
        state: 'ready',
        task: 'Create a ServiceNow Fluent application',
        active: true,
        priority: 1,
    },
})
```

## Server-Side Scripts and Modules

For server-side scripts, use JavaScript modules with `import`/`export`. This is the preferred approach — modules provide typed Glide API access, code reuse, and full IDE support. Place module files under `src/server/` and import them from `.now.ts` files:

```typescript
import { BusinessRule } from '@servicenow/sdk/core'
import { showStateUpdate } from '../server/show-state-update.js'

BusinessRule({
    $id: Now.ID['br0'],
    table: 'x_snc_example_to_do',
    script: showStateUpdate,
    name: 'LogStateChange',
    when: 'after',
    action: ['update'],
})
```

For detailed guidance on module imports, exports, Glide APIs, and Script Include patterns, see the `module-guide` topic.

## Core Difference between UI Pages and UI Formatters

- **UI Formatter** -- Used inside forms to add non-field content
- **UI Page** -- Used outside forms as standalone pages

If the request mentions "on the form" or similar keywords (activities, process flow, stages, timeline, attached knowledge, checklist, breadcrumb, CI relationships, contextual search, variable editor, formatters), use UI Formatters. If it's a standalone page/application, use UI Pages.

## AI Integration with LLM

For AI-powered capabilities (sentiment analysis, text generation, summarization), use ServiceNow's `sn_generative_ai.LLMClient` API in server-side scripts:

```javascript
var llmClient = new sn_generative_ai.LLMClient()
var prompt = 'Your specific AI task prompt here'

try {
    var result = llmClient.call({ prompt: prompt })
    if (result.status === 'Success') {
        var response = result.response.trim()
    } else {
        gs.error(result.response)
    }
} catch (e) {
    gs.error(e.message)
}
```

The recommended pattern is to create a Script Include for LLM operations, then call it from Business Rules, Scripted REST APIs, or via GlideAjax from client scripts.

