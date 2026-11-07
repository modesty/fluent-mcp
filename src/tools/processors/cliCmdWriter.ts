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
   * Return the shell text of the command, without running it. The writer
   * spawns nothing, so it takes no stdin, timeout, signal or run options.
   */
  async process(command: string, args: string[], customWorkingDir?: string): Promise<CommandResult> {
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
