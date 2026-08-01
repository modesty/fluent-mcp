import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig, findMissingResourcePaths } from '../config.js';
import { ServerStatus } from '../types.js';
import { CommandResultFactory } from '../utils/types.js';
import loggingManager from '../utils/loggingManager.js';
import logger from '../utils/logger.js';
import { ToolsManager } from '../tools/toolsManager.js';
import { ResourceManager } from '../res/resourceManager.js';
import { PromptManager } from '../prompts/promptManager.js';
import { McpResourceNotFoundError, McpInternalError } from '../utils/mcpErrors.js';

const SERVER_INSTRUCTIONS = [
  'Use explain_fluent_api for SDK APIs and guides, get-api-spec for metadata-type schemas,',
  'get-instruct for authoring guidance, and get-snippet for focused examples.',
  'For application work, run init_fluent_app, then build_fluent_app, then deploy_fluent_app.',
  'Instance authentication is validated lazily, cached in the session, and injected when a command needs it.',
].join(' ');

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
  private config: ReturnType<typeof getConfig>;
  private status: ServerStatus = ServerStatus.STOPPED;
  private initializationPromise: Promise<void>;

  /**
   * Create a new MCP server instance
   */
  constructor() {
    // Initialize server with configuration
    this.config = getConfig();

    // Create MCP server instance with server info from package.json
    this.mcpServer = new McpServer(
      {
        name: this.config.name,
        version: this.config.version,
        description: this.config.description,
      },
      {
        capabilities: {
          tools: {},
          resources: {}, // Enable resources capability
          // Note: 'elicitation' and 'roots' are ClientCapabilities, not ServerCapabilities
          // in MCP SDK v1.25+. Servers don't declare these - clients do.
          // The server can still USE these features by making requests to the client.
          prompts: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    // Initialize managers for tools, resources, and prompts
    this.toolsManager = new ToolsManager(this.mcpServer);
    this.resourceManager = new ResourceManager();
    this.promptManager = new PromptManager(this.mcpServer);

    // Initialize resources and prompts, then set up handlers
    // Store the promise so start() can await it before accepting connections
    this.initializationPromise = Promise.all([
      this.resourceManager.initialize(),
      this.promptManager.initialize()
    ]).then(() => {
      // Set up the handlers after initialization
      // Resources will be registered during start() to ensure proper timing
      this.setupHandlers();
    });
  }

  /**
   * Set up MCP protocol handlers for tools, resources, and prompts.
   */
  private setupHandlers(): void {
    const server = this.mcpServer?.server;
    if (!server) return;

    // Set up the tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolsManager.getMCPTools();
      return { tools };
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

    // Set up the resources/read handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        logger.debug('Reading resource', { uri });

        // Call ResourceManager to handle the read request
        const result = await this.resourceManager.readResource(uri);

        // Check if resource was not found (result has no contents)
        if (!result.contents || result.contents.length === 0) {
          throw new McpResourceNotFoundError(uri);
        }

        return result;
      } catch (error) {
        // Re-throw MCP errors as-is for proper error codes
        if (error instanceof McpResourceNotFoundError) {
          logger.warn('Resource not found', { uri });
          throw error;
        }

        // Wrap other errors as internal errors
        logger.error('Error reading resource',
          CommandResultFactory.normalizeError(error),
          { uri }
        );
        throw new McpInternalError(
          `Failed to read resource: ${CommandResultFactory.normalizeError(error).message}`
        );
      }
    });

    // Set up prompts handlers
    this.promptManager.setupHandlers();

    // Note: Tool calls are handled by the callbacks registered via mcpServer.registerTool() in ToolsManager.
    // We don't need a separate setRequestHandler for CallToolRequestSchema as that would conflict.
    //
    // There is deliberately no `notifications/initialized` handler: its only
    // remaining job was to trigger the transitional `roots/list` fetch, and MCP
    // 2026-07-28 both removed the handshake it belongs to and made
    // server-initiated requests illegal. Auth validation is lazy and
    // command-triggered (see ToolsManager.ensureAuthValidated).
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

      // Fail fast on a broken install before accepting connections: the resource
      // directories ship with the package (package.json "files": ["dist","res"]),
      // so a missing one means a corrupt install or a bad
      // FLUENT_MCP_RESOURCE_PATH_* override that would silently degrade the server.
      const missingResourcePaths = findMissingResourcePaths(this.config);
      if (missingResourcePaths.length > 0) {
        throw new Error(
          `Missing required resource directories: ${missingResourcePaths.join(', ')}. ` +
          'Verify the installation includes the res/ directory, or correct the ' +
          'FLUENT_MCP_RESOURCE_PATH_SPEC/SNIPPET/INSTRUCT environment overrides.'
        );
      }

      if (!this.mcpServer) {
        throw new Error('MCP server not properly initialized');
      }

      // Wait for handlers to be set up before accepting connections
      // This ensures notification handlers (like notifications/initialized) are registered
      // before the client can send them, preventing race conditions in auth validation
      await this.initializationPromise;

      // Create stdio transport for communication
      const transport = new StdioServerTransport();

      // Connect the server to the stdio transport
      await this.mcpServer.connect(transport);

      // Note: resources are served by the handlers in setupHandlers(), which call
      // resourceManager.listResources() and resourceManager.readResource().
      // ResourceManager holds no MCP server reference and registers nothing itself.

      this.status = ServerStatus.RUNNING;
      loggingManager.logServerStarted();
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
