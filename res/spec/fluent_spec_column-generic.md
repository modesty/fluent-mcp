#**Context:** Generic Column API spec: Used to create a new Generic Column (`sys_dictionary`) in a Table schema at ServiceNow, Column is also referenced as Field in ServiceNow. This API is closely related to the Table API for its schema property definition.
```typescript
GenericColumn({
	active: false, // boolean
	attributes: {}, // object, snake_case name value pairs, see attribute list
	audit: false, // boolean
	choices: {}, // object, snake_case name value pairs, for example { choice_1: { label: 'Choice1' }, choice_2: { label: 'Choice2' } }
	column_type: '', // see internal_types list, mandatory
	default: '', // string
	dropdown: 'none', // 'none' | 'dropdown_with_none' | 'suggestion' | 'dropdown_without_none'
	dynamic_value_definitions: {}, // object, see dynamic_value_definition examples  
	function_definition: `glidefunction:${""}`, // string, definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation
	label: '', // string or array of Documentation object
	mandatory: false, // boolean
	maxLength: 0, // number
	read_only: false // boolean
}): GenericColumn // returns a GenericColumn object

// dynamic_value_definition examples
const example1 = dynamic_value_definitions: {
   type: "dynamic_default", // constant, mandatory
   dynamic_default: '' // string, function from sys_filter_option_dynamic table, mandatory
};

const example2 = dynamic_value_definitions: {
   type: "dependent_field", // constant, mandatory
   column_name: get_column_name("") // string, column name from the same table, mandatory
}

const example3 = dynamic_value_definitions: {
   type: "calculated_value", // constant, mandatory
   calculated_value: '' // string, function for calculating the value, mandatory
}

const example4 = dynamic_value_definitions: {
   type: "choices_from_other_table", // constant, mandatory
   table: '', // undefined | string, mandatory
   field: get_column_name("") // string, column name from the specified table, mandatory
},

const internal_types = [
    'string',
    'reference',
    'glide_date_time',
    'integer',
    'boolean',
    'collection',
    'GUID',
    'domain_id',
    'choice',
    'glide_date',
    'domain_path',
    'table_name',
    'float',
    'decimal',
    'sys_class_name',
    'document_id',
    'ip_addr',
    'sys_class_path',
    'json',
    'translated_text',
    'glide_list',
    'field_name',
    'conditions',
    'password2',
    'translated_field',
    'script',
    'glide_duration',
    'url',
    'script_plain',
    'field_list',
    'longint',
    'string_full_utf8',
    'long',
    'user_roles',
    'color',
    'user_image',
    'auto_increment',
    'html',
    'translated_html',
    'template_value',
    'simple_name_values',
    'glide_var',
    'compressed',
    'numeric',
    'short_table_name',
    'counter',
    'records',
    'breakdown_element',
    'integer_date',
    'slushbucket',
    'condition_string',
    'percent_complete',
    'version',
    'currency',
    'int',
    'glide_time',
    'price',
    'email',
    'journal_input',
    'double',
    'glide_action_list',
    'replication_payload',
    '',
    'email_script',
    'journal',
    'glide_precise_time',
    'multi_two_lines',
    'json_translations',
    'char',
    'xml',
    'datetime',
    'image',
    'data_object',
    'script_server',
    'glyphicon',
    'name_values',
    'password',
    'workflow',
    'day_of_week',
    'short_field_name',
    'color_display',
    'order_index',
    'schedule_date_time',
    'variable_conditions',
    'mediumtext',
    'html_script',
    'ip_address',
    'multi_small',
    'ph_number',
    'date',
    'css',
    'internal_type',
    'systemClassName',
    'approval_rules',
    'html_template',
    'icon',
    'month_of_year',
    'phone_number_e164',
    'radio',
    'sysevent_name',
    'number',
    'bootstrap_color',
    'data_structure',
    'days_of_week',
    'integer_time',
    'repeat_count',
    'wiki_text',
    'table',
    'auto_number',
    'calendar_date_time',
    'documentation_field',
    'due_date',
    'file_attachment',
    'insert_timestamp',
    'journal_list',
    'mid_config',
    'properties',
    'script_client',
    'snapshot_template_value',
    'source_table',
    'glide_utc_time',
    'variable_template_value',
    'variables',
    'sys_class_code',
    'table_list',
    'table_type',
    'translate_field',
    '0',
    'colllection',
    'condition',
    'date_time',
    'document_name',
    'document_table',
    'hash',
    'order_list',
    'string_full_utf_8',
    'audio',
    'catalog_preview',
    'composite_name',
    'data_array',
    'expression',
    'external_names',
    'formula',
    'graphql_schema',
    'language',
    'nds_icon',
    'reference_name',
    'reminder_field_name',
    'repeat_type',
    'source_name',
    'timer',
    'translated',
    'user_input',
    'video',
    'week_of_month',
    'wide_text',
    'workflow_condition',
]
```
