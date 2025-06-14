# Product Requirements Document: Fluent MCP for ServiceNow SDK

## Introduction/Overview

Fluent MCP is a Model Context Protocol (MCP) server that provides ServiceNow SDK functionality to AI assistants and developers through a standardized interface. This feature solves the problem of accessing and utilizing ServiceNow SDK commands and resources programmatically with AI Agent, making ServiceNow development more accessible through AI-assisted workflows. By leveraging the MCP TypeScript SDK, this server creates a bridge between ServiceNow's development tools and modern AI-assisted development environments.

## Goals

1. Create a Node.js package that implements the Model Context Protocol for ServiceNow SDK functionality
2. Expose all ServiceNow SDK CLI commands as MCP tools
3. Provide access via MCP tools to API specifications, code snippets, and instructions for different ServiceNow metadata types
4. Enable developers and AI assistants to interact with ServiceNow development resources through a standardized protocol
5. Simplify the process of creating and modifying ServiceNow applications through natural language interactions with Developer Agents and assistants

## User Stories

1. **As a ServiceNow developer**, I want to access ServiceNow SDK commands through natural language interactions, so that I can develop applications more efficiently without memorizing command syntax.

2. **As an AI assistant**, I want to understand ServiceNow metadata specifications, so that I can assist developers in creating correct and compliant ServiceNow application components.

3. **As a ServiceNow developer**, I want to view API specifications and code examples of various ServiceNow metadata types, so that I can understand how to develop them efficiently in my applications.

4. **As an AI assistant**, I want to access metadata-specific API specifications, code exmaples and instructions, so that I can provide accurate guidance tailored to different ServiceNow component types.

5. **As a ServiceNow developer**, I want to authenticate to ServiceNow instances through the MCP server, so that I can work with my organization's ServiceNow environment.

## Functional Requirements

### 1. MCP Server Implementation

1.1. The system must implement the Model Context Protocol as defined at https://modelcontextprotocol.io/specification/2025-03-26.
1.2. The system must use stdio as the communication channel for the MCP server.
1.3. The system must built with MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
1.4. The system must install the MCP TypeScript SDK as an external dependency.
1.5. The system must provide appropriate response types for different tool invocations.
1.6. The system should reference the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md) for implementation details and best practices.

### 2. MCP Tools: CLI Commands

2.1. The system must expose all ServiceNow SDK CLI commands as MCP tools, including:
	2.1 SDK commands:
		2.1.1 `npx now-sdk --version`: Returns the version of the ServiceNow SDK.
		2.2.2 `npx now-sdk --help`: Returns the help information for the ServiceNow SDK CLI.
		2.3.3 `npx now-sdk --debug`: Return the debug logs generated with a command.
		2.4.4 `npx now-sdk upgrade --debug true`: Upgrade the ServiceNow SDK to the latest version.
	2.2 Auth command:
		2.2.1 `npx now-sdk auth [--add <instance url>] [--type <auth method>] [--alias <alias>]`: Authenticate to an instance and store, update, or view user credentials for accessing an instance on your system. Details can be found by terminal command `npx now-sdk --help auth`. Examples:
			- `npx now-sdk auth --add https://myinstance.service-now.com --type oauth --alias devuser1`
			- `npx now-sdk auth --delete devuser1`: delete the stored authentication alias.
			- `npx now-sdk auth --list`: List all stored authentication aliases.
			- `npx now-sdk auth --use devuser1`: Use the stored authentication alias
	2.3 Init command:
		prerequisites:
			- Change the current working directory to the directory where you want to create the ServiceNow application.
			- The current working directory must not already contain a ServiceNow application, meaning it must not contain a `now.config.json` file, and it's package.json (if exists) must not have dependencies for `@servicenow/now-sdk` or `@servicenow/now-sdk-cli`. Otherwise, return a message indicating that the current directory already contains a Fluent (ServiceNow SDK) application, and tell the user current scope name and package name.
			- working directory handling:
				- If working directory is provided
					- If the provided working directory doesn't exist, create it, save it as the working directory for the session, then move onto command execution
					- If the provided working directory exists: 
						- If the provided working directory does not contain Fluent app, save it as the working directory for the session, then move onto command execution
						- If the provided working directory contains Fluent app, return a message indicating that the current directory already contains a Fluent (ServiceNow SDK) application, and tell the user current scope name and package name. also save the working directory as the working directory for the session, then exist without executing the command
				- If working directory is not provided:
					- Create a new root directory under the user's home directory, save it as the working directory for the session, then move onto command execution
				- the saved working directory for the session will be used for the consecutive invocation of the following commands: 
					- `npx now-sdk build`
					- `npx now-sdk install`
					- `npx now-sdk transform`
					- `npx now-sdk dependencies`

		2.3.1 `npx now-sdk init [--from <sys_id or path>] [--appName <name>] [--packageName <name>] [--scopeName <name>] [--auth <alias>]`: Initialize a new ServiceNow application in the current directory. Details can be found by terminal command `npx now-sdk --help init`. Example: `npx now-sdk init --from dbce0f6a3b3fda107b45b5d355e45af6 --appName Example App --packageName example-app --scopeName x_snc_example --auth devuser1`
	2.4 Build command:
		2.4.1 `npx now-sdk build <source> [--frozenKeys <flag>]`: Compile source files and generate an installable package. Details can be found by terminal command `npx now-sdk --help build`. Example: `npx now-sdk build /path/to/package --frozenKeys true`
	2.5 Install command:
		1.5.1 `npx now-sdk install [--source <package path>] [--reinstall <flag>] [--auth <alias>] [--open-browser <flag>] [--info <flag>]`: Install or update an application on an instance. Before using the install command, the `build` command must be used to generate an installable package. Details can be found by terminal command `npx now-sdk --help install`. Example: `npx now-sdk install --source /path/to/package --reinstall false --auth devuser1 --open-browser true --info true`
	2.6 Transform command:
		2.6.1 `npx now-sdk transform [--from <path>] [--directory <package path>] [--preview <flag>] [--auth <alias>]`: Download application metadata (XML) from the instance and transform the metadata into ServiceNow Fluent source code to synchronize the application changes on the instance into your local application. Details can be found by terminal command `npx now-sdk --help transform`. Example: `npx now-sdk transform --from metadata/update --directory /path/to/package --preview true --auth devuser1`
	2.7 Dependencies command:
		2.7.1 `npx now-sdk dependencies [--directory <package path>] [--auth <alias>]`: Download the application dependencies configured in the now.config.json file and script dependencies, such as TypeScript type definitions for Glide APIs and script includes, from the instance. To generate and download any tables on which your application depends, you must configure dependencies in the now.config.json. After downloading script dependencies, you must update your tsconfig.json file to include the type definitions. Details can be found by terminal command `npx now-sdk --help dependencies`. Example: `npx now-sdk dependencies --directory /path/to/package --auth devuser1`
