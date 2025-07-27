/**
 * Logger utility for the MCP server
 * Outputs formatted JSON logs to stderr or a file to avoid interfering with MCP's stdio transport
 * Also supports sending logs as MCP notifications according to the protocol
 */

import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getConfig } from '../config.js';

// Log levels enum
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  NOTICE = 'notice',
  WARN = 'warn',
  WARNING = 'warning', // MCP protocol alias for warn
  ERROR = 'error',
  CRITICAL = 'critical',
  ALERT = 'alert',
  EMERGENCY = 'emergency',
}

// Level priorities - higher number means more severe
const logLevelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.NOTICE]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.WARNING]: 3, // Same priority as WARN
  [LogLevel.ERROR]: 4,
  [LogLevel.CRITICAL]: 5,
  [LogLevel.ALERT]: 6,
  [LogLevel.EMERGENCY]: 7,
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
  private mcpServer?: McpServer; // Add McpServer reference

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
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
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
    const logJson = `[${entry.timestamp}] [${entry.level.toUpperCase()}]: ${
      entry.message
    } ${JSON.stringify(entry.context || {})}`;

    if (this.useStderr) {
      process.stderr.write(`${logJson}\n`);
    } else if (this.logStream) {
      this.logStream.write(`${logJson}\n`);
    }
  }

  /**
   * Set the MCP server instance for sending log notifications
   * @param server MCP server instance
   */
  public setMcpServer(server: McpServer): void {
    this.mcpServer = server;
  }

  /**
   * Send a log message as an MCP notification
   * @param level Log level
   * @param message Message text
   * @param data Additional data for the notification
   */
  private sendMcpNotification(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.mcpServer) return;

    // Construct notification params according to MCP protocol
    const params = {
      level,
      logger: 'fluent-mcp',
      message,
      ...(data ? { data } : {}),
    };

    try {
      // Send notification via MCP
      this.mcpServer.server.notification({ method: 'logging/message', params });
    } catch (err) {
      // If notification fails, fallback to stderr
      this.writeToStderr(`Failed to send MCP notification: ${err}`);
    }
  }

  /**
   * Set up logging request handlers on the MCP server
   * 
   * Note: The MCP SDK should automatically handle logging/setLevel requests
   * when the logging capability is declared. This method is a fallback
   * in case the automatic handler is not working.
   */
  public setupLoggingHandlers(): void {
    if (!this.mcpServer) return;

    // We're relying on the SDK's built-in handling for logging/setLevel
    // which is enabled when we declare the logging capability
    // No manual handler registration needed
    
    // Log the status
    this.debug('Logging capability enabled with current level: ' + this.logLevel);
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
    this.sendMcpNotification(LogLevel.DEBUG, message, context);
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
    this.sendMcpNotification(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at the notice level
   * @param message The message to log
   * @param context Optional context object
   */
  public notice(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.NOTICE)) return;
    const entry = this.formatLogEntry(LogLevel.NOTICE, message, context);
    this.writeLogEntry(entry);
    this.sendMcpNotification(LogLevel.NOTICE, message, context);
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
    this.sendMcpNotification(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at the warning level
   * @param message The message to log
   * @param context Optional context object
   */
  public warning(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARNING)) return;
    const entry = this.formatLogEntry(LogLevel.WARNING, message, context);
    this.writeLogEntry(entry);
    this.sendMcpNotification(LogLevel.WARNING, message, context);
  }

  /**
   * Log a message at the error level
   * @param message The message to log
   * @param error Optional error object
   * @param context Optional context object
   */
  public error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const errorContext = error
      ? {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }
      : context;

    const entry = this.formatLogEntry(LogLevel.ERROR, message, errorContext);
    this.writeLogEntry(entry);
    this.sendMcpNotification(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Log a message at the critical level
   * @param message The message to log
   * @param context Optional context object
   */
  public critical(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.CRITICAL)) return;
    const entry = this.formatLogEntry(LogLevel.CRITICAL, message, context);
    this.writeLogEntry(entry);
    this.sendMcpNotification(LogLevel.CRITICAL, message, context);
  }

  /**
   * Log a message at the alert level
   * @param message The message to log
   * @param context Optional context object
   */
  public alert(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ALERT)) return;
    const entry = this.formatLogEntry(LogLevel.ALERT, message, context);
    this.writeLogEntry(entry);
    this.sendMcpNotification(LogLevel.ALERT, message, context);
  }

  /**
   * Log a message at the emergency level
   * @param message The message to log
   * @param context Optional context object
   */
  public emergency(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.EMERGENCY)) return;
    const entry = this.formatLogEntry(LogLevel.EMERGENCY, message, context);
    this.writeLogEntry(entry);
    this.sendMcpNotification(LogLevel.EMERGENCY, message, context);
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
      case LogLevel.NOTICE:
        this.notice(message, obj as Record<string, unknown>);
        break;
      case LogLevel.WARN:
        this.warn(message, obj as Record<string, unknown>);
        break;
      case LogLevel.WARNING:
        this.warning(message, obj as Record<string, unknown>);
        break;
      case LogLevel.ERROR:
        this.error(message, undefined, obj as Record<string, unknown>);
        break;
      case LogLevel.CRITICAL:
        this.critical(message, obj as Record<string, unknown>);
        break;
      case LogLevel.ALERT:
        this.alert(message, obj as Record<string, unknown>);
        break;
      case LogLevel.EMERGENCY:
        this.emergency(message, obj as Record<string, unknown>);
        break;
    }
  }
}

// Create a singleton logger instance for the application
const logger = new Logger();

// Export both as named and default export
export { logger };
export default logger;
