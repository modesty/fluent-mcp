import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getConfig } from "../config.js";
import { ServerStatus } from "../types.js";
import { CommandResult } from "../utils/types.js";
import loggingManager from "../utils/loggingManager.js";
import { ToolsManager } from "../tools/toolsManager.js";
import { ResourceManager } from "../res/resourceManager.js";
import { PromptManager } from "../prompts/promptManager.js";

/**
 * Implementation of the Model Context Protocol server for Fluent (ServiceNow SDK) 
 *
 * This server provides Fluent (ServiceNow SDK) functionality to AI assistants and developers
 * through the standardized Model Context Protocol interface.
 */
export class FluentMcpServer {
  private mcpServer: McpServer;
  private toolsManager: ToolsManager;
  private resourceManager: ResourceManager;
  private promptManager: PromptManager;
  private status: ServerStatus = ServerStatus.STOPPED;

  /**
   * Create a new MCP server instance
   */
  constructor() {
    // Initialize server with configuration
    const config = getConfig();

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
          prompts: {
            listChanged: true, // Enable prompt list change notifications
          },
        },
      }
    );

    // Initialize managers for tools, resources, and prompts
    this.toolsManager = new ToolsManager(this.mcpServer);
    this.resourceManager = new ResourceManager(this.mcpServer);
    this.promptManager = new PromptManager(this.mcpServer);

    // Initialize resources and prompts
    Promise.all([
      this.resourceManager.initialize(),
      this.promptManager.initialize()
    ]).then(() => {
      // Now that all tools, resources, and prompts are registered, we can set up the handlers
      this.setupHandlers();
    });
  }

  /**
   * Format the result of a command execution
   * @param result The command result
   * @returns Formatted string with the result
   */
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
   * Set up MCP protocol handlers for tools, resources, prompts, and logging
   */
  private setupHandlers(): void {
    const server = this.mcpServer?.server;
    if (!server) return;
    
    // Set up the tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolsManager.getMCPTools(),
      };
    });

    // Set up the resources/list handler
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const resources = await this.resourceManager.listResources();
        return { resources };
      } catch (error) {
        loggingManager.logResourceListingFailed(error);
        return { resources: [] };
      }
    });
    
    // Set up prompts handlers
    this.promptManager.setupHandlers();
    
    // Execute tool calls handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const command = this.toolsManager.getCommand(name);
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
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.status === ServerStatus.RUNNING) {
      loggingManager.logServerAlreadyRunning();
      return;
    }

    try {
      this.status = ServerStatus.INITIALIZING;
      loggingManager.logServerStarting();

      if (!this.mcpServer) {
        throw new Error("MCP server not properly initialized");
      }

      // Create stdio transport for communication
      const transport = new StdioServerTransport();

      // Connect the server to the stdio transport
      await this.mcpServer.connect(transport);

      // Configure logging manager with MCP server
      loggingManager.configure(this.mcpServer);

      // Now that we're connected and have set up handlers, register resources
      // The prompt handlers are already registered by setupHandlers
      this.resourceManager.registerAll();

      loggingManager.logServerStarted();
      this.status = ServerStatus.RUNNING;
    } catch (error) {
      this.status = ServerStatus.STOPPED;
      loggingManager.logServerStartFailed(error, this.status);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.status !== ServerStatus.RUNNING) {
      loggingManager.logServerNotRunning(this.status);
      return;
    }

    try {
      this.status = ServerStatus.STOPPING;
      loggingManager.logServerStopping();

      if (this.mcpServer) {
        await this.mcpServer.close();
      }

      this.status = ServerStatus.STOPPED;
      loggingManager.logServerStopped();
    } catch (error) {
      loggingManager.logServerStopFailed(error, this.status);
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
}
