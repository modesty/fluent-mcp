# Business Rule API example: edit a Business Rule to set active property to false and set order property to 300

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: '8c08afbd37d049c99db5a97beb999f13',
    name: "Abort before insert or update if llm_output is out of sync with llm_output_raw",
    table: 'sn_t2fluent_eval_llm',
    action: ['insert', 'update'],
    active: false,
    addMessage: false,
    script: 
        '(function executeRule(current, previous /*null when async*/ ) { if ((current.llm_output.toString() !== "" && current.llm_output.toString() === "") || (current.llm_output.toString() === "" && current.llm_output.toString() !== "")) { gs.addErrorMessage(gs.getMessage("content are out of sync")); current.setAbortAction(true); } })(current, previous);',
    order: 300,
    when: 'before',
})
```
 
