# Service Portal

Guide for building ServiceNow Service Portal experiences using the Fluent API. Service Portal is a portal framework for building user-facing self-service experiences using AngularJS and Bootstrap 3. This guide covers core portal concepts: portals, pages, widgets, and themes.

## When to Use

- Building a branded self-service portal for employees, customers, or partners
- Creating custom portal pages with responsive layouts
- Developing interactive widgets with client-server communication
- Customizing portal appearance with themes, headers, and footers
- Setting up navigation menus for portal structure
- Creating shared AngularJS services, directives, and factories for widgets
- Managing external JavaScript and CSS library dependencies for widgets

## When NOT to Use

- Platform UI Pages -- use the UI Page skill instead
- Next Experience / UI Builder pages -- different framework entirely
- Backend scripts with no UI component (business rules, script includes, etc.)
- Flow Designer workflows
- Workspace components in Next Experience

## Instructions

1. **Always use dedicated Fluent APIs.** Every Service Portal component has a dedicated API (`ServicePortal`, `SPPage`, `SPWidget`, `SPTheme`, `SPMenu`, `SPAngularProvider`, `SPWidgetDependency`). Never use `Record()` / `Now.table()` for Service Portal components.
2. **Check OOTB components first.** Before creating any widget, theme, or page, check whether an out-of-the-box equivalent already exists. Only create custom components when no suitable OOTB option exists.
3. **Verify uniqueness.** `urlSuffix` (portals), `pageId` (pages), and widget `name`/`id` must be unique across the instance. Always query the instance to verify before creating.
4. **Bootstrap 3 only.** Service Portal uses Bootstrap 3 (not 4 or 5). Use `.panel`, `.btn-default`, `.col-xs-*` through `.col-lg-*`, and the 12-column grid.
5. **AngularJS 1.x only.** Use controller alias `c` (not `$scope`), `ng-repeat`, `ng-click`, `ng-model`. No Angular 2+ syntax.
6. **Separate files for widgets.** Always use `Now.include()` for widget scripts, templates, and styles. Never inline large code blocks.
7. **No placeholders.** Replace all placeholder values with actual data or queried sys_ids.
8. **Query only when referencing existing components.** Do not query before creating new ones.
9. **Scoped app restrictions.** Fluent apps run in scoped context. Use scoped-safe APIs only (e.g., `new GlideDateTime()` instead of `nowDateTime()`).
10. **Run UI diagnostics after install.** After a successful install, verify the portal loads without errors at `/<urlSuffix>?id=<homepagePageId>`.
11. **Always share the portal URL.** After successful install, provide the complete URL: `https://<instance>.service-now.com/<urlSuffix>?id=<homepagePageId>`.

## Key Concepts

### Component Hierarchy

```
Portal (sp_portal)
+-- Theme (sp_theme)
|   +-- Header (sp_header_footer)
|   +-- Footer (sp_header_footer)
+-- Main Menu (sp_instance_menu)
+-- Pages (sp_page)
    +-- Containers -> Rows -> Columns -> Widget Instances (sp_instance)
        +-- Widgets (sp_widget)
            +-- Dependencies (sp_dependency)
            +-- Angular Providers (sp_angular_provider)
```

### API to Table Mapping

| Component         | Fluent API             | ServiceNow Table      |
| ----------------- | ---------------------- | --------------------- |
| Portal            | `ServicePortal()`      | `sp_portal`           |
| Page              | `SPPage()`             | `sp_page`             |
| Widget            | `SPWidget()`           | `sp_widget`           |
| Theme             | `SPTheme()`            | `sp_theme`            |
| Menu              | `SPMenu()`             | `sp_instance_menu`    |
| Angular Provider  | `SPAngularProvider()`  | `sp_angular_provider` |
| Widget Dependency | `SPWidgetDependency()` | `sp_dependency`       |
| Header/Footer     | `Record()`             | `sp_header_footer`    |
| CSS Include       | `CssInclude()`         | `sp_css_include`      |
| JS Include        | `JsInclude()`          | `sp_js_include`       |

### File Organization

