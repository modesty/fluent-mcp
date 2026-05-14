# Importing Data

Guide for importing external data into ServiceNow using the Fluent API. Covers Data Sources, staging tables, Import Sets (transform maps), and the three-component pattern required for every data import.

## When to Use

- Importing external data from CSV, Excel, JSON, XML, JDBC, LDAP, or REST sources
- Setting up staging tables and transform maps for data integration
- Building applications that ingest data from external systems
- Configuring field mappings, coalesce rules, and transform scripts

## Instructions

### Three-Component Pattern

Every data import requires three separate components created in order:

1. **Staging Table** (Table API): extends `sys_import_set_row`, defines all columns for imported data. Must be created FIRST.
2. **Data Source** (Record API on `sys_data_source`): references the staging table by name in `import_set_table_name`. Defines how to connect and load data. Must be created SECOND.
3. **Import Set** (ImportSet API): references the staging table by name in `sourceTable`. Defines how to map data from staging to target. Must be created THIRD.

All three components MUST use the exact same staging table name.

### Collecting Mandatory Fields

Before generating data source code, collect format-specific mandatory fields:

- **XML format**: requires `xpath_root_node` (e.g., `//product`, `/root/items/item`)
- **JSON format**: requires `jpath_root_node` (e.g., `$.employees[*]`, `$.data.records`)
- **JDBC format**: requires either `table_name` or `sql_statement`
- **LDAP format**: requires complete LDAP chain (server config, OU config, data source)
- **REST format**: requires `request_action` referencing an Integration Hub action
- **CSV/Excel**: no format-specific mandatory fields

### Password Handling

Pre-populate all configuration fields (hostnames, ports, usernames, database names) with provided values. Leave password fields empty (`''`) with a `// LEAVE EMPTY` comment -- passwords are set manually in ServiceNow after deployment.

### Transform Map Configuration

- Set coalesce fields on at least one field to prevent duplicate records during import
- Use simple string mappings (`target_field: 'source_field'`) for direct field copies
- Use object mappings for coalesce, date format, reference fields, or source scripts
- For complex transformation logic (>10-15 lines), extract to TypeScript functions in server modules

## Key Concepts

- **Data source types**: File (CSV, Excel, JSON, XML), JDBC (database), LDAP, REST (Integration Hub), Custom (Parse by Script)
- **File retrieval methods**: Attachment (direct upload), FTP, SCP, SFTP, HTTP, HTTPS
- **Import flow**: External Source -> Data Source -> Staging Table -> Transform Map -> Target Table
- **Coalesce**: Field-level setting that enables record matching -- prevents duplicates by updating existing records instead of inserting new ones
- **enforceMandatoryFields**: Controls mandatory field validation during import: `no`, `onlyMappedFields`, `allFields`
- **runBusinessRules**: Disable for bulk imports (performance); enable selectively for business logic validation

### LDAP Data Sources

LDAP imports require a chain of records: `ldap_server_config` -> `ldap_ou_config` (references server) -> optionally `ldap_server_url` (references server) -> `sys_data_source` (references OU via `ldap_target`). Use record object references (not hardcoded sys_id strings) for LDAP cross-table references.

## Avoidance

- **Do not create a data source without first searching for existing ones** that may already match
- **Do not generate XML/JSON data source code without `xpath_root_node`/`jpath_root_node`** -- the data source will deploy but fail to import data
- **Do not create an ImportSet without a corresponding Data Source and Staging Table** -- all three components are required
- **Do not use mismatched table names** between Data Source (`import_set_table_name`) and ImportSet (`sourceTable`)
- **Do not hardcode sys_id strings for LDAP references** -- use record object references
- **Do not include passwords in generated code** -- leave empty for manual configuration

## API Reference

For the full ImportSet property reference, see the `importset-api` topic. Data sources are created using the Record API on `sys_data_source` -- see the three-component pattern in the examples below.

## Examples

### Complete Three-Component Pattern: CSV Import

```typescript
import '@servicenow/sdk/global'
import { Table, Record, ImportSet } from '@servicenow/sdk/core'

// STEP 1: Staging Table (MUST BE FIRST)
export const userStagingTable = Table({
    $id: Now.ID['user-staging-table'],
    name: 'u_user_import_staging',
    label: 'User Import Staging',
    extends: 'sys_import_set_row',
    columns: [
        { name: 'u_email_address', type: 'email', max_length: 100, label: 'Email Address' },
        { name: 'u_full_name', type: 'string', max_length: 100, label: 'Full Name' },
        { name: 'u_username', type: 'string', max_length: 40, label: 'Username' },
    ],
})

// STEP 2: Data Source (MUST BE SECOND)
export const userDataSource = Record({
    $id: Now.ID['user-csv-datasource'],
    table: 'sys_data_source',
    data: {
        name: 'User CSV Data Source',
        type: 'File',
        format: 'CSV',
        file_retrieval_method: 'Attachment',
        csv_delimiter: ',',
        header_row: 1,
        import_set_table_name: 'u_user_import_staging',
        import_set_table_label: 'User Import Staging',
        batch_size: 500,
        active: true,
    },
})

// STEP 3: Import Set / Transform Map (MUST BE THIRD)
export const userImportSet = ImportSet({
    $id: Now.ID['user-import-transform'],
    name: 'User Import Transform',
    targetTable: 'sys_user',
    sourceTable: 'u_user_import_staging',
    active: true,
    runBusinessRules: true,
    fields: {
        email: { sourceField: 'u_email_address', coalesce: true },
        name: 'u_full_name',
        user_name: 'u_username',
    },
})
```

