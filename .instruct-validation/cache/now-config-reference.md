# now.config.json

The `now.config.json` file is the project configuration for a Fluent SDK application. It lives at the project root and defines the application scope, build settings, source directories, dependencies, and runtime policies. Every Fluent project requires this file.

## Required Properties

### `scope`

Scope of the application (example: 'x_myapp' or 'sn_myapp')

- **Type:** `string`
- **Pattern:** `^((x|sn)_[a-z0-9_]+|global)$`
- **Min length:** 4
- **Max length:** 18

### `scopeId`

Scope ID of the application (example: 'fc1b5713c3db3110d6489a038a40dd85')

- **Type:** `string`
- **Pattern:** `^([0-9a-f]{32}|global$)`
- **Max length:** 32

## Properties

### `active`

Is the application active

- **Type:** `boolean`

### `appOutputDir`

Location to output built application for packaging during fluent build command

- **Type:** `string`
- **Default:** `"dist/app"`

### `applicationRuntimePolicy`

Application Runtime Policy mode. Set to 'tracking' or 'enforcing' to enable policy records. Defaults to 'none' if not specified.

- **Type:** `"none"` | `"tracking"` | `"enforcing"`

### `clientDir`

Directory containing client files of the application, such as HTML and TypeScript files. Set to empty to disable the client build.

- **Type:** `string`
- **Default:** `"src/client"`

### `description`

Description of the application

- **Type:** `string`

### `fluentDir`

Directory containing .now.ts fluent files of the application

- **Type:** `string`
- **Default:** `"src/fluent"`
- **Min length:** 1

### `generatedDir`

Directory relative to 'fluentDir' where Fluent will generate files, such as keys.ts

- **Type:** `string`
- **Default:** `"generated"`
- **Min length:** 1

### `guidedSetupGuid`

SysID of the Guided Setup to start when the application is upgraded

- **Type:** `string`
- **Pattern:** `^[0-9a-f]{32}$`

### `ignoreTransformTableList`

List of tables to ignore when transforming entities to ServiceNow tables

- **Type:** `string`[]

### `installedAsDependency`

App was installed as a dependency

- **Type:** `boolean`
- **Default:** `false`

### `jsLevel`

JavaScript level for the application

- **Type:** `"es_latest"` | `"helsinki_es5"` | `"traditional"`
- **Default:** `"es_latest"`

### `logo`

SysID of the app logo

- **Type:** `string`
- **Pattern:** `^[0-9a-f]{32}$`

### `menu`

SysID of the application's primary menu for default table modules

- **Type:** `string`
- **Pattern:** `^[0-9a-f]{32}$`

### `metadataDir`

Directory containing metadata xml for the app

- **Type:** `string`
- **Default:** `"metadata"`

### `name`

Name of the application (example: 'MyApp')

- **Type:** `string`
- **Min length:** 3
- **Max length:** 100

### `networkPolicies`

Network access policies for the application (sys_arp_network_policy)

- **Type:** `object`[]

### `npmUpdateCheck`

- **Type:** `number` | `boolean`
- **Default:** `10`

### `packOutputDir`

Location to output the zip file during build process, to be later installed on the instance during install command

- **Type:** `string`
- **Default:** `"target"`

### `packageResolverVersion`

Rhino module resolver version. Must be 2.0.0+ for Global apps

- **Type:** `"1.0.0"` | `"2.0.0"`
- **Default:** `"1.0.0"`

### `serverModulesDir`

Directory containing modular files to be built into sys_modules

- **Type:** `string`
- **Default:** `"src/server"`

### `serverModulesExcludePatterns`

Patterns to exclude when building server modules

- **Type:** `string`[]
- **Default:** `["**/*.test.ts","**/*.test.js","**/*.d.ts"]`

### `serverModulesIncludePatterns`

Patterns to include when building server modules

- **Type:** `string`[]
- **Default:** `["**/*.ts","**/*.tsx","**/*.js","**/*.jsx","**/*.cts","**/*.cjs","**/*.mts","**/*.mjs","**/*.json"]`

### `staticContentDir`

Directory containing static asset files of the application

- **Type:** `string`
- **Default:** `"dist/static"`
- **Min length:** 1

### `defaultLanguage`

BCP 47 language tag for table/column documentation defaults. Used to resolve labels from multi-language documentation arrays (e.g., 'en', 'es', 'fr', 'en-US', 'zh-Hans').

- **Type:** `string`
- **Default:** `"en"`
- **Pattern:** `^[a-z]{2,3}(-[a-zA-Z0-9]{2,8})*$`
- **Min length:** 2

### `tableDefaultLanguage`

