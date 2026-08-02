import path from 'node:path';
import {
  CommandArgument,
  CommandProcessor,
  CommandResult,
  CommandResultFactory,
  EnsureAuthValidated,
} from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import logger from '../../utils/logger.js';
import { getConfig } from '../../config.js';

export const WORKING_DIRECTORY_ARGUMENT: CommandArgument = {
  name: 'workingDirectory',
  type: 'string',
  required: false,
  description:
    'Absolute path to the Fluent project for this call. Overrides the initialized session and FLUENT_MCP_WORKING_DIR.',
};

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
   * actionable error). MCP Roots was formerly a fourth rung; MCP 2026-07-28
   * deprecated Roots and removed the server-initiated `roots/list` request that
   * populated it, so it is gone rather than migrated — the three remaining rungs
   * are the spec's own sanctioned mechanisms (tool parameter, server
   * configuration).
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
      return this.validateWorkingDirectory(explicitWorkingDirectory, "'workingDirectory' tool argument");
    }

    const sessionManager = SessionManager.getInstance();
    const sessionDir = sessionManager.getWorkingDirectory();
    if (sessionDir) {
      const resolved = this.validateWorkingDirectory(sessionDir, 'initialized session');
      logger.debug(`Using session working directory: ${resolved}`);
      return resolved;
    }

    const configuredDir = getConfig().workingDirectory;
    if (configuredDir !== undefined) {
      const resolved = this.validateWorkingDirectory(configuredDir, 'FLUENT_MCP_WORKING_DIR');
      logger.debug(`Using FLUENT_MCP_WORKING_DIR: ${resolved}`);
      return resolved;
    }

    return undefined;
  }

  private validateWorkingDirectory(value: unknown, source: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${source} must be a non-empty absolute path.`);
    }

    const directory = path.normalize(value.trim());
    if (!path.isAbsolute(directory)) {
      throw new Error(`${source} must be an absolute path: ${value}`);
    }
    if (path.parse(directory).root === directory) {
      throw new Error(`${source} must not be the filesystem root: ${directory}`);
    }
    return directory;
  }

  /**
   * Resolve authentication alias from provided value or session fallback.
   * Used by commands that require instance authentication (install, transform, dependencies, download).
   * @param providedAuth Explicit auth alias from command args
   * @returns The resolved auth alias, or undefined if none available
   */
  protected async resolveAuthAlias(providedAuth?: string): Promise<string | undefined> {
    if (providedAuth) {
      return providedAuth;
    }
    const sessionManager = SessionManager.getInstance();
    const sessionAuth = sessionManager.getAuthAlias();
    if (sessionAuth) {
      logger.debug(`Auto-injecting auth alias from session: ${sessionAuth}`);
      return sessionAuth;
    }

    await this.ensureAuthValidated();
    const validatedAuth = sessionManager.getAuthAlias();
    if (validatedAuth) {
      logger.debug(`Auto-injecting validated auth alias from session: ${validatedAuth}`);
    }
    return validatedAuth;
  }

  /**
   * Execute a command that requires a working directory from the session
   * @param command The command to execute
   * @param args The command arguments
   * @param stdinInput Optional stdin input for interactive commands
   * @param timeoutMs Optional command-specific timeout (falls back to this.timeoutMs)
   * @param signal Optional abort signal from the MCP client (kills the child on cancel)
   * @param explicitWorkingDirectory The per-call `workingDirectory` tool argument, if supplied
   * @returns The command result
   */
  protected async executeWithSessionWorkingDirectory(
    command: string,
    args: string[],
    stdinInput?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
    explicitWorkingDirectory?: unknown
  ): Promise<CommandResult> {
    try {
      const workingDirectory = this.getWorkingDirectory(explicitWorkingDirectory);
      if (!workingDirectory) {
        return CommandResultFactory.error(
          "No Fluent project working directory is configured. Pass the 'workingDirectory' tool argument with an absolute path, run init_fluent_app to initialize the session, or set FLUENT_MCP_WORKING_DIR to an absolute path."
        );
      }

      const effectiveTimeout = timeoutMs ?? this.timeoutMs;
      return await this.commandProcessor.process(command, args, workingDirectory, stdinInput, effectiveTimeout, signal);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }

  /**
   * Execute an SDK command with argument mapping to CLI flags.
   * Automatically resolves auth from session when 'auth' is in flagMapping but not provided in args.
   * Uses the command's timeoutMs for process execution.
   * @param sdkCommand The SDK command name (e.g., 'build', 'install')
   * @param args The command arguments object
   * @param flagMapping Optional mapping of arg names to CLI flags
   * @param positionalArgs Optional positional arguments to append at the end
   * @param signal Optional abort signal from the MCP client (kills the child on cancel)
   * @returns The command result
   */
  protected async executeSdkCommand(
    sdkCommand: string,
    args: Record<string, unknown>,
    flagMapping: Record<string, string | { flag: string; hasValue: boolean }> = {},
    positionalArgs: string[] = [],
    signal?: AbortSignal
  ): Promise<CommandResult> {
    // Defense-in-depth: validate/sanitize the caller's args before they become CLI
    // tokens. The root injection defense is spawning shell-free (see processRunner);
    // validation still rejects unexpected control characters at the command
    // boundary. Run before auth injection so trusted session aliases aren't
    // re-validated. Commands needing special characters (e.g. the query command's
    // encoded operators) override validateArgs.
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
          // Simple string flag with value
          sdkArgs.push(flagConfig, String(value));
        } else {
          // Object config with flag and hasValue
          if (flagConfig.hasValue) {
            sdkArgs.push(flagConfig.flag, String(value));
          } else if (value) {
            // Boolean flag without value
            sdkArgs.push(flagConfig.flag);
          }
        }
      }
    }

    // Add common flags (like --debug)
    this.appendCommonFlags(sdkArgs, args);

    return this.executeWithSessionWorkingDirectory(
      command,
      sdkArgs,
      undefined,
      this.timeoutMs,
      signal,
      args.workingDirectory
    );
  }
}
