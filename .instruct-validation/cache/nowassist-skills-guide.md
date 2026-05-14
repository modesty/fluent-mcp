
# Now Assist Skills Guide

Create and configure Now Assist Skills using the `NowAssistSkillConfig` API in the Fluent SDK. Skills use configured prompts to generate AI responses from an LLM, optionally enriched by inputs and tools (script, inline script, web search, subflows, flow actions, decision branches). This guide covers the full lifecycle: provider/model selection, input configuration, tool wiring, prompt authoring, security controls, and deployment. Requires SDK 4.6.0 or higher.

---

## When to Use

- Creating or modifying Now Assist Skills using `NowAssistSkillConfig`
- Adding or modifying skill prompts, inputs, or security controls
- Adding or modifying skill tools (script, inline script, web search, subflows, flow actions, skill-as-tool, decision branches)
- Configuring skill deployment to UI Actions, Flow Actions, or Now Assist Panel

---

## Skill Structure

`NowAssistSkillConfig(Arg 1: SkillDefinition, Arg 2: SkillPromptConfig)`

### API Structure

```typescript
import { NowAssistSkillConfig } from '@servicenow/sdk/core'

NowAssistSkillConfig(
    // Arg 1: SkillDefinition
    {
        $id: Now.ID['skill_name'],
        name: string,
        description?: string,
        shortDescription?: string,
        inputs?: InputAttribute[],
        outputs?: OutputAttribute[],  // optional — 5 standard outputs auto-generated if omitted
        tools?: (t: ToolGraphBuilder) => ToolHandles | void,
        securityControls: SecurityControls,      // MANDATORY
        skillSettings?: SkillSettings,
        deploymentSettings?: DeploymentSettings
    },
    // Arg 2: SkillPromptConfig
    {
        providers: [{
            provider: 'Now LLM Service' | 'Azure OpenAI' | 'Open AI' | string,
            providerAPI?: { type: 'sys_hub_flow', id: string },
            prompts: [{
                name: string,
                versions: [{
                    $id: Now.ID['prompt_v1'],
                    model: string,
                    temperature?: number,
                    maxTokens?: number,
                    promptState: 'draft',
                    prompt: string | ((p: PromptBuilder) => string),
                    filterCondition?: { [inputName: string]: string }
                }]
            }]
        }]
    }
)
```

---

## Provider and Model Configuration

The GenAI configuration follows a **3-level hierarchy**: Provider -> Provider API -> Model.

### Query Steps

1. Query `sys_gen_ai_provider` for provider display names
2. Query `sys_generative_ai_provider_mapping` with `external=true^active=true` for Provider APIs
3. Query `sys_generative_ai_model_config` for each mapping with `provider=<mapping_sys_id>^active=true`

### Key Field Mappings

| What You Need | Table | Column | Code Property |
|---------------|-------|--------|---------------|
| Provider name | `sys_generative_ai_provider_mapping` | `provider` (display) | `provider` key |
| Provider API flow | `sys_generative_ai_provider_mapping` | `provider_implementation` | `providerAPI.id` |
| Model identifier | `sys_generative_ai_model_config` | `model` | `model` |

### Default Recommendation

Use **Now LLM Service** with **Now LLM Generic** provider API and `llm_generic_small_v2` model.

### Code Example

```typescript
providers: [{
    provider: 'Now LLM Service',
    providerAPI: {
        type: 'sys_hub_flow',
        id: '<provider_implementation_sys_id>'
    },
    prompts: p => ({
        model: 'llm_generic_small_v2',
        // prompt config
    })
}]
```

### Known Providers

`'Now LLM Service'`, `'Azure OpenAI'`, `'Open AI'`, `'Google Gemini'`, `'AWS Claude'`, `'IBM Watson'`, `'Perplexity'`, `'Aleph Alpha'`, `'Custom LLM Provider'`

---

## Input Attributes

