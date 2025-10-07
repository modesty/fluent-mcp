# Instructions for Fluent Script Include API
Always reference the Script Include API specifications for more details.

**Key Changes in v4:**
*   Import the API as `import { ScriptInclude } from '@servicenow/sdk/core';`.
*   The `script` property can now use the `Now.include()` helper to include a script from a file (e.g., `script: Now.include("./SampleClass.server.js")`).

**Best Practices:**
1.  `callerAccess` property only applies when `accessibleFrom` is set to `package_private`.
2.  Use `Now.include()` to keep your script logic in separate files for better organization and maintainability.