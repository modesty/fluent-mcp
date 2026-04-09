/**
 * Cross-cutting domain types for the Fluent MCP server
 */

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

/**
 * ServiceNow metadata types supported by the server
 */
export enum ServiceNowMetadataType {
  ACL = 'acl',
  AI_AGENT = 'ai-agent',
  AI_AGENT_WORKFLOW = 'ai-agent-workflow',
  APPLICATION_MENU = 'application-menu',
  ATF_APPNAV = 'atf-appnav',
  ATF_CATALOG_ACTION = 'atf-catalog-action',
  ATF_CATALOG_VALIDATION = 'atf-catalog-validation',
  ATF_CATALOG_VARIABLE = 'atf-catalog-variable',
  ATF_EMAIL = 'atf-email',
  ATF_FORM = 'atf-form',
  ATF_FORM_ACTION = 'atf-form-action',
  ATF_FORM_DECLARATIVE_ACTION = 'atf-form-declarative-action',
  ATF_FORM_FIELD = 'atf-form-field',
  ATF_FORM_SP = 'atf-form-sp',
  ATF_REPORTING = 'atf-reporting',
  ATF_REST_API = 'atf-rest-api',
  ATF_REST_ASSERT_PAYLOAD = 'atf-rest-assert-payload',
  ATF_SERVER = 'atf-server',
  ATF_SERVER_CATALOG_ITEM = 'atf-server-catalog-item',
  ATF_SERVER_RECORD = 'atf-server-record',
  BUSINESS_RULE = 'business-rule',
  CATALOG_CLIENT_SCRIPT = 'catalog-client-script',
  CATALOG_ITEM = 'catalog-item',
  CATALOG_ITEM_RECORD_PRODUCER = 'catalog-item-record-producer',
  CATALOG_UI_POLICY = 'catalog-ui-policy',
  CATALOG_VARIABLE = 'catalog-variable',
  CLIENT_SCRIPT = 'client-script',
  COLUMN = 'column',
  COLUMN_GENERIC = 'column-generic',
  CROSS_SCOPE_PRIVILEGE = 'cross-scope-privilege',
  DASHBOARD = 'dashboard',
  EMAIL_NOTIFICATION = 'email-notification',
  FLOW = 'flow',
  FORM = 'form',
  IMPORT_SET = 'import-set',
  INSTANCE_SCAN = 'instance-scan',
  LIST = 'list',
  NOW_ASSIST_SKILL_CONFIG = 'now-assist-skill-config',
  PROPERTY = 'property',
  ROLE = 'role',
  SCHEDULED_SCRIPT = 'scheduled-script',
  SCRIPT_ACTION = 'script-action',
  SCRIPT_INCLUDE = 'script-include',
  SCRIPTED_REST = 'scripted-rest',
  SERVICE_PORTAL = 'service-portal',
  SLA = 'sla',
  TABLE = 'table',
  UI_ACTION = 'ui-action',
  UI_PAGE = 'ui-page',
  UI_POLICY = 'ui-policy',
  USER_PREFERENCE = 'user-preference',
  VARIABLE_SET = 'variable-set',
  WORKSPACE = 'workspace',
}
