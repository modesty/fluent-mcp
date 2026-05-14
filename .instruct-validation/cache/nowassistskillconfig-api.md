
# Function: NowAssistSkillConfig(definition, promptConfig)

Creates a NowAssist Skill configuration for building AI-powered skills on the ServiceNow platform using the Fluent API. A NowAssist Skill Config defines the complete skill setup — including metadata, inputs, outputs, tool integrations, LLM provider and prompt configurations, and security controls — so that it can be built as a NowAssist skill. Use this when you want to define a generative AI skill as source-driven code instead of configuring it manually through the Skill Builder UI.

Takes two arguments to solve the IntelliSense ordering problem:
- **Arg 1 (definition):** Skill metadata, inputs, outputs, tools, security
- **Arg 2 (promptConfig):** LLM provider configurations with prompts

TypeScript infers function arguments LEFT-TO-RIGHT, so `TInputs` and `TTools`
are fully resolved from arg 1 before arg 2 needs them. This guarantees
`p.tool.*` and `p.input.*` IntelliSense works regardless of property order.

## Usage

```typescript
// Basic skill without tools
NowAssistSkillConfig(
  {
    $id: Now.ID['my_skill'],
    name: 'Customer Support Helper',
    shortDescription: 'Helps with customer inquiries',
    description: 'AI-powered customer support assistant',
    inputs: [
      {
        $id: Now.ID['customer_inquiry_input'],
        name: 'customer inquiry',
        description: 'Customer question or issue',
        mandatory: true,
        dataType: 'string'
      }
    ],
    // Outputs — optional. Standard outputs (response, provider, errorcode, status, error) are auto-generated from fluent if omitted.
    outputs: [
      {
        $id: Now.ID['customer_support_custom_response'],
        name: 'support response',
        description: 'Support response',
        dataType: 'string'
      }
    ],
    securityControls: {
      userAccess: { $id: Now.ID['customer_support_acl'], type: 'authenticated' },
      roleRestrictions: ['2831a114c611228501d4ea6c309d626d']
    }
  },
  {
    providers: [
      {
        provider: 'Now LLM Service',
        prompts: [
          {
            name: 'Support Prompt',
            versions: [
              {
                $id: Now.ID['support_prompt_v1'],
                version: 1,
                model: 'llm_generic_small',
                temperature: 0.3,
                prompt: 'You are a helpful customer support agent...',
                promptState: 'draft'
              }
            ]
          }
        ]
      }
    ]
  }
)

// Skill with tools — TTools inferred from arg 1, available in arg 2 prompts
NowAssistSkillConfig(
  {
    $id: Now.ID['incident_skill'],
    name: 'Incident Processing Skill',
    inputs: [
      { $id: Now.ID['incident_number_input'], name: 'incident number', dataType: 'string', mandatory: true },
      { $id: Now.ID['priority_input'], name: 'priority', dataType: 'string', mandatory: false }
    ],
    outputs: [],
    tools: (t) => ({
      FetchIncident: t.Script('FetchIncident', {
        scriptId: 'script_sys_id',
        inputs: [{ name: 'num', value: t.input['incident number'] }],
        output: { $id: Now.ID['fetch_incident_output'] },
      })
    }),
    securityControls: {
      userAccess: { $id: Now.ID['incident_skill_acl'], type: 'authenticated' },
      roleRestrictions: ['2831a114c611228501d4ea6c309d626d']
    }
  },
  {
    providers: [
      {
        provider: 'Now LLM Service',
        prompts: [
          {
            name: 'Main Prompt',
            versions: [
              {
                $id: Now.ID['main_prompt_v1'],
                model: 'llm_generic_small',
                promptState: 'draft',
                prompt: (p) => `
                  Incident: ${p.input['incident number']}
                  Data: ${p.tool.FetchIncident.output}
                `
              }
            ]
          }
        ]
      }
    ]
  }
)
```
## Parameters

### definition

`SkillDefinitionWithID<readonly InputAttribute<string>[], Record<string, BaseToolHandle>>`

