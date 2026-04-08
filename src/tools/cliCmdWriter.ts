import { CommandResult, CommandResultFactory } from '../utils/types.js';
import { resolveWorkingDirectory } from '../utils/rootContext.js';
import { BaseCommandProcessor } from './baseCommandProcessor.js';
import logger from '../utils/logger.js';

/**
 * Generates command text without executing — used for interactive commands
 * that should be run manually (e.g., InitCommand, DependenciesCommand)
 */
export class CLICmdWriter extends BaseCommandProcessor {
  /**
   * Process a command by generating its text representation without executing it
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    _stdinInput?: string // Not used by writer, but kept for interface compatibility
  ): Promise<CommandResult> {
    return this.execute(command, args, useMcpCwd, customWorkingDir);
  }

  /**
   * For compatibility with the CLIExecutor interface - allows this class
   * to be used as a drop-in replacement in tests and existing code
   */
  async execute(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    _stdinInput?: string // Not used by writer, but kept for interface compatibility
  ): Promise<CommandResult> {
    return this.getCommandText(command, args, useMcpCwd, customWorkingDir);
  }

  /**
   * Returns the text representation of a CLI command without executing it
   */
  private getCommandText(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): CommandResult {
    try {
      let cwd = customWorkingDir;
      if (!cwd && useMcpCwd) {
        // Use canonical working directory resolution
        cwd = resolveWorkingDirectory(this.roots);
      }

      // Sanity check on working directory - warn if it's the system root
      if (cwd === '/' || cwd === '\\') {
        throw new Error('ERROR: Command should never use system root (/) as working directory');
      }

      // Format the command string
      const argsText = args.join(' ');
      const commandText = `${command} ${argsText}`;

      // Add working directory context if available
      const cwdInfo = cwd ? `(in directory: ${cwd})` : '';
      const fullCommandText = cwdInfo ? `${commandText} ${cwdInfo}` : commandText;

      logger.info(`Generated command text: ${fullCommandText}`);

      return CommandResultFactory.success(fullCommandText);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }
}
