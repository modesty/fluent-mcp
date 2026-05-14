# UI Pages

Guide for creating ServiceNow UI Pages using React and the Fluent DSL. UI Pages are custom React-based interfaces for building forms, dashboards, list views, multi-step wizards, and any custom web experience within ServiceNow. They use React 18.2.0, the `@servicenow/react-components` library, Table API integration, CSS styling, and SPA routing via URLSearchParams.

## When to Use

- When the user explicitly asks for a UI Page or custom interface
- When creating React-based user interfaces in ServiceNow
- When building forms, lists, dashboards, or data entry screens
- When implementing single page applications (SPAs) with routing
- When integrating with ServiceNow Table API for CRUD operations
- When applying theming and CSS styling to custom pages

## Instructions

1. **Component Library:** Use `@servicenow/react-components` for all UI elements. Before writing UI code, read the component documentation via `package_docs`.
2. **Technology Stack:** Always use React 18.2.0. Never use vanilla JavaScript, jQuery, or other frameworks. Use TypeScript when writing code that uses React components in .tsx files.
3. **Component Selection:** List specific ServiceNow React components from `@servicenow/react-components` to be used (e.g., `NowRecordListConnected`, `Card`, `Button`). Read documentation for each component before use.
4. **Navigation Architecture:** If more than two views exist, define URLSearchParams structure (e.g., `?view=list`, `?view=details&id=123`).
5. **Dirty State Tracking:** If ANY forms, edits, or create views exist, implement dirty state using `useRecord().form.isDirty` and warn on navigation with `Modal`.
6. **Field Utilities:** Create `src/client/utils/fields.ts` first with `display()` and `value()` helpers.
7. **API Calls:** Always use `sysparm_display_value=all` and include `X-UserToken: window.g_ck` header.
8. **File Size:** Keep files under 100 lines. Break into components when exceeding this limit.
9. **CSS:** Import CSS via ESM (`import "./file.css"`). CSS Modules are NOT supported.
10. **Build System:** Never create webpack, vite, or build configs. The build system handles everything. Build the app at least once before checking diagnostics.
11. **Record Forms:** When building forms to view/edit ServiceNow records, ALWAYS wrap with `RecordProvider` -- NEVER use standalone Input components with manual Table API calls for record CRUD.
12. **URL-Based Navigation (DEFAULT):** Each logical part/view of the application (list view, detail view, edit view, create view, tabs, etc.) MUST be accessible via URL using URLSearchParams (e.g., `?view=list`, `?view=details&id=123`, `?tab=overview`).
13. **Dependencies:** After adding dependencies to package.json, install them. Dependencies: `"react": "18.2.0"`, `"react-dom": "18.2.0"`, `"@servicenow/react-components": "^0.1.0"` (the caret `^` is required), and devDependencies: `"@types/react": "18.3.12"`.

## Key Concepts

### UiPage API

UI Pages must be created using the `UiPage` API from `@servicenow/sdk/core`:

```ts
import { UiPage } from "@servicenow/sdk/core";
import page from "../../client/index.html";

export const my_page = UiPage({
  $id: Now.ID["my-page"],
  endpoint: "x_app_page.do", // CRITICAL: must begin with ${scope_name}_. Scope name here is x_app. 
  html: page, // CRITICAL: must import the content to use the output of the build system
  direct: true // CRITICAL: Must be true
});
```

### Project Structure

```plaintext
src/
  client/
    tsconfig.json       # TypeScript config
    index.html          # Entry HTML (HTML format, no DOCTYPE or XML preamble)
    main.tsx            # React bootstrap
    app.tsx             # Main component written in TypeScript
    utils/fields.ts     # Field utilities (create first)
    components/         # React components
    services/           # API service layer
  fluent/
    ui-pages/
      page.now.ts       # UiPage definition
```

