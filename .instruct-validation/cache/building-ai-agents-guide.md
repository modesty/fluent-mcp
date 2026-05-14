
# Building AI Agents Guide

Build and configure ServiceNow AI Agents and AI Agentic Workflows using the Fluent SDK. AI Agents perform tasks with tools (CRUD, script, OOB, reference-based), while AI Agentic Workflows orchestrate multiple agents as a team. This guide covers end-to-end creation: authentication, tool configuration, instructions authoring, triggers, ACL deployment, and editing existing agents. Requires SDK 4.4.0 or higher.

---

## When to Use

- Creating a new AI Agent in ServiceNow
- Creating AI Agentic Workflows that orchestrate multiple agents
- Modifying existing agents or agentic workflows (adding tools, changing auth, updating instructions)
- Configuring agent authentication and security (Dynamic User vs AI User)
- Selecting and configuring agent tools (CRUD, script, OOB tools)
- Setting up triggers for agents or agentic workflows
- Defining team members for agentic workflows

---

## Workflow vs Single Agent Decision Tree

```
User Request
    |
Does it involve multiple tasks? (AND, THEN, followed by)
    | NO  -> USE SINGLE AI AGENT
    | YES
        |
    Do the tasks require DIFFERENT capability types?
    (e.g., search + summarize, fetch from table A + update table B)
        | NO  -> USE SINGLE AI AGENT (multiple tools, one agent)
        | YES -> USE AI AGENTIC WORKFLOW
```

**Pattern Recognition:**

| User Says | Type | Why |
|-----------|------|-----|
| "Fetch X AND do Y" (different capabilities) | Workflow | Different capability types working together |
| "Get data THEN process it" (different agents) | Workflow | Sequential operations needing different specializations |
| "Look up and update an incident" | Single Agent | Same table, same capability type (CRUD), multiple tools |
| "Search for incidents by priority" | Single Agent | Single task |

**Key distinction:** Multiple _tools_ on the same table or same capability type = single agent with multiple tools. Multiple _capability types_ requiring different specializations = workflow with multiple agents.

---

## AI Agent vs AI Agentic Workflow

| Feature | AI Agent | AI Agentic Workflow |
|---------|----------|---------------------|
| Purpose | Single agent performing tasks | Multiple agents working as a team |
| Import | `AiAgent` from `@servicenow/sdk/core` | `AiAgenticWorkflow` from `@servicenow/sdk/core` |
| Configuration | `tools` array | `team: { $id, name, members: [...] }` |
| Version array | `versionDetails` | `versions` |
| Record identity | `$id` (explicit ID) | `$id` (explicit ID) |
| Security | `securityAcl` (mandatory, auto-generates ACL) | `securityAcl` (mandatory, auto-generates ACL) |
| Run-as user | `runAsUser` | `runAs` |
| Execution mode | `executionMode` on tools | `executionMode` at workflow level (default: `'copilot'`) |
| Trigger channel | `'nap'` / `'nap_and_va'` (agent-level `channel`) | `"Now Assist Panel"` (trigger-level, mandatory) |
| Processing messages | `processingMessage`, `postProcessingMessage` | Not available |

---

## Security ACL (`securityAcl`)

`securityAcl` is **mandatory** on both `AiAgent` and `AiAgenticWorkflow`. It controls **who can invoke** the agent/workflow and auto-generates the `sys_security_acl` and `sys_security_acl_role` records. It is a discriminated union on the `type` field — each variant also requires a `$id` to identify the generated ACL record.

### Access Types

| `type` | Who can invoke | Extra fields |
|--------|----------------|--------------|
| `'Any authenticated user'` | Any logged-in user | None |
| `'Specific role'` | Only users with listed roles | `roles: [...]` (required) |
| `'Public'` | Anyone, no auth required | None |

