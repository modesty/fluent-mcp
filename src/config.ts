/**
 * Configuration for the Fluent MCP Server for ServiceNow SDK
 */
export interface McpServerConfig {
  /** Logging level (debug, info, warn, error) */
  logLevel: string;
  /** Path to resource directories */
  resourcePaths: {
    /** Path to API specifications */
    spec: string;
    /** Path to code snippets */
    snippet: string;
    /** Path to instructions */
    instruct: string;
  };
}

/**
 * Default configuration for the MCP server
 */
export const defaultConfig: McpServerConfig = {
  logLevel: 'info',
  resourcePaths: {
    spec: './res/spec',
    snippet: './res/snippet',
    instruct: './res/instruct',
  },
};

/**
 * Get the configuration for the MCP server
 * This can be expanded to load from environment variables or a config file
 */
export function getConfig(): McpServerConfig {
  return defaultConfig;
}
