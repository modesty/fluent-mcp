# UI Page Patterns

Development patterns and guidelines for ServiceNow UI Pages, covering dirty state management, field extraction, service layer architecture, CSS styling, build constraints, and file organization.

## Dirty State Management

MANDATORY for ANY view that creates, edits, or views records with a form. If a form exists, dirty state tracking MUST exist.

`RecordProvider` tracks dirty state internally -- do NOT implement manual field diffing with `JSON.stringify`. The ONLY way to check dirty state is `useRecord().form.isDirty`. NEVER use `window.confirm()` or `window.alert()` for dirty state warnings -- use the ServiceNow `Modal` component instead.

### Standard Pattern

```tsx
import React, { useEffect } from "react";
import { RecordProvider } from "@servicenow/react-components/RecordContext";
import { FormActionBar } from "@servicenow/react-components/FormActionBar";
import { FormColumnLayout } from "@servicenow/react-components/FormColumnLayout";
import { Alert } from "@servicenow/react-components/Alert";
import { useRecord } from "@servicenow/react-components";

function FormWithDirtyTracking() {
  const { form } = useRecord();

  useEffect(() => {
    if (!form.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.isDirty]);

  return (
    <>
      {form.isDirty && (
        <Alert status="warning" content="Unsaved changes" />
      )}
      <FormActionBar />
      <FormColumnLayout />
    </>
  );
}

export default function RecordForm({ sysId }: { sysId: string }) {
  return (
    <RecordProvider table="incident" sysId={sysId} isReadOnly={false}>
      <FormWithDirtyTracking />
    </RecordProvider>
  );
}
```

### Warn on In-App Navigation (Modal)

```tsx
import React, { useState, useCallback } from "react";
import {
  Modal,
  ModalOpenedSet,
  ModalFooterActionClicked
} from "@servicenow/react-components/Modal";

interface UnsavedChangesModalProps {
  opened: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

function UnsavedChangesModal({
  opened,
  onDiscard,
  onCancel
}: UnsavedChangesModalProps) {
  const handleOpenedSet = useCallback<ModalOpenedSet>(() => {
    onCancel();
  }, [onCancel]);

  const handleFooterAction = useCallback<ModalFooterActionClicked>(
    e => {
      if (e.detail.payload.action.label === "Discard") {
        onDiscard();
      } else {
        onCancel();
      }
    },
    [onDiscard, onCancel]
  );

  return (
    <Modal
      opened={opened}
      size="sm"
      headerLabel="Unsaved Changes"
      content="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      footerActions={[
        { label: "Cancel", variant: "secondary" },
        { label: "Discard", variant: "primary-negative" }
      ]}
      onOpenedSet={handleOpenedSet}
      onFooterActionClicked={handleFooterAction}
    />
  );
}
```

Integrate with the navigation pattern. Wrap the actual `navigateToView` call with a dirty check:

```tsx
const { form } = useRecord();
const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(
  null
);

const safeNavigate = useCallback(
  (
    viewName: string,
    recordId?: string | null,
    options?: { title?: string }
  ) => {
    if (form.isDirty) {
      setPendingNavigation(
        () => () => navigateToView(viewName, recordId, options)
      );
      return;
    }
    navigateToView(viewName, recordId, options);
  },
  [form.isDirty, navigateToView]
);

// In JSX -- use safeNavigate instead of navigateToView for all user-triggered navigation:
<UnsavedChangesModal
  opened={pendingNavigation !== null}
  onDiscard={() => {
    pendingNavigation?.();
    setPendingNavigation(null);
  }}
  onCancel={() => setPendingNavigation(null)}
/>;
```

### Dirty State Key Points

- ONLY use `useRecord().form.isDirty` to check dirty state
- NEVER use `window.confirm()` or `window.alert()` -- use the ServiceNow `Modal` component
- `FormActionBar` handles save/submit/cancel automatically -- dirty state resets on successful save
- Use `key` prop on `RecordProvider` when switching records to fully remount the form
- For new records: pass `sysId="-1"` -- NEVER `null` or `undefined`

## Field Extraction Pattern

When using `sysparm_display_value=all` (recommended), ServiceNow reference, choice, and sys_id fields become objects. React cannot render objects directly, so you must extract primitive values.

### Required Utility Functions

ALWAYS use `sysparm_display_value=all` in ALL Table API calls. Create these utility functions in EVERY project:

```ts
// src/client/utils/fields.ts
export const display = field => {
  if (typeof field === "string") {
    return field;
  }
  return field?.display_value || "";
};

export const value = field => {
  if (typeof field === "string") {
    return field;
  }
  return field?.value || "";
};
```

### Usage

```tsx
import { display, value } from "./utils/fields";

// For UI display:
<td>{display(record.short_description)}</td>
<td>{display(record.assigned_to)}</td>

// For operations/keys:
await updateRecord(value(record.sys_id), data);
{records.map(r => <li key={value(r.sys_id)}>)}
```

