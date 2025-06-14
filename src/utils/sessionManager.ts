import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import logger from "./logger.js";

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
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionData: SessionData = {};
  private readonly sessionFilePath: string;

  private constructor() {
    // Create .fluent directory in user's home if it doesn't exist
    const fluentDir = path.join(os.homedir(), ".fluent");
    if (!fs.existsSync(fluentDir)) {
      try {
        fs.mkdirSync(fluentDir, { recursive: true });
      } catch (error) {
        logger.error(`Failed to create .fluent directory: ${error}`);
      }
    }

    this.sessionFilePath = path.join(fluentDir, "session.json");
    this.loadSession();
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
   * Load session data from file
   */
  private loadSession(): void {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        const data = fs.readFileSync(this.sessionFilePath, "utf-8");
        this.sessionData = JSON.parse(data);
        logger.debug(`Session loaded: ${JSON.stringify(this.sessionData)}`);
      }
    } catch (error) {
      logger.error(`Failed to load session data: ${error}`);
      this.sessionData = {};
    }
  }

  /**
   * Save session data to file
   */
  private saveSession(): void {
    try {
      fs.writeFileSync(this.sessionFilePath, JSON.stringify(this.sessionData, null, 2), "utf-8");
      logger.debug(`Session saved: ${JSON.stringify(this.sessionData)}`);
    } catch (error) {
      logger.error(`Failed to save session data: ${error}`);
    }
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
    this.saveSession();
  }

  /**
   * Clear the session data
   */
  public clearSession(): void {
    this.sessionData = {};
    this.saveSession();
  }
}