Skill definition including name, inputs, outputs, tools, and settings

**Properties:**

- **name** (required): `string`
  Display name shown in the NowAssist skill picker and admin views

- **securityControls** (required): `SecurityControls`
  Security controls for user access and role restrictions
  MANDATORY: Must be provided for all skills
  Defines who can access the skill and what roles it can inherit during execution

- **deploymentSettings** (optional): `DeploymentSettings`
  Deployment settings for UI Action and UI Builder
  **Note:** Once enabled, deploymentSettings should not be removed — similar to Now Assist Skill UI, which does not allow disabling deployment options once configured.

- **description** (optional): `string`
  Detailed explanation of what the skill does, shown on the skill detail page

- **inputs** (optional): `readonly InputAttribute<string>[]`
  Input attributes for the skill. Define as an inline array — type inference is automatic.
  - **$id** (required): `Now.ID['...']` - Explicit ID for the input attribute
  - **name** (required): `string` - Attribute name (must not contain underscores or special characters)
  - **description** (optional): `string` - Description of the input attribute
  - **mandatory** (optional): `boolean` - Whether the input is mandatory (default: false)
  - **dataType** (required): `'string' | 'numeric' | 'boolean' | 'glide_record' | 'simple_array' | 'json_object' | 'json_array'`
  - **truncate** (optional): `boolean` - Whether to truncate the value (only valid for: string, numeric, boolean, glide_record; NOT supported for: simple_array, json_object, json_array)
  - **testValues** (optional): `string` - Test values for testing and validation
  - **tableName** (optional): `string` - Table name (REQUIRED when using `glide_record` dataType)
  - **tableSysId** (optional): `string` - Test record sys ID (REQUIRED when `testValues` is provided for `glide_record` type)

- **outputs** (optional): `OutputAttribute[]`
  Data produced by the skill after execution, available to callers and downstream systems.
  If omitted or empty, the 5 standard outputs (`response`, `provider`, `errorcode`, `status`, `error`) are auto-generated.
  Custom outputs can be added alongside standard outputs.
  - **$id** (required): `Now.ID['...']` - Explicit ID for the output attribute
  - **name** (required): `string` - Attribute name
  - **description** (optional): `string` - Description of the output attribute
  - **dataType** (required): `'string' | 'numeric' | 'boolean' | 'glide_record' | 'simple_array' | 'json_object' | 'json_array'`
  - **tableName** (optional): `string` - Table name (REQUIRED when using `glide_record` dataType)

- **shortDescription** (optional): `string`
  Brief one-line summary displayed in skill listings and search results

- **skillSettings** (optional): `SkillSettings`
  Skill-level settings including providers

- **state** (optional): `'published'`
  Skill state. If not provided, skill will be in draft state.
  **Note:** Skills should be published from the ServiceNow UI (Skill Builder), not via Fluent code. This property is primarily used during transform to preserve the published state when syncing from instance.

- **tools** (optional): `(tools: ToolGraphBuilder<readonly InputAttribute<string>[]>) => void | Record<string, BaseToolHandle>`
  Tool graph configuration (optional)
  Define tools that the skill can use during execution
  **IMPORTANT:** Return tool handles to enable type-safe tool output access in prompts!
  **Supported Tool Types:**
    - **Script**: Script Include execution
    - **InlineScript**: Inline script execution
    - **FlowAction**: Flow Action execution
    - **Subflow**: Subflow execution
    - **Skill**: Skill-as-Tool execution
    - **WebSearch**: Web search capabilities
    - **Decision**: Conditional branching logic


### promptConfig

`object`

Provider and prompt configurations

**Properties:**

- **providers** (required): `[...ValidatedProviders<TProviders, TInputs, TTools>[]]`
  **Note:** If the skill is published, do not modify an existing published prompt. Instead, create a new version of the prompt to modify it.

- **defaultProvider** (optional): `TProviders[number]['provider']`



## Examples

### basic-skill

