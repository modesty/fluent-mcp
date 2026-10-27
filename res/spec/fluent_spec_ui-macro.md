# **Context:** UiMacro API spec (SDK v4.14.0+): Defines a **UI Macro** (`sys_ui_macro`) — a reusable Jelly component invoked by tag (`<g:name />`) from UI Pages, form formatters, and Service Catalog custom variables / custom carts. One `UiMacro()` call writes one `sys_ui_macro` record (plus a `sys_es_latest_script` row when `$meta.useEsLatest` is set). Import `UiMacro` from `@servicenow/sdk/core`. `$id` is the identity (mandatory), so renaming updates the record in place. `$meta`, `protectionPolicy` and `$override` are accepted. Prefer `UiMacro()` over `Record({ table: 'sys_ui_macro' })`: the generic form still builds but writes only `name` and `xml` — no `scoped_name`, `sys_name` or defaults — and entity-escapes the Jelly instead of wrapping it in CDATA.

```typescript
import { UiMacro } from '@servicenow/sdk/core'

// NOTE on codes: Fluent build diagnostics (TS11, TS213, ... below) report the TypeScript SYNTAX KIND of the flagged node
// (sdk-build-core fluent-diagnostic: code = node.getKind()), not a stable error code - the number changes with the node
// and the TypeScript version, so match on the message text. TS2304/TS2345 are genuine TypeScript diagnostics.

UiMacro({
  $id: Now.ID['alert-banner'], // Now.ID | string | number, MANDATORY - the record identity (sys_id). Missing -> TS2345 and
    // "Failed to determine ID for "sys_ui_macro" record". There is no name/mediaType coalesce: renaming `name` updates this
    // same record in place, but every <g:...> invocation of the old name must be updated by hand
  name: 'alert_banner', // string, MANDATORY - LOCAL name, WITHOUT the scope prefix. Written to `name` and `sys_name`;
    // the build derives `scoped_name` (`<scope>_<name>` in a scoped app, empty in global) - never set sys_name/scoped_name.
    // Invoke it as <g:alert_banner /> in global, or with the scope-qualified tag <g:x_myapp_alert_banner /> in scope x_myapp.
    // Build checks: a name that already carries the scope prefix -> warning (TS11, written once, not double-prefixed);
    // `<scope>_<name>` longer than 100 characters -> ERROR (TS11). In GLOBAL scope the length is NOT checked at all.
    // Two macros in the project with the same name AND mediaType -> ERROR (TS213, reported on both). The platform rejects
    // an active macro whose name + mediaType match another active macro ANYWHERE on the instance, in any scope - that only
    // surfaces at install time, so choose a distinctive name
  description: 'Displays a styled alert banner. Parameters: type (info|success|warning|danger), message.', // string,
    // optional (default '') - shown on the record form, never rendered. Macros have NO typed parameter list, so document the
    // jvar_* variables the macro reads here: it is the only parameter documentation other developers see
  xml: Now.include('./alert-banner.jelly.xml'), // string, optional (default empty) - the Jelly XML, written in CDATA.
    // PREFER Now.include() of a separate .jelly.xml file: inside a TypeScript template literal every Jelly ${...} must be
    // escaped as \${...} (an unescaped `${jvar_x}` is a TypeScript interpolation -> TS2304 "Cannot find name 'jvar_x'").
    // Malformed XML (mismatched/unclosed tags, a bare `<` or `&` in element text or inside a <script> body - comments
    // included) is only a WARNING (TS11 inline, TS213 for an included file) and the content is written as-is.
    // ATTRIBUTE values are not checked by the build but must still be XML-escaped: write test="${a &amp;&amp; b}", never
    // test="${a && b}", or the platform's parser rejects it at render time (ui-macro-guide). INSIDE a <script> body the
    // opposite holds: entity-escaping (&amp;&amp;, &lt;) passes the build but decodes between the two Jelly passes and fails
    // at render time, so restructure the code instead - see the jelly-guide topic
  active: true, // boolean, optional (default true) - false disables the macro without deleting it
  category: 'general', // 'general' | 'catalog' | 'layout' | 'cms' | '' | string, optional (default 'general') - groups
    // macros in the UI Macro list (use 'catalog' for catalog variable / cart macros). A platform choice field: any other
    // string is written verbatim with no diagnostic; '' clears a previously set category
  // mediaType: 'doctype', // string, optional (default '') - a device type/variant LOOKUP KEY, NOT an HTTP MIME type. OMIT it
    // for standard macros and formatters. A MIME-style value ('text/html', anything with '/') is a build WARNING (TS11) and
    // is still written - the platform never matches it, so the macro silently fails to resolve at render time
  protectionPolicy: 'read', // 'read' | 'protected', optional (default '') - written to sys_policy. Omit to let other
    // developers customize the macro
  // $override: { ... },          // optional - extra sys_ui_macro columns (accepted by the type; only the guide mentions it)
  // $meta: { installMethod: 'demo' }, // optional - output folder: 'first install' -> unload, 'demo' -> unload.demo,
                                       // 'once' -> apply_once
  // $meta: { useEsLatest: true },     // optional - emits a sys_es_latest_script row for this macro (runtime effect on
                                       // Jelly <g:evaluate> blocks is not verified)
})

// Inline Jelly variant - every Jelly ${...} escaped as \${...}; phase-two $[...] needs no escape.
// Phase one (j:/g: tags, ${...}) is compiled and CACHED; phase two (j2:/g2: tags, $[...]) runs on every request,
// so per-request data (record counts, the current user) belongs in g2:evaluate + $[...].
UiMacro({
  $id: Now.ID['record-count-card'],
  name: 'record_count_card',
  description: 'Shows a live record count. Parameters: title, table (a table name only, never user input).',
  xml: `<?xml version="1.0" encoding="utf-8" ?>
<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
    <g2:evaluate var="jvar_count" jelly="true">
        var ga = new GlideAggregate(jelly.jvar_table + '');
        ga.addAggregate('COUNT');
        ga.query();
        var count = 0;
        if (ga.next()) {
            count = parseInt(ga.getAggregate('COUNT'), 10) || 0;
        }
        count;
    </g2:evaluate>
    <div class="record-count-card">
        <div class="record-count-value">$[jvar_count]</div>
        <div class="record-count-title">\${jvar_title}</div>
    </div>
</j:jelly>`,
})

// ── Referencing a macro from other APIs ──
// UiMacro() returns its config; it carries NO TableBrand<'sys_ui_macro'>, so APIs accept it only where the type adds
// `| UiMacro` explicitly:
//   CatalogItem({ ..., customCart: myMacro })                      // string | Record<'sys_ui_macro'> | UiMacro
//   CustomVariable({ ..., macro: myMacro, summaryMacro: myMacro }) // same union on CustomVariable / CustomWithLabelVariable
// Elsewhere use Now.ref('sys_ui_macro', '<$id key>') - it resolves only within the current build.
// Form formatter (sys_ui_formatter via Record()): in a scoped app the record's `formatter` value must be the SCOPED file
// name 'x_myapp_<name>.xml' - it is not prefixed for you, and an unprefixed value silently renders nothing with no build
// error. The Form element's `formatterName` is optional: omit it and the Form derives it from that record's `formatter`
// (if set, it overrides the record's value with no diagnostic, so it must be identical). A formatter macro must emit <tr><td colspan="2">...</td></tr>, not a top-level <div>.
```
