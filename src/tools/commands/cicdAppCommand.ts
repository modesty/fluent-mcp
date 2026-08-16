import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { getProjectRootPath } from '../../config.js';
import {
  CLI_OUTPUT_FORMATS,
  assertOneOf,
  screenFreeTextArgs,
  screenSelectPathArg,
} from './argValidation.js';

/**
 * App-repo actions exposed by `now-sdk cicd`. Kept as a strict allowlist so a
 * caller-supplied action can never reach argv unvalidated.
 */
const APP_ACTIONS = ['install', 'publish', 'rollback'] as const;
type AppAction = (typeof APP_ACTIONS)[number];

/**
 * Release notes routinely contain printable punctuation the base
 * shell-metacharacter check rejects (parentheses, commas, semicolons), which is
 * inert on the shell-free execution path.
 */
const FREE_TEXT_ARGS = ['devNotes'] as const;

/**
 * Command to drive ServiceNow app-repo CI/CD operations against an instance
 * (SDK v4.10.0+ `now-sdk cicd`). Wraps the `sn_cicd` app_repo endpoints:
 * `install`, `publish`, and `rollback`.
 *
 * These actions change instance state, so the tool is annotated destructive.
 * The read-only/test half of the `cicd` tree lives in `CicdTestCommand`.
 *
 * Auth is auto-injected from the session. `--auth` is the only credential flag
 * the CLI accepts here: the instance is resolved from the alias.
 *
 * The CLI defaults to `--wait`, polling the progress endpoint for up to 15
 * minutes, so `timeoutMs` sits just above the CLI's own poll timeout to let the
 * CLI report a clean timeout instead of the runner killing the child first.
 */
