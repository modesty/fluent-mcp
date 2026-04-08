# **Context:** NowAssist Skill Config API spec: creates NowAssist Skill configuration records that define how NowAssist skills behave, including their triggers, actions, and integration with the NowAssist framework.

```typescript
// Creates a new NowAssist Skill Configuration
NowAssistSkillConfig({
  $id: '', // string | guid, mandatory - unique identifier for the skill configuration
  name: '', // string, mandatory - display name of the skill
  description: '', // string, optional - description of the skill's purpose and behavior
  active: true, // boolean, optional - whether the skill is active
  category: '', // string, optional - category for organizing skills (e.g., 'IT Service Management', 'HR', 'Customer Service')
  utterances: [], // string[], optional - sample utterances that trigger this skill
  skillType: '', // string, optional - type classification of the skill
  inputParameters: {}, // object, optional - input parameters the skill accepts
    // Each parameter: { name: string, type: string, required: boolean, description: string }
  outputParameters: {}, // object, optional - output parameters the skill produces
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this configuration
}): NowAssistSkillConfig
```