```typescript
/**
 * Basic NowAssist Skill Example
 *
 * A minimal skill that processes a user query using a single LLM provider.
 * This is the simplest possible NowAssist skill configuration.
 */
import { NowAssistSkillConfig } from '@servicenow/sdk/core'

NowAssistSkillConfig(
    {
        $id: Now.ID['incident_summarizer_skill'],
        name: 'Incident Summarizer',
        shortDescription: 'Summarizes incident details for quick review',
        description:
            'Takes an incident number and provides a concise summary of the incident status, priority, and recent updates.',
        inputs: [
            {
                $id: Now.ID['input_incident_number'],
                name: 'incident number',
                description: 'The incident number to summarize (e.g., INC0012345)',
                mandatory: true,
                dataType: 'string',
                testValues: 'INC0012345',
            },
            {
                $id: Now.ID['input_include_history'],
                name: 'include history',
                description: 'Whether to include work notes history',
                mandatory: false,
                dataType: 'boolean',
            },
        ],
        // Outputs — optional. Standard outputs are auto-generated if omitted.
        outputs: [
            {
                $id: Now.ID['output_summary'],
                name: 'summary',
                description: 'The generated incident summary',
                dataType: 'string',
            },
        ],
        securityControls: {
            userAccess: {
                $id: Now.ID['acl-basic'],
                type: 'authenticated',
            },
            roleRestrictions: ['2831a114c611228501d4ea6c309d626d'],
        },
    },
    {
        providers: [
            {
                provider: 'Now LLM Service',
                prompts: [
                    {
                        name: 'Summarize Incident',
                        versions: [
                            {
                                $id: Now.ID['prompt_summarize_v1'],
                                model: 'llm_generic_small_v2',
                                temperature: 0.2,
                                prompt: (p) =>
                                    `You are a ServiceNow incident analyst. Summarize the following incident concisely.\n\nIncident Number: ${p.input['incident number']}\nInclude History: ${p.input['include history']}\n\nProvide:\n1. Current status and priority\n2. Brief description of the issue\n3. Recent activity (if history requested)`,
                                promptState: 'draft',
                            },
                        ],
                    },
                ],
            },
        ],
    }
)

```

### comphrehensive-skill

