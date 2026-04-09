# **Context:** NowAssist Skill Config API spec: creates NowAssist Skill configurations. This is a two-argument function: the first defines the skill (metadata, inputs, outputs, tools, security), the second configures LLM providers and prompts.

```typescript
// Creates a new NowAssist Skill Configuration (two-argument function)
NowAssistSkillConfig(
  // First argument: Skill Definition
  {
    $id: '', // string | guid, mandatory - unique identifier for the skill
    name: '', // string, mandatory - display name shown in skill picker and admin views
    shortDescription: '', // string, optional - brief one-line summary for listings and search
    description: '', // string, optional - detailed explanation shown on skill detail page
    state: '', // 'published', optional - set to 'published' to publish; omit for draft state
    inputs: [], // InputAttribute[], optional - input attributes for the skill
      // Each input: { $id: Now.ID['...'] (mandatory), name: string (mandatory), dataType: 'string'|'numeric'|'boolean'|'glide_record'|'simple_array'|'json_object'|'json_array' (mandatory, default: 'string'), description?: string, mandatory?: boolean, testValues?: string, truncate?: boolean, tableName?: string (REQUIRED for glide_record), tableSysId?: string (REQUIRED for glide_record) }
    outputs: [], // OutputAttribute[], optional - output attributes produced by the skill
      // Each output: { $id: Now.ID['...'] (mandatory), name: string (mandatory), dataType: 'string'|'numeric'|'boolean'|'glide_record'|'simple_array'|'json_object'|'json_array' (mandatory), description?: string, tableName?: string (REQUIRED for glide_record), tableSysId?: string (REQUIRED for glide_record) }
    tools: (t) => ({}), // function, optional - tool graph builder callback. Returns tool handles for type-safe prompt access.
      // Tool types: t.Script(name, config), t.InlineScript(name, config), t.FlowAction(name, config), t.Subflow(name, config), t.Skill(name, config), t.WebSearch(name, config), t.Decision(name, config)
      // Access skill inputs via t.input.fieldName; chain tool dependencies via depends array
    securityControls: {}, // SecurityControls, MANDATORY - defines user access and role restrictions
      // securityControls: {
      //   userAccess: { type: 'authenticated' } | { type: 'roles', roles: (string | Role | Record<'sys_user_role'>)[] },
      //   roleRestrictions: (string | Role | Record<'sys_user_role'>)[] // MANDATORY, at least one role
      // }
    skillSettings: {}, // SkillSettings, optional - provider configurations for pre/postprocessing
      // skillSettings: { providers: [{ $id, name, order?, preprocessor | postprocessor (exactly one) }] }
    deploymentSettings: {}, // DeploymentSettings, optional - UI Action, NAP, Flow Action deployment
      // deploymentSettings: { uiAction?: string | { table: string }, nowAssistPanel?: { enabled: true, roles: string[] }, flowAction?: true, skillFamily?: string }
  },
  // Second argument: Prompt Configuration
  {
    providers: [], // ProviderPromptConfig[], mandatory - at least one provider with prompts
      // Each provider: { provider: string (e.g., 'Now LLM Service', 'Azure OpenAI', 'Open AI', 'Google Gemini', 'AWS Claude'), providerAPI?: object, prompts: PromptSettings[], defaultPrompt?: string, defaultPromptVersion?: number }
      // Each prompt: { $id, name, versions: [{ $id, model: string, temperature?: number, maxTokens?: number, promptState?: 'draft'|'published'|'test', prompt: string | ((p) => string) }] }
      // In prompt builder callbacks, access inputs via p.input.fieldName and tool outputs via p.tool.ToolName.output
    defaultProvider: '', // string, optional - name of default provider (must match a provider's name)
  }
): NowAssistSkillConfig
```