```typescript
// Any authenticated user
securityAcl: {
    $id: Now.ID['my_agent_acl'],
    type: 'Any authenticated user',
}

// Specific roles only
securityAcl: {
    $id: Now.ID['my_agent_acl'],
    type: 'Specific role',
    roles: [
        '282bf1fac6112285017366cb5f867469',  // itil role sys_id
        'b05926fa0a0a0aa7000130023e0bde98',  // user role sys_id
    ]
}
```

> **Important distinction:** `securityAcl` controls *who can invoke* the agent. `runAsUser` (agent) / `runAs` (workflow) and `dataAccess` are separate — they control *which user identity the agent runs under* when executing.

### Execution Identity (`runAsUser` / `dataAccess`)

Set **either** `runAsUser` (agent) or `dataAccess` — not both:

- **`runAsUser`** — agent always runs as the specified sys_user sys_id regardless of invoker
- **`dataAccess.roleList`** — agent runs as the invoking user, restricted to the listed roles. **Required when `runAsUser` is not set.** For workflows, use `dataAccess` when `runAs` is not set.

### Role Discovery

1. Identify target tables from the agent's CRUD tools
2. Query `sys_security_acl_role` for each table (encodedQuery: `sys_security_acl.nameLIKE<table_name>`)
3. Add discovered role sys_ids to `securityAcl.roles` and/or `dataAccess.roleList`

### Common Role sys_ids

| Role | sys_id |
|------|--------|
| admin | `2831a114c611228501d4ea6c309d626d` |
| itil | `282bf1fac6112285017366cb5f867469` |
| user | `b05926fa0a0a0aa7000130023e0bde98` |

---

## Tool Types and Selection

### Selection Priority

1. **OOB tools** when available (e.g., Web Search, RAG, Knowledge Graph)
2. **Reference-based tools** (action, subflow, capability, catalog, topic)
3. **CRUD tools** for database operations
4. **Script tools** only when no other tool type fits

Never use CRUD tools for journal fields (`work_notes`, `comments`). Always use Script tools with `GlideRecordSecure`.

### Tool Selection Guide

| Need | Tool Type | Why |
|------|-----------|-----|
| Read/search records | CRUD (`lookup`) | Direct table query |
| Create new records | CRUD (`create`) | Maps inputs to columns |
| Modify records | CRUD (`update`) | Query + field update |
| Custom logic | Script | Full JavaScript control |
| Web information | OOB (`web_automation`) | Auto-linked OOB tool |
| Knowledge retrieval | OOB (`rag`) | RAG Search Retrieval |
| Graph-based search | OOB (`knowledge_graph`) | Knowledge Graph tool |
| File ingestion | OOB (`file_upload`) | File Uploader tool |
| In-depth research | OOB (`deep_research`) | Deep Research tool |
| Desktop tasks | OOB (`desktop_automation`) | Desktop Automation tool |
| MCP integration | OOB (`mcp`) | MCP tool |
| Flow Designer action | Action (`action`) | Triggers existing flows |
| Now Assist skill | Capability (`capability`) | Links to skills |

### `inputs` Format by Tool Type

| Tool type | `inputs` format | Has `script` field? |
|-----------|-----------------|---------------------|
| `crud` | **Object** (`ToolInputType`) with `operationName`, `table`, `inputFields`, etc. | No (auto-generated) |
| `script` | **Array** of `[{ name, description, mandatory, value? }]` | Yes |
| `web_automation` | Omit (plugin provides defaults) | No |
| Reference types | Omit (platform resolves at runtime) | No |
| Other OOB types | Omit (plugin provides defaults) | No |

### Required Tool Properties

Every tool **must** have `name` and `type`. `preMessage` and `postMessage` are strongly recommended. Every agent **must** have `processingMessage` and `postProcessingMessage` (not available on workflows).

---

## CRUD Tools

### Operations