| Property | Required | Description |
|----------|----------|-------------|
| `$id` | Yes | Unique identifier |
| `name` | Yes | Attribute name (must not contain underscores or special characters) |
| `description` | No | Description of the input attribute |
| `dataType` | Yes | `'string'`, `'numeric'`, `'boolean'`, `'glide_record'`, `'simple_array'`, `'json_object'`, `'json_array'` |
| `mandatory` | No | Whether input is required (default: `false`) |
| `truncate` | No | Whether to truncate the value (only valid for: `string`, `numeric`, `boolean`, `glide_record`; NOT supported for: `simple_array`, `json_object`, `json_array`) |
| `testValues` | No | Values for testing and validation |
| `tableName` | Conditional | Required when using `glide_record` dataType |
| `tableSysId` | Conditional | Required when `testValues` is provided for `glide_record` type |

**Constraint:** A skill can have at most **one** input of type `glide_record`.

**Name conversion:** `"Incident Number"` becomes `{{incident_number}}` in prompts.

### glide_record vs Tools

Use `glide_record` input (preferred) when:
- Single table query
- No calculations or transformations needed
- No tools need access to the record data

Use tools with `string` input type when:
- Multiple tables or joins needed
- Calculations or transformations required
- Record data needed inside a tool script

**Critical:** `glide_record` inputs are NOT accessible inside tools. They can only be referenced in prompts via `p.input.recordName.fieldName`.

---

## Output Attributes

Do **NOT** define custom outputs. The platform automatically creates five default outputs: `response`, `confidence`, `explanation`, `metadata`, `citations`. Reference them in prompts with `${p.output.response}`.

---

## Tool Configuration

### Tool Methods

| Method | Purpose |
|--------|---------|
| `t.Script()` | Reference Script Include |
| `t.InlineScript()` | Inline script function |
| `t.WebSearch()` | Web search (AI answers) |
| `t.Skill()` | Call another skill |
| `t.Subflow()` | Execute Flow Designer subflow |
| `t.FlowAction()` | Execute Flow Designer action |
| `t.Decision()` | Conditional branching |

### Output Access in Prompts

| Tool Type | Access Pattern |
|-----------|----------------|
| `t.Script()` / `t.InlineScript()` | `${p.tool.ToolName.output}` |
| `t.WebSearch()` / `t.Skill()` | `${p.tool.ToolName.response}` |
| `t.FlowAction()` / `t.Subflow()` | `${p.tool.ToolName.outputName}` |

### Required Identifiers

Every tool needs a `$id`. Some tools need additional identifiers depending on how they integrate with the platform:

| Tool Type | `$id` | `$capabilityId` | `output.$id` | Per-input `$id` | Per-output `$id` |
|-----------|:-----:|:---------------:|:------------:|:---------------:|:----------------:|
| `t.InlineScript()` | Yes | No | No | No | No |
| `t.Script()` | Yes | Yes | Yes | Yes | No |
| `t.WebSearch()` | Yes | No | No | No | No |
| `t.Skill()` | Yes | No | No | No | No |
| `t.FlowAction()` | Yes | Yes | No | Yes | Yes |
| `t.Subflow()` | Yes | Yes | No | Yes | Yes |
| `t.Decision()` | Yes | No | No | No | No |

- **`$id`**: Unique record identifier for the tool itself.
- **`$capabilityId`**: Identifies the external capability (Script Include, Flow Action, or Subflow) the tool wraps. Required because these tools reference a platform artifact that exists outside the skill definition.
- **`output.$id`**: Script tools produce a custom output attribute that needs its own identifier. Only applies to `t.Script()`.
- **Per-input / per-output `$id`**: Each entry in the `inputs` or `outputs` array is a separate mapping record and needs its own unique `$id`.

### InlineScript Tool

```typescript
const getIncident = t.InlineScript("GetIncident", {
    $id: Now.ID["skill_getincident_tool"],
    script: `(function(context) {
        var gr = new GlideRecord('incident');
        gr.addQuery('number', context.getValue('incident_number'));
        gr.query();
        if (gr.next()) {
            return {
                number: gr.getValue('number'),
                short_description: gr.getValue('short_description')
            };
        }
        return { error: 'Incident not found' };
    })(context)`
});
```

