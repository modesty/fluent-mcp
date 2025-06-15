/**
 * MCP tools for accessing ServiceNow metadata resources (API specs, snippets, instructions)
 */
import { ResourceLoader, ResourceType } from "../utils/resourceLoader.js";
import { CLICommand, CommandArgument, CommandResult, ResourceResult } from "../utils/types.js";
import logger from "../utils/logger.js";

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

  arguments: CommandArgument[] = [
    {
      name: "metadataType",
      type: "string",
      required: true,
      description: "ServiceNow metadata type (e.g., business-rule, script-include)",
    },
    {
      name: "id",
      type: "string",
      required: false,
      description: "Optional identifier for specific resource (only for snippets)",
    }
  ];

  /**
   * Execute the resource command
   * @param args Command arguments
   * @returns Command result
   */
  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      this.validateArgs(args);
      
      const metadataType = args.metadataType as string;
      const id = args.id as string | undefined;
      
      const result = await this.resourceLoader.getResource(this.resourceType, metadataType, id);
      
      if (!result.found) {
        return {
          exitCode: 1,
          success: false,
          output: `Resource not found for metadata type: ${metadataType}`,
          error: new Error(`Resource not found for metadata type: ${metadataType}`),
        };
      }
      
      return this.formatResult(result);
    } catch (error) {
      logger.error(`Error executing ${this.name}`, 
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        exitCode: 1,
        success: false,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Format the resource result for output
   * @param result Resource result
   * @returns Command result
   */
  protected formatResult(result: ResourceResult): CommandResult {
    return {
      exitCode: 0,
      success: true,
      output: result.content,
    };
  }

  /**
   * Validate command arguments
   * @param args Command arguments
   * @throws Error if validation fails
   */
  protected validateArgs(args: Record<string, unknown>): void {
    if (!args.metadataType) {
      throw new Error("Missing required argument: metadataType");
    }
    
    // For snippets, we don't validate ID as it can be null (will default to the first snippet)
  }
}

/**
 * Command for accessing API specifications
 */
export class GetApiSpecCommand extends BaseResourceCommand {
  name = "get-api-spec";
  description = "Get API specification for a ServiceNow metadata type";
  resourceType = ResourceType.SPEC;
}

/**
 * Command for accessing code snippets
 */
export class GetSnippetCommand extends BaseResourceCommand {
  name = "get-snippet";
  description = "Get code snippet for a ServiceNow metadata type";
  resourceType = ResourceType.SNIPPET;
  
  /**
   * Execute the snippet command with enhanced features
   * @param args Command arguments
   * @returns Command result
   */
  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      this.validateArgs(args);
      
      const metadataType = args.metadataType as string;
      const id = args.id as string | undefined;
      
      // If ID is provided, get that specific snippet
      if (id) {
        return super.execute(args);
      }
      
      // If no ID provided, provide a list of available snippets first
      const snippetIds = await this.resourceLoader.listSnippets(metadataType);
      
      if (snippetIds.length === 0) {
        return {
          exitCode: 1,
          success: false,
          output: `No snippets found for metadata type: ${metadataType}`,
          error: new Error(`No snippets found for metadata type: ${metadataType}`),
        };
      }
      
      // Get the first snippet
      const result = await this.resourceLoader.getResource(
        this.resourceType,
        metadataType,
        snippetIds[0]
      );
      
      if (!result.found) {
        return {
          exitCode: 1,
          success: false,
          output: `Snippet not found for metadata type: ${metadataType}`,
          error: new Error(`Snippet not found for metadata type: ${metadataType}`),
        };
      }
      
      // Add information about other available snippets
      const additionalInfo = snippetIds.length > 1 
        ? `\n\nAdditional snippets available: ${snippetIds.slice(1).join(', ')}`
        : '';
      
      return {
        exitCode: 0,
        success: true,
        output: result.content + additionalInfo,
      };
    } catch (error) {
      logger.error(`Error executing ${this.name}`, 
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        exitCode: 1,
        success: false,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

/**
 * Command for accessing instructions
 */
export class GetInstructCommand extends BaseResourceCommand {
  name = "get-instruct";
  description = "Get instructions for a ServiceNow metadata type";
  resourceType = ResourceType.INSTRUCT;
}

/**
 * Command for listing available metadata types
 */
export class ListMetadataTypesCommand implements CLICommand {
  name = "list-metadata-types";
  description = "List all available ServiceNow metadata types";
  arguments: CommandArgument[] = [];
  
  private resourceLoader: ResourceLoader;
  
  constructor() {
    this.resourceLoader = new ResourceLoader();
  }
  
  /**
   * Execute the command to list available metadata types
   * @returns Command result with list of metadata types
   */
  async execute(): Promise<CommandResult> {
    try {
      const metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();
      
      if (metadataTypes.length === 0) {
        return {
          exitCode: 0,
          success: true,
          output: "No metadata types found.",
        };
      }
      
      return {
        exitCode: 0,
        success: true,
        output: `Available metadata types:\n${metadataTypes.join('\n')}`,
      };
    } catch (error) {
      logger.error("Error listing metadata types", 
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        exitCode: 1,
        success: false,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
