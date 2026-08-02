import { z } from 'zod';
import { McpServer, ServerContext, Tool } from '@modelcontextprotocol/server';
import { CommandFactory } from './registry/commandFactory.js';
import { CommandRegistry } from './registry/commandRegistry.js';
import { NodeProcessRunner } from './processors/processRunner.js';
import { CLIExecutor } from './processors/cliExecutor.js';
import { CLICmdWriter } from './processors/cliCmdWriter.js';
import { CLICommand, CommandResult, CommandResultFactory, EnsureAuthValidated } from '../utils/types.js';
import logger from '../utils/logger.js';
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  CheckAuthStatusCommand
} from './resources/resourceTools.js';
import { buildInputZodSchema } from './toolSchema.js';
import { autoValidateAuthIfConfigured } from '../server/fluentInstanceAuth.js';
import loggingManager from '../utils/loggingManager.js';

/**
 * Owns the command registry and registers it onto MCP server instances.
 *
 * Construction and registration are deliberately separate: `serveStdio` may
 * call its server factory more than once per connection (it builds an
 * optimistic `server/discover` probe instance and discards it if the client
 * then opens with a 2025-era `initialize`), so each call needs a *fresh*
 * `McpServer`. Building the registry once and calling `registerOn()` per
 * instance keeps the expensive work — and the single-flight auth memo below —
 * shared, while per-instance registration stays cheap and repeatable.
 */
export class ToolsManager {
  private commandRegistry: CommandRegistry;
  private cliExecutor!: CLIExecutor;
  private authValidationPromise?: Promise<void>;
  private readonly ensureAuthValidated: EnsureAuthValidated = () => {
    if (!this.authValidationPromise) {
      this.authValidationPromise = autoValidateAuthIfConfigured(this)
        .then((result) => {
          loggingManager.logAuthValidationResult(result);
        })
        .catch((error) => {
          logger.warn('Auto-auth validation failed', {
            error: CommandResultFactory.normalizeError(error).message,
          });
        });
    }
    return this.authValidationPromise;
  };

  /**
   * Create a new ToolsManager and build its command registry.
   */
  constructor() {
    this.commandRegistry = new CommandRegistry();

    // Initialize the tools
    this.initializeTools();
  }

  /**
   * Register every command in the registry as a tool on the given MCP server.
   * Safe to call for each instance the server factory produces.
   * @param server The MCP server instance to register onto
   */
  registerOn(server: McpServer): void {
    for (const command of this.commandRegistry.getAllCommands()) {
      this.registerToolFromCommand(server, command);
    }
  }

  /**
   * Build the command registry
   */
  private initializeTools(): void {
    // Register CLI commands
    const processRunner = new NodeProcessRunner();

    // Create both types of command processors
    const cliExecutor = new CLIExecutor(processRunner);
    const cliCmdWriter = new CLICmdWriter(); // CLICmdWriter doesn't need processRunner
    // Store the executor for later use (e.g., server-internal auth invocations)
    this.cliExecutor = cliExecutor;

    // Create commands with appropriate processors for each type
    // InitCommand will use CLICmdWriter, others will use CLIExecutor
    // Note: AuthCommand is not exposed to MCP clients - it's used internally for auto-auth validation
    const commands = CommandFactory.createCommands(
      cliExecutor,
      cliCmdWriter,
      this.ensureAuthValidated
    );

    commands.forEach((command) => {
      this.commandRegistry.register(command);
    });

    // Register resource tools
    this.registerResourceTools();
  }

  /**
   * Register resource access tools for ServiceNow metadata
   */
  private registerResourceTools(): void {
    try {
      this.commandRegistry.register(new GetApiSpecCommand());
      this.commandRegistry.register(new GetSnippetCommand());
      this.commandRegistry.register(new GetInstructCommand());
      this.commandRegistry.register(new CheckAuthStatusCommand(this.ensureAuthValidated));

      logger.debug('Resource tools registered successfully');
    } catch (error) {
      logger.error('Error registering resource tools',
        CommandResultFactory.normalizeError(error)
      );
      throw error;
    }
  }