```
fluent/
 +-- service-portal/
 |   +-- portal.now.ts
 +-- sp-page/
 |   +-- home/
 |   |   +-- home-page.now.ts
 |   +-- login/
 |       +-- login-page.now.ts
 +-- sp-widget/
 |   +-- my_widget/
 |       +-- widget.now.ts
 |       +-- server_script.js
 |       +-- client_script.js
 |       +-- template.html
 |       +-- styles.css
 +-- sp-theme/
 |   +-- theme.now.ts
 +-- sp-instance-menu/
 |   +-- menu.now.ts
 +-- sp-angular-provider/
 |   +-- provider.now.ts
 +-- sp-dependency/
 |   +-- dependency.now.ts
 +-- sp-header-footer/
     +-- header.now.ts
```

### Important Technologies

Service Portal uses **Bootstrap 3** (not 4/5) and **AngularJS 1.x** (not Angular 2+):

- **Bootstrap 3:** 12-column grid, `.panel`, `.btn-default`, `.col-xs-*` through `.col-lg-*`
- **AngularJS:** controller alias `c` (not `$scope`), `ng-repeat`, `ng-click`, `ng-model`

### AngularJS Binding Reference

| Pattern                 | Usage                                                  |
| ----------------------- | ------------------------------------------------------ |
| Two-way data binding    | `ng-model="c.data.fieldName"`                          |
| Display only            | `ng-bind="c.data.value"` or `{{c.data.value}}`        |
| Remove from DOM         | `ng-if="c.data.showSection"`                           |
| Hide/show (keep in DOM) | `ng-show="c.loading"`                                  |
| List iteration          | `ng-repeat="item in c.data.rows track by item.sys_id"` |
| Click handler           | `ng-click="c.methodName()"`                            |
| Dynamic class           | `ng-class="{'sp-active': c.selected === item.sys_id}"` |
| Disable button          | `ng-disabled="c.submitting"`                           |
| Input validation state  | `ng-class="{'has-error': c.errors.fieldName}"`         |

### Widget Script Communication

**Server script context:**

- `data` -- object passed to client
- `input` -- client input from `c.server.get()` / `c.server.update()`
- `options` -- widget option values

**Client script context:**

- `c.data` -- data from server
- `c.options` -- widget options
- `c.server.get(input)` -- call server (GET)
- `c.server.update()` -- call server (POST, sends `c.data` as `input`)
- `c.server.refresh()` -- reload widget

## Avoidance

- **Never use `Record()` for Service Portal components** -- every component has a dedicated API. `Record()` bypasses validation and uses incorrect field mapping.
- **Never use GlideAjax in widgets** -- use `c.server.get()` instead.
- **Never omit `setLimit()` on GlideRecord queries** -- runaway queries impact performance.
- **Never omit `track by` on `ng-repeat`** -- always use `track by item.sys_id` or `track by $index`.
- **Never use Bootstrap 4/5 classes** -- Service Portal uses Bootstrap 3 only.
- **Never use `$scope` directly** -- use controller alias `c` (`var c = this`).
- **Never use hardcoded hex colors in widget CSS** -- always use theme SCSS variables.
- **Never use raw `px` values for `font-size`** -- use `$sp-text-*` or `$font-size-*` variables.
- **Never use `!important` in widget CSS** -- increase selector specificity instead.
- **Never use inline `style=""` attributes** -- use SCSS classes.
- **Never re-add bundled libraries** (jQuery, AngularJS, Bootstrap) -- they are already included in Service Portal.
- **Never use `includeOnPageLoad: true`** on dependencies unless truly global -- link to specific widgets instead.
- **Never use `href="#"` on anchor elements** -- use `ng-click` with a button instead.
- **Never use `alert()` or `console.log()` in widgets** -- use `sp-alert` component and `gs.error()` / `gs.info()` server-side.

## Implementation Workflow

1. **Understand requirements** -- identify components needed and their relationships. Use the decision trees below.
2. **Check OOTB reusability** -- check OOTB widgets, themes, and pages before creating any custom component.
3. **Create components bottom-up** -- start with dependencies and providers, then widgets, then pages, then themes and menus, finally the portal.
4. **Verify unique identifiers** -- query the instance to confirm `urlSuffix`, `pageId`, and widget names are unique.
5. **Validate configuration** -- verify all references are valid and no `Record()` API usage.
6. **Generate code** -- use dedicated Fluent API constructors, include all required fields, replace all placeholders.
7. **Run UI diagnostics** -- after install, verify the portal loads without errors.
8. **Share the portal URL** with the user.

