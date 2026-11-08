# Create a Service Portal widget dependency with Angular module

```typescript
import { Record, SPWidgetDependency, JsInclude } from '@servicenow/sdk/core'

// The module code lives in a sys_ui_script record; the dependency loads it through a
// JS include and registers the module by `angularModuleName`, which must match the
// name passed to angular.module().
const customModuleScript = Record({
    $id: Now.ID['custom_angular_module_ui_script'],
    table: 'sys_ui_script',
    data: {
        name: 'customModule',
        active: true,
        global: false,
        script: `// Define custom Angular module
angular.module('customModule', [])
    .service('customService', function() {
        this.getMessage = function() {
            return 'Hello from custom service';
        };
    });`,
    },
})

export const customAngularModule = SPWidgetDependency({
    $id: Now.ID['custom_angular_module'],
    name: 'Custom Angular Module',
    angularModuleName: 'customModule',
    jsIncludes: [
        {
            order: 200,
            include: JsInclude({
                $id: Now.ID['custom_angular_module_js_include'],
                name: 'Custom Angular Module JS',
                sysUiScript: customModuleScript,
            }),
        },
    ],
})
```
