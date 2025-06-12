# Fluent MCP Server for ServiceNow SDK

This is a stdio MCP Server for [ServiceNow Fluent](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html), a TypeScript-based declarative domain-specific language for creating metadata, modules, records and tests in ServiceNow platform. Fluent is also called [ServiceNow SDK](https://www.npmjs.com/package/@servicenow/sdk).

## Description

Fluent MCP for ServiceNow SDK bridges ServiceNow development tools with modern AI-assisted development environments by implementing the Model Context Protocol. It enables developers and AI assistants to interact with ServiceNow SDK commands and access resources like API specifications, code snippets, and instructions through natural language.

## Installation

```bash
npm install @modesty/fluent-mcp
```

## Usage

### Starting the MCP Server

```typescript
import { startServer } from '@modesty/fluent-mcp';

// Start the MCP server
startServer();
```

### Using with an MCP Client

The MCP server communicates via stdio according to the MCP specification, allowing any compatible MCP client to interact with it.

## Features

- Access to all ServiceNow SDK CLI commands
- ServiceNow authentication via `@servicenow/sdk auth --add <instance>`
- Access to API specifications for different metadata types
- Access to code snippets and examples for different metadata types
- Access to instructions for creating and modifying different metadata types

## Available MCP Tools

### ServiceNow SDK Command Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `get_fluent_version` | Get Fluent (ServiceNow SDK) version information | None |
| `get_fluent_help` | Get help information about Fluent (ServiceNow SDK) commands | `command`: (Optional) The specific command to get help for |
| `enable_fluent_debug` | Return debug logs generated with a command for Fluent (ServiceNow SDK) | `command`: (Optional) The command to run with debug mode enabled |
| `upgrade_fluent` | Upgrade Fluent (ServiceNow SDK) to the latest version | `check`: (Optional) Only check for updates without upgrading, `debug`: (Optional) Enable debug mode for the upgrade process |

### Resource Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `getApiSpecifications` | Get API specifications for a metadata type | `metadataType`: The metadata type to get specifications for |
| `listApiSpecificationTypes` | List available metadata types with API specifications | None |
| `getCodeSnippets` | Get code snippets for a metadata type | `metadataType`: The metadata type to get snippets for `snippetId`: (Optional) Specific snippet ID to retrieve |
| `listSnippetTypes` | List available metadata types with code snippets | None |
| `getInstructions` | Get instructions for a metadata type | `metadataType`: The metadata type to get instructions for |
| `listInstructionTypes` | List available metadata types with instructions | None |

## Requirements

- Node.js 14.x or later
- ServiceNow SDK

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License

MIT
