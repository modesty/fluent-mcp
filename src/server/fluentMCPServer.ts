import { z } from "zod";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getConfig } from "../config.js";
import { ServerStatus } from "../types.js";
import {
  CLIExecutor,
  CommandFactory,
  CommandRegistry,
  NodeProcessRunner,
} from "../tools/cliCommandTools.js";
import { CLICommand, CommandArgument, CommandResult } from "../utils/types.js";
import logger, { LogLevel } from "../utils/logger.js";
import { ResourceLoader, ResourceType } from "../utils/resourceLoader.js";
// Import resource tools
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  ListMetadataTypesCommand,
} from "../tools/resourceTools.js";

/**
 * Implementation of the Model Context Protocol server for ServiceNow SDK
 *
 * This server provides ServiceNow SDK functionality to AI assistants and developers
 * through the standardized Model Context Protocol interface.
 */
export class FluentMcpServer {
  private mcpServer: McpServer;
  private commandRegistry: CommandRegistry;
  private resourceLoader: ResourceLoader;
  private status: ServerStatus = ServerStatus.STOPPED;
  private metadataTypes: string[] = [];

  /**
   * Create a new MCP server instance
   */
  constructor() {
    // Initialize server with configuration
    const config = getConfig();
    this.commandRegistry = new CommandRegistry();
    this.resourceLoader = new ResourceLoader();

    // Create MCP server instance with server info from package.json
    this.mcpServer = new McpServer(
      {
        name: config.name,
        version: config.version,
        description: config.description,
      },
      {
        capabilities: {
          tools: {},
          resources: {}, // Enable resources capability
          logging: {},   // Enable logging capability
        },
      }
    );

    // Register tools and setup handlers at last
    // Both setRequestHandler and registerTool/registerResource should be called only once
    this.registerSdkCommandTools();
    this.registerResourceTools();
    this.registerResources().then(() => {
      // Now that all tools and resources are registered, we can set up the handlers
      this.setupHandlers();
    });
  }

  /**
   * Register all MCP tools for ServiceNow SDK - NOT USED ANYMORE
   * Tools are now registered directly in the constructor
   */
  private registerTools(): void {
    logger.warn("registerTools method is deprecated and no longer used.");
  }

  /**
   * Register ServiceNow SDK CLI command tools
   */
  private registerSdkCommandTools(): void {
    if (!this.mcpServer) return;

    // // Version command
    // this.mcpServer.tool(
    //   'sdk-version',
    //   'Get ServiceNow SDK version',
    //   {}, // Empty schema for a tool with no parameters
    //   async (_args, _extra) => {
    //     // Properly format the response with required content property
    //     return {
    //       content: [{ type: 'text', text: 'ServiceNow SDK version 3.0.2' }],
    //       structuredContent: { version: '3.0.2' }
    //     };
    //   }
    // );

    // // Auth command - using proper parameter schema format
    // this.mcpServer.tool(
    //   'sdk-auth',
    //   'Manage ServiceNow SDK authentication',
    //   {
    //     action: z.enum(['add', 'list', 'delete', 'use']),
    //     instanceUrl: z.string().optional(),
    //     authType: z.enum(['oauth', 'basic']).optional(),
    //     alias: z.string().optional()
    //   },
    //   async (params, _extra) => {
    //     const { action, instanceUrl, authType, alias } = params;
    //     // Properly format the response with required content property
    //     return {
    //       content: [{ type: 'text', text: `Auth ${action} operation completed successfully` }],
    //       structuredContent: { success: true, message: `Auth ${action} completed` }
    //     };
    //   }
    // );

    // More tools will be added here
    const processRunner = new NodeProcessRunner();
    const cliExecutor = new CLIExecutor(processRunner);
    const commands = CommandFactory.createCommands(cliExecutor);

    commands.forEach((command) => {
      this.commandRegistry.register(command);
    });
  }

