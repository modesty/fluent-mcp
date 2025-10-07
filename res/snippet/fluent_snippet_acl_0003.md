# ACL API example: create a REST endpoint type ACL using roles and a script
```typescript
import { Acl } from '@servicenow/sdk/core'

// create a REST endpoint type ACL that allows execute for /api/now/ide/build if user has role `sn_glider.ide_git_user` or `admin`, and if script evaluates to true
export default Acl({
    $id: Now.ID['example_rest_acl'],
    roles: [get_sys_id('sys_user_role', 'name=sn_glider.ide_git_user'), get_sys_id('sys_user_role', 'name=admin')], // user needs role `sn_glider.ide_git_user` or `admin`
    script: `function executeRule() {
    // Call the BuildUtilSI script include to check if build is enabled
    var buildUtil = new BuildUtilSI();
    return buildUtil.buildEnabled(); // Return true if build is enabled, false otherwise
}`,
    active: true,
    adminOverrides: true,
    type: 'rest_endpoint',
    name: '/api/now/ide/build',
    operation: 'execute',
})
```
