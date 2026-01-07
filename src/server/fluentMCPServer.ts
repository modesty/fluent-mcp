import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListRootsRequestSchema,
  RootsListChangedNotificationSchema,
  InitializedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig, getProjectRootPath } from '../config.js';
import { ServerStatus, AuthValidationResult } from '../types.js';
import { CommandResult } from '../utils/types.js';
import { LogLevel } from '../utils/logger.js';
import loggingManager from '../utils/loggingManager.js';
import logger from '../utils/logger.js';
import { ToolsManager } from '../tools/toolsManager.js';
import { ResourceManager } from '../res/resourceManager.js';
import { PromptManager } from '../prompts/promptManager.js';
import { autoValidateAuthIfConfigured } from './fluentInstanceAuth.js';
import { SamplingManager } from '../utils/samplingManager.js';

/** Delay before fallback initialization if client doesn't send notifications */
const INITIALIZATION_DELAY_MS = 1000;

/** Timeout for client roots request before using fallback */
const CLIENT_ROOTS_TIMEOUT_MS = 2000;

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
  private samplingManager: SamplingManager;
  private config: ReturnType<typeof getConfig>;
  private status: ServerStatus = ServerStatus.STOPPED;
  private roots: { uri: string; name?: string }[] = [];
  private autoAuthTriggered = false;
  private clientInitialized = false;
  private pendingAuthResult: AuthValidationResult | null = null;
  private initializationPromise: Promise<void>;
  private delayedInitTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
          logging: {},   // Enable logging capability
          // Note: 'elicitation', 'sampling', and 'roots' are ClientCapabilities, not ServerCapabilities
          // in MCP SDK v1.25+. Servers don't declare these - clients do.
          // The server can still USE these features by making requests to the client.
          prompts: {
            listChanged: true, // Enable prompt list change notifications
          },
        },
      }
    );

    // Initialize managers for tools, resources, prompts, and sampling
    this.toolsManager = new ToolsManager(this.mcpServer);
    this.resourceManager = new ResourceManager(this.mcpServer);
    this.promptManager = new PromptManager(this.mcpServer);
    this.samplingManager = new SamplingManager(this.mcpServer);

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
   * Format the result of a command execution
   * @param result The command result
   * @returns Formatted string with the result
   */
  private formatResult(result: CommandResult): string {
    if (result.success) {
      return `✅ Output:\n${result.output}`;
    } else {
      let errorOutput = `❌ Error:\n${result.error || 'Unknown error'}\n(exit code: ${result.exitCode})\n${result.output}`;
      
      // Append AI error analysis if available
      if (result.errorAnalysis) {
        errorOutput += '\n' + this.samplingManager.formatAnalysis(result.errorAnalysis);
      }
      
      return errorOutput;
    }
  }

  /**
   * Send authentication status notification to the client
   * Uses the 'authentication' logger name per MCP best practices
   * @param result The auth validation result to send
   */
  private sendAuthStatusNotification(result: AuthValidationResult): void {
    // Determine appropriate log level based on auth status
    let level: LogLevel;
    switch (result.status) {
      case 'authenticated':
        level = LogLevel.INFO;
        break;
      case 'skipped':
        level = LogLevel.DEBUG;
        break;
      case 'not_authenticated':
        level = LogLevel.NOTICE;
        break;
      case 'validation_error':
        level = LogLevel.WARNING;
        break;
      default:
        level = LogLevel.INFO;
    }

    // Build structured data for the notification (exclude sensitive info)
    const data: Record<string, unknown> = {
      status: result.status,
      timestamp: result.timestamp,
    };

    if (result.alias) data.alias = result.alias;
    if (result.host) data.host = result.host;
    if (result.authType) data.authType = result.authType;
    if (result.isDefault !== undefined) data.isDefault = result.isDefault;
    if (result.actionRequired) data.actionRequired = result.actionRequired;

    // Send notification with dedicated 'authentication' logger name
    logger.sendNotification(level, result.message, data, 'authentication');
  }

  /**
   * Handle auth validation result - either send immediately or queue for later
   * @param result The auth validation result
   */
  private handleAuthResult(result: AuthValidationResult): void {
    if (this.clientInitialized) {
      // Client already initialized, send immediately
      this.sendAuthStatusNotification(result);
    } else {
      // Queue for sending after client initialization
      this.pendingAuthResult = result;
      logger.debug('Auth result queued for notification after client initialized');
    }
  }

  // auto-auth code moved to fluentInstanceAuto.ts

  /**
   * Schedule a delayed initialization to ensure roots and auth are set up
   * This provides a fallback if the client doesn't send proper notifications
   */
  private scheduleDelayedInitialization(): void {
    // Prevent scheduling multiple fallback timers
    if (this.delayedInitTimeoutId !== null) {
      return;
    }

    // Give the client some time to send notifications, then fallback
    this.delayedInitTimeoutId = setTimeout(async () => {
      try {
        // Only initialize if roots haven't been set up yet
        if (this.roots.length === 0) {
          logger.info('No roots received from client after delay, using fallback initialization...');
          
          // Try to request from client first, with short timeout
          try {
            await Promise.race([
              this.requestRootsFromClient(),
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Client roots request timeout')), CLIENT_ROOTS_TIMEOUT_MS)
              )
            ]);
          } catch (error) {
            // If client doesn't respond, use project root as fallback
            logger.warn(`Client did not provide roots, using project root fallback: ${error}`);
            const projectRoot = getProjectRootPath();
            await this.addRoot(`file://${projectRoot}`, 'Project Root (Fallback)');
          }
        }
        
        // Trigger auth validation if not already triggered
        if (!this.autoAuthTriggered) {
          this.autoAuthTriggered = true;
          logger.info('Triggering auto-auth validation...');
          try {
            const result = await autoValidateAuthIfConfigured(this.toolsManager);
            this.handleAuthResult(result);
          } catch (error) {
            logger.warn('Auto-auth validation failed', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch (error) {
        logger.error('Error during delayed initialization',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, INITIALIZATION_DELAY_MS);
  }

  /**
   * Request the list of roots from the client
   * This is called after the client sends the notifications/initialized notification
   * or when a roots/list_changed notification is received
   * @returns Promise that resolves when roots are updated
   */
  private async requestRootsFromClient(): Promise<void> {
    if (!this.mcpServer?.server) {
      logger.warn('Cannot request roots - MCP server not available');
      return;
    }

    logger.info('Requesting roots from client via roots/list...');
    
    try {
      // Create a schema for the response using the Zod library
      // This is needed because the request method requires a result schema
      const RootsResponseSchema = z.object({
        roots: z.array(z.object({
          uri: z.string(),
          name: z.string().optional()
        }))
      });

      type RootsResponse = z.infer<typeof RootsResponseSchema>;

      // Using the correct request format with schema
      // Note: The MCP SDK request method expects a specific schema type, but we use our own Zod schema
      const response = await this.mcpServer.server.request(
        { method: 'roots/list' },
        RootsResponseSchema
      ) as RootsResponse;

      const roots = response.roots;
      
      if (Array.isArray(roots) && roots.length > 0) {
        logger.info('Received roots from client', { rootCount: roots.length });
        
        // Update roots with client-provided roots
        await this.updateRoots(roots);
      } else {
        logger.warn('Client responded to roots/list but provided no roots');
        
        // Fall back to project root if no valid roots received
        if (this.roots.length === 0) {
          const projectRoot = getProjectRootPath();
          logger.info('Using project root as fallback', { projectRoot });
          await this.addRoot(projectRoot, 'Project Root');
        }
      }
    } catch (error) {
      logger.error('Error requesting roots from client', 
        error instanceof Error ? error : new Error(String(error))
      );
      
      // Fall back to project root if request fails
      if (this.roots.length === 0) {
        const projectRoot = getProjectRootPath();
        logger.info('Using project root as fallback after error', { projectRoot });
        await this.addRoot(projectRoot, 'Project Root');
      }
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
      const tools = this.toolsManager.getMCPTools();
      
      // Start a delayed initialization process to ensure roots and auth are set up
      // even if the client doesn't send proper notifications
      this.scheduleDelayedInitialization();
      
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
    // The SDK's registerResource() doesn't automatically set up the read handler
    // We need to explicitly handle resource read requests
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        logger.debug('Reading resource', { uri });
        
        // Call ResourceManager to handle the read request
        const result = await this.resourceManager.readResource(uri);
        return result;
      } catch (error) {
        logger.error('Error reading resource',
          error instanceof Error ? error : new Error(String(error)),
          { uri }
        );
        throw error;
      }
    });
    
    // Set up prompts handlers
    this.promptManager.setupHandlers();
    
    // Set up roots/list handler
    server.setRequestHandler(ListRootsRequestSchema, async () => {
      logger.debug('Received roots/list request, returning current roots');
      return {
        roots: this.roots,
      };
    });
    
    // Set up handler for notifications/initialized
    server.setNotificationHandler(InitializedNotificationSchema, async () => {
      logger.info('Received notifications/initialized notification from client');

      // Cancel the delayed initialization fallback since proper init is happening
      if (this.delayedInitTimeoutId !== null) {
        clearTimeout(this.delayedInitTimeoutId);
        this.delayedInitTimeoutId = null;
        logger.debug('Cancelled delayed initialization fallback - proper init received');
      }

      // Mark client as initialized
      this.clientInitialized = true;

      // Send any pending auth notification now that client is ready
      if (this.pendingAuthResult) {
        this.sendAuthStatusNotification(this.pendingAuthResult);
        this.pendingAuthResult = null;
      }

      // Request the list of roots from the client now that initialization is complete
      try {
        await this.requestRootsFromClient();
      } catch (error) {
        logger.error('Failed to request roots after initialization notification',
          error instanceof Error ? error : new Error(String(error))
        );
      }

      // Trigger auth validation via the proper initialization path
      if (!this.autoAuthTriggered) {
        this.autoAuthTriggered = true;
        logger.info('Triggering auto-auth validation after client initialization...');
        try {
          const result = await autoValidateAuthIfConfigured(this.toolsManager);
          this.handleAuthResult(result);
        } catch (error) {
          logger.warn('Auto-auth validation failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
    
    // Set up handler for roots/list_changed notification
    server.setNotificationHandler(RootsListChangedNotificationSchema, async () => {
      logger.info('Received notifications/roots/list_changed notification from client');
      
      // When a root list change notification is received, request the updated roots list
      try {
        await this.requestRootsFromClient();
      } catch (error) {
        logger.error('Failed to request updated roots after notification', 
          error instanceof Error ? error : new Error(String(error))
        );
      }
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

        // If command failed and error analysis is enabled, analyze the error
        if (!result.success && this.config.sampling.enableErrorAnalysis && result.error) {
          const errorMessage = result.error.message;
          
          if (this.samplingManager.shouldAnalyzeError(errorMessage, this.config.sampling.minErrorLength)) {
            logger.info('Triggering error analysis for failed command', { command: name });
            
            try {
              const analysis = await this.samplingManager.analyzeError({
                command: name,
                args: Object.entries(args || {}).map(([key, value]) => `${key}=${value}`),
                errorOutput: errorMessage,
                exitCode: result.exitCode,
              });
              
              if (analysis) {
                result.errorAnalysis = analysis;
              }
            } catch (analysisError) {
              // Log but don't fail the tool call if analysis fails
              logger.warn('Error analysis failed', {
                error: analysisError instanceof Error ? analysisError.message : String(analysisError),
              });
            }
          }
        }

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
    // Validate roots - ensure all URIs exist and are valid
    const validatedRoots = roots.filter(root => {
      if (!root.uri) {
        logger.warn('Ignoring root with empty URI');
        return false;
      }
      return true;
    });
    
    // Check if roots have changed
    const hasChanged = this.roots.length !== validatedRoots.length ||
      this.roots.some((root, index) => 
        root.uri !== validatedRoots[index]?.uri || 
        root.name !== validatedRoots[index]?.name
      );
    
    if (hasChanged) {
      this.roots = [...validatedRoots];
      
      // Only update tools manager with the roots if the server is running
      // or if the status is INITIALIZING (for tests)
      // This prevents unnecessary updates during initialization
      if (this.status === ServerStatus.RUNNING || this.status === ServerStatus.INITIALIZING) {
        // Update roots in tools manager
        this.toolsManager.updateRoots(this.roots);
        // Notify clients if server is running
        if (this.status === ServerStatus.RUNNING && this.mcpServer?.server) {
          // Use the SDK's notification method for roots/list_changed
          await this.mcpServer.server.notification({
            method: 'notifications/roots/list_changed'
          });
          // Log the root change only once at this level
          loggingManager.logRootsChanged(this.roots);
        }
        // Note: Auto-auth is triggered via scheduleDelayedInitialization() only,
        // which provides a single, predictable entry point for auth validation
      }
    }
  }
  
  /**
   * Add a new root to the list of roots
   * @param uri The URI of the root
   * @param name Optional name for the root
   */
  async addRoot(uri: string, name?: string): Promise<void> {
    // Validate root URI
    if (!uri) {
      logger.warn('Attempted to add root with empty URI, ignoring');
      return;
    }
    
    // Check if root already exists
    const existingIndex = this.roots.findIndex(root => root.uri === uri);
    
    if (existingIndex >= 0) {
      // Update existing root if name has changed
      if (this.roots[existingIndex].name !== name) {
        logger.debug(`Updating existing root: ${uri} from name '${this.roots[existingIndex].name}' to '${name}'`);
        const updatedRoots = [...this.roots];
        updatedRoots[existingIndex] = { uri, name };
        await this.updateRoots(updatedRoots);
      } else {
        logger.debug(`Root already exists with same name, no update needed: ${uri} (${name})`);
      }
    } else {
      // Add new root
      logger.debug(`Adding new root: ${uri}${name ? ` (${name})` : ''}, server status: ${this.status}`);
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

      // Wait for handlers to be set up before accepting connections
      // This ensures notification handlers (like notifications/initialized) are registered
      // before the client can send them, preventing race conditions in auth validation
      await this.initializationPromise;

      // Create stdio transport for communication
      const transport = new StdioServerTransport();

      // Connect the server to the stdio transport
      await this.mcpServer.connect(transport);

      // Configure logging manager with MCP server
      loggingManager.configure(this.mcpServer);

      // Note: Resources are handled by manual handlers in setupHandlers() that use
      // resourceManager.listResources() and resourceManager.readResource().
      // We don't call resourceManager.registerAll() here because it would try to
      // set up duplicate resources/list handlers via the SDK's registerResource().

      // Set the server status to running before initializing roots
      // This ensures that client notifications will be sent correctly
      this.status = ServerStatus.RUNNING;
      loggingManager.logServerStarted();
      
      // The root list will be requested when the client sends the notifications/initialized notification
      // This ensures proper timing according to the MCP protocol
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
