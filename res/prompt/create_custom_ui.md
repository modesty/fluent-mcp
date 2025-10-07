# Create a Custom UI with Framework You Choose

Starting Fluent v4, you can create custom UIs using frameworks of your choice, such as React, Svelte, Vue.js, or SolidJS. This guide will walk you through the steps to set up a custom UI project.

Fluent (ServiceNow SDK) supports building front-end applications with standard frameworks to run on ServiceNow! For this first release, we are natively supporting [React](https://react.dev/) out of the box, and we are aiming to support a "bring your own front end" (BYOF) approach. This new feature will let you use a more modern development experience for building UI applications.

To get started building front ends, simply choose a template with included front-end framework support such as now-sdk + fullstack React when running init to get started!

This is just the beginning of the BYOF support we are adding to the SDK and we will be following up soon with more support for providing your own bundler and tooling for other frameworks like Svelte, Vue, etc...

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
- Svelte Sample: https://github.com/ServiceNow/sdk-examples/tree/main/svelte-ui-page-sample
- Vue Sample: https://github.com/ServiceNow/sdk-examples/tree/main/vue-ui-page-sample
- SolidJS Sample: https://github.com/ServiceNow/sdk-examples/tree/main/solidjs-ui-page-sample

## Limitations

- Only hash routing is currently supported by UI Pages.
- Maximum file size of assets is limited to the `com.glide.attachment.max_size` system property
- Preloading content linked from HTML isn't supported (`rel="preload"`)
- Relative style sheets linked from HTML aren't supported (`rel="stylesheet"`). Import your style sheets into code instead (`import "path/to/style-sheet"`)
- Relative @import in CSS isn't supported
- CSS modules aren't supported
- Server-side rendering and React server components aren't supported