## Decision Trees

### Portal

```
"Create/update a portal"
+-- Existing portal?
|   +-- YES -> Query sp_portal, update only changed fields
|   +-- NO  -> Use ServicePortal() to create new
+-- Theme?
|   +-- DEFAULT -> Always use OOTB theme (Coral first, La Jolla second)
|   +-- User specifies custom branding OOTB cannot satisfy -> Create SPTheme()
+-- Navigation/menu?
    +-- YES -> Create SPMenu() (theme must have header set)
    +-- NO  -> Skip
```

### Widget

```
"Create/update a widget"
+-- Existing widget satisfies the need?
|   +-- YES -> Query sp_widget, reuse it
|   +-- NO  -> Create new with separate files (Now.include())
+-- Needs external libraries?
|   +-- YES -> SPWidgetDependency() + SPWidget()
|   +-- NO  -> SPWidget() only
+-- Needs shared services/directives?
|   +-- YES -> SPAngularProvider() + SPWidget()
|   +-- NO  -> SPWidget() only
```

### Theme

```
"Create/update a theme"
+-- Portal already has a theme?
|   +-- YES -> Use existing theme. Only update customCss if user explicitly requests branding changes
|   +-- NO  -> Check OOTB themes (Coral first). Create custom only if no suitable OOTB option exists
```

---

## API Reference: Portal (sp_portal)

For the full property reference, see the `serviceportal-api` topic.

### Portal Guidelines

- Always query `sp_portal` by `url_suffix` before creating to verify the suffix is unique
- Only one portal should have `defaultPortal: true`
- Page references can be sys_id strings or SPPage object references
- M2M relationships (catalogs, knowledge bases) use arrays of objects, not arrays of strings
- Menu display requires all three: portal `theme` + theme `header` + portal `mainMenu`

### Portal Example

```typescript
import "@servicenow/sdk/global";
import { ServicePortal } from "@servicenow/sdk/core";

export const employeePortal = ServicePortal({
  $id: Now.ID["employee_portal"],
  title: "Employee Portal",
  urlSuffix: "emp",
  theme: theme,       // SPTheme object or sys_id
  mainMenu: menu,     // SPMenu object or sys_id
  homePage: homePage,  // SPPage object or sys_id
  catalogs: [{ catalog: "<catalog_sys_id>", order: 100, active: true }],
  knowledgeBases: [{ knowledgeBase: "<kb_sys_id>", order: 100, active: true }]
});
```

---

## API Reference: Page (sp_page)

For the full property reference (pages, containers, rows, columns, instances), see the `sppage-api` topic.

### Page Guidelines

- `pageId` is globally unique across ALL Service Portal pages on the instance. Never use bare generics like `"home"` or `"dashboard"` -- always prefix with a portal identifier (e.g., `"hr-home"`, `"esc-request-catalog"`)
- Always query `sp_page` by `id=<candidate-pageId>` before creating
- Use `container` width for centered content, `container-fluid` for full-width backgrounds
- Column sizes in a row must sum to 12
- Use `nestedRows` for complex multi-level layouts within a single column
- Background images use `Now.attach('./path/to/image.png')` with `backgroundStyle: 'cover'` for hero banners

### Page Example

```typescript
import "@servicenow/sdk/global";
import { SPPage } from "@servicenow/sdk/core";

export const homePage = SPPage({
  pageId: "hr-home",
  title: "Home",
  public: true,
  containers: [
    {
      $id: Now.ID["home_hero_container"],
      name: "Hero Section",
      width: "container-fluid",
      backgroundImage: Now.attach("./images/hero-bg.jpg"),
      backgroundStyle: "cover",
      order: 1,
      rows: [
        {
          $id: Now.ID["home_hero_row"],
          order: 1,
          columns: [
            {
              $id: Now.ID["home_hero_col"],
              size: 12,
              instances: [
                {
                  $id: Now.ID["home_hero_instance"],
                  widget: heroWidget,
                  order: 1
                }
              ]
            }
          ]
        }
      ]
    }
  ]
});
```

---

## API Reference: Widget (sp_widget)