```typescript
/**
 * Comprehensive NowAssist Skill Example
 *
 * Demonstrates all configuration options including:
 *   - Multiple input/output data types (string, boolean, glide_record, json_object, etc.)
 *   - Tool dependencies and conditional execution
 *   - Deployment settings (UI Action, Now Assist Panel, Flow Action)
 *   - Skill settings with preprocessor/postprocessor
 *   - Multiple providers with multiple prompts and versioning
 *   - Arrow function prompts with tool output references
 *   - Published state
 */
import { NowAssistSkillConfig } from '@servicenow/sdk/core'

NowAssistSkillConfig(
    {
        $id: Now.ID['hr_case_assistant_skill'],
        name: 'HR Case Assistant',
        shortDescription: 'AI-powered HR case resolution assistant',
        description:
            'Assists HR agents by analyzing case details, searching knowledge bases, running diagnostic subflows, and generating resolution recommendations with full audit trail.',

        // ──────────────────────
        // Inputs — all data types
        // ──────────────────────
        inputs: [
            {
                $id: Now.ID['input_case_query'],
                name: 'case query',
                description: 'The HR case question or request',
                mandatory: true,
                dataType: 'string',
                testValues: 'Employee requesting parental leave policy details',
            },
            {
                $id: Now.ID['input_case_record'],
                name: 'case record',
                description: 'Reference to the HR case record',
                mandatory: false,
                dataType: 'glide_record',
                tableName: 'sn_hr_core_case',
                testValues: 'INC123456',
                tableSysId: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
            },
            {
                $id: Now.ID['input_include_policy'],
                name: 'include policy',
                description: 'Whether to include full policy text',
                mandatory: false,
                dataType: 'boolean',
            },
            {
                $id: Now.ID['input_case_metadata'],
                name: 'case metadata',
                description: 'Additional case metadata in JSON format',
                mandatory: false,
                dataType: 'json_object',
            },
            {
                $id: Now.ID['input_related_cases'],
                name: 'related case ids',
                description: 'List of related case IDs',
                mandatory: false,
                dataType: 'simple_array',
            },
        ],

        // ───────────────────────────────────────────────────────────────────────────────
        // Outputs — 5 standard outputs + custom outputs
        // ───────────────────────────────────────────────────────────────────────────────
        outputs: [
            // Standard outputs (these 5 are auto-generated if outputs array is omitted)
            { $id: Now.ID['output_response'], name: 'response', dataType: 'string' },
            { $id: Now.ID['output_provider'], name: 'provider', dataType: 'string' },
            { $id: Now.ID['output_errorcode'], name: 'errorcode', dataType: 'string' },
            { $id: Now.ID['output_status'], name: 'status', dataType: 'string' },
            { $id: Now.ID['output_error'], name: 'error', dataType: 'string' },
            // Custom outputs
            {
                $id: Now.ID['output_recommendation'],
                name: 'recommendation',
                description: 'AI-generated resolution recommendation',
                dataType: 'string',
            },
            {
                $id: Now.ID['output_confidence'],
                name: 'confidence score',
                description: 'Confidence score of the recommendation (0-100)',
                dataType: 'numeric',
            },
            {
                $id: Now.ID['output_policy_refs'],
                name: 'policy references',
                description: 'Referenced policy documents',
                dataType: 'json_array',
            },
        ],

        // ─────────────────
        // Tools — full graph
        // ─────────────────
        tools: (t) => {
            // Step 1: Search knowledge base for relevant policies
            const searchPolicies = t.WebSearch('SearchPolicies', {
                $id: Now.ID['tool_search_policies'],
                searchType: 'searching_and_scraping',
                query: t.input['case query'],
                sites: 'hr-policies.company.com',
                numResults: 5,
                maxTokens: 2000,
                country: 'US',
            })

            // Step 2: Fetch case details via Script Include
            const fetchCase = t.Script('FetchCaseDetails', {
                $id: Now.ID['tool_fetch_case'],
                $capabilityId: Now.ID['tool_fetch_case_cap'],
                output: { $id: Now.ID['tool_fetch_case_output'] },
                scriptId: 'aabb1122ccdd3344eeff5566aabb7788',
                scriptFunctionName: 'getCaseWithHistory',
                inputs: [
                    { $id: Now.ID['fetch_case_input_query'], name: 'query', value: t.input['case query'] },
                    { $id: Now.ID['fetch_case_input_record'], name: 'caseRef', value: t.input['case record'] },
                ],
                truncate: true,
                condition: {
                    type: 'script',
                    script: 'return currentInputs.caseRecord !== null && currentInputs.caseRecord !== "";',
                },
            })

            // Step 3: Run compliance check subflow
            const complianceCheck = t.Subflow('ComplianceCheck', {
                $id: Now.ID['tool_compliance_check'],
                $capabilityId: Now.ID['tool_compliance_check_cap'],
                subflowId: '1234abcd5678efab9012cdef3456abcd',
                inputs: [
                    { $id: Now.ID['compliance_input_query'], name: 'requestText', value: t.input['case query'] },
                    { $id: Now.ID['compliance_input_region'], name: 'region', type: 'string', value: 'US' },
                ],
                depends: [searchPolicies],
                truncate: true,
            })

            // Step 4: Decision — route based on compliance result
            const classifyAction = t.InlineScript('ClassifyAction', {
                $id: Now.ID['tool_classify_action'],
                depends: [complianceCheck, fetchCase],
                script: `function execute(context) {
                    var compliance = context.getValue("ComplianceCheck.Output");
                    if (compliance && compliance.indexOf("escalate") >= 0) return { action: "escalate" };
                    if (compliance && compliance.indexOf("approved") >= 0) return { action: "auto_resolve" };
                    return { action: "manual_review" };
                }`,
            })

            t.Decision('ActionRouter', {
                $id: Now.ID['tool_action_router'],
                depends: [classifyAction],
                targets: ['AutoResolve', 'EscalateCase', 'ManualReview'] as const,
                branches: (targets) => [
                    {
                        name: 'Auto Resolve',
                        to: targets.AutoResolve,
                        condition: {
                            field: classifyAction.output,
                            operator: 'is',
                            value: 'auto_resolve',
                        },
                    },
                    {
                        name: 'Escalate',
                        to: targets.EscalateCase,
                        condition: {
                            field: classifyAction.output,
                            operator: 'is',
                            value: 'escalate',
                        },
                    },
                ],
                default: (targets) => targets.ManualReview,
            })

            // Step 5a: Auto-resolve via FlowAction
            t.FlowAction('AutoResolve', {
                $id: Now.ID['tool_auto_resolve'],
                $capabilityId: Now.ID['tool_auto_resolve_cap'],
                actionId: 'ff001122aabb3344ccdd5566eeff7788',
                inputs: [
                    {
                        $id: Now.ID['resolve_input_case'],
                        name: 'case_sys_id',
                        type: 'string',
                        value: t.input['case record'],
                    },
                    {
                        $id: Now.ID['resolve_input_notes'],
                        name: 'resolution_notes',
                        type: 'string',
                        value: searchPolicies.response,
                    },
                ],
                outputs: [
                    { $id: Now.ID['resolve_output_status'], name: '__action_status__', type: 'string' },
                    { $id: Now.ID['resolve_output_case_number'], name: 'case_number', type: 'string' },
                ],
                depends: [classifyAction],
            })

            // Step 5b: Escalate to senior HR via Subflow
            t.Subflow('EscalateCase', {
                $id: Now.ID['tool_escalate'],
                $capabilityId: Now.ID['tool_escalate_cap'],
                subflowId: 'abcd1234efab5678cdef9012abcd3456',
                inputs: [
                    { $id: Now.ID['escalate_input_case'], name: 'caseId', value: t.input['case record'] },
                    { $id: Now.ID['escalate_input_reason'], name: 'reason', value: complianceCheck.Output },
                ],
                depends: [classifyAction],
            })

            // Step 5c: Manual review — enrich with additional context
            t.InlineScript('ManualReview', {
                $id: Now.ID['tool_manual_review'],
                depends: [classifyAction],
                script: `function execute(context) {
                    return {
                        status: "pending_review",
                        message: "Case requires manual review by HR specialist."
                    };
                }`,
            })
        },

        // ─────────────────────
        // Security Controls
        // ─────────────────────
        securityControls: {
            userAccess: {
                $id: Now.ID['hr_case_acl'],
                type: 'roles',
                roles: ['2831a114c611228501d4ea6c309d626d', 'f0b0eb19c30020107acbfa163e040e1c'],
            },
            roleRestrictions: ['2831a114c611228501d4ea6c309d626d'],
        },

        // ─────────────────────
        // Deployment Settings
        // ─────────────────────
        deploymentSettings: {
            uiAction: {
                $id: Now.ID['hr_case_uiaction'],
                table: 'sn_hr_core_case',
            },
            flowAction: true,
            skillFamily: 'aabb0011ccdd2233eeff4455aabb6677',
        },

        // ─────────────────────────────────────
        // Skill Settings — pre/postprocessors
        // ─────────────────────────────────────
        skillSettings: {
            providers: [
                {
                    $id: Now.ID['hr_request_validator'],
                    name: 'TestPreProcessor',
                    preprocessor: `(function(payload) {
                        payload.context = payload.context || {};
                        payload.context.enrichedAt = new Date().toISOString();
                        return payload;
                    })(payload);`,
                },
                {
                    $id: Now.ID['hr_response_validator'],
                    name: 'TestPostProcessor',
                    postprocessor: `(function(payload) {
                        if (payload.response && payload.response.indexOf('CONFIDENTIAL') >= 0) {
                            payload.response = '[REDACTED - Contains confidential information]';
                        }
                        return payload;
                    })(payload);`,
                },
            ],
        },
    },

    // ─────────────────────────────────────────────
    // Prompt Configuration — multiple providers
    // ─────────────────────────────────────────────
    {
        providers: [
            {
                // Primary provider: Now LLM Service
                provider: 'Now LLM Service',
                prompts: [
                    {
                        name: 'HR Resolution',
                        versions: [
                            // Version 1 — published (initial)
                            {
                                $id: Now.ID['prompt_hr_v1'],
                                version: 1,
                                model: 'llm_generic_small_v2',
                                temperature: 0.2,
                                maxTokens: 2048,
                                prompt: (p) =>
                                    `You are an HR case resolution assistant.\n\nUser Query: ${p.input['case query']}\nCase Details: ${p.tool.FetchCaseDetails.output}\nPolicy Search Results: ${p.tool.SearchPolicies.response}\nCompliance Status: ${p.tool.ComplianceCheck.Output}\n\nProvide:\n1. A clear recommendation\n2. Referenced policy sections\n3. Confidence score (0-100)`,
                                promptState: 'published',
                            },
                            // Version 2 — draft (improved)
                            {
                                $id: Now.ID['prompt_hr_v2'],
                                version: 2,
                                model: 'llm_generic_small_v2',
                                temperature: 0.15,
                                maxTokens: 4096,
                                prompt: (p) =>
                                    `You are an expert HR case resolution assistant with deep knowledge of company policies.\n\n## Context\nUser Query: ${p.input['case query']}\nCase Record: ${p.tool.FetchCaseDetails.output}\nRelated Cases: ${p.input['related case ids']}\n\n## Research\nPolicy Search: ${p.tool.SearchPolicies.response}\nCompliance Check: ${p.tool.ComplianceCheck.Output}\nAction Classification: ${p.tool.ClassifyAction.output}\n\n## Instructions\n1. Analyze the case against company HR policies\n2. Provide a specific, actionable recommendation\n3. List all referenced policy sections as JSON array\n4. Rate your confidence (0-100) based on policy match quality\n\nRespond in structured JSON format.`,
                                promptState: 'draft',
                            },
                        ],
                    },
                ],
                defaultPrompt: 'HR Resolution',
                defaultPromptVersion: 2,
            },
            {
                // Fallback provider: Azure OpenAI
                provider: 'Azure OpenAI',
                prompts: [
                    {
                        name: 'HR Resolution Fallback',
                        versions: [
                            {
                                $id: Now.ID['prompt_hr_azure_v1'],
                                model: 'gpt-4o-mini',
                                temperature: 0.2,
                                prompt: (p) =>
                                    `Analyze this HR case and provide a resolution recommendation.\n\nQuery: ${p.input['case query']}\nSearch Results: ${p.tool.SearchPolicies.response}`,
                                promptState: 'draft',
                            },
                        ],
                    },
                ],
            },
        ],
        defaultProvider: 'Now LLM Service',
    }
)

