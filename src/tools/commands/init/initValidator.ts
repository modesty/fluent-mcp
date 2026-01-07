/**
 * Validator for InitCommand parameters
 * Handles all validation logic for init command
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FluentAppValidator } from '../../../utils/fluentAppValidator.js';
import logger from '../../../utils/logger.js';
import {
  CreationElicitationData,
  MultiValidationResult,
  ValidationResult,
  VALID_TEMPLATES,
} from './types.js';

/**
 * Validator class for InitCommand parameters
 * Single Responsibility: Handles all validation logic
 */
export class InitValidator {
  /**
   * Normalize a path by expanding ~ and resolving to absolute
   */
  static normalizePath(inputPath: string): string {
    let normalized = inputPath;
    if (normalized.startsWith('~/')) {
      normalized = path.join(os.homedir(), normalized.slice(2));
    }
    return path.resolve(normalized);
  }

  /**
   * Validate working directory - must be empty local directory with no package.json or now.config.json
   */
  static async validateWorkingDirectory(workingDirectory: string): Promise<ValidationResult> {
    const normalizedPath = InitValidator.normalizePath(workingDirectory);

    // Check if directory exists, create if it doesn't
    if (!fs.existsSync(normalizedPath)) {
      try {
        fs.mkdirSync(normalizedPath, { recursive: true });
        logger.info(`Created working directory: ${normalizedPath}`);
      } catch (error) {
        return {
          valid: false,
          error: `Failed to create working directory ${normalizedPath}: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    // Check if it's a directory
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: `Working directory path is not a directory: ${normalizedPath}`,
      };
    }

    // Check if directory is empty or only contains allowed files
    const files = fs.readdirSync(normalizedPath);
    const forbiddenFiles = ['package.json', 'now.config.json'];

    for (const file of files) {
      if (forbiddenFiles.includes(file)) {
        return {
          valid: false,
          error: `Working directory must not contain ${file}. Directory must be empty or only contain non-conflicting files.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate 'from' parameter for conversion
   */
  static async validateFromParameter(from: string): Promise<ValidationResult> {
    // Check if it's a local file path
    if (from.includes('/') || from.includes('\\')) {
      const normalizedPath = InitValidator.normalizePath(from);

      if (!fs.existsSync(normalizedPath)) {
        return {
          valid: false,
          error: `Local path does not exist: ${normalizedPath}`,
        };
      }

      // Check if it's a directory containing a ServiceNow app
      try {
        const appCheck = await FluentAppValidator.checkFluentAppExists(normalizedPath);
        if (!appCheck.hasApp && !appCheck.errorMessage) {
          return {
            valid: false,
            error: `Directory ${normalizedPath} does not contain a valid ServiceNow application`,
          };
        }
      } catch (error) {
        return {
          valid: false,
          error: `Failed to validate directory: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    } else {
      // Assume it's a sys_id - basic validation (32 character hex string)
      const sysIdPattern = /^[a-f0-9]{32}$/i;
      if (!sysIdPattern.test(from)) {
        return {
          valid: false,
          error: 'sys_id must be a 32-character hexadecimal string',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate creation parameters
   */
  static async validateCreationParameters(
    data: CreationElicitationData
  ): Promise<MultiValidationResult> {
    const errors: string[] = [];

    if (!data.appName || data.appName.trim().length === 0) {
      errors.push('appName is required and cannot be empty');
    }

    if (!data.packageName || data.packageName.trim().length === 0) {
      errors.push('packageName is required and cannot be empty');
    }

    if (!data.scopeName || data.scopeName.trim().length === 0) {
      errors.push('scopeName is required and cannot be empty');
    } else {
      // Validate scopeName format
      if (!data.scopeName.startsWith('x_')) {
        errors.push('scopeName must start with "x_" prefix');
      }
      if (data.scopeName.length > 18) {
        errors.push('scopeName cannot be longer than 18 characters');
      }
      if (/\s/.test(data.scopeName)) {
        errors.push('scopeName cannot contain spaces');
      }
    }

    if (!data.workingDirectory || data.workingDirectory.trim().length === 0) {
      errors.push('workingDirectory is required and cannot be empty');
    } else {
      // Validate working directory
      const workingDirValidation = await InitValidator.validateWorkingDirectory(
        data.workingDirectory
      );
      if (!workingDirValidation.valid) {
        errors.push(workingDirValidation.error || 'Invalid working directory');
      }
    }

    if (!data.template || data.template.trim().length === 0) {
      errors.push('template is required and cannot be empty');
    } else {
      // Validate template value
      if (!VALID_TEMPLATES.includes(data.template as (typeof VALID_TEMPLATES)[number])) {
        errors.push(`template must be one of: ${VALID_TEMPLATES.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