Access inputs via `context.getValue('input_name')` with **snake_case** conversion.

### Script Tool

Requires an external Script Include with `accessibleFrom: 'all'`. Each `inputs[].name` must match a function parameter name exactly.

```typescript
const myTool = t.Script("MyTool", {
    $id: Now.ID["my_skill_script_tool"],
    $capabilityId: Now.ID["my_skill_script_capability"],
    output: { $id: Now.ID["my_skill_script_output"] },
    scriptId: myScriptInclude,
    scriptFunctionName: 'processData',
    inputs: [
        { $id: Now.ID["tool_input_id"], name: 'param', value: t.input.description }
    ]
});
```

`value` only accepts: `t.input.inputName`, `"hardcoded string"`, or `previousTool.output`.

### WebSearch Tool

```typescript
const searchWeb = t.WebSearch("SearchWeb", {
    $id: Now.ID["my_skill_search_tool"],
    searchType: "ai_answers",
    query: t.input.userQuery,
    aiSearchProviders: "perplexity"  // optional
});
```

Always use `searchType: 'ai_answers'`. External providers require API key configuration.

### Decision Node

```typescript
const checkPriority = t.Decision("CheckPriority", {
    $id: Now.ID["skill_decision"],
    depends: [getData],
    targets: ["Escalate", "Standard"] as const,
    branches: targets => [{
        name: "Critical",
        to: targets.Escalate,
        condition: { field: getData.priority, operator: "is", value: "1" }
    }],
    default: targets => targets.Standard
});
```

Branch conditions: `{ field, operator, value }` where `operator` is `'is'` or `'is_not'`, and `value` is a plain string.

### Tool Chaining

Use the `depends` property:

```typescript
const searchWeb = t.WebSearch("SearchWeb", {
    $id: Now.ID["search_tool"],
    searchType: "ai_answers",
    query: getIncident.output,
    depends: [getIncident]
});
```

---

## Prompt Configuration

### Mandatory 4-Section Structure

```
## Role
You are a [specialist type]. Your task is to [objective].

## Context
The user's [input]: '{{input_name}}'
Tool output: '${p.tool.ToolName.output}'

## Instructions
1. [First step]
2. [Second step]
3. [Constraints]

## Output
The output should be [format]. It must be [qualities].
```

### Prompt Versions

| Property | Required | Description |
|----------|----------|-------------|
| `$id` | Yes | Unique identifier |
| `model` | Yes | Always `'llm_generic_small_v2'` for Now LLM Service |
| `promptState` | Yes | **Always** `'draft'` |
| `prompt` | Yes | Text or builder function `(p) => string` |
| `temperature` | No | 0.0-1.0 (default: `0.2`) |
| `maxTokens` | No | Required for non-Now LLM providers |
| `filterCondition` | No | Per-version usage conditions |

### Type-Safe Prompt Builder

```typescript
prompt: p => `## Role
You are an incident specialist.

## Context
Incident details: ${p.tool.GetIncident.output}

## Instructions
1. Review the incident data.
2. Provide actionable recommendations.

## Output
Provide a structured analysis with Summary, Root Cause, and Recommendations.`
```

### maxTokens Guidelines

| Output Type | Recommended `maxTokens` |
|-------------|-------------------------|
| Short answers (yes/no, category) | 100-200 |
| Brief summaries | 300-500 |
| Formatted reports | 1000-2000 |

**Warning:** Setting `maxTokens` too low for formatted output forces raw JSON responses.

### Conditional Prompts (filterCondition)

```typescript
versions: [
    {
        $id: Now.ID["prompt_high"],
        model: "llm_generic_small_v2",
        promptState: "draft",
        prompt: p => `High priority analysis: ${p.input.description}`,
        filterCondition: { priority: "1" }
    },
    {
        $id: Now.ID["prompt_default"],
        model: "llm_generic_small_v2",
        promptState: "draft",
        prompt: p => `Standard analysis: ${p.input.description}`
    }
]
```

Keys must exactly match input attribute names (case-sensitive, including spaces).

---

