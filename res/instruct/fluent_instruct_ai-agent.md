# Instructions for Fluent AI Agent API
Always reference the AI Agent API specifications for more details.
1. Import `AiAgent` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. The `name` and `description` fields are both mandatory. `name` should clearly identify the agent; `description` explains what it does and when to use it.
3. The `agentRole` field is mandatory and describes the agent's purpose (e.g., "IT Support Assistant", "HR Onboarding Guide"). Used for categorization and discovery.
4. Use `versionDetails` to manage multiple versions of agent instructions. Each version has a `name`, `instructions` text, and `state` ('draft'|'committed'|'published'|'withdrawn'). This enables A/B testing and gradual rollouts.
5. Use the `tools` array to define capabilities available to the agent. Each tool has a `type` that determines its behavior: 'crud' for database operations, 'script' for custom logic, 'subflow'/'action' for Flow Designer integration, 'catalog' for Service Catalog items, 'topic'/'topic_block' for Virtual Agent, 'capability' for NowAssist skills, and built-in tools like 'web_automation', 'knowledge_graph', 'rag', 'file_upload'.
6. Use `agentType` to specify whether the agent is 'internal' (ServiceNow), 'external' (third-party AI), 'voice', or 'aia_internal' (system agent). Defaults to 'internal'.
7. Use `channel` to control deployment: 'nap' for Now Assist Panel only, 'nap_and_va' for both Now Assist and Virtual Agent. Defaults to 'nap_and_va'.
8. Use `triggerConfig` to define conditions and schedules for automatic agent execution based on record changes, time schedules, or business events.
9. Use `memoryCategories` to specify which long-term memory categories the agent can access: 'device_and_software', 'meetings_and_events', 'projects', 'workplace'.
10. Set `active: false` to disable an agent without removing its definition.
11. AI Agents are part of the AI Agent Studio framework in ServiceNow and work in conjunction with `AiAgenticWorkflow` definitions for dynamic agentic workflows.
