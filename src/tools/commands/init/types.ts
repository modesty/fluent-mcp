/**
 * Type definitions for InitCommand
 */

/**
 * Elicitation data for converting an existing app to Fluent
 */
export interface ConversionElicitationData {
  from: string;
  workingDirectory: string;
  auth?: string;
  debug?: boolean;
}

/**
 * Elicitation data for creating a new Fluent app
 */
export interface CreationElicitationData {
  appName: string;
  packageName: string;
  scopeName: string;
  workingDirectory: string;
  template: string;
  auth?: string;
  debug?: boolean;
}

/**
 * User intent for init command
 */
export type InitIntent = 'conversion' | 'creation';

/**
 * Validation result with optional error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validation result with multiple errors
 */
export interface MultiValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid template options for app creation
 */
export const VALID_TEMPLATES = [
  'base',
  'javascript.react',
  'typescript.basic',
  'typescript.react',
  'javascript.basic',
] as const;

export type ValidTemplate = (typeof VALID_TEMPLATES)[number];