2.2. The system must support all command parameters that the original ServiceNow SDK CLI commands accept.
2.3. The system must handle command execution and return results in a structured format.
2.4. The system must provide appropriate error handling for failed commands.

### 3. MCP Tools: API spec / snippet / instruct

3.1. The system must provide a tool to access API specifications for different metadata types stored in `./res/spec`.
3.2. The system must provide a tool to access code snippets for different metadata types stored in `./res/snippet`.
3.3. The system must provide a tool to access instructions for different metadata types stored in `./res/instruct`.
3.4. Each resource tool expose resources by metadata type (e.g., ACL, business rules, client scripts, etc.).
3.5. The system must support querying for specific metadata types.

### 4. Package Structure

4.1. The system must be packaged as an npm package.
4.2. The system must include proper TypeScript definitions.
4.3. The system must include documentation on how to use the MCP server.
4.4. The system must have a clear and organized code structure.
4.5. The system must include unit tests for all exposed tools.

## Non-Goals (Out of Scope)

1. The MCP server will NOT directly modify ServiceNow metadata XML files.
2. The MCP server will NOT support transport of Server-Sent Events (SSE) or streamable HTTP .
3. The MCP server will NOT provide a graphical user interface.
4. The MCP server will NOT handle ServiceNow authentication itself; it will rely on the ServiceNow SDK for authentication.
5. The MCP server will NOT modify or transform the resources in `./res/` directory; it will only expose them.

## Technical Considerations

1. Should be built using the MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
2. Should integrate with ServiceNow SDK as an external dependency
3. Should use stdio for transport according to MCP specifications
4. Should handle resource loading efficiently to minimize memory usage
5. Should use TypeScript for type safety and developer experience
6. Should follow npm package best practices for Node.js applications
7. Should reference examples from https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md for implementation details and best practices
8. Should ensure that all MCP tools are well-documented and easy to use for developers and AI assistants

## Success Metrics

1. All ServiceNow SDK commands are successfully exposed through MCP tools
2. Unit tests pass for all exposed tools with mock prompts
3. Resources from `./res/` directories are correctly accessible through MCP tools
4. The MCP server responds correctly to MCP protocol messages
5. Developers are able to use the MCP server with AI assistants to create ServiceNow applications

## Open Questions

1. What is the expected performance baseline for command execution through the MCP server?
2. How should the MCP server handle versioning for different ServiceNow SDK versions?
3. What specific error handling strategies should be implemented for different failure scenarios?
4. How should resource caching be handled for optimal performance?
5. What logging strategy should be implemented for debugging purposes?
