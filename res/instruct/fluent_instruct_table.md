# Instructions for Fluent Table API
Always reference the Table API to create Table (Dictionary) for more details.
1. Generated code should always start with proper import statements for referenced types.
2. Tables should always be assigned to an exported variable with the same name as the table name field to ensure proper typeahead support for Columns. 
3. The `name` field must be prefixed with scope name. If `name` is not prefixed with scope name there will be a design time error.
4. The `extends` field takes a table name as a string.
5. The `index` takes an array of column names to generate indexes in bootstrap.xml. To specify a composite index, add multiple column names to 'element' array.
6. Columns are specified as additional function calls within the Table API on the `schema` key. The `name` field is taken from the variable name or object key provided to the Table API.
7. For creating attributes refer to the provided attributes in the table spec.
8. Here are valid `functionDefinition` functions that Column objects can use: [ 
    'add',
    'coalesce',
    'concat',
    'datediff',
    'dayofweek',
    'distance_sphere',
    'divide',
    'greatest',
    'least',
    'length',
    'multiply',
    'position',
    'substring',
    'subtract'
]