| Operation | Required Fields |
|-----------|----------------|
| `create` | `table`, `inputFields` with `mappedToColumn` |
| `lookup` | `table`, `queryCondition`, `returnFields` (mandatory) |
| `update` | `table`, `queryCondition`, `inputFields` with `mappedToColumn` |
| `delete` | `table`, `queryCondition` |

### queryCondition Syntax

Format: `"column_name=={{input_field_name}}"`. Always verify column names by querying `sys_dictionary` before writing tools.

| Operator | Syntax | Example |
|----------|--------|---------|
| Equals | `field=value` | `state=1` |
| Not equals | `field!=value` | `state!=7` |
| Contains | `fieldLIKEvalue` | `short_descriptionLIKEnetwork` |
| Is empty | `fieldISEMPTY` | `assigned_toISEMPTY` |
| OR | `^OR` | `priority=1^ORpriority=2` |

### Lookup Best Practices

- Use `LIKE` operator for text-based searches
- Use multiple keyword inputs with `OR` for natural language
- Prefer `number` over `sys_id` as primary filter: `number={{id}}^ORsys_id={{id}}`
- For reference fields in `returnFields`, include `referenceConfig`: `{ table: "sys_user", field: "name" }`

---

## Script Tools

All script inputs are **strings** at runtime. Parse with `parseInt()`, `JSON.parse()`, etc. The `inputs` field for script tools is a **simple array** of input field definitions (unlike CRUD tools which use an object).

```javascript
(function(inputs) {
    var impact = parseInt(inputs.impact, 10);
    var urgency = parseInt(inputs.urgency, 10);
    // ... logic
    return { priority: result, status: 'success' };
})(inputs);
```

- Always use `GlideRecordSecure` (not `GlideRecord`)
- Do NOT add CDATA tags (plugin handles automatically)
- `inputSchema` is auto-generated from `inputs` — do not specify it manually
- Use module imports for server-side script files (or `Now.include()` for legacy scripts)

---

## Reference-Based Tools

Each requires a type-specific reference field containing the target record's sys_id. Do NOT add `inputs`.

| Tool Type | Required Field | Target Table |
|-----------|----------------|--------------|
| `action` | `flowActionId` | `sys_hub_action_type_definition` |
| `capability` | `capabilityId` | `sn_nowassist_skill_config` |
| `subflow` | `subflowId` | `sys_hub_flow` |
| `catalog` | `catalogItemId` | `sc_cat_item` |
| `topic` | `virtualAgentId` | `sys_cs_topic` |
| `topic_block` | `virtualAgentId` | `sys_cs_topic` |

---

## OOB Tools

OOB tools only require `type` and `name`. The plugin auto-links to the existing OOB tool record.

```typescript
{
    type: 'web_automation',
    name: 'AIA Web Search',
    preMessage: 'Searching the web...',
    postMessage: 'Web search results retrieved.'
}
```

Other supported OOB types: `'rag'`, `'knowledge_graph'`, `'file_upload'`, `'deep_research'`, `'desktop_automation'`, `'mcp'`.

---

## Instructions Authoring

### Three Key Fields

| Field | Purpose | Answers |
|-------|---------|---------|
| `description` | Scope | "What problem does this agent solve?" |
| `agentRole` | Identity (agents only) | "Who am I?" |
| `instructions` | Behavior | "How should I act and use my tools?" |

### Writing Principles

- **Actionable steps**: Every step must bind to a tool action or concrete output
- **Explicit tool references**: Name tools explicitly in instructions
- **Contingencies**: Handle failures with gates: `"DO NOT PROCEED if details are missing"`
- **Trigger context**: Use "from the task" or "from the context" -- NOT "from the triggering record"

### Scaling by Complexity

| Complexity | Tools/Agents | Instructions Length |
|------------|--------------|---------------------|
| Simple | 1-2 tools | 5-10 lines |
| Moderate | 3-4 tools | 10-20 lines |
| Complex | 5+ tools | 20-30 lines |
| Workflow | 2-10 agents | 15-30 lines |

