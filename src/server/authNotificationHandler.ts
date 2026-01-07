/**
 * Handler for authentication status notifications
 * Responsible for formatting and sending auth notifications to MCP clients
 */

import { AuthValidationResult, AuthStatus } from '../types.js';
import logger, { LogLevel } from '../utils/logger.js';

/**
 * Mapping from auth status to appropriate log level (OCP-compliant)
 * Add new status mappings here without modifying handler code
 */
const AUTH_STATUS_LOG_LEVEL_MAP: Record<AuthStatus, LogLevel> = {
  authenticated: LogLevel.INFO,
  skipped: LogLevel.DEBUG,
  not_authenticated: LogLevel.NOTICE,
  validation_error: LogLevel.WARNING,
};

/**
 * Handler class for authentication notifications
 * Single Responsibility: Format and send auth status notifications to MCP clients
 */
export class AuthNotificationHandler {
  private clientInitialized = false;
  private pendingAuthResult: AuthValidationResult | null = null;

  /**
   * Mark the client as initialized and send any pending notifications
   */
  markClientInitialized(): void {
    this.clientInitialized = true;

    // Send any pending auth notification now that client is ready
    if (this.pendingAuthResult) {
      this.sendAuthStatusNotification(this.pendingAuthResult);
      this.pendingAuthResult = null;
    }
  }

  /**
   * Check if client is initialized
   */
  isClientInitialized(): boolean {
    return this.clientInitialized;
  }

  /**
   * Handle auth validation result - either send immediately or queue for later
   * @param result The auth validation result
   */
  handleAuthResult(result: AuthValidationResult): void {
    if (this.clientInitialized) {
      // Client already initialized, send immediately
      this.sendAuthStatusNotification(result);
    } else {
      // Queue for sending after client initialization
      this.pendingAuthResult = result;
      logger.debug('Auth result queued for notification after client initialized');
    }
  }

  /**
   * Get the appropriate log level for an auth status
   * @param status The auth status
   * @returns The corresponding log level
   */
  private getLogLevelForStatus(status: AuthStatus): LogLevel {
    return AUTH_STATUS_LOG_LEVEL_MAP[status] ?? LogLevel.INFO;
  }

  /**
   * Send authentication status notification to the client
   * Uses the 'authentication' logger name per MCP best practices
   * @param result The auth validation result to send
   */
  private sendAuthStatusNotification(result: AuthValidationResult): void {
    const level = this.getLogLevelForStatus(result.status);

    // Build structured data for the notification (exclude sensitive info)
    const data: Record<string, unknown> = {
      status: result.status,
      timestamp: result.timestamp,
    };

    if (result.alias) data.alias = result.alias;
    if (result.host) data.host = result.host;
    if (result.authType) data.authType = result.authType;
    if (result.isDefault !== undefined) data.isDefault = result.isDefault;
    if (result.actionRequired) data.actionRequired = result.actionRequired;

    // Send notification with dedicated 'authentication' logger name
    logger.sendNotification(level, result.message, data, 'authentication');
  }
}
