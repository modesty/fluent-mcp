import {
  CommandArgument,
  CommandProcessor,
  CommandResult,
  CommandResultFactory,
  EnsureAuthValidated,
} from '../../utils/types.js';
import { BaseCLICommand, DEBUG_ARGUMENT } from './baseCommand.js';
import { resolveAuthAlias } from './sessionAwareCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { checkInitDestination, createInitDestination, removeCreatedDestination } from '../../utils/projectDirectory.js';
import { cliOption } from './cliArgv.js';
import logger from '../../utils/logger.js';
import {
  InitArgsResolver,
  InitValidator,
  ConversionInitData,
  CreationInitData,
  VALID_TEMPLATES,
} from './init/index.js';

/**
 * Command to initialize a new ServiceNow application
 *
 * Every input arrives with the `tools/call` arguments; the tool never asks the
 * client for more.
 *
 * Uses composition to delegate responsibilities:
 * - InitArgsResolver: Resolves the intent-specific request from the arguments
 * - InitValidator: Handles parameter validation
 */
export class InitCommand extends BaseCLICommand {
  name = 'init_fluent_app';
  description = 'Initialize a new Fluent (ServiceNow SDK) application or convert an existing scoped application. Set intent to "creation" for a new app (requires appName, packageName, scopeName, template) or "conversion" to convert from an instance sys_id or an absolute local application directory (requires from, and auth for instance conversion; pass packageName too, or the returned command prompts for it). Creation is not offline: the returned command reads the vendor prefix of the auth instance (explicit, else the session alias, else the CLI default profile) and contacts the npm registry. The workingDirectory must be an absolute path to an empty directory, or to a new directory under an existing one. The result is a shell command that enters that directory and runs the SDK init. After init, use build_fluent_app to compile.';
  // Creates a local project directory and sets the session working directory; for
  // conversion it also reads from an instance. Non-idempotent (a second run on a
  // populated directory is refused), and open-world for the conversion path.
  annotations = { openWorldHint: true, idempotentHint: false };

  private readonly ensureAuthValidated: EnsureAuthValidated;

  arguments: CommandArgument[] = [
    {
      name: 'intent',
      type: 'string',
      required: false,
      description: 'Specify your intent: "conversion" to convert an existing scoped app to Fluent, or "creation" to create a new scoped app. If omitted it is inferred — "conversion" when from is set, "creation" when appName, packageName or scopeName is set. Supply it explicitly when none of those are present.',
    },
    {
      name: 'from',
      type: 'string',
      required: false,
      description: 'For conversion: the sys_id of the sys_app record on the instance, or the absolute path of a local scoped application directory (one with a sys_app_<sys_id>.xml file in it, or in its update/ or scope/ subdirectory). ~ and relative paths are not expanded.',
    },
    {
      name: 'appName',
      type: 'string',
      required: false,
      description: 'For creation: The name of the application.',
    },
    {
      name: 'packageName',
      type: 'string',
      required: false,
      description: 'The npm package name for the project, usually the snake-case of appName in lowercase with a company prefix. Required for creation. For conversion it is optional but recommended: without it, the returned now-sdk init command stops to prompt for one.',
    },
    {
      name: 'scopeName',
      type: 'string',
      required: false,
      description: "For creation: The scope name for the application in x_<scope_name> format. Must start with 'x_' prefix. No spaces allowed, no greater than 18 characters.",
    },
    {
      name: 'template',
      type: 'string',
      required: false,
      domain: { kind: 'choices', values: VALID_TEMPLATES },
      description: 'For creation only (required): Template to use for the project. Choices: "base", "javascript.basic", "javascript.react", "typescript.basic", "typescript.react", "typescript.vue", "javascript.aiux" (an AIUX application with components and pages), "javascript.aiux-extension" (an AIUX extension that overlays pages onto an existing host experience; now-sdk init prompts for the host scope and route id). Not needed for conversion.',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias of the instance now-sdk init contacts (auto-injected from session if not provided). Conversion from an instance reads the application from it. Creation reads its vendor prefix to warn when scopeName does not start with it; without an alias, the CLI uses its default profile for that.',
    },
    {
      name: 'workingDirectory',
      type: 'string',
      required: true,
      description: 'Absolute path of the directory the Fluent (ServiceNow SDK) application is created in: an existing empty directory, or a new directory under an existing one (it is created). Not the filesystem root, and not a populated directory. ~ and relative paths are not expanded.',
    },
    DEBUG_ARGUMENT,
  ];

  constructor(
    commandProcessor: CommandProcessor,
    ensureAuthValidated: EnsureAuthValidated = async () => {}
  ) {
    super(commandProcessor);
    this.ensureAuthValidated = ensureAuthValidated;
  }

  /**
   * Build SDK arguments for conversion
   */
  private async buildConversionArgs(data: ConversionInitData, baseArgs: string[]): Promise<string[]> {
    const sdkArgs = [...baseArgs, 'init'];
    sdkArgs.push(cliOption('--from', data.from));
    // Conversion asks for the npm package name when the destination has no
    // package.json (always, for an empty or new one), so pass it when known.
    if (data.packageName) sdkArgs.push(cliOption('--packageName', data.packageName));

    // A local-path conversion is entirely local and must not trigger profile
    // discovery. An exact sys_id reads from an instance and therefore needs
    // the explicit/session/lazy-validated auth resolution path. An explicit
    // alias is honored even for a local path, but resolveAuthAlias returns it
    // without invoking lazy validation.
    const convertsFromInstance = InitValidator.isSysId(data.from);
    const hasExplicitAuth = typeof data.auth === 'string' && data.auth.trim() !== '';
    if (convertsFromInstance || hasExplicitAuth) {
      const auth = await resolveAuthAlias(data.auth, this.ensureAuthValidated);
      if (auth) sdkArgs.push(cliOption('--auth', auth));
    }

    if (data.debug) sdkArgs.push('--debug');
    return sdkArgs;
  }

