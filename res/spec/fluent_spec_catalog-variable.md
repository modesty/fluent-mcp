# **Context:** Catalog Variable API spec: The 30+ variable type functions used inside `VariableSet.variables` and `CatalogItem.variables` objects. Each function creates a specific type of input field on a catalog request form. All variable types share a common base configuration plus type-specific properties.

```typescript
// All variable functions are imported from @servicenow/sdk/core
import {
    SingleLineTextVariable, MultiLineTextVariable, WideSingleLineTextVariable,
    SelectBoxVariable, MultipleChoiceVariable, CheckboxVariable, YesNoVariable,
    ReferenceVariable, LookupSelectBoxVariable, LookupMultipleChoiceVariable,
    RequestedForVariable, DateVariable, DateTimeVariable, DurationVariable,
    EmailVariable, UrlVariable, IpAddressVariable, MaskedVariable,
    LabelVariable, RichTextLabelVariable, HtmlVariable, BreakVariable,
    ListCollectorVariable, NumericScaleVariable,
    UIPageVariable, CustomVariable, CustomWithLabelVariable,
    ContainerStartVariable, ContainerEndVariable, ContainerSplitVariable,
    AttachmentVariable,
} from '@servicenow/sdk/core'

// ─── SHARED BASE PROPERTIES (all variable types inherit these) ───
// These are defined in VariableConfig / BaseVariableConfig:
{
    question: '',           // string, mandatory — label/question shown to the user
    order: 100,             // number, optional — display order within the form
    active: true,           // boolean, optional — whether the variable is active
    mandatory: false,       // boolean, optional — field must have a value; cannot be true with hidden or readOnly
    readOnly: false,        // boolean, optional — field is display-only; cannot be true with mandatory
    hidden: false,          // boolean, optional — field is not shown; cannot be true with mandatory
    defaultValue: '',       // string | typed default, optional — default value
    helpText: '',           // string, optional — help text shown below the field
    helpTag: '',            // string, optional — help tag identifier
    showHelp: false,        // boolean, optional — show help icon
    instructions: '',       // string, optional — instructions above the field
    tooltip: '',            // string, optional — tooltip on hover
    exampleText: '',        // string, optional — example value text
    conversationalLabel: '', // string, optional — label used in Virtual Agent conversations
    disableInitialSlotFill: false, // boolean, optional — disable VA slot filling on load
    width: 100,             // 25 | 50 | 75 | 100, optional — field width percentage
    attributes: '',         // string, optional — additional field attributes string
    readRoles: [],          // (string | Role)[], optional — roles that can read this variable
    writeRoles: [],         // (string | Role)[], optional — roles that can modify this variable
    createRoles: [],        // (string | Role)[], optional — roles that can create instances
    visibleBundle: true,    // boolean, optional — visible in bundles
    visibleGuide: true,     // boolean, optional — visible in guided tours
    visibleStandalone: true, // boolean, optional — visible standalone
    visibleSummary: true,   // boolean, optional — visible in order summary
    visibility: 'Always',   // 'Always' | 'Bundle' | 'Standalone', optional
    pricingDetails: [],     // { amount: number, currencyType: string, field: string }[], optional
    pricingImplications: false, // boolean, optional
    deliveryPlan: '',       // string, optional
    alwaysExpand: false,    // boolean, optional
    removeFromConversationalInterfaces: false, // boolean, optional
    mapToField: false,      // boolean, optional — map variable value to a record field
    field: '',              // string, optional — record field to map to (requires mapToField: true)
    useDynamicDefault: false, // boolean, optional — use dynamic default value
    dotWalkPath: '',        // string, optional — dot-walk path for dynamic default
    dependentQuestion: '',  // string, optional — variable this depends on for dynamic default
    unique: false,          // boolean, optional — enforce unique values
    postInsertScript: '',   // string, optional — script run after record insert
    readScript: '',         // string, optional — script run when reading the value
    description: '',        // string, optional
    global: false,          // boolean, optional
    category: '',           // string, optional
    layout: 'normal',       // 'normal' | '2across' | '2down', optional — container layout
}

// ─── TEXT VARIABLES ───

// Single line text input
SingleLineTextVariable({
    question: '',           // mandatory
    validateRegex: '',      // string | Record<'question_regex'>, optional — regex validation pattern or reference
    // + all base properties
})

// Multi-line text area
MultiLineTextVariable({
    question: '',           // mandatory
    // + all base properties
})

// Wide single line text (full-width input)
WideSingleLineTextVariable({
    question: '',           // mandatory
    // + all base properties
})

// Email address input (with format validation)
EmailVariable({
    question: '',           // mandatory
    // + all base properties
})

// URL input (with format validation)
UrlVariable({
    question: '',           // mandatory
    // + all base properties
})

// IP address input (v4 or v6)
IpAddressVariable({
    question: '',           // mandatory
    // + all base properties
})

// Masked/password field (input is obfuscated)
MaskedVariable({
    question: '',           // mandatory
    // + all base properties
})

// ─── SELECTION VARIABLES ───

// Dropdown select box (single selection)
SelectBoxVariable({
    question: '',           // mandatory
    // + all base properties
    // Choices are configured in the catalog builder UI or via choice definitions
})

// Radio button multiple choice (single selection displayed as radio buttons)
MultipleChoiceVariable({
    question: '',           // mandatory
    // + all base properties
})

// Checkbox (true/false toggle)
CheckboxVariable({
    question: '',           // mandatory
    defaultValue: false,    // boolean, optional
    // + all base properties
})

// Yes / No dropdown (equivalent to true/false but displayed as Yes/No options)
YesNoVariable({
    question: '',           // mandatory
    // + all base properties
})

// ─── REFERENCE VARIABLES ───

// Reference to a record in another table
ReferenceVariable({
    question: '',           // mandatory
    referenceTable: 'incident', // string (TableName), mandatory — table being referenced
    useReferenceQualifier: 'simple', // 'simple' | 'dynamic' | 'advanced', optional
    referenceQualCondition: '', // string, optional — encoded query for 'simple' qualifier
    dynamicRefQual: '',     // string | Record<'sys_filter_option_dynamic'>, optional — for 'dynamic'
    referenceQual: '',      // string, optional — advanced qualifier script, for 'advanced'
    // + all base properties
})

// Lookup select box (reference field presented as a dropdown populated from another table)
LookupSelectBoxVariable({
    question: '',           // mandatory
    // + all base properties
})

// Lookup multiple choice (reference field as multi-select checkboxes)
LookupMultipleChoiceVariable({
    question: '',           // mandatory
    // + all base properties
})

// Requested For — user reference pre-populated with the requesting user
RequestedForVariable({
    question: '',           // mandatory (typically 'Requested For' or 'On behalf of')
    // + all base properties
})

// ─── DATE / TIME VARIABLES ───

DateVariable({
    question: '',           // mandatory
    defaultValue: '',       // string (date string), optional
    // + all base properties
})

DateTimeVariable({
    question: '',           // mandatory
    defaultValue: '',       // string (ISO datetime), optional
    // + all base properties
})

DurationVariable({
    question: '',           // mandatory
    // + all base properties
})

// ─── DISPLAY / LAYOUT VARIABLES ───

// Non-input label (static text displayed on the form)
LabelVariable({
    question: '',           // mandatory — the label text to display
    // + base properties (mandatory/readOnly/hidden not applicable)
})

// Rich text label (HTML-formatted static content)
RichTextLabelVariable({
    question: '',           // mandatory — rich text / HTML content
    // + base properties
})

// HTML content block (embedded HTML in the form)
HtmlVariable({
    question: '',           // mandatory — HTML string
    // + base properties
})

// Horizontal line break / separator
BreakVariable({
    question: '',           // mandatory
    // + base properties
})

// Container start (begin a collapsible section)
ContainerStartVariable({
    question: '',           // mandatory — container title
    layout: 'normal',       // 'normal' | '2across' | '2down', optional
    // + base properties
})

// Container split (divider inside a container)
ContainerSplitVariable({
    question: '',           // mandatory
    // + base properties
})

// Container end (close a container section)
ContainerEndVariable({
    question: '',           // mandatory
    // + base properties
})

// ─── SPECIAL VARIABLES ───

// List collector (multi-select from a reference table)
ListCollectorVariable({
    question: '',           // mandatory
    // + all base properties
})

// Numeric scale / rating (e.g., 1-5 satisfaction score)
NumericScaleVariable({
    question: '',           // mandatory
    // + all base properties
})

// Attachment upload field
AttachmentVariable({
    question: '',           // mandatory
    // + all base properties
})

// Embedded UI Page
UIPageVariable({
    question: '',           // mandatory — UI Page name or sys_id
    // + all base properties
})

// Custom variable (advanced — define your own type)
CustomVariable({
    question: '',           // mandatory
    // + all base properties
})

// Custom variable with label
CustomWithLabelVariable({
    question: '',           // mandatory
    // + all base properties
})
```
