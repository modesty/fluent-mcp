import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { SessionFallbackCommand } from './sessionFallbackCommand.js';

/**
 * Command to prepare shell command for ServiceNow SDK authentication
 * Handles adding, listing, deleting, and selecting auth profiles
 */
export class AuthCommand extends SessionFallbackCommand {
  name = 'manage_fluent_auth';
  description = 'Manage Fluent (ServiceNow SDK) authentication to instance with credential profiles, use this to add, list, delete, or switch between authentication profiles';
  arguments: CommandArgument[] = [
    {
      name: 'add',
      type: 'string',
      required: false,
      description: 'Instance name or URL to store authentication credentials for (now-sdk auth --add <value>)',
    },
    {
      name: 'type',
      type: 'string',
      required: false,
      description:
        'Type of authentication to use for new authentication credential. Choices: "basic", "oauth"',
    },
    {
      name: 'alias',
      type: 'string',
      required: false,
      description: 'Name for the authentication profile (required when using --add, --delete, --use)',
    },
    {
      name: 'list',
      type: 'boolean',
      required: false,
      description: 'List all existing stored authentication profiles',
    },
    {
      name: 'delete',
      type: 'string',
      required: false,
      description: 'Delete the specified authentication profile',
    },
    {
      name: 'use',
      type: 'string',
      required: false,
      description: 'Use the specified authentication profile',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
    {
      name: 'help',
      type: 'boolean',
      required: false,
      description: 'Show help',
    },
    {
      name: 'version',
      type: 'boolean',
      required: false,
      description: 'Show version number',
    },
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    // Validate mutually exclusive primary actions: add | list | delete | use
    const primaryFlags = [
      typeof args.add !== 'undefined',
      Boolean(args.list),
      typeof args.delete !== 'undefined',
      typeof args.use !== 'undefined',
    ].filter(Boolean).length;
    if (primaryFlags > 1) {
      return CommandResultFactory.error('Provide only one of --add, --list, --delete, or --use');
    }

    const sdkArgs = ['now-sdk', 'auth'];

    // Handle different auth operations
    if (typeof args.add === 'string') {
      const addValue = args.add as string;
      if (!addValue.trim()) {
        return CommandResultFactory.error('When using --add, you must provide a non-empty instance name or URL');
      }
      sdkArgs.push('--add', addValue);

      if (args.type) {
        const typeValue = String(args.type);
        const allowed = ['basic', 'oauth'];
        if (!allowed.includes(typeValue)) {
          return CommandResultFactory.error(`Invalid --type '${typeValue}'. Allowed values: basic, oauth`);
        }
        sdkArgs.push('--type', typeValue);
      }

      if (args.alias) {
        sdkArgs.push('--alias', args.alias as string);
      }
    } else if (args.list) {
      sdkArgs.push('--list');
    } else if (args.delete) {
      sdkArgs.push('--delete', args.delete as string);
    } else if (args.use) {
      sdkArgs.push('--use', args.use as string);
    }

    this.appendCommonFlags(sdkArgs, args);

    // Pass-through help/version if requested
    if (args.help) {
      sdkArgs.push('--help');
    }
    if (args.version) {
      sdkArgs.push('--version');
    }

    return await this.executeWithFallback('npx', sdkArgs);
  }
}