## Security Controls (Mandatory)

### userAccess

| Type | Configuration | Use Case |
|------|---------------|----------|
| Authenticated | `{ $id: Now.ID['ua'], type: 'authenticated' }` | General, non-sensitive |
| Role-Based | `{ $id: Now.ID['ua'], type: 'roles', roles: ['itil'] }` | Sensitive data |

### roleRestrictions

Array of role sys_ids (not names). Look up from `sys_user_role` table.

The `maint` role is NOT allowed for skills.

```typescript
securityControls: {
    userAccess: {
        $id: Now.ID['skill_user_access'],
        type: 'roles',
        roles: ['itil']
    },
    roleRestrictions: ['282bf1fac6112285017366cb5f867469']
}
```

---

## Deployment Configuration

| Channel | Configuration | When to Use |
|---------|---------------|-------------|
| UI Action | `uiAction: { $id: Now.ID['skill_uiaction'], table: 'incident' }` | Button on record form |
| Now Assist Panel | `nowAssistPanel: { enabled: true, roles: ['now_assist_panel_user'] }` | Chat interface |
| Flow Action | `flowAction: true` | Flow Designer integration |
| None | Omit `deploymentSettings` | Programmatic only |

```typescript
deploymentSettings: {
    uiAction: { $id: Now.ID['skill_uiaction'], table: 'incident' },
    nowAssistPanel: {
        enabled: true,
        roles: ['now_assist_panel_user']
    },
    flowAction: true,
    skillFamily: 'aabb0011ccdd2233eeff4455aabb6677'  // optional
}
```

---

## Skill Settings (Pre/Post Processors)

```typescript
skillSettings: {
    providers: [{
        $id: Now.ID['skill_preprocessor'],
        name: 'TestPreProcessor',
        preprocessor: `(function(payload) {
            payload.timestamp = new Date().toISOString();
            return payload;
        })(payload);`,
    },
    {
        $id: Now.ID['skill_postprocessor'],
        name: 'TestPostProcessor',
        postprocessor: `(function(payload) {
            if (payload.response) {
                payload.formatted = payload.response.trim();
            }
            return payload;
        })(payload);`
    }]
}
```

---

## Script Guidelines

### Glide APIs Are Global

`gs`, `GlideRecord`, `GlideAggregate`, `GlideDateTime` are globally available. Never import them.

### Input Parsing

All tool inputs arrive as strings:

| Type | Parse |
|------|-------|
| Number | `parseInt(input, 10)` |
| JSON | `JSON.parse(input)` in try-catch |
| Boolean | `input === 'true'` |

### Context Access

- TypeScript tool callbacks: `context.inputs["incident number"]` (exact name, bracket notation)
- GlideRecord scripts: `context.getValue('incident_number')` (snake_case)

### Script Include Requirements

| Setting | Value |
|---------|-------|
| Pattern | `Class.create()` |
| `clientCallable` | `false` |
| `accessibleFrom` | `public` |

---

## Complete Example

```typescript
import { NowAssistSkillConfig } from "@servicenow/sdk/core";

export const incidentAnalyzer = NowAssistSkillConfig(
    {
        $id: Now.ID["incident_analyzer"],
        name: "Incident Analyzer",
        inputs: [
            {
                $id: Now.ID["incident_number"],
                name: "incident number",
                mandatory: true,
                dataType: "string",
                testValues: "INC0010001"
            }
        ],
        tools: t => {
            const getIncident = t.InlineScript("GetIncident", {
                $id: Now.ID["analyzer_getincident_tool"],
                script: `(function(context) {
                    var gr = new GlideRecord('incident');
                    gr.addQuery('number', context.getValue('incident_number'));
                    gr.query();
                    if (gr.next()) {
                        return {
                            number: gr.getValue('number'),
                            short_description: gr.getValue('short_description'),
                            priority: gr.getValue('priority')
                        };
                    }
                    return { error: 'Incident not found' };
                })(context)`
            });
            return { GetIncident: getIncident };
        },
        securityControls: {
            userAccess: {
                $id: Now.ID["analyzer_user_access"],
                type: "roles",
                roles: ["itil"]
            },
            roleRestrictions: ["<ROLE_SYS_ID>"]
        },
        deploymentSettings: {
            uiAction: { $id: Now.ID["analyzer_uiaction"], table: "incident" },
            nowAssistPanel: {
                enabled: true,
                roles: ["now_assist_panel_user"]
            }
        }
    },
    {
        providers: [{
            provider: "Now LLM Service",
            prompts: [{
                name: "Analyze",
                versions: [{
                    $id: Now.ID["analyzer_prompt_v1"],
                    model: "llm_generic_small_v2",
                    promptState: "draft",
                    prompt: p => `## Role