If instructions exceed ~30 lines, split into multiple agents orchestrated by a workflow.

---

## Trigger Configuration

Triggers are optional. Agents/workflows can operate without them via Now Assist Panel.

### Trigger Types

| Type | Description |
|------|-------------|
| `record_create` | On new record creation |
| `record_update` | On record update |
| `record_create_or_update` | On both |
| `email` | On email receipt |
| `scheduled` | On a repeating interval |
| `daily` / `weekly` / `monthly` | Scheduled at specific times |
| `ui_action` (workflows only) | From a UI action button |

### Key Differences: Agent vs Workflow Triggers

| Property | Agent trigger | Workflow trigger |
|----------|--------------|------------------|
| `channel` | `"nap"` or `"nap_and_va"` | `"Now Assist Panel"` (mandatory) |
| `triggerCondition` | Optional | Mandatory for record-based |
| `objectiveTemplate` | Required (defaults to `""`) | Optional |

### Scheduled Trigger Fields

The `schedule` object is used when `triggerFlowDefinitionType` is `'scheduled'`, `'daily'`, `'weekly'`, or `'monthly'`.

| Type | Required Fields (inside `schedule` object) |
|------|---------------------------------------------|
| `daily` | `schedule.time` |
| `weekly` | `schedule.runDayOfWeek` (1=Sun to 7=Sat), `schedule.time` |
| `monthly` | `schedule.runDayOfMonth` (1-31), `schedule.time` |
| `scheduled` | `schedule.repeatInterval` (e.g., `'1970-01-05 12:00:00'` = every 5 days) |

Time format: `"1970-01-01 HH:MM:SS"`.

The `schedule.triggerStrategy` field controls repeat behavior. Values differ by entity type:

| Entity | Valid `triggerStrategy` values |
|--------|-------------------------------|
| AI Agent | `'every'`, `'once'`, `'unique_changes'`, `'always'` |
| AI Agentic Workflow | `'every'`, `'immediate'`, `'manual'`, `'once'`, `'repeat_every'`, `'unique_changes'` |

### Run-As Configuration

For record-based triggers, use one of:
- `runAs: "<column_name>"` — column-based (the column on the target table that holds the user reference)
- `runAsUser: "<sys_id>"` — run as a specific user
- `runAsScript` — a script returning a user sys_id for dynamic resolution

---

## ACL Deployment

Both AI Agents and AI Agentic Workflows use `securityAcl`. The plugin **automatically generates** `sys_security_acl` and `sys_security_acl_role` records — no manual two-step deployment is needed.

The generated ACL name follows the format: `{domain}.{scope}.{name}`

```typescript
// Works the same for both AiAgent and AiAgenticWorkflow
securityAcl: {
    $id: Now.ID['my_agent_acl'],
    type: 'Specific role',
    roles: [
        '282bf1fac6112285017366cb5f867469',  // itil
        'b05926fa0a0a0aa7000130023e0bde98'   // user
    ]
}
```

---

## Workflow Configuration

### Team Structure

Workflows use `$id` for record identity (just like agents). The `team` object also requires its own `$id`.

```typescript
team: {
    $id: Now.ID["workflow_team"],  // MANDATORY on team
    name: "Workflow Team",
    // description is auto-populated from workflow.description — do not set it
    members: [
        "62826bf03710200044e0bfc8bcbe5df1"  // Agent sys_id from sn_aia_agent table
    ]
}
```

Team members can also be specified using the `Record` API (recommended for portability across instances):

```typescript
import { AiAgenticWorkflow, Record } from '@servicenow/sdk/core'

const lookupAgent = Record({ table: 'sn_aia_agent', $id: Now.ID['lookup_agent'], data: { name: 'Lookup Agent' } })
const analysisAgent = Record({ table: 'sn_aia_agent', $id: Now.ID['analysis_agent'], data: { name: 'Analysis Agent' } })

AiAgenticWorkflow({
    // ...
    team: {
        $id: Now.ID['my_team'],
        name: 'My Team',
        members: [lookupAgent, analysisAgent],
    },
})
```

