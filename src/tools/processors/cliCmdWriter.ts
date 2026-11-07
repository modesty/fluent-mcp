import { CommandProcessor, CommandResult, CommandResultFactory } from '../../utils/types.js';
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
 *
 * The SDK CLI works in its process cwd (`now-sdk init` writes the new project
 * there), so the text enters the project directory itself rather than leaving
 * that to whoever runs it: `cd '<dir>' && <command>`.
 */
export class CLICmdWriter implements CommandProcessor {
  /**
   * Return the shell text of the command, without running it. The writer
   * spawns nothing, so it takes no stdin, timeout, signal or run options.
   */
  async process(command: string, args: string[], cwd?: string): Promise<CommandResult> {
    const commandText = [command, ...args].map(shellQuote).join(' ');
    const fullCommandText = cwd ? `cd ${shellQuote(cwd)} && ${commandText}` : commandText;

    logger.info(`Generated command text: ${fullCommandText}`);

    return CommandResultFactory.success(fullCommandText);
  }
}
