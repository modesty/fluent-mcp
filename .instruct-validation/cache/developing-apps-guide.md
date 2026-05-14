
# Developing ServiceNow Apps with the Now SDK

Guide for ServiceNow app development using the Now SDK: project setup, fluent authoring, build/deploy workflow, and CLI reference. Load this skill first when starting any ServiceNow application project or working with the Now SDK, before loading artifact-specific skills.

## When to Use

- Setting up a new ServiceNow application project from scratch
- Working with the ServiceNow SDK (`@servicenow/sdk`) CLI commands
- Scaffolding project structure, modules, or fluent definitions
- Building, deploying, or iterating on a ServiceNow app locally
- Authenticating the SDK against a ServiceNow instance
- Answering questions about SDK capabilities, fluent language, or project configuration

## Prerequisites

- **Node.js 20 or later** (LTS recommended)
- **npm** (bundled with Node.js)
- Access to a ServiceNow instance (PDI or enterprise) with admin or developer credentials

## Installation

### Non-Interactive Scaffolding (Recommended for Agents)

Create a new application:

```bash
npx @servicenow/sdk init \
  --appName "My App" \
  --packageName "my-app" \
  --scopeName "x_my_app" \
  --template "base"
```

> **Important:** You must have the scope name formatted as `x_<company_code>_<app_name>` (if they do not have maint access). Ask the user to choose one of these options:

> - Provide the company code found under the sys_property `glide.appcreator.company.code`.
> - Use the generated name you provide at their own risk. 

Convert an existing application from an instance:

```bash
npx @servicenow/sdk init \
  --from <sys_id_of_sys_app_record>
```

> `init` creates files in the current working directory. It does not create a subdirectory.

After scaffolding:

```bash
npm install
```

### Interactive Scaffolding

```bash
npx @servicenow/sdk init
```

Prompts for app scope, name, and target instance. Run `npm install` after completion.

## CLI Commands Reference

| Command | Purpose |
|---------|---------|
| `init` | Scaffold a new project. Flags: `--appName`, `--packageName`, `--scopeName`, `--template`. |
| `auth` | Authenticate. `--add <url> --type basic\|oauth` to add, `--list` to check, `--use <alias>` to set default. |
| `build` | Compile fluent source files. Validates syntax and reports errors. |
| `install` | Push built artifacts to the instance. Requires prior `auth`. |
| `transform` | Convert existing instance artifacts into fluent source files. |
| `download` | Download specific records or update sets from an instance. |
| `dependencies` | Fetch TypeScript type definitions for platform APIs. |
| `clean` | Remove build output and cached artifacts. |
| `pack` | Package the app into an update set XML. |

## Project Structure

```
src/
  fluent/
    index.now.ts           # Main fluent entry point
    example.now.ts         # Example fluent definition
    tsconfig.json          # Fluent TypeScript config
  server/
    script.ts              # Example server-side script
    tsconfig.json          # Server TypeScript config
now.config.json            # App metadata: scope, scopeId, name
package.json
```

Organize artifacts by type using kebab-case naming:

```
src/fluent/
  business-rules/
    my-rule.now.ts
  client-scripts/
    my-script.now.ts
```

### now.config.json

```json
{
  "scope": "x_my_app",
  "scopeId": "26571502d0a642339adf60a7edf6fab9",
  "name": "My App",
  "tsconfigPath": "./src/server/tsconfig.json"
}
```

Does not contain instance connection info -- that is managed via `auth`.

## Development Workflow

1. **`init`** -- Scaffold the project (one-time).
2. **`npm install`** -- Install SDK and dependencies (one-time).
3. **`auth`** -- Authenticate against your instance (or verify existing auth with `--list`).
4. **Write fluent** -- Create `.now.ts` files under `src/fluent/`. Write server scripts in `src/server/`.
5. **`build`** -- Compile and validate fluent definitions.
6. **`install`** -- Install compiled artifacts on the instance.
7. **Iterate** -- Repeat steps 4-6.

For brownfield projects, use `transform` to pull instance artifacts into fluent source first (see below).

## Converting Existing Applications

### From an Instance

Convert a scoped application already installed on an instance:

```bash
npx @servicenow/sdk init --from <sys_id_of_application>
```

Use `--auth <alias>` to specify which instance credentials to use. Without it, the default alias is used. Run `npm install` after.

### From an Existing Repository

If the app already has a git repo with XML metadata:

```bash
npx @servicenow/sdk init --from <path_to_repo>
```

Existing metadata XML and supporting files are placed inside the `metadata` folder, and fluent configuration files are added alongside them.

### Converting XML to Fluent DSL

After initializing from an instance or repo, application metadata will be in the `metadata` folder in its original XML form. Use `transform` to convert XML files into Fluent code:

```bash
# Transform a single file
npx @servicenow/sdk transform --from metadata/update/sys_script_<sys_id>.xml

# Transform the whole app at once
npx @servicenow/sdk transform --from .

# Transform a specific directory
npx @servicenow/sdk transform --from metadata/update
```

Transformed files are scaffolded into the generated directory (configurable in `now.config.json`) and removed from `metadata` upon successful conversion.

> **Note:** Records that exist as both a fluent entity (`.now.ts` file) and an XML file in `metadata` will use the XML version on `build`. Remove converted XML files to avoid conflicts.

Run `npx @servicenow/sdk transform --help` for the full list of options.

## Authentication

### Checking Existing Credentials

```bash
npx now-sdk auth --list
```

### Adding Credentials (Interactive)

```bash
npx now-sdk auth --add <instance-url> --type <basic|oauth>
```

- **`basic`**: Username and password. Suitable for local development and PDIs.
- **`oauth`**: OAuth-based. Suitable for enterprise instances.

Prompts for alias, username, and password. Credentials stored in `.now-sdk/` (gitignored).

### Setting a Default

```bash
npx now-sdk auth --use <alias>
```

### Non-Interactive (CI/CD)

```bash
export SN_SDK_INSTANCE_URL=https://myinstance.service-now.com
export SN_SDK_USER=admin
export SN_SDK_USER_PWD=password
```

Environment variables take precedence over stored credentials.

## Key Concepts

### Fluent Language (SDK 4.x Object-Based API)

TypeScript-based DSL for defining ServiceNow artifacts:

```typescript
import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { myScriptFunction } from '../server/script'

BusinessRule({
  $id: Now.ID['my-rule'],
  name: 'Uppercase Short Description',
  table: 'incident',
  when: 'after',
  action: ['insert', 'update'],
  order: 100,
  script: myScriptFunction,
})
```

- Import `@servicenow/sdk/global` to make the `Now` global available.
- Import artifact types from `@servicenow/sdk/core`.
- Server-side logic is written as functions in `src/server/` and passed via the `script` property.

### TypeScript Types

Run `npx now-sdk dependencies` to fetch type definitions for platform APIs and tables on the connected ServiceNow instance, enabling IDE autocompletion.

## SDK Version Notes

- **3.0**: Initial release. Fluent language, `init`/`build`/`install`, `transform`.
- **4.0**: Breaking changes. Object-based API, new `now.config.json`, `download` and `pack` commands.
- **4.1**: Flow Designer support.
- **4.2**: Service Catalog items, UI Pages (including React), Import Set API.
- **4.3**: UI Policy support, stability improvements, enhanced `transform`.

