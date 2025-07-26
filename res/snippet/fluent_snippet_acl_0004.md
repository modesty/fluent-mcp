# ACL API example: editing a record ACL with required roles, condition and script
```typescript
import { Acl } from "@servicenow/sdk/core";

export default Acl({
    $id: "02712f3437ac621002e674e8f2924b0a",
    script: `function executeRule() {
    var answer = false; // Set answer to false
    return answer;
}`,
    active: true,
    admin_overrides: true,
    decision_type: "allow",
    description: "Only security admin role can read the resolution log",
    local_or_existing: "Local",
    type: "record",
    table: "sn_kmf_resolution_framework_log",
    operation: "read",
    roles: ["b2d8f7130a0a0baa5bf52498ecaadeb4"]
});
```