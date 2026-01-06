import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types';
import { BaseCLICommand } from './baseCommand.js';
import { getProjectRootPath } from '../../config.js';

/**
 * ServiceNow SDK information command that accepts SDK flags
 * Handles -v/--version, -h/--help, -d/--debug flags as per SDK specification
 */
export class SdkInfoCommand extends BaseCLICommand {
  name = 'sdk_info';
  description = 'Get Fluent (ServiceNow SDK) information using native SDK flags (-v, -h, -d)';
  arguments: CommandArgument[] = [
    {
      name: 'flag',
      type: 'string',
      required: true,
      description: 'SDK flag to execute (-v/--version, -h/--help, -d/--debug)',
    },
    {
      name: 'command',
      type: 'string',
      required: false,
      description: 'Specific command to get help for (only used with -h/--help flag)',
    },
  ];

  /**
   * Get command and working directory for ServiceNow SDK execution
   */
  private getSdkCommand(): { command: string; baseArgs: string[]; workingDirectory: string } {
    // Use the project root path where @servicenow/sdk is installed
    const projectRoot = getProjectRootPath();
    
    return {
      command: 'npx',
      baseArgs: ['now-sdk'],
      workingDirectory: projectRoot
    };
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    const flag = args.flag as string;
    const command = args.command as string | undefined;

    // Validate flag
    const validFlags = ['-v', '--version', '-h', '--help', '-d', '--debug'];
    if (!validFlags.includes(flag)) {
      return CommandResultFactory.error(`Invalid flag '${flag}'. Valid flags: ${validFlags.join(', ')}`);
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
      // For version and debug: npx now-sdk <flag>
      sdkArgs.push(flag);
    }

    try {
      const result = await this.commandProcessor.process(sdkCommand, sdkArgs, false, workingDirectory);

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

      case '-d':
      case '--debug':
        return `ServiceNow SDK Debug Information:\n\n${trimmed}\n\nNote: Retrieved using 'npx now-sdk --debug'`;

      default:
        return trimmed;
    }
  }
}