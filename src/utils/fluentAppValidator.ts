import fs from 'node:fs';
import path from 'node:path';
import logger from './logger.js';

/**
 * Interface for the result of checking if a directory contains a Fluent (ServiceNow SDK) application
 */
export interface FluentAppCheckResult {
  /** Whether a Fluent app was found in the directory */
  hasApp: boolean;
  /** The scope name of the app, if found */
  scopeName?: string;
  /** The package name of the app, if found */
  packageName?: string;
  /** Error message if an error occurred during the check */
  errorMessage?: string;
}

/**
 * Utility class for validating Fluent (ServiceNow SDK) applications
 */
export class FluentAppValidator {
  /**
   * Check if the directory already contains a ServiceNow/Fluent application
   * @param directory Directory to check
   * @returns Object containing check results and any existing app info
   */
  public static async checkFluentAppExists(directory: string): Promise<FluentAppCheckResult> {
    try {
      // Check for now.config.json
      const configPath = path.join(directory, 'now.config.json');
      if (fs.existsSync(configPath)) {
        // Parse the config to extract the scope name
        try {
          const configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const scopeName = configContent.scope || 'unknown';
          const packageName = configContent.name || 'unknown';
          return { hasApp: true, scopeName, packageName };
        } catch (error) {
          logger.error('Failed to parse now.config.json', error as Error);
          return { hasApp: true, scopeName: 'unknown', packageName: 'unknown' };
        }
      }

      // Check for package.json with ServiceNow dependencies
      const packageJsonPath = path.join(directory, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (dependencies['@servicenow/now-sdk'] || dependencies['@servicenow/now-sdk-cli']) {
            return { 
              hasApp: true, 
              packageName: packageJson.name || 'unknown',
              scopeName: 'unknown' // Can't determine scope from package.json
            };
          }
        } catch (error) {
          logger.error('Failed to parse package.json', error as Error);
        }
      }

      // No ServiceNow app detected
      return { hasApp: false };
    } catch (error) {
      logger.error('Error checking for ServiceNow app', error as Error);
      return { 
        hasApp: false, 
        errorMessage: `Failed to check directory: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
