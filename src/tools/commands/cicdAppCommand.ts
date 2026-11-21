import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { AUTH_ARGUMENT, SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { cliOption } from './cliArgv.js';
import { getProjectRootPath } from '../../config.js';
import { CLI_OUTPUT_FORMATS, POSITIVE_INTEGER_DOMAIN, SELECT_PATH_DOMAIN, SYS_ID_DOMAIN } from './argValidation.js';
import { DEBUG_ARGUMENT } from './baseCommand.js';
import { runnerTimeoutForWaitMs } from './responseTimeout.js';

/**
 * App-repo actions exposed by `now-sdk cicd`: the `action` argument's choices,
 * so a caller-supplied action can never reach argv unvalidated.
 */
const APP_ACTIONS = ['install', 'publish', 'rollback'] as const;
type AppAction = (typeof APP_ACTIONS)[number];

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
      domain: { kind: 'choices', values: APP_ACTIONS },
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
      domain: SYS_ID_DOMAIN,
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
      domain: POSITIVE_INTEGER_DOMAIN,
      description: 'Milliseconds to poll for completion before giving up. CLI default 900000 (15 minutes). Raising it also extends this tool\'s own process timeout.',
    },
    AUTH_ARGUMENT,
    {
      name: 'output',
      type: 'string',
      required: false,
      domain: { kind: 'choices', values: CLI_OUTPUT_FORMATS },
      description: `Output format: ${CLI_OUTPUT_FORMATS.map((f) => `"${f}"`).join(' or ')}. Defaults to "json" (machine-readable envelope).`,
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      domain: SELECT_PATH_DOMAIN,
      description: 'Dot/bracket path to extract from the JSON envelope `{ ok, result, progress?, interpretedResult? }` (e.g. "result.links.progress.id" or "progress.status"). An unresolved path yields null. Applied by this tool to a successful (ok: true) envelope only; on a failure the full envelope is returned so the error stays visible (the CLI\'s own --select would print only null).',
    },
    DEBUG_ARGUMENT,
  ];

  /**
   * Validate the action token and the per-action argument legality that the CLI
   * enforces, so a caller gets a message naming the exact problem rather than an
   * opaque CLI failure. The schema has already checked `action`, `output` and
   * `select` against their domains.
   */
  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(args);

    const action = args.action as AppAction;

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

  protected resolveTimeoutMs(args: Record<string, unknown>): number {
    return runnerTimeoutForWaitMs(this.timeoutMs, args.pollTimeout);
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    try {
      this.validateArgs(args);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    const action = args.action as AppAction;

    // The CLI defaults `--app-sys-id`/`--app-version` from the project it is run
    // in, so prefer a resolved project directory. Outside a project the caller
    // must identify both explicitly so the CLI never reads this server's own
    // package.json version from the neutral package directory.
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
      if (!args.appVersion) {
        return CommandResultFactory.error(
          `cicd_fluent_app requires 'appVersion' for action="${action}" when no Fluent project directory is available: ` +
          "the version can only be defaulted from a Fluent project's package.json. " +
          "Pass 'appVersion' explicitly, or provide the project via the 'workingDirectory' argument, init_fluent_app, or FLUENT_MCP_WORKING_DIR."
        );
      }
    }

    return this.executeSdkCommand(
      ['cicd', action],
      args,
      {
        scope: '--scope',
        appSysId: '--app-sys-id',
        appVersion: '--app-version',
        baseAppVersion: '--base-app-version',
        autoUpgradeBaseApp: { flag: '--auto-upgrade-base-app' },
        devNotes: '--dev-notes',
        wait: { flag: '--wait', negateOnly: true },
        pollTimeout: '--poll-timeout',
        auth: '--auth',
      },
      [],
      signal,
      {
        fixedFlags: [cliOption('--output', typeof args.output === 'string' ? args.output : 'json')],
        requireAuth: true,
        cwd: workingDirectory ?? getProjectRootPath(),
        envelope: { select: args.select, raw: args.output === 'raw' },
        validated: true,
      }
    );
  }
}
