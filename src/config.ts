/**
 * Configuration for the Fluent MCP Server for ServiceNow SDK
 * This module manages server settings and environment variables
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Find the project root by examining the module path.
 * This works reliably in all environments including Claude Desktop App.
 *
 * In runtime (ESM environment): Uses import.meta.url to get the actual file location
 * In test environment: Falls back to process.cwd() with directory traversal
 */
export function getProjectRootPath(): string {
  // For ESM runtime: Use import.meta.url to get the actual module path
  if (import.meta?.url) {
    const modulePath = fileURLToPath(import.meta.url);
    const moduleDir = path.dirname(modulePath);
    return path.resolve(moduleDir, ".."); // navigate up to the project root
  }
  return process.cwd();
}

const packageJsonPath = path.resolve(getProjectRootPath(), "package.json");
let packageInfo: {
  name: string;
  version: string;
  description: string;
  [key: string]: any;
} = {
  name: "@modesty/fluent-mcp",
  version: "0.0.2",
  description: "Fluent MCP server for ServiceNow SDK",
};

try {
  const packageData = fs.readFileSync(packageJsonPath, "utf-8");
  packageInfo = JSON.parse(packageData);
} catch (err) {
//   console.error(`Failed to load package.json: ${err}`);
}

/**
 * Configuration interface for the MCP server
 */
export interface McpServerConfig {
  /** Server name from package.json */
  name: string;

  /** Server version from package.json */
  version: string;

  /** Server description from package.json */
  description: string;

  /** Logging level (debug, info, warn, error) */
  logLevel: string;

  /** Path to log file (if not specified, logs go to stderr) */
  logFilePath?: string;

  /** Path to resource directories */
  resourcePaths: {
    /** Path to API specifications */
    spec: string;
    /** Path to code snippets */
    snippet: string;
    /** Path to instructions */
    instruct: string;
  };

  /** ServiceNow SDK CLI configuration */
  servicenowSdk: {
    /** Path to ServiceNow SDK CLI */
    cliPath: string;
    /** Default timeout for SDK CLI commands in milliseconds */
    commandTimeoutMs: number;
  };
}

// Environment variable names
const ENV_PREFIX = "FLUENT_MCP_";
const ENV_VAR = {
  LOG_LEVEL: `${ENV_PREFIX}LOG_LEVEL`,
  LOG_FILE_PATH: `${ENV_PREFIX}LOG_FILE_PATH`,
  RESOURCE_PATH_SPEC: `${ENV_PREFIX}RESOURCE_PATH_SPEC`,
  RESOURCE_PATH_SNIPPET: `${ENV_PREFIX}RESOURCE_PATH_SNIPPET`,
  RESOURCE_PATH_INSTRUCT: `${ENV_PREFIX}RESOURCE_PATH_INSTRUCT`,
  SERVICENOW_SDK_CLI_PATH: `${ENV_PREFIX}SERVICENOW_SDK_CLI_PATH`,
  COMMAND_TIMEOUT_MS: `${ENV_PREFIX}COMMAND_TIMEOUT_MS`,
};

/**
 * Default configuration for the MCP server
 */
export const defaultConfig: McpServerConfig = {
  name: packageInfo.name,
  version: packageInfo.version,
  description: packageInfo.description,
  logLevel: "info",
  // By default, use stderr for logging (no logFilePath)
  resourcePaths: {
    spec: path.resolve(getProjectRootPath(), "./res/spec"),
    snippet: path.resolve(getProjectRootPath(), "./res/snippet"),
    instruct: path.resolve(getProjectRootPath(), "./res/instruct"),
  },
  servicenowSdk: {
    cliPath: "snc", // Default command name if installed globally
    commandTimeoutMs: 30000, // 30 seconds default timeout
  },
};

/**
 * Get the configuration for the MCP server
 * Loads from environment variables if available, falls back to defaults
 */
export function getConfig(): McpServerConfig {
  const config: McpServerConfig = {
    name: packageInfo.name,
    version: packageInfo.version,
    description: packageInfo.description,
    logLevel: getEnvVar(ENV_VAR.LOG_LEVEL, defaultConfig.logLevel),
    resourcePaths: {
      spec: getEnvVar(
        ENV_VAR.RESOURCE_PATH_SPEC,
        defaultConfig.resourcePaths.spec
      ),
      snippet: getEnvVar(
        ENV_VAR.RESOURCE_PATH_SNIPPET,
        defaultConfig.resourcePaths.snippet
      ),
      instruct: getEnvVar(
        ENV_VAR.RESOURCE_PATH_INSTRUCT,
        defaultConfig.resourcePaths.instruct
      ),
    },
    servicenowSdk: {
      cliPath: getEnvVar(
        ENV_VAR.SERVICENOW_SDK_CLI_PATH,
        defaultConfig.servicenowSdk.cliPath
      ),
      commandTimeoutMs: parseInt(
        getEnvVar(
          ENV_VAR.COMMAND_TIMEOUT_MS,
          defaultConfig.servicenowSdk.commandTimeoutMs.toString()
        ),
        10
      ),
    },
  };

  // Add optional logFilePath if specified in environment
  const logFilePath = process.env[ENV_VAR.LOG_FILE_PATH];
  if (logFilePath) {
    config.logFilePath = logFilePath;
  }

  return config;
}

/**
 * Get a configuration value from environment variables, falling back to default if not found
 * @param envVarName Environment variable name
 * @param defaultValue Default value to use if environment variable is not set
 * @returns Configuration value
 */
function getEnvVar(envVarName: string, defaultValue: string): string {
  return process.env[envVarName] || defaultValue;
}

/**
 * Validate that the configuration is valid
 * @param config Configuration object to validate
 * @returns True if the configuration is valid, false otherwise
 */
export function validateConfig(config: McpServerConfig): boolean {
  // Check resource paths exist
  const resourcePathExists = (path: string) => {
    try {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    } catch (err) {
      return false;
    }
  };

  const validResourcePaths =
    resourcePathExists(config.resourcePaths.spec) &&
    resourcePathExists(config.resourcePaths.snippet) &&
    resourcePathExists(config.resourcePaths.instruct);

  if (!validResourcePaths) {
    // console.warn("One or more resource paths do not exist or are not directories");
    return false;
  }

  // Add additional validation as needed
  return true;
}
