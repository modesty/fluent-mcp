import logger from './logger.js';
import { AuthValidationResult } from '../types.js';

/**
 * Interface for session data
 */
export interface SessionData {
  /** The current working directory for the Fluent SDK operations */
  workingDirectory?: string;
  /** The authentication alias to use for ServiceNow instance operations */
  authAlias?: string;
  /** The result of authentication validation */
  authValidationResult?: AuthValidationResult;
  /** Any other session data that might be needed in the future */
  [key: string]: unknown;
}

/**
 * Manager for Fluent SDK session data
 * Handles storage and retrieval of session information like working directory
 * All session data is kept in memory only (not persisted to filesystem)
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionData: SessionData = {};

  private constructor() {
    // Initialize with empty session data - in-memory only
    this.resetSession();
    logger.debug('Session manager initialized with in-memory storage');
  }

  /**
   * Get the SessionManager instance (singleton)
   * @returns SessionManager instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Reset the session data to empty state
   */
  private resetSession(): void {
    this.sessionData = {};
    logger.debug('Session data reset');
  }

  /**
   * Get the current working directory from the session
   * @returns The current working directory or undefined if not set
   */
  public getWorkingDirectory(): string | undefined {
    return this.sessionData.workingDirectory;
  }

  /**
   * Set the current working directory in the session
   * @param directory The directory to set as the working directory
   */
  public setWorkingDirectory(directory: string): void {
    this.sessionData.workingDirectory = directory;
    logger.debug(`Working directory set: ${directory}`);
  }

  /**
   * Get the current authentication alias from the session
   * @returns The current auth alias or undefined if not set
   */
  public getAuthAlias(): string | undefined {
    return this.sessionData.authAlias;
  }

  /**
   * Set the authentication alias in the session
   * @param alias The authentication alias to use for ServiceNow operations
   */
  public setAuthAlias(alias: string): void {
    this.sessionData.authAlias = alias;
    logger.debug(`Auth alias set: ${alias}`);
  }

  /**
   * Get the authentication validation result
   * @returns The auth validation result or undefined if not yet validated
   */
  public getAuthValidationResult(): AuthValidationResult | undefined {
    return this.sessionData.authValidationResult;
  }

  /**
   * Set the authentication validation result
   * @param result The result of auth validation
   */
  public setAuthValidationResult(result: AuthValidationResult): void {
    this.sessionData.authValidationResult = result;
    logger.debug(`Auth validation result set: ${result.status}`);
  }

  /**
   * Clear the session data
   */
  public clearSession(): void {
    this.resetSession();
    logger.debug('Session data cleared');
  }
}
