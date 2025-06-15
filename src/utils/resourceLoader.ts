/**
 * Resource loader utility for accessing API specifications, snippets, and instructions
 */
import fs from "node:fs";
import path from "node:path";
import { ResourceResult, ResourceTypeEnum } from "./types.js";
import logger from "./logger.js";
import { getConfig } from "../config.js";

// Re-export ResourceTypeEnum as ResourceType for backward compatibility
export import ResourceType = ResourceTypeEnum;

/**
 * Resource loader class for accessing ServiceNow metadata resources
 */
export class ResourceLoader {
  private resourcePaths: Record<ResourceType, string>;

  /**
   * Create a new resource loader instance
   */
  constructor() {
    const config = getConfig();
    this.resourcePaths = {
      [ResourceType.SPEC]: config.resourcePaths.spec,
      [ResourceType.SNIPPET]: config.resourcePaths.snippet,
      [ResourceType.INSTRUCT]: config.resourcePaths.instruct,
    };
  }

  /**
   * Get a list of all available metadata types
   * @returns Array of metadata type names
   */
  public async getAvailableMetadataTypes(): Promise<string[]> {
    try {
      // Use instruct directory as reference for available metadata types
      const files = await fs.promises.readdir(this.resourcePaths[ResourceType.INSTRUCT]);
      const metadataTypes = files
        .filter((file) => file.startsWith("fluent_instruct_") && file.endsWith(".md"))
        .map((file) => {
          // Extract metadata type from file name (fluent_instruct_TYPE.md)
          const match = file.match(/fluent_instruct_(.+)\.md/);
          return match ? match[1] : null;
        })
        .filter((type): type is string => type !== null);

      return metadataTypes;
    } catch (error) {
      logger.error("Failed to get available metadata types", 
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Get resource for a specific metadata type
   * @param resourceType Type of resource (spec, snippet, instruct)
   * @param metadataType ServiceNow metadata type (e.g., business-rule, script-include)
   * @param id Optional identifier for specific snippet
   * @returns Resource content and metadata
   */
  public async getResource(
    resourceType: ResourceType,
    metadataType: string,
    id?: string
  ): Promise<ResourceResult> {
    try {
      const resourcePath = this.resourcePaths[resourceType];
      
      if (!resourcePath) {
        throw new Error(`Resource path not configured for ${resourceType}`);
      }

      let filePath: string;
      
      if (resourceType === ResourceType.SNIPPET && id) {
        // Look for a specific snippet with ID
        filePath = path.join(
          resourcePath,
          `fluent_snippet_${metadataType}_${id}.md`
        );
        
        // If specific snippet not found, fall back to the first one
        if (!fs.existsSync(filePath)) {
          logger.warn(`Specific snippet ${id} not found for ${metadataType}, using default`);
          filePath = path.join(resourcePath, `fluent_snippet_${metadataType}_0001.md`);
        }
      } else {
        // For spec and instruct, or when no ID is provided for snippets
        const fileName = resourceType === ResourceType.SNIPPET
          ? `fluent_snippet_${metadataType}_0001.md`  // Default to first snippet
          : `fluent_${resourceType}_${metadataType}.md`;
        
        filePath = path.join(resourcePath, fileName);
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.warn(`Resource file not found: ${filePath}`);
        return {
          content: "",
          path: filePath,
          metadataType,
          resourceType: resourceType,
          found: false,
        };
      }

      // Read file content
      const content = await fs.promises.readFile(filePath, "utf-8");

      return {
        content,
        path: filePath,
        metadataType,
        resourceType: resourceType,
        found: true,
      };
    } catch (error) {
      logger.error(`Failed to get ${resourceType} for ${metadataType}`, 
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        content: "",
        path: "",
        metadataType,
        resourceType: resourceType,
        found: false,
      };
    }
  }

  /**
   * List all available snippets for a metadata type
   * @param metadataType ServiceNow metadata type
   * @returns Array of snippet IDs
   */
  public async listSnippets(metadataType: string): Promise<string[]> {
    try {
      const resourcePath = this.resourcePaths[ResourceType.SNIPPET];
      const files = await fs.promises.readdir(resourcePath);
      
      const snippetIds = files
        .filter((file) => file.startsWith(`fluent_snippet_${metadataType}_`) && file.endsWith(".md"))
        .map((file) => {
          // Extract ID from file name (fluent_snippet_TYPE_ID.md)
          const match = file.match(/fluent_snippet_[^_]+_(\d+)\.md/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null);

      return snippetIds;
    } catch (error) {
      logger.error(`Failed to list snippets for ${metadataType}`, 
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }
}
