# Instructions for Fluent AI Agent Workflow API
Always reference the AI Agent Workflow API specifications for more details.
1. Import `AiAgentWorkflow` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. The `name` field is mandatory and should describe the workflow's function (e.g., "Incident Triage Workflow", "Employee Onboarding Process").
3. Use the `agent` field to reference the `AiAgent` definition that will execute this workflow.
4. Define the `steps` array to specify the ordered sequence of actions the workflow performs. Each step has a name, type, action to execute, and optional conditions.
5. AI Agent Workflows work in conjunction with `AiAgent` definitions and are part of the AI Agent Studio in ServiceNow.
6. Set `active: false` to disable a workflow without removing its definition.
7. Workflows enable complex multi-step agentic behavior where the AI agent can make decisions, gather information, and take actions autonomously.