> **Deprecated.** Use [`defaultLanguage`](#defaultlanguage) instead. This property is still accepted and will automatically migrate to `defaultLanguage`, but will produce a deprecation warning.

### `tableOutputFormat`

Artifact type built for table definitions. Traditional bootstrap or separate component records.

- **Type:** `"bootstrap"` | `"component"`
- **Default:** `"bootstrap"`

### `trustedModules`

List of npm module patterns to mark as trusted. Trusted modules will have external_source set to false. Valid patterns: fully qualified package names (e.g., 'lodash', '@servicenow/sdk') or organization prefixes with wildcard (e.g., '@servicenow/*'). Blanket wildcards like '*' are not allowed.

- **Type:** `string`[]
- **Default:** `[]`

### `tsconfigPath`

Path to tsconfig file to be used for transpilation of server module typescript. ServiceNow SDK will emit build errors following the referenced tsconfig. (example: './src/server/tsconfig.json')

- **Type:** `string`

### `type`

Whether this project represents a scoped/global app package or a set of a record changes

- **Type:** `"package"` | `"configuration"`
- **Default:** `"package"`

## `accessControls`

Manage scoping restrictions and access to the application

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `canEditInStudio` | `boolean` | `true` | Can the application be opened in developer studio |
| `hideOnUI` | `boolean` | `false` | Application hidden in UI |
| `private` | `boolean` | `false` | Mark the application as private |
| `restrictTableAccess` | `boolean` | `false` | Restrict design time access to tables from outside the application |
| `runtimeAccessTracking` | `"none"` \| `"permissive"` \| `"enforcing"` | `"permissive"` | Runtime access tracking for the application |
| `scopedAdministration` | `boolean` | `false` | If true, System Admins will be prevented from accessing the application |
| `trackable` | `boolean` | `true` | Mark the application as trackable |
| `uninstallBlocked` | `boolean` | `false` | Uninstall blocked for the application |
| `userRole` | `string` |  | Role required for end users to access the application and its tables |

## `dependencies`

Reference dependencies on other ServiceNow application tables and entities, organized by scope

Keys match the pattern `^((x|sn)_[a-z0-9_]+|global)$`. Each entry can include:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `roles` | `"*"` \| `string`[] |  | Role definitions from sys_user_role (list of role names or '*' for all) |
| `tables` | `"*"` \| `string`[] |  | Table definitions from sys_db_object (list of table names or '*' for all) |

Additional keys are also accepted.

> **Deprecated sub-property:** `dependencies.applications` — DEPRECATED: Use flat scope structure instead. Move scopes directly under 'dependencies'.

## `licensing`

 If this application is licensable, set the subscription requirement and model.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enforceLicense` | `"none"` \| `"log"` \| `"enforce"` | `"log"` | Subscription requirement for the application |
| `licensable` | `boolean` | `true` | Mark package as licensable |
| `licenseCategory` | `"none"` \| `"general"` \| `"beta"` | `"none"` | License category for the application |
| `licenseModel` | `"none"` \| `"fulfiller"` \| `"producer"` \| `"capacity"` \| `"mixed"` \| `"app_use"` | `"none"` | License model for the application |
| `subscriptionEntitlement` | `string` |  | SysID of the subscription entitlement for the application |

## `modulePaths`

Mapping between file glob patterns to resolve imported file paths to valid runtime paths. This is needed if your Fluent files are importing modules from a different location than the runtime modules. For example, if you have a custom TypeScript setup that transpiles modules from a 'src' directory to a 'dist' directory, you would need to specify that mapping here.

Keys match the pattern `.*`. Values are `string`.

## `performancePolicy`

Performance (resource limit) configuration (sys_app_resource_limit_template). Only one per scope.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `$id` | `string` |  | Unique sys_id for the record |
| `apiTransactionLimit` | `integer` | `30` | API Transaction Quota percentage (1-100) |
| `eventHandlerLimit` | `integer` | `20` | Event Handler Quota percentage (1-100) |
| `interactiveTransactionLimit` | `integer` | `30` | Interactive Transaction Quota percentage (1-100) |
| `mode` | `"disabled"` \| `"logOnly"` \| `"enforced"` |  | Enforcement mode for quota thresholds. Auto-derived from applicationRuntimePolicy if not explicitly set: 'none'→disabled, 'tracking'→logOnly, 'enforcing'→enforced |
| `name` | `string` |  | Configuration name |
| `scheduledJobLimit` | `integer` | `20` | Scheduled Job Quota percentage (1-100) |

## `scripts`

Define scripts that are executed with the SDK task runner. The task functions are async and are passed APIs for cross-environment compatibility. Use prebuild to run a script before the build process for custom build tasks.

Keys match the pattern `.*`. Values are `string`.

## `staticContentPaths`

Mapping of source files to static output paths.

Keys match the pattern `.*`. Values are `string`.

## `taxonomy`

Configuration for taxonomy-based file organization

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fallbackFolderName` | `string` |  | Folder name to use when a table doesn't have a mapping (lowercase, no spaces or special chars) |
| `mapping` | `object` |  | Maps table names to their folder path for organization. Resulting files will be placed in '{generatedDir}/{path}' |

## `wildcardPolicy`

Wildcard/exemption policy for the application (sys_arp_segment_policy). Only one per scope.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `$id` | `string` |  | Unique sys_id for the record |
| `active` | `boolean` | `false` | Whether the policy is active |
| `arl` | `object` |  | ARL (Application Resource Limit) pillar configuration |
| `network` | `object` |  | Network pillar configuration |
| `record` | `boolean` | `false` | Enable Record pillar access |
| `scripting` | `object` |  | Scripting pillar configuration |
| `shortDescription` | `string` |  | Human-readable description of the policy |