  /**
   * Register resource access tools for ServiceNow metadata
   */
  private registerResourceTools(): void {
    if (!this.mcpServer) return;

    try {
      // Register metadata type listing tool
      const listMetadataTypesCommand = new ListMetadataTypesCommand();
      this.commandRegistry.register(listMetadataTypesCommand);
      this.registerToolFromCommand(listMetadataTypesCommand);

      // Register API specification tool
      const getApiSpecCommand = new GetApiSpecCommand();
      this.commandRegistry.register(getApiSpecCommand);
      this.registerToolFromCommand(getApiSpecCommand);

      // Register code snippet tool
      const getSnippetCommand = new GetSnippetCommand();
      this.commandRegistry.register(getSnippetCommand);
      this.registerToolFromCommand(getSnippetCommand);

      // Register instruction tool
      const getInstructCommand = new GetInstructCommand();
      this.commandRegistry.register(getInstructCommand);
      this.registerToolFromCommand(getInstructCommand);

      // Resource templates are registered in registerResources()

      logger.debug("Resource tools registered successfully");
    } catch (error) {
      logger.error("Error registering resource tools",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
  
  /**
   * Registers a command as an MCP tool
   * @param command The command to register
   */
  private registerToolFromCommand(command: CLICommand): void {
    if (!this.mcpServer) return;
    
    // Convert command arguments to Zod schema
    const schema: Record<string, z.ZodTypeAny> = {};
    
    // Build schema from command arguments
    for (const arg of command.arguments) {
      let zodType: z.ZodTypeAny;
      
      // Map command argument types to Zod types
      switch (arg.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        default:
          zodType = z.any();
      }
      
      // Make optional if not required
      if (!arg.required) {
        zodType = zodType.optional();
      }
      
      schema[arg.name] = zodType;
    }
    
    // Register with MCP server
    this.mcpServer.registerTool(
      command.name,
      {
        title: command.name,
        description: command.description,
        inputSchema: schema
      },
      async (params: Record<string, unknown>) => {
        const result = await command.execute(params);
        return {
          content: [{ type: 'text', text: result.output }],
          structuredContent: { success: result.success }
        };
      }
    );
  }



  /**
   * Register ServiceNow metadata resources that can be accessed through MCP resources
   * Only load metadata types here - actual resource registration happens after setRequestHandler in start()
   */
  private async registerResources(): Promise<void> {
    if (!this.mcpServer) return;

    try {
      // Get available metadata types
      this.metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();
      logger.debug(`Loaded ${this.metadataTypes.length} metadata types for resources`);
    } catch (error) {
      logger.error("Error loading metadata types",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Register API specification resources
   */
  private registerSpecResources(): void {
    // Register one resource for each metadata type's API spec
    for (const type of this.metadataTypes) {
      const template = new ResourceTemplate(`sn-spec://${type}`, { list: undefined });
      
      this.mcpServer.registerResource(
        `sn-spec-${type}`,
        template,
        {
          title: `ServiceNow ${type} API Specification`,
          description: `API specification for ServiceNow ${type}`,
          mimeType: "text/markdown"
        },
        async (uri: URL) => {
          try {
            // Extract metadata type from URI
            const metadataType = uri.host;
            
            // Get resource content
            const result = await this.resourceLoader.getResource(
              ResourceType.SPEC,
              metadataType
            );
            
            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `API specification not found for ${metadataType}`
                }]
              };
            }
            
            return {
              contents: [{
                uri: uri.href,
                text: result.content
              }]
            };
          } catch (error) {
            logger.error(`Error reading API spec resource for ${uri.href}`,
              error instanceof Error ? error : new Error(String(error))
            );
            
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving API specification: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }]
            };
          }
        }
      );
    }
  }

  /**
   * Register code snippet resources
   */
  private registerSnippetResources(): void {
    // Register a template for each metadata type with dynamic parameters for snippet ID
    for (const type of this.metadataTypes) {
      const template = new ResourceTemplate(`sn-snippet://${type}/{snippetId}`, { 
        list: undefined,
        complete: {
          // Provide completions for snippet IDs
          snippetId: async (value: string) => {
            try {
              const snippets = await this.resourceLoader.listSnippets(type);
              return snippets.filter(id => id.startsWith(value || ''));
            } catch (error) {
              logger.error(`Error completing snippet IDs for ${type}`, 
                error instanceof Error ? error : new Error(String(error))
              );
              return [];
            }
          }
        }
      });
      
      this.mcpServer.registerResource(
        `sn-snippet-${type}`,
        template,
        {
          title: `ServiceNow ${type} Code Snippets`,
          description: `Example code snippets for ServiceNow ${type}`,
          mimeType: "text/markdown"
        },
        async (uri: URL, extra: any) => {
          try {
            // Extract metadata type from URI and snippet ID from template params
            const metadataType = uri.host;
            const snippetId = extra.arguments?.snippetId;
            
            // Get resource content
            const result = await this.resourceLoader.getResource(
              ResourceType.SNIPPET,
              metadataType,
              snippetId
            );
            
            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `Snippet not found for ${metadataType}`
                }]
              };
            }
            
            return {
              contents: [{
                uri: uri.href,
                text: result.content
              }]
            };
          } catch (error) {
            logger.error(`Error reading snippet resource for ${uri.href}`,
              error instanceof Error ? error : new Error(String(error))
            );
            
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving snippet: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }]
            };
          }
        }
      );
    }
  }

  /**
   * Register instruction resources
   */
  private registerInstructResources(): void {
    // Register one resource for each metadata type's instruction
    for (const type of this.metadataTypes) {
      const template = new ResourceTemplate(`sn-instruct://${type}`, { list: undefined });
      
      this.mcpServer.registerResource(
        `sn-instruct-${type}`,
        template,
        {
          title: `ServiceNow ${type} Instructions`,
          description: `Development instructions for ServiceNow ${type}`,
          mimeType: "text/markdown"
        },
        async (uri: URL) => {
          try {
            // Extract metadata type from URI
            const metadataType = uri.host;
            
            // Get resource content
            const result = await this.resourceLoader.getResource(
              ResourceType.INSTRUCT,
              metadataType
            );
            
            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `Instructions not found for ${metadataType}`
                }]
              };
            }
            
            return {
              contents: [{
                uri: uri.href,
                text: result.content
              }]
            };
          } catch (error) {
            logger.error(`Error reading instruction resource for ${uri.href}`,
              error instanceof Error ? error : new Error(String(error))
            );
            
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving instructions: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }]
            };
          }
        }
      );
    }
  }

  private setupHandlers(): void {
    const server = this.mcpServer?.server;
    // List available tools handler is set in the start method

    // Execute tool calls handler is set in the start method

    // List available resources handler is set in the start method

    // Add handler for logging/setLevel - this will be added in the start method now
  }

  private formatResult(result: CommandResult): string {
    if (result.success) {
      return `✅ Command executed successfully\n\nOutput:\n${result.output}`;
    } else {
      return `❌ Command failed (exit code: ${result.exitCode})\n\nError:\n${
        result.error || "Unknown error"
      }\n\nOutput:\n${result.output}`;
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.status === ServerStatus.RUNNING) {
      logger.info("MCP server is already running");
      return;
    }

    try {
      this.status = ServerStatus.INITIALIZING;
      logger.info("Starting MCP server...");

      if (!this.mcpServer) {
        throw new Error("MCP server not properly initialized");
      }

      // Set up handlers required by the MCP protocol
      const server = this.mcpServer.server;
      
      // Set up the tools/list handler
      server?.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
          tools: this.commandRegistry.toMCPTools(),
        };
      });

      // Set up the resources/list handler
      server?.setRequestHandler(ListResourcesRequestSchema, async () => {
        try {
          // Get metadata types to build resource URIs
          if (!this.metadataTypes || this.metadataTypes.length === 0) {
            this.metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();
          }
          
          const resources = [];
          
          // Add spec resources
          for (const type of this.metadataTypes) {
            resources.push({
              uri: `sn-spec://${type}`,
              title: `ServiceNow ${type} API Specification`,
              mimeType: "text/markdown"
            });
          }
          
          // Add instruction resources
          for (const type of this.metadataTypes) {
            resources.push({
              uri: `sn-instruct://${type}`,
              title: `ServiceNow ${type} Instructions`,
              mimeType: "text/markdown"
            });
          }
          
          // For snippets, use the first one of each type
          for (const type of this.metadataTypes) {
            try {
              const snippetIds = await this.resourceLoader.listSnippets(type);
              if (snippetIds.length > 0) {
                resources.push({
                  uri: `sn-snippet://${type}/${snippetIds[0]}`,
                  title: `ServiceNow ${type} Code Snippet`,
                  mimeType: "text/markdown"
                });
              }
            } catch (error) {
              logger.error(`Error listing snippets for ${type}`,
                error instanceof Error ? error : new Error(String(error))
              );
            }
          }
          
          return { resources };
        } catch (error) {
          logger.error("Error listing resources", 
            error instanceof Error ? error : new Error(String(error))
          );
          return { resources: [] };
        }
      });
      
      // Logging capability is enabled in the constructor but handlers are set up by the McpServer
      // in the connect call using the SDK default handlers
      
      // Execute tool calls handler
      server?.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        const command = this.commandRegistry.getCommand(name);
        if (!command) {
          throw new Error(`Unknown command: ${name}`);
        }

        try {
          const result = await command.execute(args || {});

          return {
            content: [
              {
                type: "text",
                text: this.formatResult(result),
              },
            ],
          } as CallToolResult;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          return {
            content: [
              {
                type: "text",
                text: `Error: ${errorMessage}`,
              },
            ],
            isError: true,
          } as CallToolResult;
        }
      });

      // Create stdio transport for communication
      const transport = new StdioServerTransport();

      // Connect the server to the stdio transport
      await this.mcpServer.connect(transport);

      // Connect logger to MCP server for notifications
      logger.setMcpServer(this.mcpServer);
      
      // Try to setup logging/setLevel handler using the logger
      logger.setupLoggingHandlers();

      // Now that we're connected and have set up handlers, register resources
      this.registerSpecResources();
      this.registerSnippetResources();
      this.registerInstructResources();

      logger.info("MCP server initialized and connected via stdio");
      this.status = ServerStatus.RUNNING;
    } catch (error) {
      this.status = ServerStatus.STOPPED;
      logger.error("Failed to start MCP server",
        error instanceof Error ? error : new Error(String(error)),
        { status: this.status }
      );
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.status !== ServerStatus.RUNNING) {
      logger.info("MCP server is not running", { status: this.status });
      return;
    }

    try {
      this.status = ServerStatus.STOPPING;
      logger.info("Stopping MCP server...");

      if (this.mcpServer) {
        await this.mcpServer.close();
      }

      this.status = ServerStatus.STOPPED;
      logger.info("MCP server stopped");
    } catch (error) {
      logger.error("Error stopping MCP server",
        error instanceof Error ? error : new Error(String(error)),
        { status: this.status }
      );
      this.status = ServerStatus.STOPPED;
      throw error;
    }
  }

  /**
   * Get the current status of the server
   */
  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * This method is no longer used - using registerToolFromCommand instead
   * Keep as a stub for backward compatibility
   */
  private commandToSchema(command: CLICommand): Record<string, any> {
    // Convert to a simple schema object
    const schema: Record<string, any> = {};
    
    for (const arg of command.arguments) {
      schema[arg.name] = arg.required ? {} : { optional: true };
    }
    
    return schema;
  }
}
