# Reusable Jelly UI Macros (alert banner + live record count) in ServiceNow Fluent

```typescript
import { UiMacro } from '@servicenow/sdk/core'

// Reusable alert banner. Invoke as <g:alert_banner type="info" message="..." /> in global scope,
// or <g:x_myapp_alert_banner ... /> in scope x_myapp (the build derives scoped_name).
// In a real project keep the Jelly in its own file: xml: Now.include('./alert-banner.jelly.xml').
// Inline here so the example compiles standalone - every Jelly ${...} is escaped as \${...}.
UiMacro({
    $id: Now.ID['alert-banner'],
    name: 'alert_banner',
    description: 'Displays a styled alert banner. Parameters: type (info|success|warning|danger), message.',
    xml: `<?xml version="1.0" encoding="utf-8" ?>
<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
    <j:if test="\${!gs.nil(jvar_message)}">
        <div class="alert alert-\${jvar_type}" role="alert">
            <j:choose>
                <j:when test="\${jvar_type == 'danger'}"><strong>Error: </strong></j:when>
                <j:when test="\${jvar_type == 'warning'}"><strong>Warning: </strong></j:when>
                <j:otherwise><strong>Info: </strong></j:otherwise>
            </j:choose>
            \${jvar_message}
        </div>
    </j:if>
</j:jelly>`,
})

// Record count card: phase-two g2:evaluate runs on every request, and $[...] emits the phase-two value.
UiMacro({
    $id: Now.ID['record-count-card'],
    name: 'record_count_card',
    description: 'Shows a live record count. Parameters: title, table (a table name only, never user input).',
    category: 'general',
    protectionPolicy: 'read',
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
```
