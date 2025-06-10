import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig } from '../config.js';
import { ServerStatus } from '../types.js';
import { z } from 'zod';

/**
 * Implementation of the Model Context Protocol server for ServiceNow SDK
 *
 * This server provides ServiceNow SDK functionality to AI assistants and developers
 * through the standardized Model Context Protocol interface.
 */
export class FluentMcpServer {
  private mcpServer: McpServer | undefined;
  private transport: StdioServerTransport | undefined;
  private status: ServerStatus = ServerStatus.STOPPED;

  /**
   * Create a new MCP server instance
   */
  constructor() {
    // Initialize server with configuration
    const config = getConfig();

    // Create MCP server instance with server info
    this.mcpServer = new McpServer(
      {
        name: 'fluent-mcp-servicenow',
        version: '0.0.1',
        description: 'MCP Server for Fluent - ServiceNow SDK'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Create stdio transport for communication
    this.transport = new StdioServerTransport();

    // Register tools (will implement these later)
    this.registerTools();
  }

  /**
   * Register all MCP tools for ServiceNow SDK
   */
  private registerTools(): void {
    if (!this.mcpServer) {
      throw new Error('MCP server not initialized');
    }

    // Register ServiceNow SDK CLI command tools
    this.registerSdkCommandTools();

    // Register resource access tools
    this.registerResourceTools();
  }

  /**
   * Register ServiceNow SDK CLI command tools
   */
  private registerSdkCommandTools(): void {
    if (!this.mcpServer) return;

    // Version command
    this.mcpServer.tool(
      'sdk-version',
      'Get ServiceNow SDK version',
      {}, // Empty schema for a tool with no parameters
      async (_args, _extra) => {
        // Properly format the response with required content property
        return {
          content: [{ type: 'text', text: 'ServiceNow SDK version 3.0.2' }],
          structuredContent: { version: '3.0.2' }
        };
      }
    );

    // Auth command - using proper parameter schema format
    this.mcpServer.tool(
      'sdk-auth',
      'Manage ServiceNow SDK authentication',
      {
        action: z.enum(['add', 'list', 'delete', 'use']),
        instanceUrl: z.string().optional(),
        authType: z.enum(['oauth', 'basic']).optional(),
        alias: z.string().optional()
      },
      async (params, _extra) => {
        const { action, instanceUrl, authType, alias } = params;
        // Properly format the response with required content property
        return {
          content: [{ type: 'text', text: `Auth ${action} operation completed successfully` }],
          structuredContent: { success: true, message: `Auth ${action} completed` }
        };
      }
    );

    // More tools will be added here
  }

  /**
   * Register resource access tools for ServiceNow metadata
   */
  private registerResourceTools(): void {
    if (!this.mcpServer) return;

    // Get API specifications
    this.mcpServer.tool(
      'get-api-spec',
      'Get API specification for a ServiceNow metadata type',
      {
        metadataType: z.string().describe('ServiceNow metadata type (e.g., business-rule, script-include)')
      },
      async (params, _extra) => {
        const { metadataType } = params;
        // Properly format the response with required content property
        return {
          content: [{ type: 'text', text: `API specification for ${metadataType}` }],
          structuredContent: { spec: `API specification for ${metadataType}` }
        };
      }
    );

    // More resource tools will be added here
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.status === ServerStatus.RUNNING) {
      console.log('MCP server is already running');
      return;
    }

    try {
      this.status = ServerStatus.INITIALIZING;
      console.log('Starting MCP server...');

      if (!this.mcpServer || !this.transport) {
        throw new Error('MCP server not properly initialized');
      }

      // Connect the server to the stdio transport
      await this.mcpServer.connect(this.transport);

      console.log('MCP server initialized and connected via stdio');
      this.status = ServerStatus.RUNNING;
    } catch (error) {
      this.status = ServerStatus.STOPPED;
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.status !== ServerStatus.RUNNING) {
      console.log('MCP server is not running');
      return;
    }

    try {
      this.status = ServerStatus.STOPPING;
      console.log('Stopping MCP server...');

      if (this.mcpServer) {
        await this.mcpServer.close();
      }

      this.status = ServerStatus.STOPPED;
      console.log('MCP server stopped');
    } catch (error) {
      console.error('Error stopping MCP server:', error);
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
