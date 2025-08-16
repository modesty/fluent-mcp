import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CommandFactory, CommandRegistry } from './cliCommandTools.js';
import { CLICommand } from '../utils/types.js';
import logger from '../utils/logger.js';
import { 
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  ListMetadataTypesCommand
} from './resourceTools.js';
import { CLIExecutor, CLICmdWriter, NodeProcessRunner } from './cliCommandTools.js';

/**
 * Manager for handling MCP tools registration and execution
 */
export class ToolsManager {
  private commandRegistry: CommandRegistry;
  private mcpServer: McpServer;

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
    
    // Create commands with appropriate processors for each type
    // AuthCommand and InitCommand will use CLICmdWriter, others will use CLIExecutor
    const commands = CommandFactory.createCommands(cliExecutor, cliCmdWriter);

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
    
    // Register with MCP server
    this.mcpServer.registerTool(
      command.name,
      {
        title: command.name,
        description: command.description,
        inputSchema: schema
      },
      async (params: Record<string, unknown>) => {
        const result = await command.execute(params);
        return {
          content: [{ type: 'text', text: result.output }],
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
    // Get the CLI executor and writer instances
    const commands = this.commandRegistry.getAllCommands();
    
    // Find commands that use CLIExecutor or CLICmdWriter
    for (const command of commands) {
      const processor = command.getCommandProcessor();
      
      // Update roots in CLIExecutor
      if (processor instanceof CLIExecutor) {
        processor.setRoots(roots);
      }
      
      // Update roots in CLICmdWriter
      if (processor instanceof CLICmdWriter) {
        processor.setRoots(roots);
      }
    }
    
    logger.info('Updated roots in all CLI tools', { roots });
  }
}
