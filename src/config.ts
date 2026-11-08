/**
 * Configuration for the Fluent MCP Server for ServiceNow SDK
 * This module manages server settings and environment variables
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCommandTimeoutOverride } from './utils/commandTimeout.js';

/**
 * The installed package root: the directory above this module (`dist/` when
 * built, `src/` in a test stage), which holds package.json and `res/`.
 */
export function getProjectRootPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

/** The package's own package.json, which every build and install ships. */
const packageInfo = JSON.parse(
  fs.readFileSync(path.resolve(getProjectRootPath(), 'package.json'), 'utf-8')
) as { name: string; version: string; description: string };

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

  /** Explicit Fluent project directory for commands when no per-call/session directory exists */
  workingDirectory?: string;

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
    /**
     * Fallback timeout (ms) for SDK CLI commands that do not declare their own.
     * Per-command timeouts (e.g. deploy/build) normally supersede this.
     */
    commandTimeoutMs: number;
    /**
     * Operator global timeout override (ms) from `FLUENT_MCP_COMMAND_TIMEOUT_MS`.
     * When set, it wins over every per-command timeout — the escape hatch for
     * large apps whose deploy/build exceeds the built-in defaults. Undefined
     * unless the env var is present and a positive integer.
     */
    commandTimeoutOverrideMs?: number;
  };

}

// Environment variable names
const ENV_PREFIX = 'FLUENT_MCP_';
const ENV_VAR = {
  LOG_LEVEL: `${ENV_PREFIX}LOG_LEVEL`,
  WORKING_DIR: `${ENV_PREFIX}WORKING_DIR`,
  RESOURCE_PATH_SPEC: `${ENV_PREFIX}RESOURCE_PATH_SPEC`,
  RESOURCE_PATH_SNIPPET: `${ENV_PREFIX}RESOURCE_PATH_SNIPPET`,
  RESOURCE_PATH_INSTRUCT: `${ENV_PREFIX}RESOURCE_PATH_INSTRUCT`,
  COMMAND_TIMEOUT_MS: `${ENV_PREFIX}COMMAND_TIMEOUT_MS`,
};

/**
 * Defaults for the settings an environment variable can replace
 */
const defaultConfig: Pick<McpServerConfig, 'logLevel' | 'resourcePaths' | 'servicenowSdk'> = {
  logLevel: 'info',
  resourcePaths: {
    spec: path.resolve(getProjectRootPath(), './res/spec'),
    snippet: path.resolve(getProjectRootPath(), './res/snippet'),
    instruct: path.resolve(getProjectRootPath(), './res/instruct'),
  },
  servicenowSdk: {
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
      commandTimeoutMs: defaultConfig.servicenowSdk.commandTimeoutMs,
      // FLUENT_MCP_COMMAND_TIMEOUT_MS is an operator override, not the base
      // default: only honor it when present and a positive integer.
      ...(() => {
        const override = parseCommandTimeoutOverride(process.env[ENV_VAR.COMMAND_TIMEOUT_MS]);
        return override !== undefined ? { commandTimeoutOverrideMs: override } : {};
      })(),
    },
  };

  const workingDirectory = process.env[ENV_VAR.WORKING_DIR]?.trim();
  if (workingDirectory) {
    config.workingDirectory = workingDirectory;
  }

  return config;
}

/**
 * Find configured resource directories that are missing or are not directories.
 * The server cannot serve specs/snippets/instructions without these, so a
 * non-empty result is a fatal misconfiguration (broken install, or a bad
 * FLUENT_MCP_RESOURCE_PATH_* override).
 * @param config Configuration whose resourcePaths are checked
 * @returns The resource paths that do not resolve to an existing directory
 *          (empty array when all are present)
 */
export function findMissingResourcePaths(config: McpServerConfig): string[] {
  const isDirectory = (dirPath: string): boolean => {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  };

  return Object.values(config.resourcePaths).filter((dirPath) => !isDirectory(dirPath));
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
