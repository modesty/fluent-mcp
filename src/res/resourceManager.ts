import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceLoader, ResourceType } from "../utils/resourceLoader.js";
import logger from "../utils/logger.js";

/**
 * Manager for handling MCP resources registration and access
 */
export class ResourceManager {
  private mcpServer: McpServer;
  private resourceLoader: ResourceLoader;
  private metadataTypes: string[] = [];

  /**
   * Create a new ResourceManager
   * @param mcpServer The MCP server instance
   */
  constructor(mcpServer: McpServer) {
    this.mcpServer = mcpServer;
    this.resourceLoader = new ResourceLoader();
  }

  /**
   * Initialize resources by loading metadata types
   */
  async initialize(): Promise<void> {
    try {
      // Get available metadata types
      this.metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();
      logger.debug(`Loaded ${this.metadataTypes.length} metadata types for resources`);
    } catch (error) {
      logger.error("Error loading metadata types",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Register all resource types
   */
  registerAll(): void {
    this.registerSpecResources();
    this.registerSnippetResources();
    this.registerInstructResources();
  }

  /**
   * Register API specification resources
   */
  private registerSpecResources(): void {
    // Register one resource for each metadata type's API spec
    for (const type of this.metadataTypes) {
      const template = new ResourceTemplate(`sn-spec://${type}`, { list: undefined });
      
      this.mcpServer.registerResource(
        `sn-spec-${type}`,
        template,
        {
          title: `ServiceNow ${type} API Specification`,
          description: `API specification for ServiceNow ${type}`,
          mimeType: "text/markdown"
        },
        async (uri: URL) => {
          try {
            // Extract metadata type from URI
            const metadataType = uri.host;
            
            // Get resource content
            const result = await this.resourceLoader.getResource(
              ResourceType.SPEC,
              metadataType
            );
            
            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `API specification not found for ${metadataType}`
                }]
              };
            }
            
            return {
              contents: [{
                uri: uri.href,
                text: result.content
              }]
            };
          } catch (error) {
            logger.error(`Error reading API spec resource for ${uri.href}`,
              error instanceof Error ? error : new Error(String(error))
            );
            
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving API specification: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }]
            };
          }
        }
      );
    }
  }

  /**
   * Register code snippet resources
   */
  private registerSnippetResources(): void {
    // Register a template for each metadata type with dynamic parameters for snippet ID
    for (const type of this.metadataTypes) {
      const template = new ResourceTemplate(`sn-snippet://${type}/{snippetId}`, { 
        list: undefined,
        complete: {
          // Provide completions for snippet IDs
          snippetId: async (value: string) => {
            try {
              const snippets = await this.resourceLoader.listSnippets(type);
              return snippets.filter(id => id.startsWith(value || ''));
            } catch (error) {
              logger.error(`Error completing snippet IDs for ${type}`, 
                error instanceof Error ? error : new Error(String(error))
              );
              return [];
            }
          }
        }
      });
      
      this.mcpServer.registerResource(
        `sn-snippet-${type}`,
        template,
        {
          title: `ServiceNow ${type} Code Snippets`,
          description: `Example code snippets for ServiceNow ${type}`,
          mimeType: "text/markdown"
        },
        async (uri: URL, extra: any) => {
          try {
            // Extract metadata type from URI and snippet ID from template params
            const metadataType = uri.host;
            const snippetId = extra.arguments?.snippetId;
            
            // Get resource content
            const result = await this.resourceLoader.getResource(
              ResourceType.SNIPPET,
              metadataType,
              snippetId
            );
            
            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `Snippet not found for ${metadataType}`
                }]
              };
            }
            
            return {
              contents: [{
                uri: uri.href,
                text: result.content
              }]
            };
          } catch (error) {
            logger.error(`Error reading snippet resource for ${uri.href}`,
              error instanceof Error ? error : new Error(String(error))
            );
            
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving snippet: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }]
            };
          }
        }
      );
    }
  }

  /**
   * Register instruction resources
   */
  private registerInstructResources(): void {
    // Register one resource for each metadata type's instruction
    for (const type of this.metadataTypes) {
      const template = new ResourceTemplate(`sn-instruct://${type}`, { list: undefined });
      
      this.mcpServer.registerResource(
        `sn-instruct-${type}`,
        template,
        {
          title: `ServiceNow ${type} Instructions`,
          description: `Development instructions for ServiceNow ${type}`,
          mimeType: "text/markdown"
        },
        async (uri: URL) => {
          try {
            // Extract metadata type from URI
            const metadataType = uri.host;
            
            // Get resource content
            const result = await this.resourceLoader.getResource(
              ResourceType.INSTRUCT,
              metadataType
            );
            
            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `Instructions not found for ${metadataType}`
                }]
              };
            }
            
            return {
              contents: [{
                uri: uri.href,
                text: result.content
              }]
            };
          } catch (error) {
            logger.error(`Error reading instruction resource for ${uri.href}`,
              error instanceof Error ? error : new Error(String(error))
            );
            
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving instructions: ${
                  error instanceof Error ? error.message : String(error)
                }`
              }]
            };
          }
        }
      );
    }
  }

  /**
   * Get all available resources for listing
   * @returns List of resource objects
   */
  async listResources(): Promise<{ uri: string, title: string, mimeType: string }[]> {
    try {
      // Make sure metadata types are loaded
      if (!this.metadataTypes || this.metadataTypes.length === 0) {
        this.metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();
      }
      
      const resources = [];
      
      // Add spec resources
      for (const type of this.metadataTypes) {
        resources.push({
          uri: `sn-spec://${type}`,
          title: `ServiceNow ${type} API Specification`,
          mimeType: "text/markdown"
        });
      }
      
      // Add instruction resources
      for (const type of this.metadataTypes) {
        resources.push({
          uri: `sn-instruct://${type}`,
          title: `ServiceNow ${type} Instructions`,
          mimeType: "text/markdown"
        });
      }
      
      // For snippets, use the first one of each type
      for (const type of this.metadataTypes) {
        try {
          const snippetIds = await this.resourceLoader.listSnippets(type);
          if (snippetIds.length > 0) {
            resources.push({
              uri: `sn-snippet://${type}/${snippetIds[0]}`,
              title: `ServiceNow ${type} Code Snippet`,
              mimeType: "text/markdown"
            });
          }
        } catch (error) {
          logger.error(`Error listing snippets for ${type}`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
      
      return resources;
    } catch (error) {
      logger.error("Error listing resources", 
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  /**
   * Get the resource loader
   * @returns ResourceLoader instance
   */
  getResourceLoader(): ResourceLoader {
    return this.resourceLoader;
  }

  /**
   * Get the metadata types
   * @returns Array of metadata type strings
   */
  getMetadataTypes(): string[] {
    return this.metadataTypes;
  }
}
