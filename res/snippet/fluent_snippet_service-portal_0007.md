# Create a Service Portal widget dependency for custom JavaScript utilities

```typescript
import { Record, SPWidgetDependency, JsInclude } from '@servicenow/sdk/core'

// A dependency cannot hold inline code: each JS include points at an external `url`
// or at a `sys_ui_script` record (`sysUiScript`), never both. Keep the utility code
// in a UI script and include that.
const customUtilsScript = Record({
    $id: Now.ID['custom_utils_ui_script'],
    table: 'sys_ui_script',
    data: {
        name: 'customUtils',
        description: 'Custom utility functions for portal widgets',
        active: true,
        global: false,
        script: `// Custom utility functions
(function() {
    window.customUtils = {
        formatDate: function(date) {
            return new Date(date).toLocaleDateString();
        },
        formatCurrency: function(amount) {
            return '$' + parseFloat(amount).toFixed(2);
        }
    };
})();`,
    },
})

export const customUtilities = SPWidgetDependency({
    $id: Now.ID['custom_utilities'],
    name: 'Custom Utilities',
    jsIncludes: [
        {
            order: 100, // lower order loads first
            include: JsInclude({
                $id: Now.ID['custom_utils_js_include'],
                name: 'Custom Utilities JS',
                sysUiScript: customUtilsScript,
            }),
        },
    ],
})
```
