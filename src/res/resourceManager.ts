import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceLoader } from '../utils/resourceLoader.js';
import { ResourceType, CommandResultFactory } from '../utils/types.js';
import logger from '../utils/logger.js';

/**
 * Configuration for a resource type, capturing all per-type differences
 * for the table-driven registration, listing, and reading logic.
 */
interface ResourceTypeConfig {
  resourceType: ResourceType;
  /** URI scheme, e.g. 'sn-spec' */
  scheme: string;
  /** URI suffix after {type}. Empty for simple types, '/{snippetId}' for parameterized. */
  uriSuffix: string;
  /** Function to build the title given a metadata type name */
  titleTemplate: (type: string) => string;
  /** Function to build the description given a metadata type name */
  descriptionTemplate: (type: string) => string;
  /** Label used in "not found" / error messages */
  label: string;
  /** Whether this type has dynamic sub-identifiers (like snippetId) */
  hasSubId: boolean;
}

/**
 * Resource type configurations ordered to match existing listResources output:
 * specs first, then instructions, then snippets.
 */
const RESOURCE_TYPE_CONFIGS: ResourceTypeConfig[] = [
  {
    resourceType: ResourceType.SPEC,
    scheme: 'sn-spec',
    uriSuffix: '',
    titleTemplate: (type) => `${type} API Specification for Fluent (ServiceNow SDK)`,
    descriptionTemplate: (type) => `API specification for Fluent (ServiceNow SDK) ${type}`,
    label: 'API specification',
    hasSubId: false,
  },
  {
    resourceType: ResourceType.INSTRUCT,
    scheme: 'sn-instruct',
    uriSuffix: '',
    titleTemplate: (type) => `${type} Instructions for Fluent (ServiceNow SDK)`,
    descriptionTemplate: (type) => `Development instructions for Fluent (ServiceNow SDK) ${type}`,
    label: 'Instructions',
    hasSubId: false,
  },
  {
    resourceType: ResourceType.SNIPPET,
    scheme: 'sn-snippet',
    uriSuffix: '/{snippetId}',
    titleTemplate: (type) => `${type} Code Snippets for Fluent (ServiceNow SDK)`,
    descriptionTemplate: (type) => `Example code snippets for Fluent (ServiceNow SDK) ${type}`,
    label: 'Snippet',
    hasSubId: true,
  },
];

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
      logger.error('Error loading metadata types', CommandResultFactory.normalizeError(error));
      throw error;
    }
  }

  /**
   * Register all resource types
   */
  registerAll(): void {
    for (const config of RESOURCE_TYPE_CONFIGS) {
      this.registerResourcesForType(config);
    }
  }

  /**
   * Register resources for a single resource type config across all metadata types
   */
  private registerResourcesForType(config: ResourceTypeConfig): void {
    for (const type of this.metadataTypes) {
      const uriPattern = `${config.scheme}://${type}${config.uriSuffix}`;

      // Build template options: snippet type gets a `complete` handler for autocomplete
      const templateOptions: { list: undefined; complete?: Record<string, (value: string) => Promise<string[]>> } = {
        list: undefined,
      };

      if (config.hasSubId) {
        templateOptions.complete = {
          snippetId: async (value: string): Promise<string[]> => {
            try {
              const snippets = await this.resourceLoader.listSnippets(type);
              return snippets.filter(id => id.startsWith(value || ''));
            } catch (error) {
              logger.error(`Error completing snippet IDs for ${type}`,
                CommandResultFactory.normalizeError(error)
              );
              return [];
            }
          }
        };
      }

      const template = new ResourceTemplate(uriPattern, templateOptions);

      this.mcpServer.registerResource(
        `${config.scheme}-${type}`,
        template,
        {
          title: config.titleTemplate(type),
          description: config.descriptionTemplate(type),
          mimeType: 'text/markdown',
        },
        async (uri: URL, extra?: { arguments?: { snippetId?: string } }) => {
          try {
            const metadataType = uri.host;
            const subId = config.hasSubId ? extra?.arguments?.snippetId : undefined;

            const result = await this.resourceLoader.getResource(
              config.resourceType,
              metadataType,
              subId
            );

            if (!result.found) {
              return {
                contents: [{
                  uri: uri.href,
                  text: `${config.label} not found for ${metadataType}`,
                }],
              };
            }

            return {
              contents: [{
                uri: uri.href,
                text: result.content,
              }],
            };
          } catch (error) {
            logger.error(`Error reading ${config.label.toLowerCase()} resource for ${uri.href}`,
              CommandResultFactory.normalizeError(error)
            );
            return {
              contents: [{
                uri: uri.href,
                text: `Error retrieving ${config.label.toLowerCase()}: ${
                  CommandResultFactory.normalizeError(error).message
                }`,
              }],
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
  async listResources(): Promise<{ uri: string, name: string, title: string, mimeType: string }[]> {
    try {
      // Make sure metadata types are loaded
      if (!this.metadataTypes || this.metadataTypes.length === 0) {
        this.metadataTypes = await this.resourceLoader.getAvailableMetadataTypes();
      }

      const resources: { uri: string; name: string; title: string; mimeType: string }[] = [];

      for (const config of RESOURCE_TYPE_CONFIGS) {
        for (const type of this.metadataTypes) {
          if (config.hasSubId) {
            // For snippet types, list the first snippet
            try {
              const snippetIds = await this.resourceLoader.listSnippets(type);
              if (snippetIds.length > 0) {
                resources.push({
                  uri: `${config.scheme}://${type}/${snippetIds[0]}`,
                  name: `${config.scheme}-${type}`,
                  title: `${type} Code Snippet for Fluent (ServiceNow SDK)`,
                  mimeType: 'text/markdown',
                });
              }
            } catch (error) {
              logger.error(`Error listing snippets for ${type}`,
                CommandResultFactory.normalizeError(error)
              );
            }
          } else {
            resources.push({
              uri: `${config.scheme}://${type}`,
              name: `${config.scheme}-${type}`,
              title: config.titleTemplate(type),
              mimeType: 'text/markdown',
            });
          }
        }
      }

      return resources;
    } catch (error) {
      logger.error('Error listing resources', CommandResultFactory.normalizeError(error));
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

  /**
   * Read a resource by URI
   * This method is called by the MCP server's resources/read handler
   * @param uriString The resource URI to read
   * @returns Resource contents
   */
  async readResource(uriString: string): Promise<{ contents: Array<{ uri: string; text: string; mimeType?: string }> }> {
    try {
      const uri = new URL(uriString);
      const scheme = uri.protocol.replace(':', '');
      const metadataType = uri.host;

      const config = RESOURCE_TYPE_CONFIGS.find(c => c.scheme === scheme);
      if (!config) {
        throw new Error(`Unknown resource URI scheme: ${scheme}`);
      }

      return await this.readTypedResource(uri, metadataType, config);
    } catch (error) {
      logger.error('Error reading resource', CommandResultFactory.normalizeError(error));
      throw error;
    }
  }

  /**
   * Read a resource given a parsed URI, metadata type, and config
   */
  private async readTypedResource(
    uri: URL,
    metadataType: string,
    config: ResourceTypeConfig
  ): Promise<{ contents: Array<{ uri: string; text: string; mimeType?: string }> }> {
    // Extract sub-identifier from URI path if this type supports it
    let subId: string | undefined;
    if (config.hasSubId) {
      const pathParts = uri.pathname.split('/').filter(p => p);
      subId = pathParts.length > 0 ? pathParts[0] : undefined;
    }

    const result = await this.resourceLoader.getResource(
      config.resourceType,
      metadataType,
      subId
    );

    if (!result.found) {
      return {
        contents: [{
          uri: uri.href,
          text: `${config.label} not found for ${metadataType}`,
          mimeType: 'text/plain',
        }],
      };
    }

    return {
      contents: [{
        uri: uri.href,
        text: result.content,
        mimeType: 'text/markdown',
      }],
    };
  }
}