export class CicdAppCommand extends SessionAwareCLICommand {
  name = 'cicd_fluent_app';
  description = 'Run a ServiceNow app-repo CI/CD operation via the sn_cicd API (SDK v4.10.0+): install, publish, or rollback an application on an instance. CHANGES INSTANCE STATE. Identify the app with either scope or appSysId; inside a Fluent project both appSysId and appVersion default from now.config.json/package.json, and outside one both must be passed explicitly. appVersion is always required for rollback. Requires instance authentication (auto-injected from session, or pass auth explicitly).';
  annotations = { destructiveHint: true, idempotentHint: false, openWorldHint: true };
  timeoutMs = 930_000;
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'action',
      type: 'string',
      required: true,
      description: 'App-repo operation to run: "install", "publish", or "rollback".',
    },
    {
      name: 'scope',
      type: 'string',
      required: false,
      description: 'Scope name of the application (e.g. x_myco_app). Mutually exclusive with appSysId; prefer appSysId when known.',
    },
    {
      name: 'appSysId',
      type: 'string',
      required: false,
      description: 'sys_id of the application (sys_app). Mutually exclusive with scope. Defaults to the scopeId in now.config.json when run inside a Fluent project.',
    },
    {
      name: 'appVersion',
      type: 'string',
      required: false,
      description: 'Application version. For install/publish, defaults to the version in package.json inside a Fluent project — REQUIRED when no Fluent project directory is available. REQUIRED for rollback — the version expected after the rollback completes.',
    },
    {
      name: 'baseAppVersion',
      type: 'string',
      required: false,
      description: 'Version of the base application to install alongside this application. Only valid with action="install".',
    },
    {
      name: 'autoUpgradeBaseApp',
      type: 'boolean',
      required: false,
      description: 'Automatically upgrade the base application if required. Only valid with action="install".',
    },
    {
      name: 'devNotes',
      type: 'string',
      required: false,
      description: 'Developer notes to record for this published version. Only valid with action="publish".',
    },
    {
      name: 'wait',
      type: 'boolean',
      required: false,
      description: 'Wait for the operation to complete, polling progress (CLI default true). Set false to return immediately after dispatch with the progress id.',
    },
    {
      name: 'pollTimeout',
      type: 'number',
      required: false,
      description: 'Milliseconds to poll for completion before giving up. CLI default 900000 (15 minutes). Values above ~15 minutes also require raising FLUENT_MCP_COMMAND_TIMEOUT_MS.',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'output',
      type: 'string',
      required: false,
      description: `Output format: ${CLI_OUTPUT_FORMATS.map((f) => `"${f}"`).join(' or ')}. Defaults to "json" (machine-readable envelope).`,
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      description: 'Dot/bracket path to extract from the output (e.g. "result.links.progress.id" or "result.records[0].sys_id"). Implies machine-readable output.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  /**
   * Validate the action token and the per-action argument legality that the CLI
   * enforces, so a caller gets a message naming the exact problem rather than an
   * opaque CLI failure.
   *
   * `devNotes` (prose) and `select` (a bracket path) both carry characters the
   * base shell-metacharacter check rejects but that are harmless on the
   * shell-free execution path, so the base is handed benign placeholders —
   * preserving its required/type checks — while each real value is screened by
   * the rule that applies to it (see argValidation).
   */
  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(screenSelectPathArg(screenFreeTextArgs(args, FREE_TEXT_ARGS)));

    const action = assertOneOf(args.action, APP_ACTIONS, 'action');

    if (args.output !== undefined) {
      assertOneOf(args.output, CLI_OUTPUT_FORMATS, 'output');
    }

    if (args.scope && args.appSysId) {
      throw new Error(
        "Arguments 'scope' and 'appSysId' are mutually exclusive. Pass only one — prefer 'appSysId' when known, since it identifies the application directly."
      );
    }

    if (action === 'rollback' && !args.appVersion) {
      throw new Error(
        "Argument 'appVersion' is required for action=\"rollback\" — it is the version expected after the rollback completes. For rolling back an App Customization install, set it to the base application version expected afterward."
      );
    }

    // Covers publish and rollback alike: only the install operation accepts the
    // base-application flags.
    if (action !== 'install' && (args.baseAppVersion !== undefined || args.autoUpgradeBaseApp !== undefined)) {
      throw new Error(
        `Arguments 'baseAppVersion' and 'autoUpgradeBaseApp' are only valid with action="install", not action="${action}".`
      );
    }

    if (action !== 'publish' && args.devNotes !== undefined) {
      throw new Error(`Argument 'devNotes' is only valid with action="publish", not action="${action}".`);
    }
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    try {
      this.validateArgs(args);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    const action = args.action as AppAction;

    // These operations act on a live instance, so authentication is required.
    // Resolve it up front and fail with an actionable message.
    const providedAuth = typeof args.auth === 'string' ? args.auth : undefined;
    const resolvedAuth = await this.resolveAuthAlias(providedAuth);
    if (!resolvedAuth) {
      return CommandResultFactory.error(
        'cicd_fluent_app requires authentication to a ServiceNow instance, but no credential alias was found. ' +
        "Pass 'auth' with a stored profile alias, or set SN_INSTANCE_URL so lazy validation can load a matching profile into the session. " +
        "Use the ServiceNow SDK 'now-sdk auth --add <instance>' command to create a profile."
      );
    }

    // The CLI defaults `--app-sys-id`/`--app-version` from the project it is run
    // in, so prefer a resolved project directory. Outside a project the caller
    // must identify the application explicitly.
    let workingDirectory: string | undefined;
    try {
      workingDirectory = this.getWorkingDirectory(args.workingDirectory);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    if (!workingDirectory) {
      if (!args.scope && !args.appSysId) {
        return CommandResultFactory.error(
          "cicd_fluent_app could not identify the application: no Fluent project directory is available to default 'appSysId' from. " +
          "Pass 'scope' or 'appSysId' explicitly, or provide the project via the 'workingDirectory' argument, init_fluent_app, or FLUENT_MCP_WORKING_DIR."
        );
      }

      // The CLI defaults `--app-version` from the *cwd's* package.json, and the
      // only cwd available here is the MCP server's own install directory — so
      // omitting it outside a project would silently publish/install this
      // server's version. Require it explicitly instead of inferring a wrong one.
      if (!args.appVersion) {
        return CommandResultFactory.error(
          `cicd_fluent_app requires 'appVersion' for action="${action}" when no Fluent project directory is available: ` +
          "the version can only be defaulted from a Fluent project's package.json. " +
          "Pass 'appVersion' explicitly, or provide the project via the 'workingDirectory' argument, init_fluent_app, or FLUENT_MCP_WORKING_DIR."
        );
      }
    }

    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs: string[] = [...baseArgs, 'cicd', action];

    if (args.scope) sdkArgs.push('--scope', String(args.scope));
    if (args.appSysId) sdkArgs.push('--app-sys-id', String(args.appSysId));
    if (args.appVersion) sdkArgs.push('--app-version', String(args.appVersion));
    if (args.baseAppVersion) sdkArgs.push('--base-app-version', String(args.baseAppVersion));
    if (args.autoUpgradeBaseApp) sdkArgs.push('--auto-upgrade-base-app');

    if (args.devNotes) sdkArgs.push('--dev-notes', String(args.devNotes));

    // `--wait` defaults to true in the CLI, so only the negation is meaningful.
    // The flag-mapping helper drops `false` values, hence the explicit push.
    if (args.wait === false) sdkArgs.push('--no-wait');
    if (args.pollTimeout !== undefined) sdkArgs.push('--poll-timeout', String(args.pollTimeout));

    sdkArgs.push('--auth', resolvedAuth);
    sdkArgs.push('--output', typeof args.output === 'string' ? args.output : 'json');
    if (args.select) sdkArgs.push('--select', String(args.select));
    this.appendCommonFlags(sdkArgs, args);

    // App-repo work is instance-side. When no project is configured the installed
    // package directory is only a cwd for spawning the bundled CLI: the checks
    // above guarantee both project-derived defaults (`--app-sys-id` from
    // now.config.json, `--app-version` from package.json) are already supplied,
    // so the CLI reads nothing out of that directory.
    return this.commandProcessor.process(
      command,
      sdkArgs,
      workingDirectory ?? getProjectRootPath(),
      undefined,
      this.timeoutMs,
      signal
    );
  }
}
