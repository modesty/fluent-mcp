# UI Page Theming

Horizon Design System theming reference for ServiceNow UI Pages, covering design foundations, layout patterns, controls, and component styling.

## Theming: Horizon Design System Foundations

The Horizon Design System defines foundational rules for generating ServiceNow-compliant UIs using HTML, CSS, and design tokens (CSS custom properties).

### Core Principles

1. **Fluid**: UIs MUST adapt seamlessly to varying contexts. Use relative units (`rem`, `%`, `auto`) and spacing tokens, not fixed pixels.
2. **Symphonic**: Components MUST visually harmonize. Consistent radius, shadows, and typography ensure unified experience.
3. **Accessible**: All UIs MUST comply with WCAG 2.1 AA: text contrast >= 4.5:1, visible focus states, keyboard navigation, semantic HTML.

### Color Roles

- `primary` -- intended for primary actions or important UI elements
- `secondary` -- complementary color to the primary colors
- `primary background` -- default theme background
- `secondary background` -- strong division between sections (use sparingly)
- `text` variables -- palette for written content like sentences, paragraphs, or captions
- Semantic colors: `alert`, `warning`, `positive` -- convey feedback, status, or urgency

### Accessibility Standards

1. All interactive elements MUST have distinct states: `base`, `hover`, `active`, `focus-visible`, `disabled`
2. Focus rings MUST use inset shadows or outlines (no layout reflow)
3. Screen-reader labels MUST exist for all actionable elements
4. Landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) SHOULD be used

### Foundation Token Patterns

| Property | Token Pattern | Available Values |
| --- | --- | --- |
| **Spacing** | `--now-static-space--{size}` | xxs (0.125rem), xs (0.25rem), sm (0.5rem), md (0.75rem), lg (1rem), xl (1.5rem), xxl (2rem), 3xl (2.5rem) |
| **Drop Shadows** | `--now-static-drop-shadow--{size}` | sm, md, lg, xl, xxl |
| **Border Radius** | `--now-static-border-radius--{size}` | sm (0.125rem), md (0.25rem), lg (0.5rem) |
| **Font Sizes** | `--now-static-font-size--{size}` | sm (0.75rem), md (1rem), lg (1.25rem), xl (1.5rem) |
| **Line Height** | `--now-static-line-height` | 1.25 (unitless) |
| **Font Family** | `--now-font-family` | Lato, Arial, sans-serif |

### Semantic Token Categories

| Element Type | Token Category | Example |
| --- | --- | --- |
| Buttons, CTAs | `actionable` | `--now-actionable--primary--background-color` |
| Inputs, Checkboxes | `form-control` | `--now-form-control-input--primary--border-color` |
| Containers, Cards | `container` | `--now-container-card--background-color-alpha` |
| Windows, Modals | `window` | `--now-window--border-color` |
| Menus, Lists | `menu` | `--now-menu-list--primary--background-color` |
| Navigation | `navigation` | `--now-navigation-page_tabs--primary--background-color` |
| Alerts, Banners | `messaging` | `--now-messaging--primary_warning--border-color` |
| Status Indicators | `indicator` | `--now-indicator--primary_critical--background-color` |
| Typography | `display-type` | `--now-display-type_label--font-weight` |

### Token Integrity Rules

1. Each visual property MUST use a valid design token
2. Tokens MUST belong to correct semantic category
3. Fallbacks MUST follow chained `var()` structure
4. Colors MUST be wrapped with `rgb()` or `rgba()`
5. No hard-coded color values -- use tokens

```css
/* Correct fallback chain */
var(--now-actionable--primary--background-color, var(--now-color--primary-1, 0,128,163))

/* Correct color wrapping */
background-color: rgb(var(--now-color_background--primary, 255, 255, 255));
```

### Alias Layer

Provide stable, reusable names mapping to instance tokens:

