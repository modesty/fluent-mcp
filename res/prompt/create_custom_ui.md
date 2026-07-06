---
title: "Create a Custom UI with Fluent (ServiceNow SDK)"
description: "Guide for creating custom UIs with React (18.2.0) using the Fluent (ServiceNow SDK) UiPage API"
---

# Create a Custom UI with React

Fluent (ServiceNow SDK) lets you build front-end applications that run on ServiceNow. **Current UI Page guidance mandates React:** use [React](https://react.dev/) 18.2.0 together with the `@servicenow/react-components` library. Do not use vanilla JavaScript, jQuery, or another framework for a supported UI Page implementation.

To get started, choose a React template when running `init` — the SDK ships full-stack `javascript.react` and `typescript.react` templates. The CLI also exposes a `typescript.vue` template, but template availability is a technical capability, not a statement of UI Page support. Follow the installed UI Page guidance and use React for new UI Pages.

## How does it work

Front-end applications utilize the `UiPage` Fluent API for bundling and hosting the application and its entry point. The SDK detects importing from an .html page that is being assigned to the html attribute on `UiPage` Fluent API and bundles your front end into static assets served with your application.
By default, the front-end application code lives in your src/client directory (configurable in now.config.json with the clientDir property). Add all your images, style sheets, fonts, etc. here the same way you would for any typical React application that you're building. The out of the box bundler we have included is [Rollup](https://rollupjs.org/) to package up the your front end application.

Example with React:

```typescript
import { UiPage } from '@servicenow/sdk/core'
import indexPage from '../client/index.html'

UiPage({
    $id: Now.ID['sample-frontend'],
    endpoint: 'x_sampleapp-uipage-fe.do',
    description: 'Sample Front-End Application',
    category: 'general',
    html: indexPage,
    direct: true,
})
```

In the `src/client` folder create an `index.html` page like this:

```html
<html>
<head>
  <title>Sample Front-End Application</title>

  <!-- Initialize globals and Include ServiceNow's required scripts -->
  <sdk:now-ux-globals></sdk:now-ux-globals>

  <!-- Include your React entry point -->
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

When you are ready, just build and install then open the UI Page on the instance to view your application!

- React Sample: https://github.com/ServiceNow/sdk-examples/tree/main/react-ui-page-ts-sample
- Vue Sample (CLI template capability; not the supported UI Page path): https://github.com/ServiceNow/sdk-examples/tree/main/vue-ui-page-sample

## Limitations

- Client-side routing must use query strings (`?view=details`) via `URLSearchParams`. NEVER use hash-based routing (`#/path`) — it is not supported by UI Pages.
- Maximum file size of assets is limited to the `com.glide.attachment.max_size` system property
- Preloading content linked from HTML isn't supported (`rel="preload"`)
- Relative style sheets linked from HTML aren't supported (`rel="stylesheet"`). Import your style sheets into code instead (`import "path/to/style-sheet"`)
- Relative @import in CSS isn't supported
- CSS modules aren't supported
- Server-side rendering and React server components aren't supported