### Transform Map with Field Transformations

```typescript
import '@servicenow/sdk/global'
import { ImportSet } from '@servicenow/sdk/core'

export const userImportWithTransforms = ImportSet({
    $id: Now.ID['user-import-advanced'],
    name: 'Advanced User Import',
    targetTable: 'sys_user',
    sourceTable: 'u_user_staging',
    active: true,
    runBusinessRules: true,
    enforceMandatoryFields: 'allFields',
    copyEmptyFields: false,
    createOnEmptyCoalesce: true,
    fields: {
        email: {
            sourceField: 'u_email_address',
            coalesce: true,
            coalesceCaseSensitive: false,
        },
        name: {
            sourceField: 'u_full_name',
            useSourceScript: true,
            sourceScript: `answer = (function transformEntry(source) {
                return source.u_full_name ? source.u_full_name.toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ') : '';
            })(source);`,
        },
        u_department: {
            sourceField: 'u_dept_code',
            referenceValueField: 'u_dept_id',
            choiceAction: 'create',
        },
        u_start_date: {
            sourceField: 'u_hire_date',
            dateFormat: 'MM/dd/yyyy',
        },
    },
})
```

### Transform Map with Server Module Scripts

```typescript
import '@servicenow/sdk/global'
import { ImportSet } from '@servicenow/sdk/core'
import { transformCIRow, validateCIData, postProcessCI } from '../server/ci-transforms'

export const ciImportWithScripts = ImportSet({
    $id: Now.ID['ci-import-scripts'],
    name: 'CI Import with Transform Scripts',
    targetTable: 'cmdb_ci_computer',
    sourceTable: 'u_computer_import',
    active: true,
    runBusinessRules: false,
    runScript: true,
    script: transformCIRow,
    fields: {
        asset_tag: { sourceField: 'u_asset_tag', coalesce: true },
        name: 'u_hostname',
        serial_number: 'u_serial_number',
    },
    scripts: [
        {
            $id: Now.ID['ci-validation-script'],
            when: 'onBefore',
            order: 50,
            active: true,
            script: validateCIData,
        },
        {
            $id: Now.ID['ci-cleanup-script'],
            when: 'onAfter',
            order: 200,
            active: true,
            script: postProcessCI,
        },
    ],
})
```

### LDAP Data Source (Complete Chain)

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

// Step 1: LDAP Server Configuration
export const ldapServer = Record({
    $id: Now.ID['users_ldap_server'],
    table: 'ldap_server_config',
    data: {
        name: 'users_ldap_server',
        server_url: 'ldap://ldap.company.com',
        port: 389,
        dn: 'cn=admin,dc=company,dc=com',
        rdn: '',
        password: '', // LEAVE EMPTY - set manually in ServiceNow
        active: true,
        ssl: false,
        authenticate: true,
        paging: true,
        vendor: 'openldap',
    },
})

// Step 2: LDAP OU Configuration
export const ldapOU = Record({
    $id: Now.ID['users_ou'],
    table: 'ldap_ou_config',
    data: {
        name: 'users_ou',
        ou: 'ou=users,dc=company,dc=com',
        filter: '(uid=e*)',
        server: ldapServer, // Reference to record object, NOT sys_id string
        active: true,
    },
})

// Step 3: LDAP Data Source
export const ldapDataSource = Record({
    $id: Now.ID['users_datasource'],
    table: 'sys_data_source',
    data: {
        name: 'users_datasource',
        type: 'LDAP',
        import_set_table_name: 'u_users_import',
        import_set_table_label: 'Users Import',
        ldap_target: ldapOU, // Reference to OU config
        batch_size: 100,
        active: true,
    },
})
```

### XML File Data Source

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

export const xmlDataSource = Record({
    $id: Now.ID['xml-product-import'],
    table: 'sys_data_source',
    data: {
        name: 'Product XML Import',
        type: 'File',
        format: 'XML',
        file_retrieval_method: 'Attachment',
        // MANDATORY for XML format:
        xpath_root_node: '/products/product',
        expand_node_children: true,
        import_set_table_name: 'u_product_import',
        import_set_table_label: 'Product Import',
        batch_size: 100,
        active: true,
    },
})
```

### JDBC Data Source (MySQL/MariaDB)

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

export const databaseDataSource = Record({
    $id: Now.ID['test-jdbc'],
    table: 'sys_data_source',
    data: {
        name: 'Test JDBC',
        type: 'JDBC',
        format: 'org.mariadb.jdbc.Driver',
        database_name: 'my_database',
        database_port: '3306',
        jdbc_server: 'localhost',
        jdbc_user_name: '',
        jdbc_password: '', // LEAVE EMPTY - set manually in ServiceNow
        table_name: 'task',
        import_set_table_name: 'u_jdbc_staging',
        import_set_table_label: 'JDBC Staging',
        batch_size: 1000,
        active: true,
    },
})
```

