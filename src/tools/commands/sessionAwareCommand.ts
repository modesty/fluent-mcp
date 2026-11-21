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
import { FlagConfig } from './cliArgv.js';
import logger from '../../utils/logger.js';
import { getConfig, getProjectRootPath } from '../../config.js';
import { resolveProjectDirectory } from '../../utils/projectDirectory.js';
import { ENVELOPE_RUN_OPTIONS, shapeEnvelopeResult } from '../../utils/jsonSelect.js';

export const WORKING_DIRECTORY_ARGUMENT: CommandArgument = {
  name: 'workingDirectory',
  type: 'string',
  required: false,
  description:
    'Absolute path to the Fluent project for this call. Overrides the initialized session and FLUENT_MCP_WORKING_DIR.',
};

export const AUTH_ARGUMENT: CommandArgument = {
  name: 'auth',
  type: 'string',
  required: false,
  description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
};

export const SOURCE_ARGUMENT: CommandArgument = {
  name: 'source',
  type: 'string',
  required: false,
  description: 'Path to the directory that contains package.json configuration',
};

/** Options for `SessionAwareCLICommand.executeSdkCommand`. */
export interface ExecuteSdkOptions {
  /** Fixed CLI tokens appended after mapped flags (before `--debug`), e.g. `['--output=json']`. */
  fixedFlags?: readonly string[];
  /** Require an auth alias up front and return `missingAuthResult()` when none resolves. */
  requireAuth?: boolean;
  /** Explicit working directory (skips `getWorkingDirectory` / `requiresProject`). */
  cwd?: string;
  /** Capture stdout whole and apply client-side `select` + bounding (`shapeEnvelopeResult`). */
  envelope?: { select?: unknown; raw?: boolean };
  /** Skip `validateArgs` when the caller already validated before pre-flight work. */
  validated?: boolean;
  /** Per-call process options (when `envelope` is not set). */
  processOptions?: ProcessRunOptions;
}

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
    const validation = SessionManager.getInstance().getAuthValidationResult();
    if (validation?.status === 'validation_error' || validation?.status === 'not_authenticated') {
      return CommandResultFactory.error([validation.message, validation.actionRequired].filter(Boolean).join('\n\n'));
    }
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
    sdkCommand: string | readonly string[],
    args: Record<string, unknown>,
    flagMapping: Record<string, FlagConfig> = {},
    positionalArgs: readonly string[] = [],
    signal?: AbortSignal,
    options?: ExecuteSdkOptions
  ): Promise<CommandResult> {
    // Validate caller args with the command's input schema before auth injection
    // or argv construction, unless the caller already ran validateArgs up front.
    if (!options?.validated) {
      this.validateArgs(args);
    }

    // Resolve auth from session when 'auth' is mapped (or required up front).
    if (options?.requireAuth) {
      const providedAuth = typeof args.auth === 'string' ? args.auth : undefined;
      const resolvedAuth = await this.resolveAuthAlias(providedAuth);
      if (!resolvedAuth) {
        return this.missingAuthResult();
      }
      args = { ...args, auth: resolvedAuth };
    } else if ('auth' in flagMapping && !args.auth) {
      const sessionAuth = await this.resolveAuthAlias();
      if (sessionAuth) {
        args = { ...args, auth: sessionAuth };
      }
    }

    let cwd: string;
    if (options?.cwd !== undefined) {
      cwd = options.cwd;
    } else if (!this.requiresProject) {
      // The CLI resolves nothing from its cwd for this command, so the installed
      // package directory is a neutral cwd and no Fluent project is needed.
      cwd = getProjectRootPath();
    } else {
      try {
        const workingDirectory = this.getWorkingDirectory(args.workingDirectory);
        if (!workingDirectory) {
          return CommandResultFactory.error(
            "No Fluent project working directory is configured. Pass the 'workingDirectory' tool argument with an absolute path, run init_fluent_app to initialize the session, or set FLUENT_MCP_WORKING_DIR to an absolute path."
          );
        }
        cwd = workingDirectory;
      } catch (error) {
        return CommandResultFactory.fromError(error);
      }
    }

    const processOptions = options?.envelope ? ENVELOPE_RUN_OPTIONS : options?.processOptions;
    let result: CommandResult;
    try {
      result = await this.runBundledSdk(args, {
        subcommand: sdkCommand,
        flags: flagMapping,
        positionals: positionalArgs,
        fixedFlags: options?.fixedFlags,
        cwd,
        timeoutMs: this.resolveTimeoutMs(args),
        signal,
        processOptions,
      });
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    return options?.envelope
      ? shapeEnvelopeResult(result, options.envelope.select, options.envelope.raw)
      : result;
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
