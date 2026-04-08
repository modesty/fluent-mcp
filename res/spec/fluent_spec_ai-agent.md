# **Context:** AI Agent API spec: creates AI Agent definitions for the AI Agent Studio in ServiceNow. AI Agents are autonomous entities that can perform tasks, make decisions, and interact with users and systems.

```typescript
// Creates a new AI Agent definition
AiAgent({
  $id: '', // string | guid, mandatory - unique identifier for the AI agent
  name: '', // string, mandatory - display name of the AI agent
  description: '', // string, optional - description of the agent's purpose and capabilities
  active: true, // boolean, optional - whether the agent is active
  category: '', // string, optional - category for organizing agents
  instructions: '', // string, optional - system instructions that guide the agent's behavior
  skills: [], // string[], optional - array of skill IDs or references the agent can use
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this agent definition
}): AiAgent
```
