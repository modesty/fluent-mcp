import {
  CommandArgument,
  CommandProcessor,
  CommandResult,
  CommandResultFactory,
  EnsureAuthValidated,
  ProcessRunOptions,
} from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { cliOption } from './cliArgv.js';
import logger from '../../utils/logger.js';
import { getConfig, getProjectRootPath } from '../../config.js';
import { resolveProjectDirectory } from '../../utils/projectDirectory.js';

export const WORKING_DIRECTORY_ARGUMENT: CommandArgument = {
  name: 'workingDirectory',
  type: 'string',
  required: false,
  description:
    'Absolute path to the Fluent project for this call. Overrides the initialized session and FLUENT_MCP_WORKING_DIR.',
};

/**
 * Resolve the auth alias for a command that contacts an instance: the explicit
 * alias, else the session alias, else the alias that lazy validation of
 * `SN_INSTANCE_URL` stores in the session (undefined when there is none).
 */
export async function resolveAuthAlias(
  providedAuth: string | undefined,
  ensureAuthValidated: EnsureAuthValidated
): Promise<string | undefined> {
  if (providedAuth) {
    return providedAuth;
  }
  const sessionManager = SessionManager.getInstance();
  const sessionAuth = sessionManager.getAuthAlias();
  if (sessionAuth) {
    logger.debug(`Auto-injecting auth alias from session: ${sessionAuth}`);
    return sessionAuth;
  }

  await ensureAuthValidated();
  const validatedAuth = sessionManager.getAuthAlias();
  if (validatedAuth) {
    logger.debug(`Auto-injecting validated auth alias from session: ${validatedAuth}`);
  }
  return validatedAuth;
}

/**
 * Base class for commands that operate inside a Fluent project directory.
 * Extends BaseCLICommand and adds working directory handling, auth resolution, and timeout support.
 */
export abstract class SessionAwareCLICommand extends BaseCLICommand {
  constructor(
    commandProcessor: CommandProcessor,
    private readonly ensureAuthValidated: EnsureAuthValidated = async () => {}
  ) {
    super(commandProcessor);
  }

  /**
   * Resolve the Fluent project directory without guessing from process cwd or the
   * installed package location.
   *
   * Resolution order: explicit `workingDirectory` argument → initialized session
   * → `FLUENT_MCP_WORKING_DIR` → undefined (the caller turns that into an
   * actionable error).
   * @returns The working directory to use for the command
   */
  protected getWorkingDirectory(explicitWorkingDirectory?: unknown): string | undefined {
    // MCP clients commonly serialize an omitted optional value as null. Empty
    // strings have the same meaning for this optional context argument. Treat
    // both as absent so the documented fallback chain remains usable; any
    // other explicitly supplied value must still be validated and rejected.
    const hasExplicitWorkingDirectory = explicitWorkingDirectory !== undefined &&
      explicitWorkingDirectory !== null &&
      !(typeof explicitWorkingDirectory === 'string' && explicitWorkingDirectory.trim() === '');

    if (hasExplicitWorkingDirectory) {
      return resolveProjectDirectory(explicitWorkingDirectory, "'workingDirectory' tool argument");
    }

    const sessionManager = SessionManager.getInstance();
    const sessionDir = sessionManager.getWorkingDirectory();
    if (sessionDir) {
      const resolved = resolveProjectDirectory(sessionDir, 'initialized session');
      logger.debug(`Using session working directory: ${resolved}`);
      return resolved;
    }

    const configuredDir = getConfig().workingDirectory;
    if (configuredDir !== undefined) {
      const resolved = resolveProjectDirectory(configuredDir, 'FLUENT_MCP_WORKING_DIR');
      logger.debug(`Using FLUENT_MCP_WORKING_DIR: ${resolved}`);
      return resolved;
    }

    return undefined;
  }

  /**
   * Resolve the auth alias for a command that requires instance access: the
   * explicit value, else the session alias (lazily validated on first use).
   * @param providedAuth Explicit auth alias from command args
   * @returns The resolved auth alias, or undefined if none available
   */
  protected resolveAuthAlias(providedAuth?: string): Promise<string | undefined> {
    return resolveAuthAlias(providedAuth, this.ensureAuthValidated);
  }

  /**
   * The failure of an instance command that found no auth alias, naming the
   * ways to provide one.
   */
  protected missingAuthResult(): CommandResult {
    return CommandResultFactory.error(
      `${this.name} requires authentication to a ServiceNow instance, but no credential alias was found. ` +
      "Pass 'auth' with a stored profile alias, or set SN_INSTANCE_URL so lazy validation can load a matching profile into the session. " +
      "Use the ServiceNow SDK 'now-sdk auth --add <instance>' command to create a profile."
    );
  }

