import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CommandFactory, CommandRegistry } from './cliCommandTools.js';
import { CLICommand, CommandProcessor, CommandResult } from '../utils/types.js';
import logger from '../utils/logger.js';
import { 
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  ListMetadataTypesCommand
} from './resourceTools.js';
import { CLIExecutor, CLICmdWriter, NodeProcessRunner, BaseCommandProcessor } from './cliCommandTools.js';
import { AuthCommand } from './commands/authCommand.js';
import { setRoots as setRootContextRoots } from '../utils/rootContext.js';

/**
 * Manager for handling MCP tools registration and execution
 */
export class ToolsManager {
  private commandRegistry: CommandRegistry;
  private mcpServer: McpServer;
  private cliExecutor!: CLIExecutor;
  private cliCmdWriter!: CLICmdWriter;

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
    // Store shared processors for later use (e.g., server-internal invocations)
    this.cliExecutor = cliExecutor;
    this.cliCmdWriter = cliCmdWriter;
    
    // Create commands with appropriate processors for each type
    // AuthCommand and InitCommand will use CLICmdWriter, others will use CLIExecutor
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

      logger.debug('Resource tools registered successfully');
    } catch (error) {
      logger.error('Error registering resource tools',
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

    
    // Create schema for MCP - use raw schema object, let MCP handle the z.object() wrapping
    let inputSchema: any = undefined;
    if (Object.keys(schema).length > 0) {
      // Pass raw schema object, MCP will wrap it properly
      inputSchema = schema;
    }

    // Register with MCP server
    this.mcpServer.registerTool(
      command.name,
      {
        title: command.name,
        description: command.description,
        inputSchema: inputSchema
      },
      async (args: { [x: string]: any }, _extra: unknown) => {
        const result = await command.execute(args);
        return {
          content: [{ type: 'text' as const, text: result.output }],
          structuredContent: { success: result.success }
        };
      }
    );
  }

  /**
   * Format the result of a command execution
   * @param result The command result
   * @returns Formatted string with the result
   */
  formatResult(result: { success: boolean, output: string, exitCode?: number, error?: string }): string {
    if (result.success) {
      return `✅ Command executed successfully\n\nOutput:\n${result.output}`;
    } else {
      return `❌ Command failed (exit code: ${result.exitCode})\n\nError:\n${
        result.error || 'Unknown error'
      }\n\nOutput:\n${result.output}`;
    }
  }

  /**
   * Get a command by name
   * @param name The command name
   * @returns The command or undefined if not found
   */
  getCommand(name: string): CLICommand | undefined {
    return this.commandRegistry.getCommand(name);
  }

  /**
   * Get all commands as MCP tools
   * @returns List of MCP tools
   */
  getMCPTools(): Record<string, unknown>[] {
    return this.commandRegistry.toMCPTools();
  }

  /**
   * Get the command registry
   * @returns The command registry
   */
  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
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
   * Get the shared CLI executor used by registered commands
   */
  getExecutorProcessor(): CommandProcessor {
    return this.cliExecutor;
  }

  /**
   * Execute the AuthCommand using the shared executor (not the writer)
   * Used by server-internal flows like auto auth validation
   */
  async runAuth(args: Record<string, unknown>): Promise<CommandResult> {
    const cmd = new AuthCommand(this.cliExecutor);
    return await cmd.execute(args);
  }
}
