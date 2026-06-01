/**
 * MCP tools for accessing ServiceNow metadata resources (API specs, snippets, instructions)
 * and checking authentication status
 */
import { z } from 'zod';
import { ResourceLoader } from '../../utils/resourceLoader.js';
import { CLICommand, CommandArgument, CommandResult, CommandResultFactory, ResourceType } from '../../utils/types.js';
import { SessionManager } from '../../utils/sessionManager.js';
import logger from '../../utils/logger.js';

/**
 * Shared MCP output schema for the metadata resource read tools
 * (get-api-spec, get-snippet, get-instruct). Extra keys are stripped by Zod,
 * so a single shape covers fetch + listing modes.
 */
const RESOURCE_OUTPUT_SCHEMA = {
  content: z.string().describe('The resource content (markdown).'),
  resourceType: z.string().describe('Resource type: spec | snippet | instruct.'),
  metadataType: z.string().optional().describe('The ServiceNow metadata type, when a specific resource was returned.'),
  snippetId: z.string().optional().describe('The returned snippet id (snippets only).'),
  additionalSnippetIds: z.array(z.string()).optional().describe('Other available snippet ids (snippets only).'),
  availableTypes: z.array(z.string()).optional().describe('All available metadata types (listing mode).'),
};

/**
 * Base class for resource access commands
 */
export abstract class BaseResourceCommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract resourceType: ResourceType;
  outputSchema = RESOURCE_OUTPUT_SCHEMA;

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
      // Normalize args before processing:
      // 1. Lowercase metadataType to match resource file naming convention
      // 2. Coerce null/empty id to undefined (LLMs often send null for "not provided")
      const normalized = { ...args };
      if (typeof normalized.metadataType === 'string') {
        normalized.metadataType = normalized.metadataType.toLowerCase();
      }
      if (normalized.id === null || normalized.id === '') {
        delete normalized.id;
      }
      return await this.doExecute(normalized);
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
      return CommandResultFactory.error(
        `No ${this.resourceType} resource found for metadata type '${metadataType}'. ` +
        'Call get-api-spec without arguments to list all available metadata types.'
      );
    }

    return CommandResultFactory.success(result.content, 0, {
      content: result.content,
      resourceType: this.resourceType,
      metadataType,
    });
  }

  /**
   * Validate command arguments
   * @param args Command arguments
   * @throws Error if validation fails
   */
  protected validateArgs(args: Record<string, unknown>): void {
    if (!args.metadataType) {
      throw new Error(
        "Missing required argument 'metadataType'. Provide a ServiceNow metadata type " +
        "like 'business-rule' or 'script-include'. Call get-api-spec without arguments to list all available types."
      );
    }
  }
}

/**
 * Command for accessing API specifications
 * When called without metadataType, lists all available metadata types
 */
export class GetApiSpecCommand extends BaseResourceCommand {
  name = 'get-api-spec';
  description = 'Fetch the Fluent API specification for a ServiceNow metadata type (e.g., "business-rule", "script-include"). Call without arguments to list all available metadata types. Use this to understand the Fluent API for a specific metadata type before writing code. For code examples, use get-snippet instead. For best practices, use get-instruct instead.';
  annotations = { readOnlyHint: true, idempotentHint: true };
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
        return CommandResultFactory.success(output, 0, {
          content: output,
          resourceType: this.resourceType,
          availableTypes: metadataTypes,
        });
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
  description = 'Fetch a Fluent code snippet for a ServiceNow metadata type (e.g., "business-rule", "script-include"). Returns the first available snippet when called without an id. Provides additional snippet ids if more are available. For API specifications, use get-api-spec instead. For best practices, use get-instruct instead.';
  annotations = { readOnlyHint: true, idempotentHint: true };
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
      return CommandResultFactory.error(
        `No snippets found for metadata type '${metadataType}'. ` +
        'Verify the metadata type name using get-api-spec without arguments.'
      );
    }

    // Get the first snippet
    const result = await this.resourceLoader.getResource(
      this.resourceType,
      metadataType,
      snippetIds[0]
    );

    if (!result.found) {
      return CommandResultFactory.error(
        `Snippet not found for metadata type '${metadataType}'. ` +
        'Verify the metadata type name using get-api-spec without arguments.'
      );
    }

    // Add information about other available snippets
    const additionalInfo = snippetIds.length > 1
      ? `\n\nAdditional snippets available: ${snippetIds.slice(1).join(', ')}`
      : '';

    return CommandResultFactory.success(result.content + additionalInfo, 0, {
      content: result.content,
      resourceType: this.resourceType,
      metadataType,
      snippetId: snippetIds[0],
      ...(snippetIds.length > 1 && { additionalSnippetIds: snippetIds.slice(1) }),
    });
  }
}

/**
 * Command for accessing instructions
 */
export class GetInstructCommand extends BaseResourceCommand {
  name = 'get-instruct';
  description = 'Fetch instructions and best practices for creating a ServiceNow metadata type using the Fluent API (e.g., "business-rule", "script-include"). Provides guidance on patterns, conventions, and common pitfalls. For API specifications, use get-api-spec. For code examples, use get-snippet.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  resourceType = ResourceType.INSTRUCT;

  // Override to only expose metadataType — instruct resources don't use id
  arguments: CommandArgument[] = [
    {
      name: 'metadataType',
      type: 'string',
      required: true,
      description: 'ServiceNow metadata type (e.g., business-rule, script-include)',
    },
  ];

  /**
   * Override doExecute to strip id — instruct resources are keyed by metadataType only.
   */
  protected async doExecute(args: Record<string, unknown>): Promise<CommandResult> {
    const { id: _ignored, ...rest } = args;
    return super.doExecute(rest);
  }
}

/**
 * Command for checking current authentication status
 * Returns the cached auth validation result from the session
 */
export class CheckAuthStatusCommand implements CLICommand {
  name = 'check_auth_status';
  description = 'Check current ServiceNow authentication status. Returns the cached auto-auth validation result as JSON including status, profile alias, instance host, auth type, and any required user action. Call this before commands that require authentication (deploy_fluent_app, fluent_transform, download_fluent_dependencies, download_fluent_app) to verify credentials are configured.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  arguments: CommandArgument[] = [];
  outputSchema = {
    status: z.string().describe("Auth status: 'authenticated' | 'not_authenticated' | 'validation_error' | 'skipped' | 'unknown'."),
    message: z.string().describe('Human-readable status message.'),
    alias: z.string().optional().describe('The matched auth profile alias.'),
    host: z.string().optional().describe('The ServiceNow instance host.'),
    authType: z.string().optional().describe("Auth type: 'oauth' | 'basic'."),
    isDefault: z.boolean().optional().describe('Whether this is the default auth profile.'),
    actionRequired: z.string().optional().describe('A shell command to run if manual auth setup is needed.'),
    timestamp: z.string().optional().describe('ISO timestamp of the validation.'),
  };

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
        const unknownStatus = {
          status: 'unknown',
          message: 'Auth validation has not been performed yet. This may happen if the server just started or SN_INSTANCE_URL is not configured.',
          timestamp: new Date().toISOString(),
        };
        return CommandResultFactory.success(JSON.stringify(unknownStatus, null, 2), 0, unknownStatus);
      }

      // Return the auth result as formatted JSON plus structured content
      return CommandResultFactory.success(
        JSON.stringify(authResult, null, 2),
        0,
        { ...authResult }
      );
    } catch (error) {
      logger.error('Error checking auth status', CommandResultFactory.normalizeError(error));
      return CommandResultFactory.fromError(error);
    }
  }
}
