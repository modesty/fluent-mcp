# **Context:** AI Agent API spec: creates AI Agent definitions (sn_aia_agent) for ServiceNow's AI Agent Studio. AI Agents are autonomous entities that can perform tasks, make decisions, and interact with users and systems.

```typescript
// Creates a new AI Agent definition
AiAgent({
  $id: '', // string | guid, mandatory - unique identifier for the AI agent
  name: '', // string, mandatory - human-readable name shown in the UI, must be unique within scope
  description: '', // string, mandatory - brief explanation of what the agent does and when to use it
  agentRole: '', // string, mandatory - describes the agent's role or purpose (e.g., 'IT Support Assistant', 'HR Onboarding Guide')
  securityAcl: {}, // SecurityAclUserAccessConfig, MANDATORY - auto-generates `sys_security_acl` + `sys_security_acl_role` records controlling who can invoke the agent
    // Shape: { $id: Now.ID['…'], type: 'Specific role' | …, roles: string[] (role names or sys_ids) }
  active: true, // boolean, optional - controls whether the agent is available for use (default: true)
  agentDescriptor: '', // AiAgentDescriptorType | '', optional (SDK v4.7.0+) - classifies how the agent was created / its access requirement; set on `sn_aia_agent_config`
    // Values: 'require_caller_id' | 'created_by_ai_agent_advisor' | 'created_by_build_agent'. Defaults to ''
  agentType: '', // 'internal' | 'external' | 'voice' | 'aia_internal', optional - specifies agent type (default: 'internal')
  channel: '', // 'nap' | 'nap_and_va', optional - where the agent is available: Now Assist Panel only or both Now Assist and Virtual Agent (default: 'nap_and_va')
  advancedMode: false, // boolean, optional - enables advanced configuration options (default: false)
  agentLearning: false, // boolean, optional - allows the agent to learn from interactions and improve over time (default: false)
  agentConfigSysOverrides: '', // string | Record<'sn_aia_agent_config'>, optional - reference to overrides for agent config
  compiledHandbook: '', // string, optional - compiled handbook for the agent
  condition: '', // string, optional - condition table reference
  contextProcessingScript: '', // function | string, optional - server-side script that transforms or enriches context before agent executes (supports Now.include())
  dataAccess: {}, // DataAccessConfigType, optional (MANDATORY when runAsUser is NOT set) - which roles the agent inherits from the invoking user
    // Provide at least one of (SDK v4.7.0+):
    //   roleMap: [],  // string[] of role NAMES (e.g. ['itil','admin']) - preferred; resolved at build time via `sys_agent_access_role_mapping`
    //   roleList: [], // string[] of role SYS_IDS (e.g. ['282bf1fac6112285017366cb5f867469']) - legacy path
    //   description: '' // string, optional
  docUrl: '', // string, optional - link to external documentation or help content
  external: false, // boolean, optional - whether the agent is external
  externalAgentConfiguration: '', // string | Record<'sn_aia_external_agent_configuration'>, optional - reference to external agent configuration
  iconUrl: '', // string, optional - URL to custom icon image representing this agent in the UI
  parent: '', // string | Record<'sn_aia_agent'>, optional - reference to parent AI Agent
  postProcessingMessage: '', // string, optional - message shown to users after the agent finishes execution
  processingMessage: '', // string, optional - message shown to users while the agent is working
  public: false, // boolean, optional - controls whether the agent appears in public catalogs (default: false)
  recordType: '', // 'template' | 'aia_internal' | 'custom' | 'promoted', optional - classifies the agent's lifecycle stage (default: 'template')
  runAsUser: '', // string | Record<'sys_user'>, optional - specifies which user's permissions the agent uses when accessing data
  sourceId: '', // string | Record<'sn_aia_agent'>, optional - reference to the source agent (for cloned agents)
  sysDomain: '', // string, optional - domain ID
  memoryCategories: [], // ('device_and_software' | 'meetings_and_events' | 'projects' | 'workplace')[], optional - categories of long-term memory the agent can access
  tools: [], // AiAgentToolDetailsType[], optional - array of tools and capabilities available to the agent (see tool types below)
  triggerConfig: [], // AiAgentTriggerConfigType[], optional - defines conditions and schedules for automatic agent execution
  versionDetails: [], // AiAgentVersionDetailsType[], optional - manages multiple versions of agent instructions for A/B testing and gradual rollouts
}): AiAgent

// Tool types (discriminated union based on 'type' field):
// - type: 'crud' — CRUD database operations, requires 'inputs' (ToolInputType with operationName, table, inputFields)
// - type: 'script' — custom script logic, requires 'script' (function | string), optional 'inputs'
// - type: 'capability' — references a NowAssist skill, requires 'capabilityId'
// - type: 'subflow' — references a Flow Designer subflow, requires 'subflowId'
// - type: 'action' — references a Flow Designer action, requires 'flowActionId'
// - type: 'catalog' — references a Service Catalog item, requires 'catalogItemId'
// - type: 'topic' — references a Virtual Agent topic, requires 'virtualAgentId'
// - type: 'topic_block' — references a Virtual Agent topic block, requires 'virtualAgentId'
// - type: 'web_automation' — OOB web search tool
// - type: 'knowledge_graph' — OOB knowledge graph tool
// - type: 'file_upload' — OOB file uploader tool
// - type: 'rag' — OOB RAG search retrieval tool
// Common tool fields: name (mandatory), description, active, displayOutput, executionMode ('autopilot'|'copilot'), maxAutoExecutions, outputTransformationStrategy, postMessage, preMessage, preRun, postProcessingScript, timeout, toolAttributes, widgets

// AiAgentVersionDetailsType:
// - name: string — version name
// - number?: number — version number
// - instructions?: string — version-specific instructions
// - state?: 'draft' | 'committed' | 'published' | 'withdrawn' (default: 'draft')
// - condition?: string — condition for version activation
```
