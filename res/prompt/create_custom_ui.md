---
title: "Create a Custom UI with Fluent (ServiceNow SDK)"
description: "Guide for creating custom UIs with React (18.2.0) using the Fluent (ServiceNow SDK) UiPage API"
---

# Create a Custom UI with React

Fluent (ServiceNow SDK) lets you build front-end applications that run on ServiceNow. **Current UI Page guidance mandates React:** use [React](https://react.dev/) 18.2.0 together with the `@servicenow/react-components` library for all UI elements (`ui-page-guide`). Do not use vanilla JavaScript, jQuery, or another framework.

To get started, choose a React template when running `init` — the SDK ships full-stack `javascript.react` and `typescript.react` templates. The CLI also exposes a `typescript.vue` template, and the SDK's Rollup build is framework-agnostic (`sdlc-guide`), but template availability is a technical capability, not a statement of UI Page support: the UI Page guides and every pattern below assume React, so use React for new UI Pages.

The React templates scaffold `react` / `react-dom` **19.x** without `@servicenow/react-components`. After `init`, set the dependencies the UI Page guide requires and install them — `"react": "18.2.0"`, `"react-dom": "18.2.0"`, `"@servicenow/react-components": "^0.1.0"` (the caret is required), and the devDependency `"@types/react": "18.3.12"` — without changing the versions of any other existing dependency.

## How does it work

Front-end applications use the `UiPage` Fluent API for hosting the application and its entry point. During `now-sdk build`, the SDK bundles every `.html` entry under `clientDir` (default `src/client`, set in `now.config.json`) into `staticContent.buildDir` (default `dist/static`) with its Rollup-based bundler, and an `.html` file imported into `UiPage({ html })` resolves to that built copy through `staticContent.paths`. Always import the HTML file — never use `Now.include()` for it. Add your images, style sheets, fonts, etc. under `clientDir` the same way you would in any React application.

If you change `clientDir`, change `staticContent.paths` to match (default `{ "src/client/*.html": "dist/static/*.html" }`); otherwise the build still reports success but ships the unbuilt HTML that points at `./main.tsx`.

Example with React:

```typescript
import { UiPage } from '@servicenow/sdk/core'
import indexPage from '../client/index.html'

UiPage({
    $id: Now.ID['sample-frontend'],
    endpoint: 'x_sampleapp_frontend.do', // must begin with '<scope>_' — here the scope is x_sampleapp
    description: 'Sample Front-End Application',
    category: 'general',
    html: indexPage, // must import the HTML to use the build output
    direct: true, // must be true
})
```

In the `src/client` folder create an `index.html` page like this (no `<!DOCTYPE html>` and no XML preamble):

```html
<html class="-polaris">
<head>
  <title>Sample Front-End Application</title>

  <!-- Initialize globals (window.g_ck, theming) and include ServiceNow's required scripts -->
  <sdk:now-ux-globals></sdk:now-ux-globals>

  <!-- Include your React entry point; the build appends the required uxpcb cache-busting parameter -->
  <script src="./main.tsx" type="module"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

In the `src/client/*` folder add a `main.tsx` file with your React code, CSS, and other assets to build your application.

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'

const rootElement = document.getElementById('root')
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    )
}
```

When you are ready, build and install, then open the UI Page on the instance to view your application!

- React Sample (scaffold reference only — React 19.x, no `@servicenow/react-components`): https://github.com/ServiceNow/sdk-examples/tree/main/react-ui-page-ts-sample
- Vue Sample (framework-agnostic build; not covered by the UI Page guides): https://github.com/ServiceNow/sdk-examples/tree/main/vue-ui-page-sample

## Required patterns

Look up `ui-page-guide`, `ui-page-patterns-guide`, and `ui-page-theming-guide` with `explain_fluent_api` for the full rules. These are the ones you must not skip:

- **Client tsconfig** — `src/client/tsconfig.json` needs `"moduleResolution": "bundler"`, `"module": "es2022"`, `"target": "es2022"`, `"lib": ["ES2022", "DOM"]`, `"jsx": "preserve"`, **and `"skipLibCheck": true`** on every write — `ui-page-guide` marks it mandatory because some `@servicenow/react-components` declarations reference the global `React` namespace. The build type-checks every client `.ts`/`.tsx` file and fails on any error.
- **Components first** — read each component's documentation (`node_modules/@servicenow/react-components/docs/`) before writing TSX; never guess prop or event names. Use a component wherever one replaces a raw `<button>`, `<input>`, `<select>`, or modal.
- **Record lists** — `NowRecordListConnected`, never a manual Table API fetch. `onNewActionClicked` must navigate to the create view unless `hideHeader={true}`.
- **Record forms** — wrap with `RecordProvider` (`sysId="-1"` for a new record, never `null`/`undefined`) around `FormActionBar` + `FormColumnLayout`; there is no `RecordField` component. Check dirty state only with `useRecord().form.isDirty`, and warn on navigation with `Modal`, never `window.confirm()`.
- **Navigation** — every view has its own URLSearchParams URL (`?view=details&id=123`); use React state to re-render, never `window.location.reload()`. Detect the Polaris iframe with `window.self !== window.top` for navigation and title updates.
- **Data access** — send `X-UserToken: window.g_ck` and `sysparm_display_value=all` on every Table API call, and read values through `display()` / `value()` helpers created first in `src/client/utils/fields.ts`.
- **Theming** — use Horizon CSS tokens with fallbacks, e.g. `background-color: rgb(var(--now-color_background--primary, 255, 255, 255));`.
- **Build and HTML rules** — never add webpack/vite/babel configs; no Jelly, `<g:script>`, `g_form`, GlideAjax, inline `onclick` handlers, or CDN/external scripts; no `client_script` / `processing_script` on the page. Keep files under 100 lines.
- **Navigator entry** — create the Application Menu and an App Module for the page (see the `application-menu` spec).

## Limitations

- Client-side routing must use query strings (`?view=details`) via `URLSearchParams`. NEVER use hash-based routing (`#/path`) — it is not supported by UI Pages.
- Maximum file size of assets is limited to the `com.glide.attachment.max_size` system property
- Preloading content linked from HTML isn't supported (`rel="preload"`)
- Relative style sheets linked from HTML aren't supported (`rel="stylesheet"`). Import your style sheets into code instead (`import "path/to/style-sheet"`)
- `@import` in CSS files isn't supported (relative or remote) — import each style sheet from code instead
- CSS modules aren't supported
- Audio, video, and WASM files aren't supported
- Output paths must be deterministic — don't configure hashed file names
- Server-side rendering and React server components aren't supported
