import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CommandFactory } from './registry/commandFactory.js';
import { CommandRegistry } from './registry/commandRegistry.js';
import { NodeProcessRunner } from './processors/processRunner.js';
import { CLIExecutor } from './processors/cliExecutor.js';
import { CLICmdWriter } from './processors/cliCmdWriter.js';
import { BaseCommandProcessor } from './processors/baseCommandProcessor.js';
import { CLICommand, CommandResult, CommandResultFactory } from '../utils/types.js';
import logger from '../utils/logger.js';
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  CheckAuthStatusCommand
} from './resources/resourceTools.js';
import { setRoots as setRootContextRoots } from '../utils/rootContext.js';

/**
 * Manager for handling MCP tools registration and execution
 */
export class ToolsManager {
  private commandRegistry: CommandRegistry;
  private mcpServer: McpServer;
  private cliExecutor!: CLIExecutor;

  /**
   * Create a new ToolsManager
   * @param mcpServer The MCP server instance
   */
  constructor(mcpServer: McpServer) {
    this.mcpServer = mcpServer;
    this.commandRegistry = new CommandRegistry();

    // Initialize the tools
    this.initializeTools();
  }

  /**
   * Initialize all tools
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
    const commands = CommandFactory.createCommands(cliExecutor, cliCmdWriter, this.mcpServer);

    commands.forEach((command) => {
      this.commandRegistry.register(command);
      // Register each CLI command as an MCP tool
      this.registerToolFromCommand(command);
    });

    // Register resource tools
    this.registerResourceTools();
  }

  /**
   * Register resource access tools for ServiceNow metadata
   */
  private registerResourceTools(): void {
    try {
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

      // Register auth status check tool
      const checkAuthStatusCommand = new CheckAuthStatusCommand();
      this.commandRegistry.register(checkAuthStatusCommand);
      this.registerToolFromCommand(checkAuthStatusCommand);

      logger.debug('Resource tools registered successfully');
    } catch (error) {
      logger.error('Error registering resource tools',
        CommandResultFactory.normalizeError(error)
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

      // Map command argument types to Zod types with descriptions for JSON Schema.
      // Optional args use .nullable().optional() because LLMs commonly send null
      // for "not provided" parameters, and z.string().optional() rejects null.
      switch (arg.type) {
        case 'string':
          zodType = z.string().describe(arg.description);
          break;
        case 'number':
          zodType = z.number().describe(arg.description);
          break;
        case 'boolean':
          zodType = z.boolean().describe(arg.description);
          break;
        case 'array':
          zodType = z.array(z.any()).describe(arg.description);
          break;
        default:
          zodType = z.any().describe(arg.description);
      }

      // Make optional if not required — also accept null since LLMs often send null
      if (!arg.required) {
        zodType = zodType.nullable().optional();
      }

      schema[arg.name] = zodType;
    }


    // Create schema for MCP - use raw schema object, let MCP handle the z.object() wrapping
    let inputSchema: any = undefined;
    if (Object.keys(schema).length > 0) {
      // Pass raw schema object, MCP will wrap it properly
      inputSchema = schema;
    }

    // Register with MCP server.
    // Wrap the output shape in z.object() so the schema survives bundling — the
    // SDK's raw-shape detection (isZodRawShapeCompat) can misfire on a minified
    // bundle, dropping the advertised outputSchema; a concrete ZodObject is robust.
    this.mcpServer.registerTool(
      command.name,
      {
        title: command.name,
        description: command.description,
        inputSchema: inputSchema,
        ...(command.outputSchema && { outputSchema: z.object(command.outputSchema) }),
        ...(command.annotations && { annotations: command.annotations }),
      },
      async (args: { [x: string]: any }, _extra: unknown) => {
        // Emit progress notifications for long-running commands when the client
        // supplied a progressToken. Best-effort: never let progress break the tool.
        const endProgress = this.startProgress(command, _extra);
        try {
          const result = await command.execute(args);

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
   * @returns A cleanup function to call when the command completes.
   */
  private startProgress(command: CLICommand, extra: unknown): () => void {
    const progressToken = (extra as { _meta?: { progressToken?: string | number } })?._meta?.progressToken;
    const sendNotification = (extra as { sendNotification?: (n: unknown) => Promise<unknown> })?.sendNotification;
    const isLongRunning = (command.timeoutMs ?? 0) >= ToolsManager.LONG_RUNNING_THRESHOLD_MS;

    if (progressToken === undefined || typeof sendNotification !== 'function' || !isLongRunning) {
      return () => { /* no-op */ };
    }

    let progress = 0;
    const emit = (message: string) => {
      // Indeterminate progress: increment a counter, omit total so clients render a spinner.
      sendNotification({
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
  getMCPTools(): Record<string, unknown>[] {
    return this.commandRegistry.toMCPTools();
  }

  /**
   * Update the roots in CLI tools
   * @param roots Array of root URIs and optional names
   */
  updateRoots(roots: { uri: string; name?: string }[]): void {
    // Skip empty root updates
    if (!roots || roots.length === 0) {
      return;
    }

    // Get all the commands
    const commands = this.commandRegistry.getAllCommands();

    // Collect unique command processors that support roots
    const processors = new Set<BaseCommandProcessor>();

    for (const command of commands) {
      const processor = command.getCommandProcessor();
      if (processor instanceof BaseCommandProcessor) {
        processors.add(processor);
      }
    }

    // Log details about the update process
    logger.debug('Updating roots in CLI tools', {
      processorCount: processors.size,
      commandCount: commands.length,
      rootCount: roots.length,
      rootPaths: roots.map(r => r.uri)
    });

    // Update roots in each unique processor instance
    processors.forEach(processor => {
      processor.setRoots(roots);
    });

    // Also update global RootContext for modules that don't participate in the command registry
    setRootContextRoots(roots);

    // Log only once at this level after all updates are complete
    logger.info('Updated roots in all CLI tools', { roots });
  }

  /**
   * Execute the AuthCommand using the shared executor (not the writer)
   * Used internally by server for auto-auth validation at startup.
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
