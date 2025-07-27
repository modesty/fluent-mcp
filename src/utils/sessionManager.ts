import logger from './logger.js';

/**
 * Interface for session data
 */
export interface SessionData {
  /** The current working directory for the Fluent SDK operations */
  workingDirectory?: string;
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
   * Clear the session data
   */
  public clearSession(): void {
    this.resetSession();
    logger.debug('Session data cleared');
  }
}
