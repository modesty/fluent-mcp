# **Context:** AI Agentic Workflow API spec: creates dynamic agentic workflow definitions (sn_aia_workflow_def) for AI Agent Studio. Workflows define team-based execution logic with trigger-driven automation, versioned instructions, and configurable execution modes.

```typescript
// Creates a new AI Agentic Workflow definition
AiAgenticWorkflow({
  $id: '', // string | guid, mandatory - unique identifier for the workflow
  name: '', // string, mandatory - display name of the AI Agentic Workflow
  description: '', // string, mandatory - description of the AI Agentic Workflow
  active: true, // boolean, optional - whether the workflow is active (default: true)
  executionMode: '', // 'copilot' | 'autopilot', optional - execution mode (default: 'copilot')
  recordType: '', // 'custom' | 'template' | 'aia_internal', optional - record type classification (default: 'template')
  contextProcessingScript: '', // function | string, optional - script that processes context for the workflow (supports Now.include())
  sysDomain: '', // string, optional - domain ID
  memoryScope: '', // string, optional - memory scope for team members
  acl: '', // string | Record<'sys_security_acl'> | Acl, optional - access control list reference
  runAs: '', // string, optional - user to run workflow as
  dataAccess: {}, // DataAccessConfigWorkflowType, optional - data access controls (required when runAs is empty)
    // dataAccess: { description?: string, roleList: (string | Role | Record<'sys_user_role'>)[] }
  team: {}, // TeamType, optional - team configuration with members
    // team: { $id, name?, description?, sysDomain?, members?: (string | Record<'sn_aia_agent'>)[] }
  versions: [], // AIAVersion[], optional - array of version configurations
    // Each version: { name: string, number?: number, instructions?: string, state?: 'draft'|'committed'|'published'|'withdrawn' (default: 'draft'), condition?: string }
  triggerConfig: [], // TriggerConfigType[], optional - trigger configurations for automatic invocation
    // Each trigger: { name: string (mandatory), channel: string (mandatory), description?, active? (default: false), triggerCondition?, enableDiscovery?, notificationScript?, objectiveTemplate?, portal?, profile?, runAs?, runAsScript?, runAsUser?, businessRule?, showNotifications?, domain?, targetTable?, triggerFlowDefinitionType? ('record_create'|'record_create_or_update'|'record_update'|'email'|'scheduled'|'daily'|'weekly'|'monthly'|'ui_action'), schedule? (ScheduleConfigWorkflowType) }
    // ScheduleConfigWorkflowType: { runDayOfMonth? (1-31), runDayOfWeek? (1-7, 1=Sunday), repeatInterval? (Duration string), starting? (datetime string), time? (datetime string), triggerStrategy? ('every'|'immediate'|'manual'|'once'|'repeat_every'|'unique_changes'|'') }
}): AiAgenticWorkflow
```