Agents **must** be deployed before creating workflows.

### Workflow-Level Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `executionMode` | `'copilot' \| 'autopilot'` | `'copilot'` | Execution mode for the workflow |
| `memoryScope` | `string` | `'global'` | Memory scope for team members |
| `active` | `boolean` | `true` | Omit if active (default) |
| `sysDomain` | `string` | `'global'` | Omit if global (default) |

Only specify fields that differ from their defaults — the plugin suppresses default values in the transform output.

### Deployment Order

1. Create and deploy AI Agents (with `securityAcl`)
2. Get agent sys_ids from `sn_aia_agent`
3. Create and deploy workflow with `securityAcl` and agent sys_ids
4. Verify with `run_query` on `sn_aia_usecase`

### contextProcessingScript

Supports inline scripts or `Now.include()` for external files:

```javascript
(function(task, user_utterance, workflow_id, context) {
    return {
        pageContext: context?.pageContext,
        triggerContext: context?.triggerContext
    };
})(task, user_utterance, workflow_id, context);
```

```typescript
// Preferred: external file
contextProcessingScript: Now.include('./context-processing-script.js')
```

---

## Complete AI Agent Example

```typescript
import { AiAgent } from "@servicenow/sdk/core";

export const incidentHelperAgent = AiAgent({
    $id: Now.ID["incident_helper_agent"],
    name: "Incident Helper Agent",
    description: "Retrieves incident details and searches for resolution guidance.",
    agentRole: "You are an ITSM incident specialist.",

    // Security — auto-generates ACL records
    securityAcl: {
        $id: Now.ID['incident_helper_agent_acl'],
        type: 'Specific role',
        roles: [
            '282bf1fac6112285017366cb5f867469',  // itil
            'b05926fa0a0a0aa7000130023e0bde98'   // user
        ]
    },

    channel: 'nap_and_va',
    recordType: 'custom',
    processingMessage: "Analyzing your incident request...",
    postProcessingMessage: "Incident analysis complete.",

    versionDetails: [{
        name: "V1",
        number: 1,
        state: "published",
        instructions: `Step 1: Extract the incident number from the user's request.
Step 2: Use the Lookup Incident tool to fetch details.
Step 3: Present details in bullet-point format.
Step 4: Use AIA Web Search for resolution guidance.
Step 5: Recommend next steps. NEVER modify without user approval.`
    }],

    tools: [
        {
            active: true,
            name: "Lookup Incident",
            description: "Searches for incidents by number",
            executionMode: "autopilot",
            type: "crud",
            recordType: "custom",
            preMessage: "Searching for the incident...",
            postMessage: "Incident details retrieved.",
            inputs: {
                operationName: "lookup",
                table: "incident",
                inputFields: [
                    { name: "incident_number", description: "Incident number", mandatory: false }
                ],
                queryCondition: "number={{incident_number}}",
                returnFields: [
                    { name: "number" },
                    { name: "short_description" },
                    { name: "state" },
                    { name: "priority" },
                    { name: "assigned_to", referenceConfig: { table: "sys_user", field: "name" } }
                ]
            }
        },
        {
            type: "web_automation",
            name: "AIA Web Search",
            active: true,
            preMessage: "Searching the web...",
            postMessage: "Web search results retrieved."
        }
    ],

    triggerConfig: []
});
```

## Complete Workflow Example

