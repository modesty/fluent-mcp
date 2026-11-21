import { CommandProcessor, CommandResult, CommandResultFactory } from '../../utils/types.js';
import logger from '../../utils/logger.js';
import { shellQuote } from '../../utils/shellQuote.js';
import { resolveEffectiveCredentialsDir } from '../../utils/credentialStore.js';

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
 * that to whoever runs it: `cd '<dir>' && <command>`. Both the SDK's key
 * provider and effective credential-store directory (resolved custom
 * `SN_SDK_CREDENTIALS_DIR` or default `~/.now-sdk`) are always pinned on the
 * command so a user's terminal environment or `cwd` cannot redirect an alias
 * to a different store/instance than the one MCP validated. The matching env
 * key must come from the terminal.
 */
export class CLICmdWriter implements CommandProcessor {
  /**
   * Return the shell text of the command, without running it. The writer
   * spawns nothing, so it takes no timeout, signal or run options.
   */
  async process(command: string, args: string[], cwd?: string): Promise<CommandResult> {
    const credDir = resolveEffectiveCredentialsDir();
    const keySource = process.env.SN_SDK_KEY_SOURCE || 'keyring';
    if (keySource !== 'env' && keySource !== 'keyring') {
      return CommandResultFactory.error('Set SN_SDK_KEY_SOURCE to env or keyring in the MCP server configuration.');
    }
    const assignments = [
      `SN_SDK_KEY_SOURCE=${keySource}`,
      `SN_SDK_CREDENTIALS_DIR=${shellQuote(credDir)}`,
    ];
    const commandText = [...assignments, ...[command, ...args].map(shellQuote)].join(' ');
    // Keep the reminder executable and on stderr. The terminal supplies its
    // exported key directly to the SDK, even when shell tracing is enabled.
    const instructions = keySource === 'env'
      ? 'echo "For stored profiles, export SN_SDK_ENCRYPTION_KEY in this terminal from the same secret used by the MCP server." >&2 && '
      : '';
    const enterDirectory = cwd ? `cd ${shellQuote(cwd)} && ` : '';
    const fullCommandText = enterDirectory + instructions + commandText;
    logger.info(`Generated command text: ${fullCommandText}`);
    return CommandResultFactory.success(fullCommandText);
  }
}
