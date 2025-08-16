import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ListResourcesRequestSchema,
  ListRootsRequestSchema,
  RootsListChangedNotificationSchema,
  // ListPromptsRequestSchema, - Unused import
  // GetPromptRequestSchema, - Unused import
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig, getProjectRootPath } from '../config.js';
import { ServerStatus } from '../types.js';
import { CommandResult } from '../utils/types.js';
import loggingManager from '../utils/loggingManager.js';
import { ToolsManager } from '../tools/toolsManager.js';
import { ResourceManager } from '../res/resourceManager.js';
import { PromptManager } from '../prompts/promptManager.js';

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
  private roots: { uri: string; name?: string }[] = [];

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
          roots: {
            listChanged: true, // Enable root list change notifications
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
      return `✅ Output:\n${result.output}`;
    } else {
      return `❌ Error:\n${result.error || 'Unknown error'}\n(exit code: ${result.exitCode})\n${result.output}`;
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
    
    // Set up roots/list handler
    server.setRequestHandler(ListRootsRequestSchema, async () => {
      return {
        roots: this.roots,
      };
    });
    
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
              type: 'text',
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
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        } as CallToolResult;
      }
    });
  }

  /**
   * Update the list of roots and notify clients if changed
   * @param roots The new list of roots
   */
  async updateRoots(roots: { uri: string; name?: string }[]): Promise<void> {
    // Check if roots have changed
    const hasChanged = this.roots.length !== roots.length ||
      this.roots.some((root, index) => 
        root.uri !== roots[index]?.uri || 
        root.name !== roots[index]?.name
      );
    
    if (hasChanged) {
      this.roots = [...roots];
      
      // Update roots in tools manager
      this.toolsManager.updateRoots(this.roots);
      
      // Notify clients if server is running
      if (this.status === ServerStatus.RUNNING && this.mcpServer?.server) {
        await this.mcpServer.server.notification({
          method: 'notifications/roots/list_changed'
        });
        loggingManager.logRootsChanged(this.roots);
      }
    }
  }
  
  /**
   * Add a new root to the list of roots
   * @param uri The URI of the root
   * @param name Optional name for the root
   */
  async addRoot(uri: string, name?: string): Promise<void> {
    // Check if root already exists
    const existingIndex = this.roots.findIndex(root => root.uri === uri);
    
    if (existingIndex >= 0) {
      // Update existing root if name has changed
      if (this.roots[existingIndex].name !== name) {
        const updatedRoots = [...this.roots];
        updatedRoots[existingIndex] = { uri, name };
        await this.updateRoots(updatedRoots);
      }
    } else {
      // Add new root
      await this.updateRoots([...this.roots, { uri, name }]);
    }
  }
  
  /**
   * Remove a root from the list of roots
   * @param uri The URI of the root to remove
   */
  async removeRoot(uri: string): Promise<void> {
    const updatedRoots = this.roots.filter(root => root.uri !== uri);
    
    if (updatedRoots.length !== this.roots.length) {
      await this.updateRoots(updatedRoots);
    }
  }
  
  /**
   * Get the current list of roots
   * @returns The list of roots
   */
  getRoots(): { uri: string; name?: string }[] {
    return [...this.roots];
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
        throw new Error('MCP server not properly initialized');
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
      
      // Initialize roots with project root path if not already set
      if (this.roots.length === 0) {
        const projectRoot = getProjectRootPath();
        await this.addRoot(projectRoot, 'Project Root');
      }

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