For the full property reference, see the `spwidget-api` topic.

### Widget Guidelines

- Widget `name` and `id` must be unique across the instance -- always query before creating
- Always use separate files via `Now.include()` for scripts, templates, and styles
- Client script pattern: bare function with `api.controller`, `var c = this`, no IIFE
- Templates always use controller alias `c`: `{{c.data.field}}`, never `{{data.field}}`
- Never use GlideAjax -- use `c.server.get()` instead
- Every GlideRecord query must have `setLimit()`
- Every `ng-repeat` must have `track by`
- Initialize all `data.*` properties at the top of server script
- Use `optionSchema` for configurable behavior instead of hardcoded values
- No raw hex in widget CSS -- use theme SCSS variables

### Scoped Application Restrictions

Fluent apps run in scoped context. Global scope functions are not allowed:

| Global (NOT allowed)  | Scoped Alternative                    |
| --------------------- | ------------------------------------- |
| `nowDateTime()`       | `new GlideDateTime()`                 |
| `getXMLWait()`        | `c.server.get()` or REST API          |
| `gs.print()`          | `gs.info()`, `gs.error()`            |

### Widget Example

```typescript
import "@servicenow/sdk/global";
import { SPWidget } from "@servicenow/sdk/core";

export const myWidget = SPWidget({
  $id: Now.ID["my_widget"],
  name: "My Widget",
  htmlTemplate: Now.include("./template.html"),
  clientScript: Now.include("./client_script.js"),
  serverScript: Now.include("./server_script.js"),
  customCss: Now.include("./styles.css"),
  optionSchema: [
    {
      name: "table",
      label: "Table Name",
      type: "string",
      default_value: "incident",
      section: "Data"
    },
    {
      name: "max_records",
      label: "Max Records",
      type: "integer",
      default_value: "10",
      section: "Data"
    }
  ]
});
```

### Server Script Pattern

```javascript
// server_script.js
(function () {
  data.records = [];
  data.success = false;
  data.message = "";

  try {
    if (input && input.action === "submit") {
      var gr = new GlideRecord("incident");
      gr.initialize();
      gr.short_description = input.short_description;
      var id = gr.insert();
      data.success = !!id;
      data.message = id ? gr.getValue("number") + " created." : "Insert failed.";
      return;
    }

    // Initial load
    var gr = new GlideRecord("incident");
    gr.addQuery("active", true);
    gr.orderByDesc("sys_created_on");
    gr.setLimit(options.max_records || 50);
    gr.query();
    while (gr.next()) {
      data.records.push({
        sys_id: gr.getUniqueValue(),
        number: gr.getValue("number"),
        short_description: gr.getValue("short_description"),
        state: gr.getDisplayValue("state")
      });
    }
  } catch (e) {
    gs.error("Widget error: " + e.message);
    data.message = "An error occurred.";
  }
})();
```

### Client Script Pattern

```javascript
// client_script.js
api.controller = function (spUtil) {
  var c = this;

  c.loading = false;
  c.submitting = false;
  c.data = c.data || {};

  c.submit = function () {
    c.submitting = true;
    c.server
      .get({ action: "submit", short_description: c.form.short_description })
      .then(function (r) {
        if (r.data.success) {
          c.data.successMsg = r.data.message;
          c.form = {};
        } else {
          c.data.errorMsg = r.data.message || "An error occurred.";
        }
        c.submitting = false;
      });
  };
};
```

### HTML Template Pattern

```html
<!-- template.html -->
<div class="panel panel-default sp-card">
  <div class="panel-heading sp-card-header">
    <h3 class="panel-title sp-card-title">My Incidents</h3>
  </div>
  <div class="panel-body sp-card-body">
    <div class="sp-alert sp-alert-success" ng-if="c.data.successMsg" role="alert">
      {{c.data.successMsg}}
    </div>
    <ul class="list-group">
      <li ng-repeat="record in c.data.records track by record.sys_id"
          class="list-group-item">
        <strong>{{record.number}}</strong> -- {{record.short_description}}
        <span class="sp-badge sp-badge-info pull-right">{{record.state}}</span>
      </li>
    </ul>
    <div class="sp-empty-state" ng-if="!c.data.records.length && !c.loading">
      <span class="glyphicon glyphicon-inbox sp-empty-icon"></span>
      <p class="sp-empty-body">No records found.</p>
    </div>
  </div>
</div>
```

