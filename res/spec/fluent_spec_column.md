#**Context:** Column API for table schema spec: Used to create a typed column object for a table schema. This group of API is working closely with the Table API to create table schema property.
```typescript
// Creates a new Column (`sys_dictionary`)
StringColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): StringColumn // returns a StringColumn object

BooleanColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string | boolean
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): BooleanColumn // returns an BooleanColumn object

ChoiceColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string | number
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): ChoiceColumn // returns a ChoiceColumn object

ReferenceColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	cascadeRule: 'none', // "none" | "cascade" | "delete_no_workflow" | "delete" | "restrict" | "clear"
	default: '', // undefined | string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
	referenceTable?: '', // undefined | string
}): ReferenceColumn // returns a ReferenceColumn object

DateTimeColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DateTimeColumn // returns a DateTimeColumn object

DateColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DateColumn // returns a DateColumn object

IntegerColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	max: 0, // number
	maxLength: 0, // number
	min: 0, // number
	read_only: false // boolean
}): IntegerColumn // returns an IntegerColumn object

DecimalColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string | number
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DecimalColumn // returns a DecimalColumn object

ListColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // undefined | string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
	referenceTable?: '', // undefined | string
}): ListColumn // returns a ListColumn object

FieldNameColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): FieldNameColumn // returns a FieldNameColumn object

ScriptColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // undefined | string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
	signature: '', // undefined | string
}): ScriptColumn // returns a ScriptColumn object

UserRolesColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string | Role object see spec
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): UserRolesColumn // returns a UserRolesColumn object

TranslatedTextColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): TranslatedTextColumn // returns a TranslatedTextColumn object

ConditionsColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // undefined | string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): ConditionsColumn // returns a ConditionsColumn object

TranslatedFieldColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): TranslatedFieldColumn // returns a TranslatedFieldColumn object

BasicImageColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): BasicImageColumn // returns a BasicImageColumn object

IntegerDateColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string | number
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): IntegerDateColumn // returns a IntegerDateColumn object

VersionColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): VersionColumn // returns a VersionColumn object

BasicDateTimeColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): BasicDateTimeColumn // returns a BasicDateTimeColumn object

CalendarDateTime({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): CalendarDateTime // returns a CalendarDateTime object

DueDateColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DueDateColumn // returns a DueDateColumn object

ScheduleDateTimeColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): ScheduleDateTimeColumn // returns a ScheduleDateTimeColumn object

OtherDateColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): OtherDateColumn // returns a OtherDateColumn object

RadioColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): RadioColumn // returns a RadioColumn object

DomainIdColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DomainIdColumn // returns an DomainIdColumn object

DomainPathColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DomainPathColumn // returns a DomainPathColumn object

TableNameColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string | (string & {})
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): TableNameColumn // returns a TableNameColumn object

SystemClassNameColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): SystemClassNameColumn // returns a SystemClassNameColumn object

DocumentIdColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	default: '', // string
	dependent: {}, // object TableNameColumn see above spec
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): DocumentIdColumn // returns a DocumentIdColumn object

```

