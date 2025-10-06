# create a script include to store constants for the app, accessible from all application scopes with caller tracking
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID["test_app_constants_si"],
    table: "sys_script_include",
    data: {
        name: "TestAppConstants",
        description: "Constants for TestApp",
        script: `var TestAppConstants = Class.create();

TestAppConstants.prototype = {
    initialize: function() {
        // Constructor - nothing to initialize
    },
    
    // Tables
    TABLE: {
        USER: 'sys_user',
        GROUP: 'sys_user_group',
        ROLE: 'sys_user_role',
        TESTAPP_CONFIG: 'x_testapp_config',
        TESTAPP_RECORD: 'x_testapp_record',
        TESTAPP_LOG: 'x_testapp_log'
    },
    
    // Schema Constants
    SCHEMA: {
        STATUS: {
            ACTIVE: 'active',
            INACTIVE: 'inactive',
            PENDING: 'pending',
            PROCESSING: 'processing',
            COMPLETE: 'complete',
            ERROR: 'error'
        },
        PRIORITY: {
            CRITICAL: '1',
            HIGH: '2',
            MODERATE: '3',
            LOW: '4'
        }
    },
    
    // Configuration Constants
    CONFIG: {
        DEFAULT_BATCH_SIZE: 1000,
        MAX_RETRY_ATTEMPTS: 3,
        PROCESS_TIMEOUT_MS: 300000 // 5 minutes
    },
    
    type: 'TestAppConstants'
};`,
        access: "public", // accessible from all application scopes
        callerAccess: '1', // keep track of the caller through cross-scope privileges
        active: true,
        clientCallable: false,
        mobileCallable: false,
        sandboxCallable: false,
    }
})
```