### tsconfig.json Contents

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "es2022",
    "target": "es2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve"
  }
}
```

### Agent Decision Tree

When building OR editing a UI Page, follow these steps. Step 1 applies to EVERY prompt -- including follow-ups that change layouts, add views, or modify existing components:

1. **MANDATORY -- Load component rules (EVERY prompt)**: Review component selection rules immediately. Do NOT write any TSX/JSX code before completing this step.
2. **Create ServiceNow application** (if new)
3. **Set proper HTML title**: Include dynamic title generation based on context (Polaris iframe vs standard page)
4. **Read component documentation**: Use package docs to read docs for components you will use
5. **List specific components**: Explicitly state which components from `@servicenow/react-components` will be used
6. **Define navigation structure**: If two or more views/logical entities exist (list + details, tabs, different sections), specify URLSearchParams structure (e.g., `?view=list`, `?view=details&id=123`, `?tab=overview`)
7. **Plan dirty state tracking**: If ANY forms, edits, or create views exist, implement dirty state using `useRecord().form.isDirty` and warn on navigation with `Modal`
8. **Create UI Page files**: HTML, JSX, components, services, CSS
9. **MANDATORY -- Application navigator entry**: Create the Application Menu and App Module
10. **Build and install**

**Decision rules:**

- Listing ServiceNow records -- ALWAYS use `NowRecordListConnected`, NEVER manual Table API
- Viewing/editing a record -- ALWAYS use `RecordProvider` wrapper, NEVER standalone inputs
- Multiple views -- ALWAYS use URLSearchParams
- Any form edit/create -- ALWAYS implement dirty state tracking using `useRecord().form.isDirty`
- Navigation/title updates -- ALWAYS check `window.self !== window.top` for Polaris iframe detection
- Build config -- NEVER create (IDE handles everything)

## Component Selection and Usage

### Why ServiceNow Components?

ALWAYS use `@servicenow/react-components` instead of bare HTML elements. ServiceNow components provide:

- **Platform theming** -- automatically match the instance's Polaris theme, dark mode, and branding
- **Accessibility** -- built-in ARIA attributes, keyboard navigation, and screen reader support
- **Field type handling** -- reference fields, choice lists, dates, currencies rendered correctly without custom code
- **ACL enforcement** -- field-level security and read-only rules applied automatically
- **Dirty state tracking** -- built-in form change detection via `useRecord().form.isDirty`
- **Pagination, sorting, filtering** -- `NowRecordListConnected` handles all list behavior out of the box
- **Consistent UX** -- matches every other ServiceNow application the user interacts with

You cannot replicate this with bare HTML. A custom `<input>` won't respect field types, ACLs, or theming. A manual `<table>` with `.map()` won't have pagination, sorting, or inline editing.

### Component Mapping

| Raw HTML | ServiceNow Component |
| --- | --- |
| `<button>` | `Button`, `ButtonIconic`, `ButtonBare`, `ButtonStateful` |
| `<input>` | `Input`, `InputUrl` |
| `<select>` | `Select`, `Dropdown` |
| `<textarea>` | `Textarea` |
| `<div class="card">` | `Card`, `CardHeader`, `CardFooter`, `CardActions` |
| `<dialog>` / custom modal | `Modal` |
| `<div class="tabs">` | `Tabs` |
| `<span class="badge">` | `Badge` |
| `<img>` | `Image`, `Avatar` |
| `<a href>` | `TextLink` |
| `<div class="tooltip">` | `Tooltip` |
| `<progress>` | `ProgressBar` |
| `<input type="checkbox">` | `Checkbox`, `Toggle` |
| `<input type="radio">` | `RadioButtons` |

Do NOT guess event handler prop names (e.g., `onClick` vs `onClicked`). ALWAYS read the component documentation to get the correct prop names. ServiceNow components often differ from standard React patterns:

- Text content uses `label` prop, not children
- Lists use `items` array prop, not mapped children
- Events use `onXxxSet` naming (e.g., `onSelectedItemSet`) with data in `event.detail`

### Decision Matrix

| Use Case | Component | Never Use |
| --- | --- | --- |
| Display list of records | `NowRecordListConnected` | Manual `fetch()` + `map()` + `<table>` |
| View/edit single record | `RecordProvider` + `FormColumnLayout` | Manual `fetch()` + `<input>` fields |
| Buttons | `Button` | `<button>` |
| Form inputs (non-record) | `Input`, `Textarea` | `<input>`, `<textarea>` |
| Dropdowns (non-record) | `Select` | `<select>` |
| Cards/panels | `Card` | `<div className="card">` |
| Modals | `Modal` | Custom modal implementation |
| Tabs (UI only) | `Tabs` + `Tab` | Custom tab implementation |

For navigation between different views/pages, use URLSearchParams (`?tab=overview`) NOT `Tabs`. Use `Tabs` only for UI organization within a single view that doesn't need separate URLs.

### Critical Anti-Patterns

**Anti-Pattern 1: Manual Record Iteration.** Using `.map()` to iterate over fetched ServiceNow records is forbidden -- use `NowRecordListConnected` instead. This applies to ALL data from ServiceNow tables.

```tsx
// FORBIDDEN - manual fetch + map
const [records, setRecords] = useState([]);
useEffect(() => {
  fetch("/api/now/table/incident")
    .then(r => r.json())
    .then(d => setRecords(d.result));
}, []);
return records.map(record => <div>{record.number}</div>);

