import fs from 'node:fs';
import path from 'node:path';
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
import {
  checkInitDestination,
  createInitDestination,
  removeCreatedDestination,
  resolveExistingDirectory,
} from '../../utils/projectDirectory.js';
import { cliOption } from './cliArgv.js';
import { POSITIVE_INTEGER_DOMAIN, SYS_ID_DOMAIN } from './argValidation.js';
import logger from '../../utils/logger.js';

/** Valid intents for `init_fluent_app`. */
const VALID_INTENTS = ['conversion', 'creation'] as const;
type InitIntent = (typeof VALID_INTENTS)[number];

/** Valid template options for app creation. */
export const VALID_TEMPLATES = [
  'base',
  'javascript.react',
  'typescript.basic',
  'typescript.react',
  'javascript.basic',
  'typescript.vue',
  'javascript.aiux',
  'javascript.aiux-extension',
] as const;

interface ConversionInitData {
  from: string;
  workingDirectory: string;
  packageName?: string;
  auth?: string;
  timeoutSeconds?: number;
  debug?: boolean;
}

interface CreationInitData {
  appName: string;
  packageName: string;
  scopeName: string;
  workingDirectory: string;
  template: string;
  auth?: string;
  debug?: boolean;
}

/** Creation arguments the caller must supply; `workingDirectory` is already schema-required. */
const REQUIRED_CREATION_ARGS = ['appName', 'packageName', 'scopeName', 'workingDirectory', 'template'] as const;

const CONVERSION_SOURCE_REMEDY =
  'Supply an instance sys_id (32 hexadecimal characters) or the absolute path of a scoped application directory to convert.';

/**
 * The application record files `now-sdk init --from <dir>` converts from, and
 * the subdirectories it looks in (`ProjectFactory.getSysAppXML` in
 * `@servicenow/sdk-api`).
 */
const SYS_APP_XML = /^sys_(store_)?app_[0-9a-zA-Z]{32}\.xml$/;
const SYS_APP_XML_DIRS = ['', 'update', 'scope'];

/** Whether a string argument was supplied as non-blank text (null/blank count as absent). */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/** Whether a conversion `from` value is an instance application sys_id (32 hex). */
const isSysId = (value: string): boolean => SYS_ID_DOMAIN.regex.test(value);

/** Whether `directory` holds a `sys_app`/`sys_store_app` XML record where `now-sdk init` looks. */
function hasSysAppXml(directory: string): boolean {
  return SYS_APP_XML_DIRS.some((subdir) => {
    const dir = path.join(directory, subdir);
    try {
      return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).some((item) => SYS_APP_XML.test(item));
    } catch {
      return false;
    }
  });
}

/**
 * Resolve `from` once to what the SDK receives: an instance sys_id as is, or
 * a canonical local application directory (absolute, non-root, with an app XML).
 */
function resolveConversionSource(from: string): string {
  if (isSysId(from)) return from;

  const directory = resolveExistingDirectory(from, 'from', CONVERSION_SOURCE_REMEDY, 'an application directory');
  if (!hasSysAppXml(directory)) {
    throw new Error(
      `from holds no application record: ${directory}. now-sdk init converts a directory with a ` +
      'sys_app_<sys_id>.xml or sys_store_app_<sys_id>.xml file in it, or in its update/ or scope/ subdirectory. ' +
      CONVERSION_SOURCE_REMEDY
    );
  }
  return directory;
}

/** Determine intent from explicit `intent` (schema-validated) or supplied mode arguments. */
function determineIntent(args: Record<string, unknown>): InitIntent | null {
  if (typeof args.intent === 'string') return args.intent as InitIntent;
  if (args.from) return 'conversion';
  if (args.appName || args.packageName || args.scopeName) return 'creation';
  return null;
}

function resolveConversionData(args: Record<string, unknown>): ConversionInitData {
  const missing = (['from', 'workingDirectory'] as const).filter((name) => !isNonEmptyString(args[name]));
  if (missing.length > 0) {
    throw new Error(
      `Required parameters for conversion are missing: ${missing.join(', ')}. ` +
      "Supply 'from' as an instance sys_id (32-character hex) or the absolute path of a local scoped " +
      "application directory, and 'workingDirectory' as an absolute path to an empty or new directory."
    );
  }
  return {
    from: resolveConversionSource(args.from as string),
    workingDirectory: args.workingDirectory as string,
    packageName: isNonEmptyString(args.packageName) ? args.packageName : undefined,
    auth: args.auth as string | undefined,
    timeoutSeconds: typeof args.timeoutSeconds === 'number' ? args.timeoutSeconds : undefined,
    debug: args.debug as boolean | undefined,
  };
}

function resolveCreationData(args: Record<string, unknown>): CreationInitData {
  const missing = REQUIRED_CREATION_ARGS.filter((name) => !isNonEmptyString(args[name]));
  if (missing.length > 0) {
    throw new Error(
      `Required parameters for creation are missing: ${missing.join(', ')}. ` +
      `Valid template values are: ${VALID_TEMPLATES.join(', ')}.`
    );
  }
  const scopeName = args.scopeName as string;
  const errors: string[] = [];
  if (!scopeName.startsWith('x_')) errors.push('scopeName must start with "x_" prefix');
  if (scopeName.length > 18) errors.push('scopeName cannot be longer than 18 characters');
  if (/\s/.test(scopeName)) errors.push('scopeName cannot contain spaces');
  if (errors.length > 0) {
    throw new Error(`Invalid parameters: ${errors.join(', ')}`);
  }
  return {
    appName: args.appName as string,
    packageName: args.packageName as string,
    scopeName,
    workingDirectory: args.workingDirectory as string,
    template: args.template as string,
    auth: args.auth as string | undefined,
    debug: args.debug as boolean | undefined,
  };
}

