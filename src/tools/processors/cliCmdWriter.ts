import { CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCommandProcessor } from './baseCommandProcessor.js';
import logger from '../../utils/logger.js';
import { shellQuote } from '../../utils/shellQuote.js';

/**
 * Generates command text without executing — used for interactive commands
 * that should be run manually (e.g., InitCommand, DependenciesCommand).
 *
 * This is the one place a shell sees the argv: a person runs the text. Every
 * entry is therefore shell-escaped here (POSIX, `shellQuote`), after the
 * command has encoded it for yargs (`cliOption`), so the shell hands the CLI
 * exactly the argv the command built. Commands never quote for the shell.
 */
export class CLICmdWriter extends BaseCommandProcessor {
  /**
   * Process a command by generating its text representation without executing it
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    customWorkingDir?: string,
    _stdinInput?: string, // Not used by writer, but kept for interface compatibility
    _timeoutMs?: number,  // Not used by writer, but kept for interface compatibility
    _signal?: AbortSignal // Not used by writer (no child process to cancel)
  ): Promise<CommandResult> {
    return this.execute(command, args, customWorkingDir);
  }

  /**
   * For compatibility with the CLIExecutor interface - allows this class
   * to be used as a drop-in replacement in tests and existing code
   */
  async execute(
    command: string,
    args: string[],
    customWorkingDir?: string,
    _stdinInput?: string // Not used by writer, but kept for interface compatibility
  ): Promise<CommandResult> {
    return this.getCommandText(command, args, customWorkingDir);
  }

  /**
   * Returns the text representation of a CLI command without executing it
   */
  private getCommandText(
    command: string,
    args: string[],
    customWorkingDir?: string
  ): CommandResult {
    try {
      const cwd = this.resolveCommandWorkingDirectory(customWorkingDir);

      const commandText = [command, ...args].map(shellQuote).join(' ');

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
