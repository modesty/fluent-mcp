# **Context:** AI Agent Workflow API spec: creates dynamic agentic workflow definitions for AI Agent Studio. Workflows define the execution logic and decision paths that AI agents follow when processing tasks.

```typescript
// Creates a new AI Agent Workflow definition
AiAgentWorkflow({
  $id: '', // string | guid, mandatory - unique identifier for the workflow
  name: '', // string, mandatory - display name of the workflow
  description: '', // string, optional - description of the workflow's purpose
  active: true, // boolean, optional - whether the workflow is active
  agent: '', // string, optional - reference to the AI Agent that uses this workflow
  steps: [], // WorkflowStep[], optional - ordered array of workflow steps
    // Each step: { name: string, type: string, action: string, condition?: string }
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this workflow
}): AiAgentWorkflow
```
