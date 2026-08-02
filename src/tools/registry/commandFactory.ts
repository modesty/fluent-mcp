import { CommandProcessor, CLICommand, EnsureAuthValidated } from '../../utils/types.js';
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
  QueryCommand,
} from '../commands/index.js';

/**
 * Factory for creating all CLI command instances with appropriate processors
 */
export class CommandFactory {
  /**
   * Creates all CLI command instances with appropriate processors
   * @param executor The command processor to use for most commands that require execution
   * @param writer The command processor to use for commands that should return text (InitCommand)
   * @param ensureAuthValidated Single-flight lazy auth-validation trigger
   * @returns An array of command instances
   *
   * Note: AuthCommand is not exposed to MCP clients. Authentication is handled
   * lazily via environment variables (SN_INSTANCE_URL, SN_AUTH_TYPE) when first needed.
   * The auth alias is stored in the session and used by all SDK commands.
   *
   * No command receives the MCP server: nothing calls back to the client. The
   * former `mcpServer` parameter existed only to reach `elicitInput`, which MCP
   * 2026-07-28 removed (SEP-2322).
   */
  static createCommands(
    executor: CommandProcessor,
    writer?: CommandProcessor,
    ensureAuthValidated: EnsureAuthValidated = async () => {}
  ): CLICommand[] {
    // If no writer is provided, use the executor for all commands
    const textProcessor = writer || executor;

    return [
      // SDK Information Tool (using SDK flags, not commands)
      new SdkInfoCommand(executor),

      // SDK Command Tools (actual SDK subcommands)
      // Note: AuthCommand removed - auth is handled lazily via env vars
      new InitCommand(textProcessor, ensureAuthValidated), // Uses writer to generate text instead of executing
      new BuildCommand(executor, ensureAuthValidated),
      new InstallCommand(executor, ensureAuthValidated),
      new TransformCommand(executor, ensureAuthValidated),
      new DependenciesCommand(textProcessor, ensureAuthValidated), // Uses writer to generate text instead of executing
      new DownloadCommand(executor, ensureAuthValidated),
      new CleanCommand(executor, ensureAuthValidated),
      new PackCommand(executor, ensureAuthValidated),
      new ExplainCommand(executor),
      new QueryCommand(executor, ensureAuthValidated),
    ];
  }
}