### Common Mistakes

```tsx
// WRONG - accessing object directly
<span>{record.assigned_to}</span>

// WRONG - assuming string type
<span>{record.assigned_to.toString()}</span>

// CORRECT - using display helper
<span>{display(record.assigned_to)}</span>

// WRONG - using value for display
<span>{value(record.state)}</span>  // Shows "2" instead of "In Progress"

// CORRECT - display for UI, value for operations
<span>{display(record.state)}</span>  // Shows "In Progress"
await api.update(value(record.sys_id), data);  // Uses sys_id value
```

## Service Layer Pattern

Centralize all API calls in a service layer to keep components focused on UI logic, enable easy testing and mocking, standardize error handling, and maintain consistent authentication.

### Basic Service Class

```ts
// src/client/services/TodoService.ts
export class TodoService {
  constructor() {
    this.tableName = "x_app_todo";
  }

  async list() {
    const response = await fetch(
      `/api/now/table/${this.tableName}?sysparm_display_value=all`,
      {
        headers: {
          Accept: "application/json",
          "X-UserToken": window.g_ck
        }
      }
    );
    const { result } = await response.json();
    return result || [];
  }

  async create(data) {
    const response = await fetch(
      `/api/now/table/${this.tableName}?sysparm_display_value=all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-UserToken": window.g_ck
        },
        body: JSON.stringify(data)
      }
    );
    return response.json();
  }

  async update(sysId, data) {
    const response = await fetch(
      `/api/now/table/${this.tableName}/${sysId}?sysparm_display_value=all`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-UserToken": window.g_ck
        },
        body: JSON.stringify(data)
      }
    );
    return response.json();
  }

  async delete(sysId) {
    const response = await fetch(`/api/now/table/${this.tableName}/${sysId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "X-UserToken": window.g_ck
      }
    });
    return response.ok;
  }
}
```

### Service with Error Handling

```ts
// src/client/services/ApiService.ts
export class ApiService {
  constructor(tableName) {
    this.tableName = tableName;
    this.baseUrl = `/api/now/table/${tableName}`;
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "X-UserToken": window.g_ck,
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `Request failed: ${response.status}`
        );
      }

      if (response.status === 204) {
        return true;
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  async list(query = "") {
    const params = new URLSearchParams({
      sysparm_display_value: "all"
    });
    if (query) params.set("sysparm_query", query);
    const { result } = await this.request(`${this.baseUrl}?${params}`);
    return result || [];
  }

  async get(sysId) {
    const { result } = await this.request(
      `${this.baseUrl}/${sysId}?sysparm_display_value=all`
    );
    return result;
  }

  async create(data) {
    const { result } = await this.request(
      `${this.baseUrl}?sysparm_display_value=all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }
    );
    return result;
  }

  async update(sysId, data) {
    const { result } = await this.request(
      `${this.baseUrl}/${sysId}?sysparm_display_value=all`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }
    );
    return result;
  }

  async delete(sysId) {
    return this.request(`${this.baseUrl}/${sysId}`, { method: "DELETE" });
  }
}
```

### Service Key Points

1. Always include `X-UserToken: window.g_ck` -- required for authentication
2. Always use `sysparm_display_value=all` -- returns both display and raw values
3. Centralize error handling -- parse JSON errors from ServiceNow responses
4. Use `useMemo` for service instances -- prevents recreation on re-renders
5. Keep services under 60 lines -- split into multiple services if needed

## CSS Styling Guidelines

### Supported CSS Patterns

Import CSS files directly in TSX/TS files using ESM syntax:

```tsx
import "./filename.css";
import "./app.css";
import "./components/TodoItem.css";
```

### Not Supported

- **CSS Modules**: `import styles from './file.module.css'` -- NOT supported
- **@import statements**: Within CSS files -- NOT supported
- **Link tags**: `<link rel="stylesheet" href="...">` in HTML -- NOT supported
- **CSS-in-CSS imports**: Relative stylesheet references -- NOT supported

### File Organization

Place CSS files in `src/client` alongside their components. Each component can have its own CSS file. The build system automatically bundles all imported CSS.

```
src/client/
  app.tsx
  app.css
  components/
    TodoList.tsx
    TodoList.css
    TodoItem.tsx
    TodoItem.css
```

### Naming Conventions

Since CSS Modules aren't supported, use BEM naming conventions to avoid conflicts:

```css
/* TodoItem.css */
.todo-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.todo-item__text {
  flex: 1;
}

.todo-item__text--done {
  text-decoration: line-through;
  opacity: 0.6;
}

.todo-item__delete {
  margin-left: auto;
}
```

### ServiceNow Theming Integration

Use CSS variables from the Horizon Design System to allow customer-authored themes to apply to your UI Page. Including the `<sdk:now-ux-globals></sdk:now-ux-globals>` tag in your HTML brings in support for theming.

```css
.my-card {
  background-color: var(--now-color-background-primary);
  border: 1px solid var(--now-color-border-primary);
  border-radius: var(--now-border-radius-md);
  padding: var(--now-spacing-lg);
  color: var(--now-color-text-primary);
}