  /**
   * Execute an SDK command with argument mapping to CLI flags.
   * Automatically resolves auth from session when 'auth' is in flagMapping but not provided in args.
   * Uses resolveTimeoutMs(args) for process execution.
   *
   * A string flag config takes the argument's value (`--flag=value`). An object
   * config is a boolean flag: `true` emits the bare flag, and `false` emits the
   * yargs negation (`--no-<flag>`) only when marked `negatable`, the only way to
   * turn off a CLI flag that defaults to true. Without it, `false` emits nothing.
   * @param sdkCommand The SDK command name (e.g., 'build', 'install')
   * @param args The command arguments object
   * @param flagMapping Optional mapping of arg names to CLI flags
   * @param positionalArgs Optional positional arguments to append at the end
   * @param signal Optional abort signal from the MCP client (kills the child on cancel)
   * @param options Optional per-call process options (e.g. a raised stdout capture cap)
   * @returns The command result
   */
  protected async executeSdkCommand(
    sdkCommand: string,
    args: Record<string, unknown>,
    flagMapping: Record<string, string | { flag: string; negatable?: boolean }> = {},
    positionalArgs: string[] = [],
    signal?: AbortSignal,
    options?: ProcessRunOptions
  ): Promise<CommandResult> {
    // Validate the caller's args with the command's input schema before they
    // become CLI tokens (the same schema tools/call enforces). Run before auth
    // injection, so a trusted session alias is not re-validated.
    this.validateArgs(args);

    // Auto-resolve auth from session if 'auth' is mapped but not provided
    if ('auth' in flagMapping && !args.auth) {
      const sessionAuth = await this.resolveAuthAlias();
      if (sessionAuth) {
        args = { ...args, auth: sessionAuth };
      }
    }

    // Build the full SDK command args using the bundled CLI so commands work
    // regardless of cwd: [<base>, 'subcommand', ...positional, ...flags]
    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs: string[] = [...baseArgs, sdkCommand];

    // Add positional arguments first (before flags)
    sdkArgs.push(...positionalArgs);

    // Add mapped flags
    for (const [argName, flagConfig] of Object.entries(flagMapping)) {
      const value = args[argName];
      if (value !== undefined && value !== null && value !== '') {
        if (typeof flagConfig === 'string') {
          sdkArgs.push(cliOption(flagConfig, value));
        } else if (value) {
          sdkArgs.push(flagConfig.flag);
        } else if (flagConfig.negatable) {
          // Explicit false on a default-true CLI flag: emit the yargs negation
          sdkArgs.push(flagConfig.flag.replace(/^--/, '--no-'));
        }
      }
    }

    // Add common flags (like --debug)
    this.appendCommonFlags(sdkArgs, args);

    const timeoutMs = this.resolveTimeoutMs(args);
    if (!this.requiresProject) {
      // The CLI resolves nothing from its cwd for this command, so the installed
      // package directory is a neutral cwd and no Fluent project is needed.
      return this.commandProcessor.process(command, sdkArgs, getProjectRootPath(), timeoutMs, signal, options);
    }

    try {
      const workingDirectory = this.getWorkingDirectory(args.workingDirectory);
      if (!workingDirectory) {
        return CommandResultFactory.error(
          "No Fluent project working directory is configured. Pass the 'workingDirectory' tool argument with an absolute path, run init_fluent_app to initialize the session, or set FLUENT_MCP_WORKING_DIR to an absolute path."
        );
      }
      return await this.commandProcessor.process(command, sdkArgs, workingDirectory, timeoutMs, signal, options);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }

  /**
   * Whether the CLI command works in a Fluent project. A command that reads
   * nothing from its cwd sets this to false: it declares no `workingDirectory`
   * argument and `executeSdkCommand` spawns it in the installed package directory.
   */
  protected readonly requiresProject: boolean = true;

  /**
   * The runner timeout for one invocation. Defaults to the command's static
   * timeoutMs; commands whose CLI accepts its own caller-tunable timeout override
   * this so the runner never kills the child before the CLI can report it.
   * `FLUENT_MCP_COMMAND_TIMEOUT_MS` still wins over the value returned here.
   * @param _args The (validated) command arguments
   * @returns The timeout in milliseconds, or undefined for the runner default
   */
  protected resolveTimeoutMs(_args: Record<string, unknown>): number | undefined {
    return this.timeoutMs;
  }
}
