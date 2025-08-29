/**
 * Logger utility for the MCP server
 * Outputs formatted JSON logs to stderr or a file to avoid interfering with MCP's stdio transport
 * Also supports sending logs as MCP notifications according to the protocol
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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
  private mcpServer?: McpServer; // Add McpServer reference

  constructor() {
    const config = getConfig();
    this.logLevel = (config.logLevel as LogLevel) || LogLevel.INFO;
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
  private writeLogEntry(level: LogLevel, entry: LogEntry): void {
    // Format the log entry as JSON for human readability
    const logJson = `[${entry.timestamp}] [${entry.level.toUpperCase()}]: ${
      entry.message
    } ${JSON.stringify(entry.context || {})}`;

    // all human readable logs go to stderr
    process.stderr.write(`${logJson}\n`);

    // send log notifications to MCP server if available
    this.sendMcpNotification(level, entry.message, entry.context);
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
      // Send notification via MCP - this goes to stdout via the MCP server
      // We don't need to write to stderr here as that's handled separately
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

    // Explicitly register the logging/setLevel handler
    this.mcpServer.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
      const level = request.params.level as LogLevel;
      this.setLogLevel(level);
      this.info(`Log level set to: ${level}`);
      return {};
    });
    
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
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.DEBUG, entry);
  }

  /**
   * Log a message at the info level
   * @param message The message to log
   * @param context Optional context object
   */
  public info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLogEntry(LogLevel.INFO, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.INFO, entry);
  }

  /**
   * Log a message at the notice level
   * @param message The message to log
   * @param context Optional context object
   */
  public notice(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.NOTICE)) return;
    const entry = this.formatLogEntry(LogLevel.NOTICE, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.NOTICE, entry);
  }

  /**
   * Log a message at the warn level
   * @param message The message to log
   * @param context Optional context object
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLogEntry(LogLevel.WARN, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.WARN, entry);
  }

  /**
   * Log a message at the warning level
   * @param message The message to log
   * @param context Optional context object
   */
  public warning(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARNING)) return;
    const entry = this.formatLogEntry(LogLevel.WARNING, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.WARNING, entry);
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
    // Always log errors regardless of log level
    // Prepare error context
    const errorContext: Record<string, unknown> = {
      ...(context || {}),
    };

    if (error) {
      errorContext.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    // In test environment, downgrade error logs to WARN to keep test output clean
    const level = process.env.NODE_ENV === 'test' ? LogLevel.WARN : LogLevel.ERROR;
    const entry = this.formatLogEntry(level, message, errorContext);
    // Only write to stderr, not stdout
    this.writeLogEntry(level, entry);
  }
  public critical(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.CRITICAL)) return;
    const entry = this.formatLogEntry(LogLevel.CRITICAL, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.CRITICAL, entry);
  }

  /**
   * Log a message at the alert level
   * @param message The message to log
   * @param context Optional context object
   */
  public alert(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ALERT)) return;
    const entry = this.formatLogEntry(LogLevel.ALERT, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.ALERT, entry);
  }

  /**
   * Log a message at the emergency level
   * @param message The message to log
   * @param context Optional context object
   */
  public emergency(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.EMERGENCY)) return;
    const entry = this.formatLogEntry(LogLevel.EMERGENCY, message, context);
    // Only write to stderr, not stdout
    this.writeLogEntry(LogLevel.EMERGENCY, entry);
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
