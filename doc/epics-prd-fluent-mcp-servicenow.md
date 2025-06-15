## Relevant Files

- `src/index.ts` - Entry point for the MCP server, contains the main server setup and initialization
- `src/server/fluentMCPServer.ts` - Core MCP server implementation using the MCP TypeScript SDK
- `src/tools/index.ts` - Exports for all MCP tools
- `src/tools/cliCommandTools.ts` - Utility for executing ServiceNow SDK CLI commands
- `src/tools/commands/index.ts` - Exports for all command implementations
- `src/tools/commands/baseCommand.ts` - Base class for all command implementations
- `src/tools/commands/authCommand.ts` - Authentication command implementation
- `src/tools/commands/initCommand.ts` - Init command implementation for creating new ServiceNow applications
- `src/tools/commands/versionCommand.ts` - Version command implementation
- `src/tools/commands/helpCommand.ts` - Help command implementation
- `src/tools/commands/debugCommand.ts` - Debug command implementation
- `src/tools/commands/upgradeCommand.ts` - Upgrade command implementation
- `src/tools/resources.ts` - MCP tools for accessing API specs, snippets, and instructions
- `src/utils/resourceLoader.ts` - Utility for loading resources from the res/ directory
- `src/utils/logger.ts` - Logging utility that provides structured JSON logging with timestamps
- `src/utils/types.ts` - TypeScript type definitions for command execution and utilities
- `src/types/index.ts` - TypeScript type definitions for the MCP server and tools
- `src/config.ts` - Configuration for the MCP server
- `src/test/tools/initCommand.test.ts` - Unit tests for the Init command
- `src/test/tools/authCommand.test.ts` - Unit tests for the Auth command
- `src/test/tools/sdkCommands.test.ts` - Unit tests for the SDK commands tools
- `src/test/tools/resources.test.ts` - Unit tests for the resources tools
- `src/test/server/mcpServer.test.ts` - Unit tests for the MCP server

### Notes

- Unit tests should typically be placed under `/src/test/` , with the same file base name as the source code file they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the `src/test/` directory).
- Use `npm test` to run tests. Running without a path executes all tests found by the Jest configuration.

## Epics and Stories

- [x] 1.0 Set up project infrastructure and MCP server
    - [x] 1.1 Initialize a new Node.js/TypeScript project with package.json, tsconfig.json, and initial folder structure
    - [x] 1.2 Install required dependencies including MCP TypeScript SDK and ServiceNow SDK
    - [x] 1.3 Create base MCP server implementation using stdio transport
    - [x] 1.4 Set up configuration management for the MCP server, create `src/config.ts` to manage server settings and environment variables, also incorporate package.json for version, name, and description exposure and reference
    - [x] 1.5 Implement error handling and logging mechanism, create `src/utils/logger.ts` that wraps console log, info, warn, error, and debug methods and ensure the output is formatted as JSON with a timestamp

- [ ] 2.0 Implement MCP tools for ServiceNow SDK CLI commands
    - [x] 2.1 Create command execution helper in `tools/cliCommandTools.ts` for running ServiceNow SDK CLI commands
    - [x] 2.2 Implement MCP tool for basic SDK commands (version, help, debug, upgrade)
    - [x] 2.3 Implement MCP tool for authentication commands
    - [x] 2.4 Implement MCP tool for initialization commands
    - [x] 2.5 Implement MCP tool for build commands
    - [x] 2.6 Implement MCP tool for install commands
    - [x] 2.7 Implement MCP tool for transform commands
    - [x] 2.8 Implement MCP tool for dependencies commands

- [ ] 3.0 Implement MCP tools for accessing resources
    - [ ] 3.1 Develop resource loading utility to access files in the res/ directory
    - [ ] 3.2 Implement MCP tool for accessing API specifications from res/spec/
    - [ ] 3.3 Implement MCP tool for accessing code snippets from res/snippet/
    - [ ] 3.4 Implement MCP tool for accessing instructions from res/instruct/
    - [ ] 3.5 Create query functionality to filter resources by metadata type
    - [ ] 3.6 Implement caching mechanism for improved performance

- [ ] 4.0 Create package structure and documentation
    - [ ] 4.1 Organize code structure according to npm package best practices
    - [ ] 4.2 Create TypeScript type definitions for all modules
    - [ ] 4.3 Generate API documentation using TypeDoc
    - [ ] 4.4 Write README.md with installation and usage instructions
    - [ ] 4.5 Create example configurations and usage scenarios
    - [ ] 4.6 Set up npm package configuration for publishing

- [ ] 5.0 Implement testing and quality assurance measures
    - [ ] 5.1 Set up Jest testing framework with TypeScript support
    - [ ] 5.2 Write unit tests for MCP server implementation
    - [ ] 5.3 Write unit tests for SDK command tools
    - [ ] 5.4 Write unit tests for resource tools
    - [ ] 5.5 Implement integration tests with mock ServiceNow SDK
    - [ ] 5.6 Set up GitHub Actions workflow for continuous integration
    - [ ] 5.7 Add code quality tools (ESLint, Prettier) with appropriate configuration