---

## API Reference: Theme (sp_theme)

For the full property reference, see the `sptheme-api` topic.

### Menu Display Prerequisites

Navigation menus will NOT appear unless ALL THREE are set:

1. Portal has `theme` configured
2. Theme has `header` configured (an `sp_header_footer` record)
3. Portal has `mainMenu` configured

### CSS Variable Rules

- Only `--now-*` tokens exist as platform CSS custom properties. Never invent token names.
- Use `sp-rgb(--now-token, #hex) !default` when a verified `--now-*` token exists for the color.
- Use hex directly when no token exists. Never invent a token name.
- Always add `!default` to allow per-portal variable overrides.

### Navbar Color Alignment (Required When Overriding `$brand-primary`)

When `customCss` declares a custom `$brand-primary`, you MUST also set these 8 navbar variables:

```scss
$navbar-inverse-bg:                  $brand-primary !default;
$navbar-inverse-border:              darken($brand-primary, 6.5%) !default;
$navbar-inverse-link-color:          $btn-primary-color !default;
$navbar-inverse-link-hover-color:    $btn-primary-color !default;
$navbar-inverse-link-active-color:   $btn-primary-color !default;
$navbar-inverse-brand-color:         $btn-primary-color !default;
$navbar-inverse-toggle-icon-bar-bg:  $btn-primary-color !default;
$navbar-inverse-toggle-border-color: darken($brand-primary, 10%) !default;
```

Skip this when using an OOTB theme or when `$brand-primary` is not being overridden.

### Theme Guidelines

- Always check for an existing theme first -- query the portal's `theme` field before any theme work
- Never create a new theme when one already exists on the portal
- Always reuse existing headers -- only create custom when explicitly requested
- Header is mandatory for menu display

### OOTB Themes

| Name                  | Sys ID                             | Description                         |
| --------------------- | ---------------------------------- | ----------------------------------- |
| Coral                 | `281507c44317d210ca4c1f425db8f2fd` | Coral color-scheme branding         |
| La Jolla              | `a7a6e78277002300a6e592718a10617a` | Modern flat design                  |
| Stock                 | `79315153cb33310000f8d856634c9c4b` | Default baseline theme              |
| Stock - High Contrast | `f84873986711320023c82e08f585ef6a` | Accessibility-compliant             |
| EC Theme              | `9b6f06d71bb8f85047582171604bcb9c` | Employee Center default             |
| Portal Next Experience| `f548bd34845a1110f87767389929c667` | Next-gen portal (Polaris)           |

When no custom theme is needed, prefer Coral first, then La Jolla. Always verify existence on instance before referencing.

### Theme Example

```typescript
import "@servicenow/sdk/global";
import { SPTheme } from "@servicenow/sdk/core";

export const brandedTheme = SPTheme({
  $id: Now.ID["branded_theme"],
  name: "Branded Theme",
  customCss: `
    $brand-primary:      sp-rgb(--now-color--primary-1, #0047ab) !default;
    $brand-primary-dark: darken(#0047ab, 12%) !default;
    $link-color:         sp-rgb(--now-color--primary-1, #0047ab) !default;
    $body-bg:            sp-rgb(--now-color_background--secondary, #f4f5f7) !default;

    $navbar-inverse-bg:                  $brand-primary !default;
    $navbar-inverse-border:              darken($brand-primary, 6.5%) !default;
    $navbar-inverse-link-color:          $btn-primary-color !default;
    $navbar-inverse-link-hover-color:    $btn-primary-color !default;
    $navbar-inverse-link-active-color:   $btn-primary-color !default;
    $navbar-inverse-brand-color:         $btn-primary-color !default;
    $navbar-inverse-toggle-icon-bar-bg:  $btn-primary-color !default;
    $navbar-inverse-toggle-border-color: darken($brand-primary, 10%) !default;
  `,
  header: "bf5ec2f2cb10120000f8d856634c9c0c",
  footer: "feb4f763df121200ba13a4836bf26320",
  logo: Now.attach("logo.png"),
  logoAltText: "Company Logo"
});
```