// REQUIRED - use NowRecordListConnected
<NowRecordListConnected
  table="incident"
  listTitle="Incidents"
  columns="number,short_description,priority"
  onNewActionClicked={() =>
    navigateToView("create", null, { title: "New Record" })
  }
/>;
```

**Anti-Pattern 2: Raw HTML Elements.** Using raw HTML elements when a ServiceNow React component exists is forbidden -- use components from `@servicenow/react-components` instead.

### Record List Pattern

ALWAYS use `NowRecordListConnected` for displaying ServiceNow records.

```tsx
import React from "react";
import { NowRecordListConnected } from "@servicenow/react-components/NowRecordListConnected";

export default function TicketList({ onSelectTicket, onNewClicked }) {
  return (
    <NowRecordListConnected
      table="incident"
      listTitle="Incidents"
      columns="number,short_description,priority,state,assigned_to"
      onRowClicked={e => onSelectTicket(e.detail.payload.sys_id)}
      onNewActionClicked={onNewClicked}
      limit={25}
    />
  );
}
```

**Filtering:** `NowRecordListConnected` has no `query` prop. To filter records, use the React `key` prop with an encoded query string -- this forces a re-mount with the filtered data:

```tsx
<NowRecordListConnected
  key="active=true^priority=1"
  table="incident"
  listTitle="Critical Incidents"
  columns="number,short_description,priority"
/>
```

**`onNewActionClicked`:** REQUIRED unless `hideHeader={true}`. MUST navigate to the create view -- NEVER use an empty function `() => {}`.

For custom/creative apps, use `hideHeader={true}` (music library, catalog, etc.) where the standard list header doesn't fit the UI design. When `hideHeader` is true, `onNewActionClicked` is not needed.

### Single Record Form Pattern

ALWAYS use `RecordProvider` for viewing/editing a single record.

```tsx
import React from "react";
import { RecordProvider } from "@servicenow/react-components/RecordContext";
import { FormActionBar } from "@servicenow/react-components/FormActionBar";
import { FormColumnLayout } from "@servicenow/react-components/FormColumnLayout";

export default function TicketDetail({ ticketId, onBack }) {
  return (
    <RecordProvider
      table="incident"
      sysId={ticketId}
      isReadOnly={false}
    >
      <FormActionBar />
      <FormColumnLayout />
    </RecordProvider>
  );
}
```

**RecordProvider usage notes:**

- `table`: ServiceNow table name
- `sysId`: Record sys_id to load (use `"-1"` for new records, NEVER `null`/`undefined`)
- `isReadOnly={false}`: Required for editable forms and new records
- `FormColumnLayout`: Renders ALL fields automatically -- there is NO `RecordField` component
- `FormActionBar`: Provides save/update/delete action buttons
- `useRecord()`: Hook to access `form.isDirty`, `header.data`, etc.

## URL Generation and Navigation

ALWAYS use URLSearchParams for navigation. Each view MUST have its own URL. NEVER use `window.location.reload()` -- use React state to trigger re-renders. NEVER use hash-based routing (`#/path`) -- ALWAYS use query strings (`?view=details`).

ALWAYS implement iframe detection for Polaris compatibility:

```javascript
if (window.self !== window.top) {
  // Polaris iframe: Use CustomEvent.fireTop
  window.CustomEvent.fireTop("magellanNavigator.permalink.set", {
    relativePath: path,
    title: title
  });
} else {
  // Standalone: Use history.pushState
  window.history.pushState({}, "", path);
  document.title = title;
}
```

### Complete Navigation Example

