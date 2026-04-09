# Instructions for Fluent AI Agentic Workflow API
Always reference the AI Agentic Workflow API specifications for more details.
1. Import `AiAgenticWorkflow` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. The `name` and `description` fields are both mandatory. `name` should describe the workflow's function; `description` explains its purpose.
3. Use `executionMode` to choose between 'copilot' (human-in-the-loop, default) and 'autopilot' (fully autonomous) execution.
4. Use `team` to define a group of AI agents that collaborate within the workflow. Team has a `$id`, `name`, `description`, and `members` array referencing AI Agent sys_ids or Record references.
5. Use `versions` to manage multiple versions of workflow instructions. Each version has `name`, `number`, `instructions` text, and `state` ('draft'|'committed'|'published'|'withdrawn'). Defaults to 'draft'.
6. Use `triggerConfig` to define automatic workflow invocation. Each trigger requires `name` and `channel` (e.g., 'Now Assist Panel'). Use `triggerFlowDefinitionType` for record-based triggers ('record_create', 'record_update', 'record_create_or_update') or scheduled triggers ('scheduled', 'daily', 'weekly', 'monthly'). Add `targetTable` for record triggers and `schedule` for time-based triggers.
7. Use `dataAccess` to configure role-based data access. Required when `runAs` is not set. Contains a `roleList` array of role references.
8. Use `contextProcessingScript` to transform or enrich context before the workflow executes. Supports inline functions or `Now.include()` for external files.
9. Set `active: false` to disable a workflow without removing its definition.
10. AI Agentic Workflows are part of the AI Agent Studio framework and enable multi-agent collaboration with trigger-driven automation.
