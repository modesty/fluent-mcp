import { CommandProcessor, CLICommand } from '../../utils/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  SdkInfoCommand,
  InitCommand,
  BuildCommand,
  InstallCommand,
  TransformCommand,
  DependenciesCommand,
  DownloadCommand,
  CleanCommand,
  PackCommand,
  ExplainCommand,
} from '../commands/index.js';

/**
 * Factory for creating all CLI command instances with appropriate processors
 */
export class CommandFactory {
  /**
   * Creates all CLI command instances with appropriate processors
   * @param executor The command processor to use for most commands that require execution
   * @param writer The command processor to use for commands that should return text (InitCommand)
   * @param mcpServer Optional MCP server for commands that support elicitation
   * @returns An array of command instances
   *
   * Note: AuthCommand is not exposed to MCP clients. Authentication is handled
   * automatically at startup via environment variables (SN_INSTANCE_URL, SN_AUTH_TYPE).
   * The auth alias is stored in the session and used by all SDK commands.
   */
  static createCommands(executor: CommandProcessor, writer?: CommandProcessor, mcpServer?: McpServer): CLICommand[] {
    // If no writer is provided, use the executor for all commands
    const textProcessor = writer || executor;

    return [
      // SDK Information Tool (using SDK flags, not commands)
      new SdkInfoCommand(executor),

      // SDK Command Tools (actual SDK subcommands)
      // Note: AuthCommand removed - auth is handled via env vars at startup
      new InitCommand(textProcessor, mcpServer), // Uses writer to generate text instead of executing
      new BuildCommand(executor),
      new InstallCommand(executor),
      new TransformCommand(executor),
      new DependenciesCommand(textProcessor), // Uses writer to generate text instead of executing
      new DownloadCommand(executor),
      new CleanCommand(executor),
      new PackCommand(executor),
      new ExplainCommand(executor),
    ];
  }
}
