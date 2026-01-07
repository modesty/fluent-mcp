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
  private mcpServer?: McpServer;

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
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Determine if a log level should be output based on the current log level
   */
  private shouldLog(level: LogLevel): boolean {
    return logLevelPriority[level] >= logLevelPriority[this.logLevel];
  }

  /**
   * Format a log entry as JSON
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
   */
  public setMcpServer(server: McpServer): void {
    this.mcpServer = server;
  }

  /**
   * Send a log message as an MCP notification
   * @param level Log level
   * @param message Log message
   * @param data Optional structured data
   * @param loggerName Optional logger name (defaults to 'fluent-mcp')
   */
  private sendMcpNotification(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    loggerName: string = 'fluent-mcp'
  ): void {
    if (!this.mcpServer) return;

    // Construct notification params according to MCP protocol
    const params = {
      level,
      logger: loggerName,
      message,
      ...(data ? { data } : {}),
    };

    try {
      // Send notification via MCP - this goes to stdout via the MCP server
      this.mcpServer.server.notification({ method: 'notifications/message', params });
    } catch (err) {
      // If notification fails, fallback to stderr
      this.writeToStderr(`Failed to send MCP notification: ${err}`);
    }
  }

  /**
   * Send a dedicated notification with custom logger name
   * Use this for domain-specific notifications (e.g., authentication)
   * @param level Log level
   * @param message Log message
   * @param data Structured data to include
   * @param loggerName The logger name (e.g., 'authentication')
   */
  public sendNotification(
    level: LogLevel,
    message: string,
    data: Record<string, unknown>,
    loggerName: string
  ): void {
    // Also write to stderr for debugging
    const logJson = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${loggerName}]: ${message} ${JSON.stringify(data)}`;
    this.writeToStderr(logJson);

    // Send MCP notification with custom logger name
    this.sendMcpNotification(level, message, data, loggerName);
  }

  /**
   * Set up logging request handlers on the MCP server
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
   * Core logging method - logs a message at the specified level
   * All level-specific methods delegate to this
   */
  private logAtLevel(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    options: { skipLevelCheck?: boolean } = {}
  ): void {
    if (!options.skipLevelCheck && !this.shouldLog(level)) {
      return;
    }

    const entry = this.formatLogEntry(level, message, context);
    this.writeLogEntry(level, entry);
  }

  /**
   * Log a message at the debug level
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a message at the info level
   */
  public info(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at the notice level
   */
  public notice(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.NOTICE, message, context);
  }

  /**
   * Log a message at the warn level
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at the warning level
   */
  public warning(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.WARNING, message, context);
  }

  /**
   * Log a message at the error level
   * Always logs regardless of log level, with optional error object for stack trace
   */
  public error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
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
    this.logAtLevel(level, message, errorContext, { skipLevelCheck: true });
  }

  /**
   * Log a message at the critical level
   */
  public critical(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.CRITICAL, message, context);
  }

  /**
   * Log a message at the alert level
   */
  public alert(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.ALERT, message, context);
  }

  /**
   * Log a message at the emergency level
   */
  public emergency(message: string, context?: Record<string, unknown>): void {
    this.logAtLevel(LogLevel.EMERGENCY, message, context);
  }

  /**
   * Log a message with an object for additional context at any level
   */
  public log(level: LogLevel, message: string, obj?: unknown): void {
    const context = obj as Record<string, unknown>;

    if (level === LogLevel.ERROR) {
      this.error(message, undefined, context);
    } else {
      this.logAtLevel(level, message, context);
    }
  }
}

// Create a singleton logger instance for the application
const logger = new Logger();

// Export both as named and default export
export { logger };
export default logger;
