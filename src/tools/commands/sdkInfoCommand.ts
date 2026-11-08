import { ArgumentDomain, CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { getProjectRootPath } from '../../config.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';

/** The SDK flags this tool runs: version and help. */
const SDK_INFO_FLAGS = ['-v', '--version', '-h', '--help'] as const;

/**
 * A `now-sdk` command name to get help for. It must not begin with "-", or the
 * CLI would read it as an option.
 */
const SDK_COMMAND_NAME_DOMAIN: ArgumentDomain = {
  kind: 'pattern',
  regex: /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/,
  expected: 'a command name: letters, digits, "_" and "-", not beginning with "-"',
};

/**
 * ServiceNow SDK information command that accepts SDK flags
 * Handles:
 * - -v/--version: Show SDK version
 * - -h/--help: Show SDK help (optionally for a specific command)
 */
export class SdkInfoCommand extends BaseCLICommand {
  name = 'sdk_info';
  description = 'Get Fluent (ServiceNow SDK) version or help information. Use -v to check the installed SDK version, or -h for general help or help on a specific command (e.g., flag: "-h", command: "build"). Does NOT require authentication or a Fluent project directory.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  timeoutMs = 10_000;
  arguments: CommandArgument[] = [
    {
      name: 'flag',
      type: 'string',
      required: true,
      domain: { kind: 'choices', values: SDK_INFO_FLAGS },
      description: 'SDK flag to execute: -v/--version (SDK version), -h/--help (SDK help)',
    },
    {
      name: 'command',
      type: 'string',
      required: false,
      domain: SDK_COMMAND_NAME_DOMAIN,
      description: 'Specific command to get help for (only used with -h/--help flag)',
    },
  ];

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    // The schema checks the flag's choices and the command name's grammar.
    this.validateArgs(args);

    const flag = args.flag as string;
    const command = args.command as string | undefined;
    const isHelp = flag === '-h' || flag === '--help';

    // A command name is help for that command, so it needs the help flag.
    if (command !== undefined && !isHelp) {
      return CommandResultFactory.error(
        'The \'command\' argument is only valid with -h/--help flag'
      );
    }

    // Run the bundled SDK CLI from the installed package directory, so version
    // and help work regardless of cwd: now-sdk [<command>] --help, or now-sdk <flag>.
    const { command: sdkCommand, baseArgs } = resolveSdkCli();
    const sdkArgs: string[] = [...baseArgs];
    if (isHelp) {
      if (command) sdkArgs.push(command);
      sdkArgs.push('--help');
    } else {
      sdkArgs.push(flag);
    }

    const result = await this.commandProcessor.process(sdkCommand, sdkArgs, getProjectRootPath(), this.timeoutMs, signal);
    if (result.exitCode === 0) {
      return CommandResultFactory.success(SdkInfoCommand.formatOutput(result.output, isHelp, command));
    }
    return CommandResultFactory.errorWithOutput(
      result.output,
      result.error || new Error(`SDK flag '${flag}' execution failed`),
      result.exitCode
    );
  }

  /**
   * Label the CLI output: `now-sdk --version` prints the bare version, and help
   * is the CLI's own text for the general or one command's usage.
   */
  private static formatOutput(output: string, isHelp: boolean, command?: string): string {
    const trimmed = output.trim();
    if (!isHelp) {
      return `ServiceNow SDK Version Information:\n\n${trimmed}`;
    }
    return command
      ? `ServiceNow SDK Help for '${command}' command:\n\n${trimmed}\n\nNote: Retrieved using the bundled 'now-sdk ${command} --help'`
      : `ServiceNow SDK General Help:\n\n${trimmed}\n\nNote: Retrieved using the bundled 'now-sdk --help'`;
  }
}