.my-button {
  background-color: var(--now-color-interactive-primary);
  color: var(--now-color-text-inverse);
  padding: var(--now-spacing-sm) var(--now-spacing-md);
  border-radius: var(--now-border-radius-sm);
}

.my-button:hover {
  background-color: var(--now-color-interactive-primary-hover);
}
```

## Build System Constraints

The build system handles ALL build processes automatically.

**MUST NEVER:**

- Create webpack.config.js, vite.config.js, or any build configs
- Add build scripts to package.json
- Configure babel, typescript compiler, or bundlers
- Attempt to modify the build pipeline
- Add build tools as dependencies

**MUST ALWAYS:**

- Trust the IDE build system to handle everything
- Use only the file patterns shown in templates
- Place files in exact locations specified
- Use ESM imports (the IDE handles transformation)

### What the IDE Handles Automatically

- TSX transformation
- Module bundling
- CSS processing
- Import resolution
- Development server
- Production builds

### Package.json Restrictions

When adding dependencies, preserve existing versions -- never modify them. No "scripts" section, no build configurations. After modifying package.json, always install the dependencies.

### HTML Entry Point Requirements

```html
<!-- src/client/index.html -->
<html class="-polaris">
  <head>
    <title>My Page</title>
    <sdk:now-ux-globals></sdk:now-ux-globals>
    <script
      src="main.tsx?uxpcb=$[UxFrameworkScriptables.getFlushTimestamp()]"
      type="module"
    ></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

The `uxpcb` parameter is required to ensure that stale UI Page contents are not mistakenly cached. The `<sdk:now-ux-globals></sdk:now-ux-globals>` tag brings in support for theming and other platform support.

## File Size Guidelines

### Optimal Ranges by File Type

- **Components** (50-80 lines ideal, 100 max): Simple display 30-50, Forms 50-80, Complex with state 60-100 max
- **Service Modules** (30-60 lines): API service 40-60, Single responsibility 30-50
- **Hooks** (20-50 lines): Simple 20-30, Complex with cleanup 40-50
- **Utility Functions** (20-40 lines): 3-5 related functions per file
- **Main App Component** (50-100 lines): Composition and routing logic

### When to Split Files

Split when:

- File exceeds 100 lines
- Multiple unrelated responsibilities
- Component has 3+ useEffect hooks
- Service has 5+ API methods

## Essential Requirements and Limitations

### Core Requirements

1. **UiPage API Usage**: UI Pages must be created using the `UiPage` API from `@servicenow/sdk/core`.
2. **HTML Reference**: Always use imports (not `Now.include()`) to reference HTML files in UI Page definitions. HTML files should only be placed in the `src/client` directory.
3. **Script Management**: TypeScript/TSX code in separate files loaded via script tags with `type="module"`. Do not embed or inline TypeScript directly in HTML.
4. **Use of HTML**: Ensure HTML files are valid HTML with self-closing tags for void elements.
5. **No DOCTYPE**: Never add `<!DOCTYPE html>` declarations. Never add XML preamble.
6. **No Jelly**: Do not include Jelly elements in HTML files.
7. **No Client Script**: Do not include `client_script` or `processing_script` fields.
8. **No Script Includes**: Use `<script src="..."></script>` instead of `<g:script>` or `<g:include>`.
9. **No g_form**: Do not reference g_form in UI Pages.
10. **Use React**: Always use React. Do not use pure HTML or other frameworks.
11. **Event Handling**: Use event listeners in TypeScript, not inline handlers like `onclick="function()"`.
12. **Authentication**: Include `X-UserToken: window.g_ck` header in all fetch requests.
13. **Accessibility**: Follow WCAG 2.1 AA standards, use semantic HTML, ensure keyboard navigation.
14. **Ampersand Character**: Use `$[AMP]` instead of `&` in text content within HTML files.

### Technology Stack (Mandatory)

- **React 18.2.0** -- All UI Pages MUST use React exclusively
- **@servicenow/react-components ^0.1.0** -- MUST install with caret `^`
- **ServiceNow Table API** -- Primary integration method for CRUD operations
- **Fluent DSL** -- TypeScript-based configuration language
- **Build System** -- Platform handles ALL build processes automatically

### Limitations

- **No media support**: Audio, video, and WASM files are not supported
- **Deterministic paths**: No hashed output paths; file paths must be predictable
- **No preloading**: `<link rel="preload">` is not supported
- **CSS limitations**: No CSS Modules, no @import, no CSS-in-CSS imports, ESM imports only
- **Routing**: Use URLSearchParams, NOT hash routing
- **No server-side rendering**: React server components and SSR are not available

