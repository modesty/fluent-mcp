# Route new incidents through an interceptor chooser in ServiceNow Fluent

```typescript
import { Interceptor } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// Follow-up question, defined first so the chooser below can reference its return value.
// `name` is the identity (no top-level $id) — verify it is unique on the instance before deploying.
const hardwareQuestion = Interceptor({
    name: 'Fluent MCP hardware type',
    question: 'What type of hardware is affected?',
    answers: [
        {
            $id: Now.ID['fluent_mcp_hw_laptop'],
            answer: 'Laptop',
            type: 'answer',
            targetUrl: 'incident.do?sys_id=-1&sysparm_query=category=hardware^subcategory=laptop',
            order: 100,
        },
        {
            // Prefer externalChoice when the options already exist as a sys_choice dropdown.
            // In a scoped app, point `table` at a same-scope table instead of incident.
            $id: Now.ID['fluent_mcp_hw_subcategory'],
            answer: 'Pick a hardware subcategory',
            type: 'externalChoice',
            table: 'incident',
            element: 'subcategory',
            dependentValue: 'hardware', // subcategory depends on category; confirm values via sys_choice
            order: 200,
        },
    ],
})

// Top-level chooser shown instead of the default new-incident form.
Interceptor({
    name: 'Fluent MCP incident chooser',
    question: 'What would you like to report?',
    intercepts: 'incident.do',
    protectionPolicy: 'read', // lands on sys_wizard only, not on the answers
    answers: [
        {
            $id: Now.ID['fluent_mcp_chooser_general'],
            answer: 'A general issue',
            type: 'answer',
            targetUrl: 'incident.do?sys_id=-1',
            order: 100,
        },
        {
            $id: Now.ID['fluent_mcp_chooser_hardware'],
            answer: 'A hardware problem',
            type: 'leadingQuestion',
            nextQuestion: hardwareQuestion, // same-project question: pass the Interceptor(...) return value
            order: 200,
        },
        {
            $id: Now.ID['fluent_mcp_chooser_urgent'],
            answer: 'Is this blocking your work?',
            type: 'yesNo',
            payloadName: 'is_blocking', // the only field with runtime effect for yesNo
            order: 300,
        },
        {
            // Buttons show buttonLabel; do not also set `answer` (stored but not displayed).
            $id: Now.ID['fluent_mcp_chooser_escalate'],
            type: 'button',
            buttonLabel: 'Escalate now',
            script: "current.priority = '1'; current.update();",
            roles: ['itil'], // runtime visibility filter only
            order: 400,
        },
    ],
})
```
