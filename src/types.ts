/**
 * Server status enum
 */
export enum ServerStatus {
  STOPPED = 'stopped',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  STOPPING = 'stopping',
}

/**
 * Authentication validation status
 */
export type AuthStatus = 'authenticated' | 'not_authenticated' | 'validation_error' | 'skipped';

/**
 * Result of authentication validation
 * Used to report auth status to MCP clients via logging notifications
 */
export interface AuthValidationResult {
  /** Current authentication status */
  status: AuthStatus;
  /** Profile alias if authenticated */
  alias?: string;
  /** ServiceNow instance hostname (sanitized, no credentials) */
  host?: string;
  /** Authentication type: 'oauth' or 'basic' */
  authType?: string;
  /** Whether this is the default profile */
  isDefault?: boolean;
  /** Human-readable status message */
  message: string;
  /** Shell command for manual setup if auth required */
  actionRequired?: string;
  /** ISO timestamp of validation */
  timestamp: string;
}