```typescript
import { AiAgenticWorkflow } from "@servicenow/sdk/core";

export const incidentAnalysisWorkflow = AiAgenticWorkflow({
    $id: Now.ID["incident_analysis_workflow"],
    name: "Incident Analysis Workflow",
    description: "Orchestrates two agents to retrieve and analyze incidents.",
    recordType: "custom",

    // Security — auto-generates ACL records (mandatory)
    securityAcl: {
        $id: Now.ID['incident_analysis_workflow_acl'],
        type: 'Specific role',
        roles: [
            '282bf1fac6112285017366cb5f867469',  // itil
            'b05926fa0a0a0aa7000130023e0bde98'   // user
        ]
    },

    // dataAccess required when runAs is omitted (dynamic user identity)
    dataAccess: {
        roleList: [
            '282bf1fac6112285017366cb5f867469',
            'b05926fa0a0a0aa7000130023e0bde98'
        ]
    },

    team: {
        $id: Now.ID["incident_analysis_team"],
        name: "Incident Analysis Team",
        // description is auto-populated from workflow description
        members: [
            "62826bf03710200044e0bfc8bcbe5df1",
            "274b465a7d5f42e581664209557b2b18"
        ]
    },

    versions: [{
        name: "V1",
        number: 1,
        state: "published",
        instructions: `Step 1: Use the Incident Lookup Agent to fetch details.
Step 2: Use the Analysis Agent to examine patterns.
Step 3: Present findings. NEVER modify without user approval.`
    }],

    triggerConfig: [{
        name: "high_priority_incident",
        channel: "Now Assist Panel",
        targetTable: "incident",
        triggerFlowDefinitionType: "record_create",
        triggerCondition: "priority<=2",
        objectiveTemplate: "Analyze high priority incident ${number}",
        showNotifications: true,
        runAsScript: `(function(current) {
            return current.assigned_to || "6816f79cc0a8016401c5a33be04be441";
        })(current);`
    }]
});
```

---

## Editing Existing Agents/Workflows

### Safe Edit Workflow

1. Locate the `.now.ts` file
2. Read the entire current configuration
3. Identify scope of changes (see Change Impact Matrix)
4. Apply only the requested changes
5. Redeploy and verify with `run_query`

### Change Impact Matrix

| Change | Also Update |
|--------|-------------|
| Add CRUD tool | Verify columns, update instructions, check executionMode |
| Remove tool | Remove instruction references, check dependencies |
| Change auth mode | Update `securityAcl.type`, add/remove `roles` as needed |
| Add trigger | Add to `triggerConfig`, verify target table |
| Add team member (workflow) | Deploy agent first, get sys_id, update instructions |
| Update instructions | Ensure all referenced tool/agent names still exist |

### Rollback

Set current published version to `state: "withdrawn"`, set previous version to `state: "published"`, redeploy.

---

## Validation and Enums

### Required Fields

| Entity | Mandatory Fields |
|--------|-----------------|
| AI Agent | `$id`, `name`, `description`, `agentRole`, `securityAcl` |
| AI Agentic Workflow | `$id`, `name`, `description`, `securityAcl`, `team.$id` |
| CRUD tool | `name`, `type`, `inputs.operationName`, `inputs.table`, `inputs.inputFields` |
| Script tool | `name`, `type`, `script` |

### Valid Enums

| Property | Valid Values |
|----------|-------------|
| `recordType` (agent) | `"custom"`, `"template"`, `"aia_internal"`, `"promoted"` (default: `"template"`) |
| `recordType` (workflow) | `"custom"`, `"template"`, `"aia_internal"` (default: `"template"`) |
| `executionMode` (tool) | `"autopilot"`, `"copilot"` |
| `executionMode` (workflow) | `"autopilot"`, `"copilot"` (default: `"copilot"`) |
| `state` (version) | `"draft"`, `"committed"`, `"published"`, `"withdrawn"` (default: `"draft"`) |
| `tool.type` | `"script"`, `"crud"`, `"capability"`, `"subflow"`, `"action"`, `"catalog"`, `"topic"`, `"topic_block"`, `"web_automation"`, `"rag"`, `"knowledge_graph"`, `"file_upload"`, `"deep_research"`, `"desktop_automation"`, `"mcp"` |
| `securityAcl.type` | `'Any authenticated user'`, `'Specific role'`, `'Public'` |
| `agentType` | `"internal"`, `"external"`, `"voice"`, `"aia_internal"` |
| `channel` (agent) | `"nap"`, `"nap_and_va"` (default: `"nap_and_va"`) |
| `schedule.triggerStrategy` (agent) | `"every"`, `"once"`, `"unique_changes"`, `"always"` |
| `schedule.triggerStrategy` (workflow) | `"every"`, `"immediate"`, `"manual"`, `"once"`, `"repeat_every"`, `"unique_changes"` |
| `outputTransformationStrategy` | `"abstract_summary"`, `"custom"`, `"none"`, `"paraphrase"`, `"summary"`, `"summary_for_search_results"` |