You are an incident analysis specialist.

## Context
Incident details: ${p.tool.GetIncident.output}

## Instructions
1. Review the incident number, description, and priority.
2. Identify root cause based on available information.
3. Provide actionable recommendations.

## Output
**Summary:** [Brief overview]
**Root Cause:** [Identified cause or 'Requires investigation']
**Recommendations:** [Numbered action items]`
                }]
            }]
        }]
    }
);
```

---

## Editing Existing Skills

### Edit Workflow

1. Read the existing `.now.ts` file in `src/fluent/now-assist-skills/`
2. Identify what needs to change
3. Preserve unchanged configuration
4. Update `testValues` if inputs changed
5. Build, install, and verify

### Change Impact Matrix

| Change | Also Update |
|--------|-------------|
| Add input | Update `testValues`, update prompts to reference new input |
| Remove input | Remove all prompt references, check tool dependencies |
| Add tool | Update prompts, add to `return` statement in tools callback |
| Change provider/model | Verify availability, may need prompt adjustments |
| Change `userAccess` | If switching to `roles`, provide role sys_ids |

---

## Validation Rules

### Required Fields

| Rule | Description |
|------|-------------|
| `$id` required | Unique identifier for the skill |
| `name` required | Skill display name |
| `securityControls` required | Must include `userAccess` and `roleRestrictions` |
| `providers` required | At least one provider with prompts |
| `promptState: 'draft'` | Always use `'draft'` -- other values cause validation errors |

### Valid Enums

| Property | Valid Values |
|----------|-------------|
| `dataType` | `'string'`, `'numeric'`, `'boolean'`, `'glide_record'`, `'simple_array'`, `'json_object'`, `'json_array'` |
| `promptState` | `'draft'`, `'finalized'`, `'published'`, `'archived'` |
| `userAccess.type` | `'authenticated'`, `'roles'` |
| `providerAPI.type` | `'sys_hub_flow'`, `'sys_hub_action_type_definition'`, `'sys_script_include'`, `'one_api_system_executor'` |

### Common Hallucinations to Avoid

| Wrong | Correct |
|-------|---------|
| `promptState: 'published'` | `promptState: 'draft'` |
| `dataType: 'record'` | `dataType: 'glide_record'` |
| `dataType: 'text'` | `dataType: 'string'` |
| `roleRestrictions: ['admin']` | `roleRestrictions: ['<sys_id>']` |
| `${p.tool.WebSearch.output}` | `${p.tool.WebSearch.response}` |
| Multiple `glide_record` inputs | Only ONE allowed |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Prompt variable not replaced | Check name conversion (spaces to underscores) |
| Tool output not available | Verify tool executed before prompt references it |
| Script execution failed | Check `context.getValue()` uses snake_case |
| Skill name too long | Shorten to 40 characters |
| Missing glide_record fields | Provide both `tableName` and `tableSysId` |
| ShorthandPropertyAssignment | Use `{ tool: tool }` not `{ tool }` |
| UI Action not appearing | Verify table name, check record exists |
| Skill not in NAP | Set `nowAssistPanel: { enabled: true, roles: ['now_assist_panel_user'] }`, publish in platform |

### Post-Creation: Skill URL

After creating a skill, query `sn_nowassist_skill_config` for `skill_id` and construct: `https://<instance_name>/now/now-assist-skillkit/skill/<skill_id>/`

