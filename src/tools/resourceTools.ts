/**
 * MCP tools for accessing ServiceNow metadata resources (API specs, snippets, instructions)
 * and checking authentication status
 */
import { ResourceLoader, ResourceType } from '../utils/resourceLoader.js';
import { CLICommand, CommandArgument, CommandResult, CommandResultFactory } from '../utils/types.js';
import { SessionManager } from '../utils/sessionManager.js';
import logger from '../utils/logger.js';

/**
 * Base class for resource access commands
 */
export abstract class BaseResourceCommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract resourceType: ResourceType;

  protected resourceLoader: ResourceLoader;

  constructor() {
    this.resourceLoader = new ResourceLoader();
  }

  /**
   * Resource commands don't use command processors
   */
  getCommandProcessor(): undefined {
    return undefined;
  }

  arguments: CommandArgument[] = [
    {
      name: 'metadataType',
      type: 'string',
      required: true,
      description: 'ServiceNow metadata type (e.g., business-rule, script-include)',
    },
    {
      name: 'id',
      type: 'string',
      required: false,
      description: 'Optional identifier for specific resource (only for snippets)',
    }
  ];

  /**
   * Execute the resource command
   * @param args Command arguments
   * @returns Command result
   */
  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      return await this.doExecute(args);
    } catch (error) {
      logger.error(`Error executing ${this.name}`, CommandResultFactory.normalizeError(error));
      return CommandResultFactory.fromError(error);
    }
  }

  /**
   * Template method for subclasses to implement core execution logic
   * Override this instead of execute() to benefit from base error handling
   */
  protected async doExecute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    const metadataType = args.metadataType as string;
    const id = args.id as string | undefined;

    const result = await this.resourceLoader.getResource(this.resourceType, metadataType, id);

    if (!result.found) {
      return CommandResultFactory.error(`Resource not found for metadata type: ${metadataType}`);
    }

    return CommandResultFactory.success(result.content);
  }

  /**
   * Validate command arguments
   * @param args Command arguments
   * @throws Error if validation fails
   */
  protected validateArgs(args: Record<string, unknown>): void {
    if (!args.metadataType) {
      throw new Error('Missing required argument: metadataType');
    }
  }
}

/**
 * Command for accessing API specifications
 * When called without metadataType, lists all available metadata types
 */
export class GetApiSpecCommand extends BaseResourceCommand {
  name = 'get-api-spec';
  description = 'Fetches the Fluent API specification for a given ServiceNow metadata type. Call without arguments to list all available metadata types.';
  resourceType = ResourceType.SPEC;

  // Override arguments to make metadataType optional for listing
  arguments: CommandArgument[] = [
    {
      name: 'metadataType',
      type: 'string',
      required: false,  // Optional - if not provided, lists all available types
      description: 'ServiceNow metadata type (e.g., business-rule, script-include). Omit to list all available types.',
    },
  ];

  /**
   * Override doExecute to add listing functionality when no metadataType is provided
   */
  protected async doExecute(args: Record<string, unknown>): Promise<CommandResult> {
    const metadataType = args.metadataType as string | undefined;

    // If no metadataType provided, list all available types
    if (!metadataType) {
      try {
        const metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();

        if (metadataTypes.length === 0) {
          return CommandResultFactory.error('No metadata types found.');
        }

        const output = `Available Fluent metadata types (${metadataTypes.length}):\n${metadataTypes.join('\n')}\n\nUse get-api-spec with a specific metadataType to fetch its API specification.`;
        return CommandResultFactory.success(output);
      } catch (error) {
        logger.error('Error listing metadata types', CommandResultFactory.normalizeError(error));
        return CommandResultFactory.fromError(error);
      }
    }

    // Otherwise, fetch the specific API spec
    return super.doExecute(args);
  }

  /**
   * Override validateArgs since metadataType is now optional
   */
  protected validateArgs(_args: Record<string, unknown>): void {
    // No validation needed - metadataType is optional
  }
}

/**
 * Command for accessing code snippets
 */
export class GetSnippetCommand extends BaseResourceCommand {
  name = 'get-snippet';
  description = 'Fetches the Fluent code snippet for a given ServiceNow metadata type';
  resourceType = ResourceType.SNIPPET;

  /**
   * Override doExecute to add snippet listing functionality
   */
  protected async doExecute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    const metadataType = args.metadataType as string;
    const id = args.id as string | undefined;

    // If ID is provided, use base implementation
    if (id) {
      return super.doExecute(args);
    }

    // If no ID provided, list available snippets and return the first one
    const snippetIds = await this.resourceLoader.listSnippets(metadataType);

    if (snippetIds.length === 0) {
      return CommandResultFactory.error(`No snippets found for metadata type: ${metadataType}`);
    }

    // Get the first snippet
    const result = await this.resourceLoader.getResource(
      this.resourceType,
      metadataType,
      snippetIds[0]
    );

    if (!result.found) {
      return CommandResultFactory.error(`Snippet not found for metadata type: ${metadataType}`);
    }

    // Add information about other available snippets
    const additionalInfo = snippetIds.length > 1
      ? `\n\nAdditional snippets available: ${snippetIds.slice(1).join(', ')}`
      : '';

    return CommandResultFactory.success(result.content + additionalInfo);
  }
}

/**
 * Command for accessing instructions
 */
export class GetInstructCommand extends BaseResourceCommand {
  name = 'get-instruct';
  description = 'Retrieves instructions of Fluent API usage for a given ServiceNow metadata type';
  resourceType = ResourceType.INSTRUCT;
}

/**
 * Command for checking current authentication status
 * Returns the cached auth validation result from the session
 */
export class CheckAuthStatusCommand implements CLICommand {
  name = 'check_auth_status';
  description = 'Check current ServiceNow authentication status. Returns the result of auto-auth validation including status, profile alias, instance host, and any required action.';
  arguments: CommandArgument[] = [];

  /**
   * This command doesn't use a command processor
   */
  getCommandProcessor(): undefined {
    return undefined;
  }

  /**
   * Execute the command to check auth status
   * @returns Command result with auth status information
   */
  async execute(): Promise<CommandResult> {
    try {
      const sessionManager = SessionManager.getInstance();
      const authResult = sessionManager.getAuthValidationResult();

      if (!authResult) {
        return CommandResultFactory.success(JSON.stringify({
          status: 'unknown',
          message: 'Auth validation has not been performed yet. This may happen if the server just started or SN_INSTANCE_URL is not configured.',
          timestamp: new Date().toISOString(),
        }, null, 2));
      }

      // Return the auth result as formatted JSON
      return CommandResultFactory.success(JSON.stringify(authResult, null, 2));
    } catch (error) {
      logger.error('Error checking auth status', CommandResultFactory.normalizeError(error));
      return CommandResultFactory.fromError(error);
    }
  }
}
