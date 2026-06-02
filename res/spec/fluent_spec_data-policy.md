# **Context:** DataPolicy API spec (SDK v4.7.0+): Used to create a Data Policy that enforces field mandatory and read-only rules **server-side** across all interfaces (forms, lists, mobile, web services, import sets, integrations). Unlike client-side UI Policies, Data Policies cannot be bypassed via API, imports, or direct database access (`sys_data_policy2` + `sys_data_policy_rule`).

```typescript
// Creates a new Data Policy (`sys_data_policy2`). Import from '@servicenow/sdk/core'.
DataPolicy({
 $id: '', // string | number | guid, mandatory - unique identifier for the record
 table: '', // keyof Tables, mandatory - the table to which the Data Policy applies
 shortDescription: '', // string, optional - a brief description of the Data Policy's purpose
 description: '', // string, optional - detailed description of the Data Policy's purpose
 active: true, // boolean, optional - whether the Data Policy is active
 conditions: '', // string, optional - encoded query string defining when the policy applies (e.g. 'priority=1^urgency=1')
 reverseIfFalse: true, // boolean, optional - if true, reverses the policy rules when the condition is false (defaults to true)
 inherit: false, // boolean, optional - if true, child tables that extend this table inherit this policy
 applyToImportSets: true, // boolean, optional - enforce policy rules during import set transformations (defaults to true)
 applyToSOAP: true, // boolean, optional - enforce policy rules for SOAP/REST web service operations (defaults to true)
 useAsUiPolicyOnClient: false, // boolean, optional - if true, also enforces as a UI Policy on the client side for immediate user feedback
 modelId: '', // string, optional - document ID reference for model-based policies
 rules: {}, // Partial<Record<TableSchemaDotWalk<T>, DataPolicyRuleConfig>> & Record<string, DataPolicyRuleConfig>, optional
   // Field-level rules keyed by field name. Supports dot-walk notation for reference fields (e.g. 'caller_id.email'). Each field can only have one rule.
   // Each rule object (DataPolicyRuleConfig):
   //   $id: '', // string | number | guid, mandatory - unique identifier for the rule record (`sys_data_policy_rule`)
   //   mandatory: 'ignore', // boolean | 'ignore', optional - field is mandatory (true), optional (false), or unchanged ('ignore'). Default: 'ignore'
   //   readOnly: 'ignore', // boolean | 'ignore', optional - field is read-only (true), editable (false), or unchanged ('ignore'). Default: 'ignore'
 $override: {}, // Record<string, string | boolean | number>, optional - escape hatch to set unmodeled columns by DB column name
}): DataPolicy // returns a DataPolicy object
```
