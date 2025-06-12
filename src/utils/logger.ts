/**
 * Logger utility for the MCP server
 * Outputs formatted JSON logs to stderr or a file to avoid interfering with MCP's stdio transport
 */

import { getConfig } from '../config.js';
import fs from 'fs';
import path from 'path';


// Log levels enum
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Level priorities - higher number means more severe
const logLevelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Logger class that outputs formatted JSON logs to stderr or a file
 * to avoid interfering with MCP's stdio transport
 */
export class Logger {
  private logLevel: LogLevel;
  private useStderr: boolean;
  private logFilePath?: string;
  private logStream?: fs.WriteStream;

  constructor() {
    const config = getConfig();
    this.logLevel = (config.logLevel as LogLevel) || LogLevel.INFO;

    // By default, use stderr to avoid conflicting with stdio transport
    this.useStderr = true;

    // Check if log file path is specified in config
    if (config.logFilePath) {
      this.setupFileLogging(config.logFilePath);
    }
  }

  /**
   * Set up file logging
   * @param logFilePath Path to the log file
   */
  private setupFileLogging(logFilePath: string): void {
    try {
      // Ensure the directory exists
      const logDir = path.dirname(logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      this.logFilePath = logFilePath;
      this.logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      this.useStderr = false;

      // Handle process exit to close log file
      process.on('exit', () => {
        this.logStream?.end();
      });
    } catch (err) {
      // Fall back to stderr if file logging setup fails
      this.useStderr = true;
      this.writeToStderr(`Failed to set up file logging: ${err}`);
    }
  }

  /**
   * Get the current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Set the log level
   * @param level The log level to set
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Determine if a log level should be output based on the current log level
   * @param level The log level to check
   * @returns True if the log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return logLevelPriority[level] >= logLevelPriority[this.logLevel];
  }

  /**
   * Format a log entry as JSON
   * @param level The log level
   * @param message The log message
   * @param context Optional context object
   * @returns The formatted log entry
   */
  private formatLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? { context } : {}),
    };
  }

  /**
   * Write directly to stderr (bypasses JSON formatting)
   */
  private writeToStderr(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  /**
   * Write a log entry to the configured output (stderr or file)
   */
  private writeLogEntry(entry: LogEntry): void {
	const logJson = `[${entry.timestamp}] [${entry.level.toUpperCase()}]: ${entry.message} ${JSON.stringify(entry.context || {})}`;

    if (this.useStderr) {
      process.stderr.write(`${logJson}\n`);
    } else if (this.logStream) {
      this.logStream.write(`${logJson}\n`);
    }
  }

  /**
   * Log a message at the debug level
   * @param message The message to log
   * @param context Optional context object
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatLogEntry(LogLevel.DEBUG, message, context);
    this.writeLogEntry(entry);
  }

  /**
   * Log a message at the info level
   * @param message The message to log
   * @param context Optional context object
   */
  public info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLogEntry(LogLevel.INFO, message, context);
    this.writeLogEntry(entry);
  }

  /**
   * Log a message at the warn level
   * @param message The message to log
   * @param context Optional context object
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLogEntry(LogLevel.WARN, message, context);
    this.writeLogEntry(entry);
  }

  /**
   * Log a message at the error level
   * @param message The message to log
   * @param error Optional error object
   * @param context Optional context object
   */
  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : context;

    const entry = this.formatLogEntry(LogLevel.ERROR, message, errorContext);
    this.writeLogEntry(entry);
  }

  /**
   * Log a message with an object for additional context
   * @param message The message to log
   * @param level The log level
   * @param obj The object to include
   */
  public log(level: LogLevel, message: string, obj?: unknown): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, obj as Record<string, unknown>);
        break;
      case LogLevel.INFO:
        this.info(message, obj as Record<string, unknown>);
        break;
      case LogLevel.WARN:
        this.warn(message, obj as Record<string, unknown>);
        break;
      case LogLevel.ERROR:
        this.error(message, undefined, obj as Record<string, unknown>);
        break;
    }
  }
}

// Create a singleton logger instance for the application
const logger = new Logger();

// Export both as named and default export
export { logger };
export default logger;