```css
:root {
  /* Surfaces & borders */
  --snx-color-surface: rgb(var(--now-container--color, 255, 255, 255));
  --snx-color-surface-alt: rgb(var(--now-heading--header-primary--color, 245, 247, 249));
  --snx-color-border: rgb(var(--now-container--border-color, 207, 213, 215));

  /* Text */
  --snx-color-text: rgb(var(--now-color_text--primary, 16, 23, 26));
  --snx-color-text-muted: rgb(var(--now-color_text--secondary, 75, 85, 89));

  /* Actions & focus */
  --snx-color-primary: rgb(var(--now-actionable--primary--background-color, 0, 128, 163));
  --snx-color-on-primary: rgb(var(--now-actionable_label--primary--color, 255, 255, 255));
  --snx-color-focus: rgb(var(--now-color_focus-ring, 53, 147, 37));

  /* Spacing */
  --snx-space-inner: var(--now-static-space--md, 0.75rem);
  --snx-space-outer: var(--now-static-space--lg, 1rem);

  /* Border radius - component-specific */
  --snx-radius-button: var(--now-actionable--border-radius, 6px);
  --snx-radius-input: var(--now-form-control-input--primary--border-radius, 2px);
  --snx-radius-container: var(--now-container--border-radius, 8px);

  /* Typography */
  --snx-font-body: var(--now-font-family, system-ui, sans-serif);
  --snx-line-height: var(--now-static-line-height, 1.25);
}
```

Rules for aliases: NEVER create generic aliases that ignore component requirements. ALWAYS use component-specific aliases. Aliases MUST remain stable between generations.

### Dark Mode

Each token has light and dark mode values. The theme system handles switching automatically:

```css
/* Token automatically switches between light/dark */
background-color: rgb(var(--now-container--color, 255, 255, 255));
color: rgb(var(--now-color_text--primary, 16, 23, 26));
```

### Browser Default Resets

When using base HTML elements, ALWAYS reset browser defaults that conflict with design tokens:

```css
.form {
  display: grid;
  margin: 0;
  padding: 0;
  border: none;
  grid-template-columns: 1fr 1fr;
  gap: var(--now-static-space--lg, 1rem);
}
```

## Theming: Layout Patterns

### Cards

Cards present grouped content in elevated surfaces. They MUST contain header, body, and optional footer slots.

```css
.card {
  background-color: rgb(var(--now-color_background--secondary, 245, 246, 247));
  border: 1px solid rgb(var(--now-container-card--border-color, 207, 213, 215));
  border-radius: var(--now-container-card--border-radius, 8px);
  box-shadow: var(--now-static-drop-shadow--sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card__header {
  padding: var(--now-static-space--lg, 1rem);
  border-bottom: 1px solid rgb(var(--now-container-card--border-color, 207, 213, 215));
  font-weight: 600;
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
  background-color: rgb(var(--now-container--color, 255, 255, 255));
}

.card__body {
  padding: var(--now-static-space--lg, 1rem);
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
  flex: 1;
}

.card__footer {
  padding: var(--now-static-space--lg, 1rem);
  border-top: 1px solid rgb(var(--now-container-card--border-color, 207, 213, 215));
  display: flex;
  justify-content: flex-end;
  gap: var(--now-static-space--sm, 0.5rem);
}
```

### Modals and Dialogs

Modals use `window` category tokens. They MUST include header, body, and optional footer regions. Focus MUST trap within modal.

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(
    var(--now-window_overlay--background-color, 0, 0, 0),
    var(--now-window_overlay--background-color-alpha, 0.5)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: rgb(var(--now-window--background-color, 255, 255, 255));
  border: 1px solid rgb(var(--now-window--border-color, 207, 213, 215));
  border-radius: var(--now-window--border-radius, 8px);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--now-static-drop-shadow--lg);
}