### Common Hallucinations to Avoid

| Wrong | Correct |
|-------|---------|
| `"standard"` | `"custom"` (recordType) |
| `"automatic"` | `"autopilot"` (executionMode) |
| `"active"` | `"published"` (state) |
| `"database"` | `"crud"` (tool.type) |
| `versions` (for agents) | `versionDetails` |
| `versionDetails` (for workflows) | `versions` |
| `runAs` (for agents) | `runAsUser` |
| `"nap"` (for workflow triggers) | `"Now Assist Panel"` |
| `acl: "..."` (for agents or workflows) | `securityAcl: { $id, type, roles? }` (mandatory for both) |
| Missing `securityAcl` on workflows | `securityAcl` is mandatory for workflows too, not just agents |
| `securityAcl: { userAccess: 'dynamic_user' }` | `securityAcl: { $id, type: 'Any authenticated user' \| 'Specific role' \| 'Public' }` |
| Missing `$id` at workflow top level | Workflows use `$id` just like agents — always include it |
| `processingMessage` on workflows | Agent-only field — not valid on `AiAgenticWorkflow` |
| `postProcessingMessage` on workflows | Agent-only field — not valid on `AiAgenticWorkflow` |
| `team.description` set manually | Auto-populated from workflow `description` — do not set |
| Manual `inputSchema` | Auto-generated from `inputs` — never set manually |
| `inputs: {...}` for script tools | `inputs: [...]` (array, not object) for script tools |
| `dataAccess` omitted when `runAs` absent (workflow) | `dataAccess` is mandatory for workflows when `runAs` is not set |

---

## Error Recovery

| Error Pattern | Category | Resolution |
|---------------|----------|------------|
| `dataAccess.roleList is mandatory` | Missing roles | Add `dataAccess.roleList` with role sys_ids (required when `runAsUser`/`runAs` is not set) |
| `Table not found` | Bad table name | Query `sys_db_object` to verify |
| `Record not found` / `Invalid reference` | Bad sys_id | Query appropriate table for correct sys_id |
| `Duplicate name` | Name collision | Query both `sn_aia_agent` and `sn_aia_usecase` |
| ACL / permission error | ACL misconfiguration | Verify `securityAcl` is set correctly |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `sn_aia_agent` | AI Agent records |
| `sn_aia_agent_config` | Agent configuration and settings |
| `sn_aia_usecase` | AI Agentic Workflow records |
| `sn_aia_usecase_config_override` | Configuration overrides for workflows |
| `sn_aia_team` | Team configuration |
| `sn_aia_team_member` | Team member records |
| `sn_aia_version` | Version information |
| `sn_aia_tool` | Tool definitions |
| `sn_aia_agent_tool_m2m` | Agent-to-tool relationships |
| `sn_aia_trigger_configuration` | Trigger configuration |
| `sn_aia_trigger_agent_usecase_m2m` | Trigger-agent-usecase mappings |
| `sys_agent_access_role_configuration` | Role-based data access controls |
| `sys_security_acl` | ACL records (auto-generated by `securityAcl`) |
| `sys_user_role` | Role records |