```tsx
interface ViewState {
  view: string;
  recordId: string | null;
}

function getViewFromUrl(): ViewState {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view") || "list",
    recordId: params.get("id") || null
  };
}

export default function TaskApp() {
  const [currentView, setCurrentView] = useState<ViewState>(getViewFromUrl);

  useEffect(() => {
    const onPopState = () => setCurrentView(getViewFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateToView = useCallback(
    (viewName: string, recordId?: string | null, { title = "" } = {}) => {
      const params = new URLSearchParams({ view: viewName });
      if (recordId) params.set("id", recordId);
      const relativePath = `${window.location.pathname}?${params}`;
      const pageTitle =
        title ||
        `Task Manager - ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;

      if (window.self !== window.top) {
        (window as any).CustomEvent.fireTop("magellanNavigator.permalink.set", {
          relativePath,
          title: pageTitle
        });
      }

      window.history.pushState({ viewName, recordId }, "", relativePath);
      document.title = pageTitle;
      setCurrentView({ view: viewName, recordId: recordId || null });
    },
    []
  );

  const { view, recordId } = currentView;

  if (view === "list") {
    return (
      <NowRecordListConnected
        table="incident"
        listTitle="Incidents"
        columns="number,short_description,priority,state,assigned_to"
        onRowClicked={e => {
          const sysId = e.detail.payload.sys_id;
          const number = e.detail.payload.number;
          navigateToView("detail", sysId, { title: `Incident ${number}` });
        }}
        onNewActionClicked={() => {
          navigateToView("create", null, { title: "New Incident" });
        }}
      />
    );
  }

  if (view === "create") {
    return (
      <RecordProvider table="incident" sysId="-1" isReadOnly={false}>
        <FormActionBar
          onSubmit={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
          onCancel={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
        />
        <FormColumnLayout />
      </RecordProvider>
    );
  }

  if (view === "detail" && recordId) {
    return (
      <RecordProvider table="incident" sysId={recordId} isReadOnly={false}>
        <FormActionBar
          onSubmit={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
          onCancel={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
        />
        <FormColumnLayout />
      </RecordProvider>
    );
  }
}
```

### Updating Page Title After Record Fetch

```typescript
function updatePageTitle(label: string) {
  if (window.self !== window.top) {
    (window as any).CustomEvent.fireTop("magellanNavigator.permalink.set", {
      relativePath: window.location.pathname + window.location.search,
      title: label
    });
  } else {
    document.title = label;
  }
}
```

### Navigation Key Points

- Each view needs its own URL with URLSearchParams
- Use React state (`setCurrentView`) to trigger re-renders -- NEVER `window.location.reload()`
- Check `window.self !== window.top` for iframe context
- Use `window.CustomEvent.fireTop` in Polaris iframe
- Use `history.pushState()` for URL updates
- Listen for `popstate` events for browser back/forward
- NEVER use hash-based routing (`#/path`)

## SPA Patterns

### Default Navigation Approach

Full SPA with URL-based routing is the DEFAULT navigation pattern for ALL UI Pages unless the user explicitly specifies otherwise.

Every UI Page application should:

- Use URLSearchParams for navigation (`?view=list`, `?view=details&id=123`, `?tab=overview`)
- Implement view switching based on URL parameters
- Support browser back/forward buttons via `popstate` event

### When to Use SPA Architecture

SPA architecture is the DEFAULT for:

- Any application with multiple views (list, detail, edit, create)
- Multi-step forms or wizards
- Tab-based interfaces
- Complex state management across views
- Dashboard with multiple sections
- ANY UI Page unless user explicitly requests a single-view page

### Shared State Management with Context

```tsx
// src/client/contexts/AppContext.tsx
import React, { createContext, useState, useContext } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({});
  const [currentView, setCurrentView] = useState("dashboard");

  const navigate = view => {
    setCurrentView(view);
    const params = new URLSearchParams({ view });
    window.history.pushState({ view }, "", `?${params}`);
  };

  return (
    <AppContext.Provider
      value={{ user, setUser, filters, setFilters, currentView, navigate }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
```

```tsx
// src/client/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "./contexts/AppContext.tsx";
import App from "./app.tsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AppProvider>
    <App />
  </AppProvider>
);
```

### SPA Best Practices

- Keep route components under 80 lines
- Use URLSearchParams-based routing (no router library dependencies)
- Centralize API calls in a service layer
- Use React Context for shared state across views
- Maintain a single HTML entry point
- Each logical view/tab MUST have its own URL parameter
- Support browser back/forward navigation with `popstate` event listener

## Avoidance

- Never use raw HTML elements (`<button>`, `<input>`, `<select>`) when `@servicenow/react-components` provides equivalents
- Never use standalone Input components for ServiceNow record operations -- ALWAYS use `NowRecordListConnected` for lists and `RecordProvider` + `FormColumnLayout` for forms. There is no `RecordField` component
- Never use hash-based routing (`#/path`) -- ALWAYS use URLSearchParams with query strings (`?view=details`)
- Never skip iframe detection (`window.self !== window.top`) -- ALWAYS implement Polaris compatibility for navigation and title updates
- Never assume standard React patterns for ServiceNow components -- always read the component docs first
- Never create build configuration files (webpack, vite, babel)
- Never use CSS Modules (`.module.css`) or `@import` in CSS files
- Never use CDNs or external script sources
- Never use GlideAjax, g_form, Jelly, or `<g:script>` tags
- Never add `client_script` or `processing_script` fields
- Never inline JavaScript in HTML or use `onclick` handlers
- Never skip the `X-UserToken` header in API calls

## API Reference

For the full property reference, see the `uipage-api` topic.

## Templates and Examples

### Minimal Starter Template

#### Fields Utility (ALWAYS CREATE FIRST)

```typescript
// src/client/utils/fields.ts
export const display = field => field?.display_value || "";
export const value = field => field?.value || "";
```

#### UI Page Definition

```typescript
// src/fluent/ui-pages/page.now.ts
import "@servicenow/sdk/global";
import { UiPage } from "@servicenow/sdk/core";
import page from "../../client/index.html";

export const my_page = UiPage({
  $id: Now.ID["my-page"],
  endpoint: "x_app_page.do",
  html: page,
  direct: true
});
```

#### HTML Entry (with Array.from Polyfill)

```html
<!-- src/client/index.html -->
<html class="-polaris">
  <head>
    <title>My Page</title>
    <sdk:now-ux-globals></sdk:now-ux-globals>
    <!-- Array.from polyfill to fix prototype.js breaking iterables (Set, Map, etc.) -->
    <!-- MUST be inline script BEFORE module scripts - ESM imports are hoisted so external polyfill files won't work -->
    <script type="text/javascript">
      //<![CDATA[
      (function () {
        var testWorks = (function () {
          try {
            var result = Array.from(new Set([1, 2]));
            return (
              Array.isArray(result) && result.length === 2 && result[0] === 1
            );
          } catch (e) {
            return false;
          }
        })();
        if (testWorks) return;
        var originalArrayFrom = Array.from;
        function specArrayFrom(arrayLike, mapFn, thisArg) {
          if (arrayLike == null)
            throw new TypeError(
              "Array.from requires an array-like or iterable object"
            );
          var C = this;
          if (typeof C !== "function" || C === Window || C === Object) {
            C = Array;
          }
          var mapping = typeof mapFn === "function";
          var iterFn = arrayLike[Symbol.iterator];
          if (typeof iterFn === "function") {
            var result = [];
            var i = 0;
            var iterator = iterFn.call(arrayLike);
            var step;
            while (!(step = iterator.next()).done) {
              result[i] = mapping
                ? mapFn.call(thisArg, step.value, i)
                : step.value;
              i++;
            }
            result.length = i;
            return result;
          }
          var items = Object(arrayLike);
          var len = Math.min(
            Math.max(Number(items.length) || 0, 0),
            Number.MAX_SAFE_INTEGER
          );
          var result = new C(len);
          for (var k = 0; k < len; k++) {
            result[k] = mapping ? mapFn.call(thisArg, items[k], k) : items[k];
          }
          result.length = len;
          return result;
        }
        Array.from = function (arrayLike, mapFn, thisArg) {
          if (
            arrayLike != null &&
            typeof arrayLike[Symbol.iterator] === "function"
          ) {
            try {
              return specArrayFrom.call(this, arrayLike, mapFn, thisArg);
            } catch (e) {
              console.error("Array.from failed with error:", e);
              return originalArrayFrom.call(this, arrayLike, mapFn, thisArg);
            }
          }
          return originalArrayFrom.call(this, arrayLike, mapFn, thisArg);
        };
      })();

      if (window.Element && Element.Methods) {
        Element.Methods.remove = function (element) {
          element = $(element);
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
          return element;
        };
        Element.addMethods();
      }

      //]]>
    </script>
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

**IMPORTANT NOTES:**

- The Array.from polyfill MUST be an inline `<script>` tag (not `type="module"`) placed BEFORE the module script. ESM imports are hoisted and execute before any inline code in the module, so importing a polyfill file won't work.
- The `//<![CDATA[` and `//]]>` wrappers are required to prevent Jelly from parsing JavaScript operators like `<` and `&&` as XML syntax.

#### React Bootstrap

```tsx
// src/client/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

### Common User Requests Mapping

| User Request | Agent Implementation |
| --- | --- |
| "Create a ticket management interface" | React with state-based routing and Table API |
| "Build a form to submit requests" | React form component with POST to Table API |
| "Dashboard showing metrics" | Multiple React components with aggregated queries |
| "Multi-step wizard" | State-based SPA with shared context |
| "Tab interface" | Switch statement with currentView state |
| "Add React Router" | "Use built-in state-based routing instead" |
| "Add webpack configuration" | "The build system handles this automatically" |

