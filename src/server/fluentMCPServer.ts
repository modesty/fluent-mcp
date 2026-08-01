import { serveStdio, StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { McpServer, Transport } from '@modelcontextprotocol/server';
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

/** One hour, in ms. */
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Cache hints for the cacheable results of protocol revision 2026-07-28
 * (`ttlMs` / `cacheScope`, SEP-2549).
 *
 * Everything this server returns on these six methods is immutable for the
 * lifetime of the process: a fixed tool set derived from the command registry,
 * a fixed prompt set, and static markdown bundled in `res/`. None of it can
 * change without a new release, so a long TTL is safe and saves every client
 * re-fetching the same content each turn.
 *
 * `cacheScope: 'public'` is correct because the payloads are identical for
 * every caller — they contain no session, instance, or credential state. (The
 * SDK migration guide's example shows `cacheScope: 'global'`; the installed
 * package types define `CacheScope = 'public' | 'private'` and throw a
 * `RangeError` on anything else, so the package wins.)
 *
 * Without these, v2 emits the conservative defaults `ttlMs: 0` /
 * `cacheScope: 'private'`. 2025-era responses are never affected either way.
 */
const CACHE_HINTS = {
  'tools/list': { ttlMs: ONE_HOUR_MS, cacheScope: 'public' },
  'prompts/list': { ttlMs: ONE_HOUR_MS, cacheScope: 'public' },
  'resources/list': { ttlMs: ONE_HOUR_MS, cacheScope: 'public' },
  'resources/templates/list': { ttlMs: ONE_HOUR_MS, cacheScope: 'public' },
  'resources/read': { ttlMs: ONE_HOUR_MS, cacheScope: 'public' },
  'server/discover': { ttlMs: ONE_HOUR_MS, cacheScope: 'public' },
} as const;

/**
 * Implementation of the Model Context Protocol server for Fluent (ServiceNow SDK)
 *
 * This server provides Fluent (ServiceNow SDK) functionality to AI assistants and developers
 * through the standardized Model Context Protocol interface.
 *
 * Speaks **both** protocol eras from one handler set. `serveStdio` owns the era
 * decision: it inspects the opening message and pins one instance from
 * `buildServer()` for the connection's lifetime — a 2025-era `initialize` is
 * served exactly as before, a modern opening as 2026-07-28.
 */
export class FluentMcpServer {
  private toolsManager: ToolsManager;
  private resourceManager: ResourceManager;
  private promptManager: PromptManager;
  private config: ReturnType<typeof getConfig>;
  private status: ServerStatus = ServerStatus.STOPPED;
  private initializationPromise: Promise<void>;
  private handle?: StdioServerHandle;

  /**
   * Create a new MCP server instance
   */
  constructor() {
    // Initialize server with configuration
    this.config = getConfig();

    // Managers are built once and shared across every McpServer instance the
    // factory produces: they hold the command registry and the loaded resource
    // and prompt content, none of which is per-connection state.
    this.toolsManager = new ToolsManager();
    this.resourceManager = new ResourceManager();
    this.promptManager = new PromptManager();

    // Load resource and prompt content once. start() awaits this before
    // accepting connections so the factory can register synchronously.
    this.initializationPromise = Promise.all([
      this.resourceManager.initialize(),
      this.promptManager.initialize()
    ]).then(() => { /* content loaded; registration happens per instance */ });
  }

  /**
   * Build a fully-registered MCP server instance.
   *
   * MUST return a fresh instance on every call. `serveStdio` may invoke its
   * factory twice for one connection: a `server/discover` opening builds an
   * optimistic "probe" instance, and if the next message is instead a 2025-era
   * `initialize`, the entry closes that probe and asks the factory again.
   * Returning a shared instance would hand back an already-closed server.
   *
   * All content loading happens in the constructor, so this method is
   * synchronous and cheap enough to repeat.
   */
  private buildServer(): McpServer {
    const mcpServer = new McpServer(
      {
        name: this.config.name,
        version: this.config.version,
        description: this.config.description,
      },
      {
        capabilities: {
          // Every listChanged is explicitly false. v2 defaults each of them to
          // `true` when it installs the corresponding handler set, which would
          // advertise three notifications this server never sends — the same
          // defect W6 fixed for prompts.listChanged, and 2026-07-28 routes
          // list-change signalling through subscriptions/listen anyway.
          tools: { listChanged: false },
          resources: { listChanged: false },
          // Note: 'elicitation', 'roots' and 'sampling' are ClientCapabilities,
          // never ServerCapabilities. This server neither declares nor uses
          // them — 2026-07-28 forbids server-initiated requests entirely.
          prompts: { listChanged: false },
        },
        instructions: SERVER_INSTRUCTIONS,
        cacheHints: CACHE_HINTS,
      }
    );

    // Declaring a capability makes v2's McpServer install its own default
    // handlers for that capability's methods. Ours are registered afterwards
    // and replace them by method name; `resources/templates/list` is left to
    // the SDK's default (an empty template list), which is what keeps the
    // declared `resources` capability answerable rather than -32601.
    this.toolsManager.registerOn(mcpServer);
    this.promptManager.registerOn(mcpServer);
    this.setupHandlers(mcpServer);

    return mcpServer;
  }

  /**
   * Set up MCP protocol handlers for tools and resources on one server instance.
   */
  private setupHandlers(mcpServer: McpServer): void {
    const server = mcpServer.server;

    // tools/list is served from the CommandRegistry rather than from what
    // registerTool() inferred, because the registry is the single source of
    // truth for advertised annotations, _meta and outputSchema.
    server.setRequestHandler('tools/list', async () => ({
      tools: this.toolsManager.getMCPTools(),
    }));

    // Set up the resources/list handler
    server.setRequestHandler('resources/list', async () => {
      try {
        const resources = await this.resourceManager.listResources();
        return { resources };
      } catch (error) {
        loggingManager.logResourceListingFailed(error);
        return { resources: [] };
      }
    });

    // Set up the resources/read handler
    server.setRequestHandler('resources/read', async (request) => {
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

    // Note: tools/call is dispatched by the callbacks registered via
    // registerTool() in ToolsManager, so it is deliberately not handled here.
    //
    // There is also deliberately no `notifications/initialized` handler: its only
    // remaining job was to trigger the transitional `roots/list` fetch, and MCP
    // 2026-07-28 both removed the handshake it belongs to and made
    // server-initiated requests illegal. Auth validation is lazy and
    // command-triggered (see ToolsManager.ensureAuthValidated).
    //
    // `server/discover` is installed by the SDK itself for modern connections.
  }

  /**
   * Start the MCP server
   * @param transport Optional transport to serve over instead of the process's
   *   stdio. `ServeStdioOptions.transport` exists for exactly this ("bring your
   *   own transport"); tests use an `InMemoryTransport` pair so both protocol
   *   eras can be exercised over the real entry point rather than through mocks.
   */
  async start(transport?: Transport): Promise<void> {
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

      // Load resource and prompt content before accepting connections so the
      // server factory below can register everything synchronously.
      await this.initializationPromise;

      // serveStdio owns the transport and the era decision. legacy: 'serve'
      // (the default, explicit here) means a 2025-era opening is served from
      // the same factory rather than rejected.
      this.handle = serveStdio(() => this.buildServer(), {
        legacy: 'serve',
        onerror: (error) => {
          logger.error('MCP stdio transport error', CommandResultFactory.normalizeError(error));
        },
        ...(transport && { transport }),
      });

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

      // Closes the pinned instance (if any) and the underlying transport.
      await this.handle?.close();
      this.handle = undefined;

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
