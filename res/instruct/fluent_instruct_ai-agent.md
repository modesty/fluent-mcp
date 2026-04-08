# Instructions for Fluent AI Agent API
Always reference the AI Agent API specifications for more details.
1. Import `AiAgent` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. The `name` field is mandatory and should clearly describe the agent's role (e.g., "IT Support Agent", "HR Onboarding Agent").
3. Use `instructions` to provide system-level guidance that shapes the agent's behavior, tone, and decision-making approach.
4. The `skills` array references skill configurations that the agent can invoke. Ensure referenced skills are defined and active.
5. AI Agents are part of the AI Agent Studio framework in ServiceNow and work in conjunction with `AiAgentWorkflow` definitions for dynamic agentic workflows.
6. Use the `category` field to organize agents by domain or function.
7. Set `active: false` to disable an agent without removing its definition.
