/**
 * MCP tools for accessing ServiceNow metadata resources (API specs, snippets, instructions)
 */
import { ResourceLoader, ResourceType } from '../utils/resourceLoader.js';
import { CLICommand, CommandArgument, CommandResult, CommandResultFactory } from '../utils/types.js';
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
 */
export class GetApiSpecCommand extends BaseResourceCommand {
  name = 'get-api-spec';
  description = 'Fetches the Fluent API specification for a given ServiceNow metadata type (e.g., "business-rule", "acl", etc.).';
  resourceType = ResourceType.SPEC;
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
 * Command for listing available metadata types
 */
export class ListMetadataTypesCommand implements CLICommand {
  name = 'list-metadata-types';
  description = 'List all available ServiceNow metadata types that currently supported by Fluent (ServiceNow SDK)';
  arguments: CommandArgument[] = [];

  private resourceLoader: ResourceLoader;

  constructor() {
    this.resourceLoader = new ResourceLoader();
  }

  /**
   * Resource commands don't use command processors
   */
  getCommandProcessor(): undefined {
    return undefined;
  }

  /**
   * Execute the command to list available metadata types
   * @returns Command result with list of metadata types
   */
  async execute(): Promise<CommandResult> {
    try {
      const metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();

      const output = metadataTypes.length === 0
        ? 'No metadata types found.'
        : `Available metadata types:\n${metadataTypes.join('\n')}`;

      return CommandResultFactory.success(output);
    } catch (error) {
      logger.error('Error listing metadata types', CommandResultFactory.normalizeError(error));
      return CommandResultFactory.fromError(error);
    }
  }
}