/**
 * Command to initialize a new ServiceNow application or convert an existing one.
 * Every input arrives with the `tools/call` arguments; the tool never prompts
 * the client for more.
 */
export class InitCommand extends BaseCLICommand {
  name = 'init_fluent_app';
  description = 'Initialize a new Fluent (ServiceNow SDK) application or convert an existing scoped application. Set intent to "creation" for a new app (requires appName, packageName, scopeName, template) or "conversion" to convert from an instance sys_id or an absolute local application directory (requires from, and auth for instance conversion; pass packageName too, or the returned command prompts for it; for a large app on a slow instance, raise timeoutSeconds). Creation is not offline: the returned command reads the vendor prefix of the auth instance (explicit, else the session alias, else the CLI default profile) and contacts the npm registry. The workingDirectory must be an absolute path to an empty directory, or to a new directory under an existing one. The result is a shell command that enters that directory and runs the SDK init. After init, use build_fluent_app to compile.';
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
      domain: { kind: 'choices', values: VALID_INTENTS },
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
      name: 'timeoutSeconds',
      type: 'number',
      required: false,
      domain: POSITIVE_INTEGER_DOMAIN,
      description: 'For conversion from an instance only (from is a sys_id; SDK v4.14.2+): seconds now-sdk init waits between response chunks from the instance before giving up (CLI default 3600). An idle timeout, not a total. The returned command runs in your terminal, so no server timeout applies to it.',
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

  private async buildConversionArgs(data: ConversionInitData, baseArgs: string[]): Promise<string[]> {
    const sdkArgs = [...baseArgs, 'init', cliOption('--from', data.from)];
    if (data.packageName) sdkArgs.push(cliOption('--packageName', data.packageName));
    if (data.timeoutSeconds !== undefined) sdkArgs.push(cliOption('--timeout', data.timeoutSeconds));

    // Local-path conversion must not trigger lazy profile discovery; an explicit
    // alias is honored without lazy validation, and a sys_id uses full resolution.
    const convertsFromInstance = isSysId(data.from);
    const hasExplicitAuth = isNonEmptyString(data.auth);
    if (convertsFromInstance || hasExplicitAuth) {
      const auth = await resolveAuthAlias(data.auth, this.ensureAuthValidated);
      if (auth) sdkArgs.push(cliOption('--auth', auth));
    }

    if (data.debug) sdkArgs.push('--debug');
    return sdkArgs;
  }

  private async buildCreationArgs(data: CreationInitData, baseArgs: string[]): Promise<{ sdkArgs: string[]; auth?: string }> {
    const sdkArgs = [...baseArgs, 'init'];

    // CLICmdWriter shell-escapes every entry. Strip outer double quotes a caller
    // meant as shell quoting rather than part of the application name.
    const bareAppName = /^".*"$/.test(data.appName) ? data.appName.slice(1, -1) : data.appName;
    sdkArgs.push(
      cliOption('--appName', bareAppName),
      cliOption('--packageName', data.packageName),
      cliOption('--scopeName', data.scopeName),
      cliOption('--template', data.template)
    );
    // Creation contacts an instance to check its vendor prefix (warnIfScopePrefixMismatch);
    // resolve explicit/session auth so it targets the intended instance instead of an unrelated default.
    const auth = await resolveAuthAlias(data.auth, this.ensureAuthValidated);
    if (auth) sdkArgs.push(cliOption('--auth', auth));
    if (data.debug) sdkArgs.push('--debug');

    return { sdkArgs, auth };
  }

  private static creationNetworkNote(auth: string | undefined): string {
    const instance = auth
      ? `the instance of auth profile ${auth}`
      : "the instance of the CLI's default auth profile, if one is set (pass auth to choose the instance)";
    return `Running this command contacts ${instance} to read its vendor prefix, and warns when scopeName does not start with it; ` +
      'the project is created either way. It also contacts the npm registry for the latest SDK version and the template packages.';
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      this.validateArgs(args);

      const intent = determineIntent(args);
      if (!intent) {
        return CommandResultFactory.error(
          "Cannot determine intent for init_fluent_app. Set intent to 'creation' and supply " +
          `${REQUIRED_CREATION_ARGS.join(', ')}; or set intent to 'conversion' and supply 'from' ` +
          '(an instance sys_id or the absolute path of a local scoped application directory).'
        );
      }

      // `now-sdk init --timeout` (SDK v4.14.2+) only reaches the connector of an
      // instance conversion; the CLI accepts and ignores it otherwise.
      if (typeof args.timeoutSeconds === 'number' &&
          !(intent === 'conversion' && typeof args.from === 'string' && isSysId(args.from))) {
        return CommandResultFactory.error(
          "Argument 'timeoutSeconds' applies only to conversion from an instance (from is a sys_id). " +
          'Creation and local conversion do not download from an instance.'
        );
      }

      const initData = intent === 'conversion' ? resolveConversionData(args) : resolveCreationData(args);

      // Build SDK args (including any awaited lazy auth) before checking/creating
      // the destination, so nothing awaited separates checkInitDestination from use.
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

      const localSource = intent === 'conversion' && !isSysId((initData as ConversionInitData).from)
        ? (initData as ConversionInitData).from
        : undefined;
      const destination = checkInitDestination(initData.workingDirectory, localSource);
      const workingDirectory = destination.directory;
      const created = createInitDestination(destination);
      if (created) logger.info(`Created working directory: ${workingDirectory}`);

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