.modal__header {
  padding: var(--now-static-space--lg, 1rem);
  border-bottom: 1px solid rgb(var(--now-window--border-color, 207, 213, 215));
  font-weight: var(--now-window_header--font-weight, 600);
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal__body {
  padding: var(--now-static-space--lg, 1rem);
  overflow-y: auto;
  flex: 1;
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
}

.modal__footer {
  padding: var(--now-static-space--lg, 1rem);
  border-top: 1px solid rgb(var(--now-window--border-color, 207, 213, 215));
  display: flex;
  justify-content: flex-end;
  gap: var(--now-static-space--sm, 0.5rem);
}
```

### Forms Layout

```css
.form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--now-static-space--lg, 1rem);
}

@media (max-width: 768px) {
  .form {
    grid-template-columns: 1fr;
  }
}

.form__label {
  font-weight: var(--now-form-control_label--primary--font-weight, 600);
  color: rgb(var(--now-form-control_label--primary--color, 16, 23, 26));
  margin-bottom: var(--now-static-space--sm, 0.5rem);
  font-size: 0.875rem;
}

.form__input {
  height: calc(1rem + var(--now-form-field--scale-size-block, 1) * 2rem / 2);
  padding: 0 var(--now-static-space--md, 0.75rem);
  border: 1px solid rgb(var(--now-form-control-input--primary--border-color, 207, 213, 215));
  border-radius: var(--now-form-control-input--primary--border-radius, 2px);
  background-color: rgb(var(--now-input--background-color, 255, 255, 255));
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
}
```

### Lists

```css
.list {
  border: 1px solid rgb(var(--now-container--border-color, 207, 213, 215));
  border-radius: var(--now-container--border-radius, 8px);
  overflow: hidden;
}

.list__header {
  background-color: rgb(var(--now-menu-list--primary--background-color, 245, 247, 249));
  font-weight: 600;
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
  border-bottom: 1px solid rgb(var(--now-container--border-color, 207, 213, 215));
}

.list__row {
  border-bottom: 1px solid rgb(var(--now-container--border-color, 207, 213, 215));
  background-color: rgb(var(--now-container--color, 255, 255, 255));
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
}

.list__row:hover {
  background-color: rgb(var(--now-menu-list--primary--background-color--hover, 235, 237, 239));
}
```

### Tables

Tables MUST use semantic HTML (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>`).

```css
.table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid rgb(var(--now-container--border-color, 207, 213, 215));
}

.table th, .table td {
  padding: var(--now-static-space--md, 0.75rem) var(--now-static-space--lg, 1rem);
  border-bottom: 1px solid rgb(var(--now-container--border-color, 207, 213, 215));
  text-align: left;
}

.table thead {
  background-color: rgb(var(--now-color_background--tertiary, 226, 229, 231));
  font-weight: 600;
}

.table tbody tr {
  background-color: rgb(var(--now-color_background--primary, 255, 255, 255));
}

.table tbody tr:hover {
  background-color: rgba(var(--now-color--primary-1, 245, 246, 247), var(--now-opacity--least, 0.1));
}
```

## Theming: Controls

### Buttons

Buttons use the `actionable` token category. All controls MUST support states: `base`, `hover`, `active`, `focus-visible`, `disabled`.

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--now-static-space--sm, 0.5rem);
  min-block-size: calc(1rem + var(--now-button--scale-size-block, 1) * 2rem / 2);
  padding-inline: calc(1rem * var(--now-button--scale-size-inline, 1));
  border: 1px solid transparent;
  border-radius: var(--now-actionable--border-radius, 6px);
  font-family: var(--now-font-family, system-ui, sans-serif);
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 100ms linear;
}

.btn--primary {
  background-color: rgb(var(--now-actionable--primary--background-color, 0, 128, 163));
  color: rgb(var(--now-actionable_label--primary--color, 255, 255, 255));
  border-color: rgb(var(--now-actionable--primary--border-color, 0, 128, 163));
}

.btn--primary:hover {
  background-color: rgb(var(--now-actionable--primary--background-color--hover, 0, 138, 173));
}

.btn--primary:focus-visible {
  box-shadow: inset 0 0 0 2px rgb(var(--now-color_focus-ring_shadow, 53, 147, 37));
}

.btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**Secondary/Tertiary Button Alpha Channel (CRITICAL):** Secondary/tertiary buttons use RGBA with alpha for transparency, NOT solid RGB:

```css
.btn--secondary {
  background-color: rgba(
    var(--now-actionable--secondary--background-color, 0, 113, 143),
    var(--now-actionable--background-color-alpha, 0)
  );
}

.btn--secondary:hover {
  background-color: rgba(
    var(--now-actionable--secondary--background-color--hover, 0, 76, 97),
    var(--now-actionable--background-color-alpha--hover, 0.08)
  );
}
```

### Input Fields

```css
input[type="text"], input[type="email"], input[type="number"], textarea {
  height: calc(1rem + var(--now-form-field--scale-size-block, 1) * 2rem / 2);
  padding: 0 var(--now-static-space--md, 0.75rem);
  border: 1px solid rgb(var(--now-form-control-input--primary--border-color, 115, 127, 132));
  border-radius: var(--now-form-control-input--primary--border-radius, 2px);
  background-color: rgb(var(--now-input--background-color, 255, 255, 255));
  color: rgb(var(--now-color_text--primary, 16, 23, 26));
}

input:focus-visible {
  outline: none;
  border-color: rgb(var(--now-form-control-input--primary--border-color--focus, 53, 147, 37));
  box-shadow: inset 0 0 0 1px rgb(var(--now-form-control_focus-ring--primary--color, 53, 147, 37));
}
```

Focus states MUST use inset box-shadow or outline (no border width changes that cause layout reflow).

### Checkboxes and Radio Buttons

Checkboxes use `form-control-input-selection--primary` tokens. Radio buttons use `form-control-input-selection--secondary` tokens.

### Toggles

Track and handle derive from distinct subcategories (`form-control_track`, `form-control_handle`).

### Pills and Chips

Background and border derive from pill tokens. Remove icons MUST inherit text color via `currentColor`.

## Theming: Components

### Severity Variant Reference

All messaging, alert, and indicator components use these semantic variants:

| Display Name | Token Variant | Use For |
| --- | --- | --- |
| Success | `positive` | Successful operations, valid states |
| Error | `critical` | Errors, failures, urgent issues |
| Warning | `warning` | Warnings, cautions |
| Info | `info` | Informational messages |

ALWAYS use `positive`, `critical`, `warning`, `info` -- NEVER "success", "error", or "informational".

### Alerts and Banners

Alert components use `alert` tokens for backgrounds and borders. Text color fallback chain: `--now-alert--color` -> `--now-messaging_label--primary--color` -> `--now-color_text--primary`.

```css
.alert--warning {
  background-color: rgb(var(--now-alert--warning--background-color, 239, 224, 176));
  border: 1px solid rgb(var(--now-alert--warning--border-color, 221, 182, 101));
  color: rgb(var(
    --now-alert--color,
    var(--now-messaging_label--primary--color, var(--now-color_text--primary, 16, 23, 26))
  ));
}
```

**Toast Notifications** MUST use `--now-container-card--background-color` (NOT `--now-container--color`) for proper dark mode inversion.

### Tabs

Tabs use `--now-tabs--*` design tokens. Active tabs show bottom border only (not full border). Tabs MUST NOT have gaps between them. Tabs MUST NEVER have vertical scrolling.

| State | Border | Font Weight |
| --- | --- | --- |
| Base | transparent bottom | normal |
| Hover | focus-ring bottom | normal |
| Active | focus-ring bottom | 600 |

