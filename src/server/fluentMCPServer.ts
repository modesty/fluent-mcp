import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import { getConfig } from "../config.js";
import { ServerStatus } from "../types.js";
import {
  CLIExecutor,
  CommandFactory,
  CommandRegistry,
  NodeProcessRunner,
} from "../tools/cliCommandTools.js";
import { CommandResult } from "../utils/types.js";
import logger from "../utils/logger.js";

/**
 * Implementation of the Model Context Protocol server for ServiceNow SDK
 *
 * This server provides ServiceNow SDK functionality to AI assistants and developers
 * through the standardized Model Context Protocol interface.
 */
export class FluentMcpServer {
  private mcpServer: McpServer;
  private commandRegistry: CommandRegistry;
  private status: ServerStatus = ServerStatus.STOPPED;

  /**
   * Create a new MCP server instance
   */
  constructor() {
    // Initialize server with configuration
    const config = getConfig();
    this.commandRegistry = new CommandRegistry();

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
        },
      }
    );

    // Register tools (will implement these later)
	  this.registerTools();
	  this.setupHandlers();
  }

  /**
   * Register all MCP tools for ServiceNow SDK
   */
  private registerTools(): void {
    if (!this.mcpServer) {
      const error = new Error("MCP server not initialized");
      logger.error("Failed to register tools", error);
      throw error;
    }

    try {
      // Register ServiceNow SDK CLI command tools
      this.registerSdkCommandTools();

      // Register resource access tools
      this.registerResourceTools();

      logger.debug("All tools registered successfully");
    } catch (error) {
      logger.error("Error registering tools",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
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

    // Get API specifications
    this.mcpServer.tool(
      "get-api-spec",
      "Get API specification for a ServiceNow metadata type",
      {
        metadataType: z
          .string()
          .describe(
            "ServiceNow metadata type (e.g., business-rule, script-include)"
          ),
      },
      async (params, _extra) => {
        const { metadataType } = params;
        // Properly format the response with required content property
        return {
          content: [
            { type: "text", text: `API specification for ${metadataType}` },
          ],
          structuredContent: { spec: `API specification for ${metadataType}` },
        };
      }
    );

    // More resource tools will be added here
  }

  private setupHandlers(): void {
    const server = this.mcpServer?.server;
    // List available tools
    server?.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.commandRegistry.toMCPTools(),
      };
    });

    // Execute tool calls
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

      // Create stdio transport for communication
      const transport = new StdioServerTransport();

      // Connect the server to the stdio transport
      await this.mcpServer.connect(transport);

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
}