  /**
   * Registers a command as an MCP tool on the given server
   * @param server The MCP server instance to register onto
   * @param command The command to register
   */
  private registerToolFromCommand(server: McpServer, command: CLICommand): void {
    // Build the enforced input schema from the single source of truth shared with
    // the advertised tools/list schema (commandRegistry.toMCPTools), so canonical
    // types and required fields cannot drift. See src/tools/toolSchema.ts.
    // This is already a concrete ZodObject (z.strictObject), i.e. a Standard
    // Schema object, not a v1 raw shape — the codemod could not prove that
    // statically and flagged it; verified by hand instead.
    const inputSchema = buildInputZodSchema(command.arguments);

    // Register with MCP server.
    // Wrap the output shape in z.object() so the schema survives bundling — the
    // SDK's raw-shape detection can misfire on a minified bundle, dropping the
    // advertised outputSchema; a concrete ZodObject is robust.
    server.registerTool(
      command.name,
      {
        title: command.name,
        description: command.description,
        inputSchema: inputSchema,
        ...(command.outputSchema && { outputSchema: z.object(command.outputSchema) }),
        ...(command.annotations && { annotations: command.annotations }),
      },
      async (args: { [x: string]: any }, ctx: ServerContext) => {
        // Emit progress notifications for long-running commands when the client
        // supplied a progressToken. Best-effort: never let progress break the tool.
        const endProgress = this.startProgress(command, ctx);
        // Propagate MCP client cancellation: aborting `tools/call` fires this
        // signal, which threads down to the spawned child so it is killed (P0.3).
        const signal = ctx.mcpReq.signal;
        try {
          const result = await command.execute(args, signal);

          // Format the output: clean on success, concise error context on failure
          const formattedOutput = this.formatResult({
            success: result.success,
            output: result.output,
            exitCode: result.exitCode,
            error: result.error?.message
          });

          return {
            content: [{ type: 'text' as const, text: formattedOutput }],
            // structuredContent is only valid on success (the SDK skips validation on errors);
            // omit it on failure so tools with an outputSchema don't fail output validation.
            ...(result.success && result.structuredContent && { structuredContent: result.structuredContent }),
            isError: !result.success
          };
        } catch (error) {
          // Handle exceptions from validateArgs() or command execution
          const normalizedError = CommandResultFactory.normalizeError(error);
          logger.error(`Tool '${command.name}' execution failed`, normalizedError);
          return {
            content: [{ type: 'text' as const, text: `Error: ${normalizedError.message}` }],
            isError: true
          };
        } finally {
          endProgress();
        }
      }
    );
  }

  /** Commands at or above this timeout are treated as long-running for progress reporting. */
  private static readonly LONG_RUNNING_THRESHOLD_MS = 30_000;
  /** Interval between progress heartbeats for long-running commands. */
  private static readonly PROGRESS_HEARTBEAT_MS = 3_000;

  /**
   * Start best-effort progress notifications for a long-running command.
   * Emits an initial progress, then periodic heartbeats with an indeterminate
   * total, until the returned cleanup function is called (which sends a final
   * progress). No-ops unless the client supplied a `progressToken` and the
   * command is long-running. Never throws.
   *
   * Request-scoped `notifications/progress` still flows on the originating
   * request's stream on 2026-07-28, so this behaviour is unchanged by the v2
   * swap; only the accessors moved (`ctx.mcpReq.notify` replaces the v1
   * `extra.sendNotification`).
   * @returns A cleanup function to call when the command completes.
   */
  private startProgress(command: CLICommand, ctx: ServerContext): () => void {
    const progressToken = ctx.mcpReq._meta?.progressToken;
    const isLongRunning = (command.timeoutMs ?? 0) >= ToolsManager.LONG_RUNNING_THRESHOLD_MS;

    if (progressToken === undefined || !isLongRunning) {
      return () => { /* no-op */ };
    }

    let progress = 0;
    const emit = (message: string) => {
      // Indeterminate progress: increment a counter, omit total so clients render a spinner.
      ctx.mcpReq.notify({
        method: 'notifications/progress',
        params: { progressToken, progress: ++progress, message },
      }).catch((err) => logger.debug(`Progress notification failed for '${command.name}': ${err}`));
    };

    emit(`Running ${command.name}…`);
    const interval = setInterval(() => emit(`Still running ${command.name}…`), ToolsManager.PROGRESS_HEARTBEAT_MS);

    return () => {
      clearInterval(interval);
      emit(`Finished ${command.name}`);
    };
  }

  /**
   * Strip ANSI escape codes from CLI output to avoid wasting LLM tokens.
   * Covers CSI sequences (colors, cursor, 24-bit), OSC (title), and charset selectors.
   */
  private stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1B(?:\[[0-9;:]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\)|\([A-B0-2]|[>=])/g, '');
  }

  /**
   * Format the result of a command execution.
   * On success, returns clean output only (isError field already conveys success/failure).
   * On failure, returns concise error with output context.
   */
  formatResult(result: { success: boolean, output: string, exitCode?: number, error?: string }): string {
    const cleanOutput = this.stripAnsi(result.output);

    if (result.success) {
      return cleanOutput;
    }

    const errorMsg = result.error || 'Unknown error';
    return cleanOutput
      ? `Error (exit ${result.exitCode}): ${errorMsg}\n\nOutput:\n${cleanOutput}`
      : `Error (exit ${result.exitCode}): ${errorMsg}`;
  }

  /**
   * Get all commands as MCP tools
   * @returns List of MCP tools
   */
  getMCPTools(): Tool[] {
    return this.commandRegistry.toMCPTools();
  }

  /**
   * Execute the AuthCommand using the shared executor (not the writer)
   * Used internally for lazy auto-auth validation.
   * Note: AuthCommand is not exposed to MCP clients - authentication is managed
   * via environment variables (SN_INSTANCE_URL, SN_AUTH_TYPE) and the auth alias
   * is stored in session for use by all SDK commands.
   * Uses dynamic import to lazy-load AuthCommand only when needed.
   */
  async runAuth(args: Record<string, unknown>): Promise<CommandResult> {
    // Lazy load AuthCommand to avoid importing it at module load time
    const { AuthCommand } = await import('./commands/authCommand.js');
    const cmd = new AuthCommand(this.cliExecutor);
    return await cmd.execute(args);
  }
}
