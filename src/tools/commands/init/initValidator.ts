/**
 * Validator for InitCommand parameters
 * Handles all validation logic for init command
 */

import fs from 'node:fs';
import path from 'node:path';

import { resolveExistingDirectory } from '../../../utils/projectDirectory.js';
import { CreationInitData, MultiValidationResult } from './types.js';

/** The remedy a conversion source error ends with. */
const CONVERSION_SOURCE_REMEDY =
  'Supply an instance sys_id (32 hexadecimal characters) or the absolute path of a scoped application directory to convert.';

/**
 * The application record files `now-sdk init --from <dir>` converts from, and
 * the subdirectories it looks in (`ProjectFactory.getSysAppXML` in
 * `@servicenow/sdk-api`).
 */
const SYS_APP_XML = /^sys_(store_)?app_[0-9a-zA-Z]{32}\.xml$/;
const SYS_APP_XML_DIRS = ['', 'update', 'scope'];

/**
 * Validator class for InitCommand parameters
 * Single Responsibility: Handles all validation logic
 */
export class InitValidator {
  /**
   * Return whether a conversion source is an instance application sys_id.
   * Keeping this predicate next to validation prevents command construction
   * from using a looser path heuristic than the user-facing validator.
   */
  static isSysId(value: string): boolean {
    return /^[a-f0-9]{32}$/i.test(value);
  }

  /**
   * Resolve the conversion source once, to the value the SDK receives: an
   * instance sys_id as is, or a local application directory as its canonical
   * path. A local source must be absolute, like the destination: the SDK runs
   * in the destination, so a relative path would name a different directory
   * there than it did here, and `~` is never expanded in argv.
   * @param from The `from` argument
   * @returns The sys_id, or the canonical source directory
   * @throws Error with an actionable message for any other value
   */
  static resolveConversionSource(from: string): string {
    if (InitValidator.isSysId(from)) {
      return from;
    }

    const directory = resolveExistingDirectory(from, 'from', CONVERSION_SOURCE_REMEDY, 'an application directory');
    if (!InitValidator.hasSysAppXml(directory)) {
      throw new Error(
        `from holds no application record: ${directory}. now-sdk init converts a directory with a ` +
        'sys_app_<sys_id>.xml or sys_store_app_<sys_id>.xml file in it, or in its update/ or scope/ subdirectory. ' +
        CONVERSION_SOURCE_REMEDY
      );
    }
    return directory;
  }

  /** Whether the directory has an application record where the SDK looks for one. */
  private static hasSysAppXml(directory: string): boolean {
    return SYS_APP_XML_DIRS.some((subdir) => {
      const dir = path.join(directory, subdir);
      try {
        return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).some((item) => SYS_APP_XML.test(item));
      } catch {
        return false;
      }
    });
  }

  /**
   * Validate creation parameters. The destination directory is checked
   * separately, for both intents (`checkInitDestination`).
   */
  static validateCreationParameters(data: CreationInitData): MultiValidationResult {
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

    // The template's choices are part of the input schema (InitCommand.validateArgs).
    if (!data.template || data.template.trim().length === 0) {
      errors.push('template is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
