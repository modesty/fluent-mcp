# **Context:** Field Style spec (SDK v4.11.0+): Applies CSS to a **single field** in list and form views, conditionally on that field's value or a scripted condition. Authored with the generic `Record()` API against the newly-supported `sys_ui_style` table (there is no `FieldStyle()` constructor) — import `Record` from `@servicenow/sdk/core`. One record styles one `name` + `element` pair at one `value`, so a multi-state colour scheme is several records. Not limited to background colour: any standard CSS property is valid, which also makes this the mechanism for list **column width** and **text alignment**.

```typescript
// One field style per (table, field, trigger value). Repeat the Record() call per state.
Record({
  $id: Now.ID['field_style_1'], // Now.ID | string | number, mandatory - identity
  table: 'sys_ui_style', // mandatory, LITERAL - this is what makes the record a Field Style
  data: {
    name: 'incident', // TableName (maxLength 80), mandatory - the table this style applies to.
      // Typed as keyof Now.Internal.Tables, so it is checked against known tables
    element: 'priority', // string (maxLength 80), mandatory - the FIELD on `name` to style.
      // Declared `dependent: 'name'` in the schema — it is a field_name column scoped to `name`
    value: '1', // string (maxLength 250), optional - the TRIGGER. Three distinct behaviours; see the
      // matrix below. A static value, a `javascript:` expression, or empty
    style: 'background-color:tomato;', // string (maxLength 1000), optional - standard CSS.
      // NOT limited to background-color: font-weight, font-style, color, font-size, text-decoration,
      // text-align, width, border are all valid
    themed_style: 'background-color: RGB(var(--now-color_alert--critical-0, 226,63,74))',
      // string (maxLength 1000), optional - Polaris-themed override using --now-color_* design tokens.
      // Use alongside `style` so non-Polaris instances still render
    alt: 'Critical priority', // translated_text (maxLength 100), optional - alternative text describing
      // the style for screen readers. Matters most when the style sets a background-image icon
  },
})

// ── `value` BEHAVIOUR MATRIX — the single most misunderstood part of sys_ui_style ──
//   value content                | List view                         | Form view
//   ----------------------------|-----------------------------------|---------------------------
//   static (e.g. '1')            | applied when the field matches    | NOT applied (unless read-only)
//   'javascript:<expr>'          | applied when the expr is true     | NOT applied
//   empty / omitted              | applied ONLY when the field value | applied UNCONDITIONALLY
//                                | is itself null/empty              |
//
// So an EMPTY `value` is NOT "always apply" in a list — it is "apply where the cell is blank".
// For a layout style that must apply to every row, use the always-true idiom:
//   value: 'javascript:1==1;'
// Note `value: ''` serializes to <value/> and imports back as null.
// The `value` field supports only ONE `javascript:` entry — combine conditions into a single
// expression instead: 'javascript:current.state == "Completed" && current.error_tables > 0'
// When the field is READ-ONLY, the `value` condition governs BOTH list and form views.

// ── Unconditional list column width ──
Record({
  $id: Now.ID['field_style_width'],
  table: 'sys_ui_style',
  data: {
    name: 'sys_dictionary',
    element: 'dynamic_ref_qual',
    value: 'javascript:1==1;', // always-true, so the width applies to every row
    style: 'width:240px;',
  },
})

// ── Scripted condition driving an icon, with accessible alt text ──
Record({
  $id: Now.ID['field_style_vip'],
  table: 'sys_ui_style',
  data: {
    name: 'incident',
    element: 'caller_id',
    value: 'javascript:current.caller_id.vip == true', // dot-walking is allowed in the expression
    style: 'background-image: url(images/icons/vip.gif); background-position: right; background-repeat: no-repeat;',
    alt: 'VIP caller',
  },
})

// ── PLATFORM LIMITS (not enforced by the build — none of these produce a Fluent error) ──
// • Polaris / Next Experience: a `background-color` renders as a coloured DOT INDICATOR beside the
//   value in list views rather than filling the cell. font-weight, text-align and width are unaffected.
// • CHOICE-type fields on FORMS (e.g. State) are never background-coloured by sys_ui_style; styles on
//   them render in list views only.
// • SCOPE: a field style may only target a table or database view in the SAME scope as the style, or a
//   table with at least one field in that scope. A style on a table does NOT apply to a database view
//   that includes it — author a separate style for the view.
// • The two reserved `task` fields `work_notes` and `comments` are NOT styled by sys_ui_style at all.
//   Only their activity-stream BACKGROUND COLOUR can change, and only via GLOBAL-scope properties:
//     glide.ui.activity_stream.style.work_notes
//     glide.ui.activity_stream.style.comments
//   Set those with Property() / Record({ table: 'sys_properties' }) in global scope. A CUSTOM journal
//   field (e.g. internal_notes) is unaffected by this restriction — style it normally.
```