```css
.tabs {
  display: flex;
  border-bottom: 1px solid rgb(var(--now-container--border-color, 207, 213, 215));
  overflow-x: auto;
  overflow-y: hidden;
}

.tab {
  padding: 0.75rem 1rem;
  color: rgb(var(--now-tabs--color, 16, 23, 26));
  cursor: pointer;
  border: none;
  border-bottom: 0.125rem solid transparent;
  background-color: rgba(var(--now-tabs--background-color, 255, 255, 255), var(--now-tabs--background-color-alpha, 0));
  border-radius: 0;
  margin-bottom: -1px;
}

.tab--active {
  border-bottom-color: rgb(var(--now-color_focus-ring, var(--now-color--secondary-1, 0, 128, 163)));
  font-weight: 600;
}
```

### Side Navigation

Use `content-tree` tokens (NOT `navigation-sidebar`) for proper contrast and dark mode support.

```css
.sidenav {
  background-color: rgb(var(--now-content-tree--background-color, 255, 255, 255));
  width: 240px;
  border: 1px solid rgb(var(--now-container-card--border-color, 207, 213, 215));
  border-radius: 6px;
}

.sidenav__item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: rgb(var(--now-content-tree--color, 16, 23, 26));
  border-left: 4px solid transparent;
}

.sidenav__item--active {
  background-color: rgb(var(--now-content-tree--background-color--selected, 224, 234, 222));
  border-left-color: rgb(var(--now-color--primary-1, 0, 128, 163));
  font-weight: 600;
}
```

### Badges and Indicators

Badge text MUST use `--now-indicator_label--{variant}--color` (note `_label` subcategory), NOT base indicator color.

```css
.badge--positive {
  background-color: rgb(var(--now-indicator--primary_positive--background-color, 62, 134, 0));
  color: rgb(var(--now-indicator_label--primary_positive--color, 255, 255, 255));
  border: 1px solid rgb(var(--now-indicator--primary_positive--border-color, 48, 103, 0));
}

.badge--critical {
  background-color: rgb(var(--now-indicator--primary_critical--background-color, 229, 34, 57));
  color: rgb(var(--now-indicator_label--primary_critical--color, 255, 255, 255));
}
```

### Progress Indicators

```css
.progress {
  width: 100%;
  height: 0.5rem;
  background-color: rgb(var(--now-progress-bar--background-color, 240, 242, 243));
  border-radius: var(--now-static-border-radius--lg, 0.5rem);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background-color: rgb(var(--now-progress-bar_path--initial--background-color, 0, 128, 163));
  transition: width 200ms ease;
}

.spinner {
  border: 2px solid rgba(var(--now-loading_indicator--primary--color, 0, 128, 163), 0.2);
  border-top-color: rgb(var(--now-loading_indicator--primary--color, 0, 128, 163));
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
```

### Stepper (Progress Indicator)

Step indicators use circular shapes with consistent sizing (2rem diameter). Completed steps use checkmark SVG icon (never unicode). Icons MUST use `fill: currentColor`.

| State | Tokens |
| --- | --- |
| Completed | `stepper_step--done` (green background, green border) |
| Active | `stepper_step--partial` (white background, green border) |
| Incomplete | `stepper_step--none` (white background, gray border) |

### Pagination

Pagination buttons use bare/borderless style. Navigation arrows MUST use SVG icons, never unicode characters. Active page MUST have distinct background and bold font weight.

### Expandable/Collapsible UI

Icons MUST use SVG, never unicode characters. Icon size MUST be `1rem`. Rotation animation uses CSS transforms. Icons use `fill: currentColor` to inherit text color.

### Extrapolation Guidelines

When components are not explicitly defined in the Horizon system, extrapolate using established philosophies, token categories, spacing rhythm, and state logic. Select tokens from the closest semantic category. Extrapolated interactive elements MUST implement the standard state set: `base`, `hover`, `active`, `focus-visible`, `disabled`.

| New Element | Recommended Analogue | Token Category |
| --- | --- | --- |
| Split button | Button + Menu | `actionable` for trigger; `menu` for list |
| Command palette | Menu/Dialog hybrid | `menu` for list; `window` for container |
| Inline tag editor | Pill/Chip | `form-control-pill` |
| Empty state panel | Card + Messaging | `container` for surface; `messaging` for accent |