  /**
   * Build SDK arguments for creation
   */
  private async buildCreationArgs(data: CreationInitData, baseArgs: string[]): Promise<{ sdkArgs: string[]; auth?: string }> {
    const sdkArgs = [...baseArgs, 'init'];

    // CLICmdWriter shell-escapes every entry of this argv. A name the caller
    // already wrapped in double quotes meant them as shell quoting, so they are
    // removed here rather than kept as part of the name.
    const { appName } = data;
    const bareAppName = /^".*"$/.test(appName) ? appName.slice(1, -1) : appName;
    sdkArgs.push(cliOption('--appName', bareAppName));
    sdkArgs.push(cliOption('--packageName', data.packageName));
    sdkArgs.push(cliOption('--scopeName', data.scopeName));
    sdkArgs.push(cliOption('--template', data.template));
    // Creation is not offline: `now-sdk init` resolves a credential either way
    // (`--auth`, else the CLI's default profile) and reads that instance's
    // vendor prefix to warn about a scopeName without it (sdk-cli
    // `command/init/prompts.js` `warnIfScopePrefixMismatch`; a warning only).
    // Omitting `--auth` therefore contacted whatever profile was the default,
    // unrelated to the configured instance, and dropped an explicit auth. The
    // target is the explicit alias, else the session's (lazily validated
    // SN_INSTANCE_URL) one; with neither, the CLI default applies and the
    // result says so.
    const auth = await resolveAuthAlias(data.auth, this.ensureAuthValidated);
    if (auth) sdkArgs.push(cliOption('--auth', auth));
    if (data.debug) sdkArgs.push('--debug');

    return { sdkArgs, auth };
  }

  /**
   * The network use of running a creation command, which the result discloses:
   * the instance whose vendor prefix is read, and the npm registry (the latest
   * SDK version check and the template packages).
   */
  private static creationNetworkNote(auth: string | undefined): string {
    const instance = auth
      ? `the instance of auth profile ${auth}`
      : "the instance of the CLI's default auth profile, if one is set (pass auth to choose the instance)";
    return `Running this command contacts ${instance} to read its vendor prefix, and warns when scopeName does not start with it; ` +
      'the project is created either way. It also contacts the npm registry for the latest SDK version and the template packages.';
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      // The schema checks types, the template choices, and control characters.
      this.validateArgs(args);

      // Step 1: Determine user intent from the supplied arguments. There is no
      // fallback prompt — a bag that implies neither mode fails with a message
      // naming both modes and their required arguments.
      const intent = InitArgsResolver.determineIntent(args);
      if (!intent) {
        return CommandResultFactory.error(InitArgsResolver.missingIntentError());
      }

      // Step 2: Resolve and validate data based on intent
      let initData: ConversionInitData | CreationInitData;

      if (intent === 'conversion') {
        const conversion = InitArgsResolver.resolveConversionData(args);
        // The SDK gets the resolved source, not the caller's spelling of it:
        // it runs in the destination, where a relative path means something else.
        initData = { ...conversion, from: InitValidator.resolveConversionSource(conversion.from) };
      } else {
        initData = InitArgsResolver.resolveCreationData(args);

        // Validate creation parameters
        const validation = InitValidator.validateCreationParameters(initData as CreationInitData);
        if (!validation.valid) {
          return CommandResultFactory.error(`Invalid parameters: ${validation.errors.join(', ')}`);
        }
      }

      // Step 3: Build the SDK command for the bundled CLI. A creation or a
      // conversion from an instance may wait here for lazy auth, so this comes before the
      // destination check: nothing awaited may separate that check from its use.
      const { command, baseArgs } = resolveSdkCli();
      let sdkArgs: string[];
      let networkNote: string | undefined;
      if (intent === 'conversion') {
        sdkArgs = await this.buildConversionArgs(initData as ConversionInitData, baseArgs);
      } else {
        const creation = await this.buildCreationArgs(initData as CreationInitData, baseArgs);
        sdkArgs = creation.sdkArgs;
        networkNote = InitCommand.creationNetworkNote(creation.auth);
      }

      // Step 4: Check the destination and create it if it is new, with no
      // await in between. Nothing on disk or in the session has changed before
      // this point, so any earlier failure leaves both as they were.
      const localSource = intent === 'conversion' && !InitValidator.isSysId((initData as ConversionInitData).from)
        ? (initData as ConversionInitData).from
        : undefined;
      const destination = checkInitDestination(initData.workingDirectory, localSource);
      const workingDirectory = destination.directory;
      const created = createInitDestination(destination);
      if (created) logger.info(`Created working directory: ${workingDirectory}`);

      // Step 5: Produce the command, which enters the destination (`now-sdk
      // init` writes the project into its cwd). The session takes the directory
      // only when that succeeds. On failure, a directory this call created is
      // removed again (best effort, empty only); one that already existed is
      // never touched. A failure of the SDK itself, once someone runs the
      // returned command, happens outside the server and is not rolled back.
      let result: CommandResult | undefined;
      try {
        result = await this.commandProcessor.process(command, sdkArgs, workingDirectory);
      } finally {
        if (created && !result?.success) removeCreatedDestination(workingDirectory);
      }
      logger.info(`Executed init command in directory: ${workingDirectory} - ${JSON.stringify(result)}`);

      if (result.success) {
        SessionManager.getInstance().setWorkingDirectory(workingDirectory);
        if (networkNote) result.output += `\n\n${networkNote}`;
        result.output += `\n\nThis directory (${workingDirectory}) has been saved as your working directory for future commands.`;
      }

      return result;

    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }
}
