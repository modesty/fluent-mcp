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

  /**
   * Get command and working directory for ServiceNow SDK execution
   */
  private getSdkCommand(): { command: string; baseArgs: string[]; workingDirectory: string } {
    // Resolve the bundled SDK CLI so version/help work regardless of cwd.
    const { command, baseArgs } = resolveSdkCli();

    return {
      command,
      baseArgs,
      workingDirectory: getProjectRootPath(),
    };
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    // The schema checks the flag's choices and the command name's grammar.
    this.validateArgs(args);

    const flag = args.flag as string;
    const command = args.command as string | undefined;

    if (command !== undefined) {
      // A command name is help for that command, so it needs the help flag.
      if (flag !== '-h' && flag !== '--help') {
        return CommandResultFactory.error(
          'The \'command\' argument is only valid with -h/--help flag'
        );
      }
    }

    // Build command arguments for SDK execution
    const { command: sdkCommand, baseArgs, workingDirectory } = this.getSdkCommand();
    const sdkArgs: string[] = [...baseArgs];

    if (flag === '-h' || flag === '--help') {
      if (command) {
        // Get help for specific command: npx now-sdk <command> --help
        sdkArgs.push(command, '--help');
      } else {
        // Get general help: npx now-sdk --help
        sdkArgs.push('--help');
      }
    } else {
      // For version: npx now-sdk <flag>
      sdkArgs.push(flag);
    }

    try {
      const result = await this.commandProcessor.process(sdkCommand, sdkArgs, workingDirectory, undefined, this.timeoutMs, signal);

      if (result.exitCode === 0) {
        return CommandResultFactory.success(this.formatOutput(result.output, flag, command));
      } else {
        return CommandResultFactory.errorWithOutput(
          result.output,
          result.error || new Error(`SDK flag '${flag}' execution failed`),
          result.exitCode
        );
      }
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }

  /**
   * Format the output based on the flag used
   */
  private formatOutput(output: string, flag: string, command?: string): string {
    const trimmed = output.trim();

    switch (flag) {
      case '-v':
      case '--version': {
        // Extract version for cleaner presentation
        const versionMatch = trimmed.match(/ServiceNow SDK v?(\d+\.\d+\.\d+[^\s]*)/i);
        if (versionMatch) {
          return `ServiceNow SDK Version: ${versionMatch[1]}\n\nFull output:\n${trimmed}`;
        }
        return `ServiceNow SDK Version Information:\n\n${trimmed}`;
      }

      case '-h':
      case '--help':
        if (command) {
          return `ServiceNow SDK Help for '${command}' command:\n\n${trimmed}\n\nNote: Retrieved using 'npx now-sdk ${command} --help'`;
        }
        return `ServiceNow SDK General Help:\n\n${trimmed}\n\nNote: Retrieved using 'npx now-sdk --help'`;

      default:
        return trimmed;
    }
  }
}