```

### tools-skills

```typescript
/**
 * Tools Showcase Example
 *
 * Demonstrates all available tool types:
 *   - InlineScript: Inline JavaScript execution
 *   - Script: Reference to a Script Include
 *   - Subflow: Invoke a Flow Designer subflow
 *   - FlowAction: Invoke a Flow Designer action
 *   - WebSearch: Web search (AI answers & searching/scraping variants)
 *   - Skill: Reference another NowAssist skill as a tool
 *   - Decision: Conditional branching/routing between tools
 *
 * Also shows tool dependencies, conditional execution, and prompt tool output references.
 */
import { NowAssistSkillConfig } from '@servicenow/sdk/core'

NowAssistSkillConfig(
    {
        $id: Now.ID['tools_showcase_skill'],
        name: 'IT Support Assistant',
        shortDescription: 'Multi-tool IT support skill',
        description: 'An advanced skill that routes user queries through multiple tools based on intent.',
        inputs: [
            {
                $id: Now.ID['input_user_query'],
                name: 'user query',
                description: 'The user support question',
                mandatory: true,
                dataType: 'string',
                testValues: 'My laptop cannot connect to VPN',
            },
            {
                $id: Now.ID['input_priority'],
                name: 'priority',
                description: 'Issue priority level',
                mandatory: false,
                dataType: 'string',
            },
        ],
        // Outputs — optional. Standard outputs are auto-generated if omitted.
        outputs: [
            {
                $id: Now.ID['output_resolution'],
                name: 'resolution',
                description: 'The suggested resolution',
                dataType: 'string',
            },
        ],
        tools: (t) => {
            // ─────────────────────────────────────────────
            // 1. InlineScript — inline JavaScript execution
            // ─────────────────────────────────────────────
            const classifyIntent = t.InlineScript('ClassifyIntent', {
                $id: Now.ID['tool_classify_intent'],
                script: `function execute(context) {
                    var query = context.getValue("userQuery");
                    if (query.indexOf("password") >= 0) return { category: "password_reset" };
                    if (query.indexOf("VPN") >= 0) return { category: "network" };
                    return { category: "general" };
                }`,
            })

            // ─────────────────────────────────────────
            // 2. Script — reference a Script Include
            // ─────────────────────────────────────────
            const fetchUserDetails = t.Script('FetchUserDetails', {
                $id: Now.ID['tool_fetch_user'],
                $capabilityId: Now.ID['tool_fetch_user_cap'],
                output: { $id: Now.ID['tool_fetch_user_output'] },
                scriptId: 'ba03048dec3548c597d6f1698c68969c',
                scriptFunctionName: 'getUserProfile',
                inputs: [{ $id: Now.ID['fetch_user_input_query'], name: 'query', value: t.input['user query'] }],
                truncate: true,
            })

            // ──────────────────────────────────────────────────
            // 3. Decision — route based on classification result
            // ──────────────────────────────────────────────────
            t.Decision('RouteByIntent', {
                $id: Now.ID['tool_route_decision'],
                depends: [classifyIntent],
                targets: ['SearchKB', 'ResetPassword', 'NetworkDiag'] as const,
                branches: (targets) => [
                    {
                        name: 'Password Issues',
                        to: targets.ResetPassword,
                        condition: {
                            field: classifyIntent.output,
                            operator: 'is',
                            value: 'password_reset',
                        },
                    },
                    {
                        name: 'Network Issues',
                        to: targets.NetworkDiag,
                        condition: {
                            field: t.input['priority'],
                            operator: 'is',
                            value: 'high',
                        },
                    },
                ],
                default: (targets) => targets.SearchKB,
            })

            // ────────────────────────────────────────────────────────
            // 4. WebSearch (AI Answers) — search the web for solutions
            // ────────────────────────────────────────────────────────
            t.WebSearch('SearchKB', {
                $id: Now.ID['tool_search_kb'],
                searchType: 'ai_answers',
                query: t.input['user query'],
                depends: [classifyIntent],
            })

            // ──────────────────────────────────────────────────────────
            // 5. WebSearch (Searching & Scraping) — scrape specific sites
            // ──────────────────────────────────────────────────────────
            t.WebSearch('NetworkDiag', {
                $id: Now.ID['tool_network_diag'],
                searchType: 'searching_and_scraping',
                query: t.input['user query'],
                sites: 'support.company.com',
                numResults: 5,
                maxTokens: 2000,
                depends: [classifyIntent],
            })

            // ─────────────────────────────────────────────────────
            // 6. Subflow — invoke a Flow Designer subflow
            // ─────────────────────────────────────────────────────
            t.Subflow('ResetPassword', {
                $id: Now.ID['tool_reset_password'],
                $capabilityId: Now.ID['tool_reset_password_cap'],
                subflowId: '7866867cffc47210151cffffffffff27',
                inputs: [{ $id: Now.ID['reset_input_user'], name: 'userId', value: fetchUserDetails.output }],
                depends: [classifyIntent, fetchUserDetails],
                condition: {
                    type: 'script',
                    script: 'return currentInputs.userQuery.indexOf("password") >= 0;',
                },
            })

            // ───────────────────────────────────────────────────
            // 7. FlowAction — invoke a Flow Designer action
            // ───────────────────────────────────────────────────
            t.FlowAction('CreateTicket', {
                $id: Now.ID['tool_create_ticket'],
                $capabilityId: Now.ID['tool_create_ticket_cap'],
                actionId: '65fa39f1ef947e1071260422ed97d708',
                inputs: [
                    {
                        $id: Now.ID['ticket_input_desc'],
                        name: 'short_description',
                        type: 'string',
                        value: t.input['user query'],
                    },
                    {
                        $id: Now.ID['ticket_input_priority'],
                        name: 'priority',
                        type: 'string',
                        value: t.input['priority'],
                    },
                ],
                outputs: [
                    { $id: Now.ID['ticket_output_number'], name: 'ticket_number', type: 'string' },
                    { $id: Now.ID['ticket_output_status'], name: '__action_status__', type: 'string' },
                ],
                depends: [fetchUserDetails],
            })

            // ────────────────────────────────────────────────────────
            // 8. Skill — reference another NowAssist skill as a tool
            // ────────────────────────────────────────────────────────
            t.Skill('KnowledgeSearch', {
                $id: Now.ID['tool_knowledge_skill'],
                skillId: '739b26e553e5e21016f7ddeeff7b1237',
                inputs: [
                    {
                        definitionAttributeId: 'aabb0000cccc1111',
                        value: t.input['user query'],
                    },
                ],
                outputs: {
                    provider: { definitionAttributeId: 'prov_attr_id_001' },
                    response: { definitionAttributeId: 'resp_attr_id_002', truncate: true },
                    error: { definitionAttributeId: 'err_attr_id_003' },
                    errorcode: { definitionAttributeId: 'errc_attr_id_004' },
                    status: { definitionAttributeId: 'stat_attr_id_005' },
                },
                depends: [classifyIntent],
            })
        },
        securityControls: {
            userAccess: {
                $id: Now.ID['it_support_acl'],
                type: 'authenticated',
            },
            roleRestrictions: ['2831a114c611228501d4ea6c309d626d'],
        },
        deploymentSettings: {
            uiAction: { $id: Now.ID['it_support_uiaction'], table: 'incident' },
            nowAssistPanel: {
                enabled: true,
                roles: ['now_assist_panel_user'],
            },
        },
    },
    {
        providers: [
            {
                provider: 'Now LLM Service',
                prompts: [
                    {
                        name: 'Resolve Query',
                        versions: [
                            {
                                $id: Now.ID['prompt_resolve_v1'],
                                model: 'llm_generic_small_v2',
                                temperature: 0.3,
                                prompt: (p) =>
                                    `You are an IT support assistant.\n\nUser query: ${p.input['user query']}\nSearch results: ${p.tool.SearchKB.response}\nUser details: ${p.tool.FetchUserDetails.output}\n\nProvide a clear, actionable resolution.`,
                                promptState: 'draft',
                            },
                        ],
                    },
                ],
            },
        ],
    }
)

```

## Limitations

### Supported Tools

The following tool types are fully supported in the current release:

- **Script**: Script Include execution
- **InlineScript**: Inline script execution
- **FlowAction**: Flow Action execution
- **Subflow**: Subflow execution
- **Skill**: Skill-as-Tool execution
  - **Note:** The skill being referenced must already be published in the target instance. Publishing must be done through the Skill Builder UI before it can be used as a tool from Fluent.
- **WebSearch**: Web search capabilities
- **Decision**: Conditional branching logic

### Unsupported Tools

The following tool types are **not supported** in the current release:

- **DocumentIntelligence**: Document Intelligence capabilities
- **PredictIntelligence**: Predictive Intelligence capabilities
- **Retriever**: Retriever tool capabilities

### Tool Conversion Behavior

> **Important:** If any unsupported tool type is added to a skill configuration, **all tools in the skill will be converted to recordAPI format**. This is a fallback mechanism to ensure the skill can still be deployed, but it may result in different runtime behavior than expected.

To avoid this conversion, ensure your skill only uses supported tool types (Script, InlineScript, WebSearch, FlowAction, Subflow).
