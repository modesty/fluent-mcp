# **Context:** Column API for table schema spec: Used to create a typed column object for a table schema. This group of API is working closely with the Table API to create table schema property.

```typescript
// Creates a new Column (`sys_dictionary`)
StringColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): StringColumn // returns a StringColumn object

BooleanColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string | boolean
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): BooleanColumn // returns an BooleanColumn object

ChoiceColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string | number
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): ChoiceColumn // returns a ChoiceColumn object

ReferenceColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 cascadeRule: 'none', // "none" | "cascade" | "delete_no_workflow" | "delete" | "restrict" | "clear"
 default: '', // undefined | string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
 referenceTable?: '', // undefined | string
}): ReferenceColumn // returns a ReferenceColumn object

DateTimeColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DateTimeColumn // returns a DateTimeColumn object

DateColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DateColumn // returns a DateColumn object

IntegerColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 max: 0, // number
 maxLength: 0, // number
 min: 0, // number
 readOnly: false // boolean
}): IntegerColumn // returns an IntegerColumn object

DecimalColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string | number
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DecimalColumn // returns a DecimalColumn object

ListColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // undefined | string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
 referenceTable?: '', // undefined | string
}): ListColumn // returns a ListColumn object

FieldNameColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): FieldNameColumn // returns a FieldNameColumn object

ScriptColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // undefined | string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
 signature: '', // undefined | string
}): ScriptColumn // returns a ScriptColumn object

UserRolesColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string | Role object see spec
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): UserRolesColumn // returns a UserRolesColumn object

TranslatedTextColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): TranslatedTextColumn // returns a TranslatedTextColumn object

ConditionsColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // undefined | string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): ConditionsColumn // returns a ConditionsColumn object

TranslatedFieldColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): TranslatedFieldColumn // returns a TranslatedFieldColumn object

BasicImageColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): BasicImageColumn // returns a BasicImageColumn object

IntegerDateColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string | number
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): IntegerDateColumn // returns a IntegerDateColumn object

VersionColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): VersionColumn // returns a VersionColumn object

BasicDateTimeColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): BasicDateTimeColumn // returns a BasicDateTimeColumn object

CalendarDateTime({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): CalendarDateTime // returns a CalendarDateTime object

DueDateColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DueDateColumn // returns a DueDateColumn object

ScheduleDateTimeColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): ScheduleDateTimeColumn // returns a ScheduleDateTimeColumn object

OtherDateColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): OtherDateColumn // returns a OtherDateColumn object

RadioColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): RadioColumn // returns a RadioColumn object

DomainIdColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DomainIdColumn // returns an DomainIdColumn object

DomainPathColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DomainPathColumn // returns a DomainPathColumn object

TableNameColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string | (string & {})
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): TableNameColumn // returns a TableNameColumn object

SystemClassNameColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples  
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): SystemClassNameColumn // returns a SystemClassNameColumn object

DocumentIdColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 dependent: {}, // object TableNameColumn see above spec
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DocumentIdColumn // returns a DocumentIdColumn object

Password2Column({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): Password2Column // returns a Password2Column object

GuidColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number, typically 32 or 36 for GUIDs
 readOnly: false // boolean
}): GuidColumn // returns a GuidColumn object

JsonColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string, use json() helper for objects e.g. json({ theme: 'dark' })
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): JsonColumn // returns a JsonColumn object

NameValuePairsColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string, use nameValuePairs() helper for objects e.g. nameValuePairs({ key: 'value' })
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): NameValuePairsColumn // returns a NameValuePairsColumn object for flat key-value pair storage

UrlColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string, should start with http:// or https://
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): UrlColumn // returns a UrlColumn object

EmailColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
 default: '', // string, should follow user@domain format
 dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
 dynamicValueDefinitions: {}, // object, see dynamic_value_definition examples
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): EmailColumn // returns an EmailColumn object

HtmlColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string, use html() helper for HTML content e.g. html('<h2>Title</h2><p>Content</p>')
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): HtmlColumn // returns an HtmlColumn object

FloatColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: 0, // number
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false, // boolean
 scale: 0, // number, optional - number of decimal places to display (e.g., 2 for 99.99)
}): FloatColumn // returns a FloatColumn object

MultiLineTextColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): MultiLineTextColumn // returns a MultiLineTextColumn object for multi-line text areas

DurationColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: {}, // Duration object { days?, hours?, minutes?, seconds? } or string in ServiceNow format e.g. '1970-01-02 06:30:15'
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): DurationColumn // returns a DurationColumn object, use Duration() helper for default values

TimeColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: {}, // TimeOfDay object { hours?, minutes?, seconds? } or string in ServiceNow format e.g. '1970-01-01 17:30:00'
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): TimeColumn // returns a TimeColumn object, use Time() helper for default values

FieldListColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: [], // FieldListValue array of field names with dot-walk support, use FieldList() helper
 dependent: '', // string, required - field name of a TableNameColumn that provides the table context
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): FieldListColumn // returns a FieldListColumn object

SlushBucketColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false, // boolean
 script: '', // string, optional - script method to populate options (e.g., 'getRoles()')
}): SlushBucketColumn // returns a SlushBucketColumn object for dual-list selection interface

TemplateValueColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string or TemplateValue object, use TemplateValue() helper for type-safe values
 dependent: '', // string, required - field name of a TableNameColumn that provides the table context
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): TemplateValueColumn // returns a TemplateValueColumn object

ApprovalRulesColumn({
 active: false, // boolean
 attributes: {}, // object, snake_case name value pairs, see attribute list
 audit: false, // boolean
 default: '', // string
 functionDefinition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
 label: '', // string or array of Documentation object
 mandatory: false, // boolean
 maxLength: 0, // number
 readOnly: false // boolean
}): ApprovalRulesColumn // returns an ApprovalRulesColumn object for approval workflow rules

// --- Utility Helper Functions ---

// Duration helper: creates duration values for DurationColumn default
Duration({
 days: 0, // number, optional
 hours: 0, // number, optional
 minutes: 0, // number, optional
 seconds: 0, // number, optional
}) // returns a Duration value string in ServiceNow format e.g. '1970-01-02 06:30:15'

// Time helper: creates time-of-day values for TimeColumn default
Time({
 hours: 0, // number, optional
 minutes: 0, // number, optional
 seconds: 0, // number, optional
}, 'UTC') // optional second parameter: IANA timezone string (e.g., 'America/New_York', 'Europe/London', 'UTC'). Defaults to system timezone.
// returns a Time value, time is converted from specified timezone to UTC

// FieldList helper: creates type-checked field list values for FieldListColumn default
FieldList<'table_name'>(['field1', 'field2', 'field3.dot_walked_field'])
// generic table parameter provides IntelliSense for table fields with dot-walk support
// returns comma-separated string e.g. 'field1,field2,field3.dot_walked_field'

// TemplateValue helper: creates template values for TemplateValueColumn default
TemplateValue<'table_name'>({ field1: 'value1', field2: 100, field3: true })
// generic table parameter provides IntelliSense for table fields
// returns ServiceNow encoded query format e.g. 'field1=value1^field2=100^field3=true^EQ'

// --- Now.attach ---

// Now.attach: attaches an image file to a BasicImageColumn default value
Now.attach('path/to/image.png') // returns an Image reference
// path is relative to the source root
// Supported formats: jpg, png, bmp, gif, jpeg, ico, svg (case-insensitive)

```
