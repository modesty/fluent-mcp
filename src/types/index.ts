/**
 * Type definitions for the Fluent MCP for ServiceNow SDK
 */

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

/**
 * Resource type supported by the server
 */
export enum ResourceType {
  SPEC = 'spec',
  SNIPPET = 'snippet',
  INSTRUCT = 'instruct',
}

/**
 * Export all types from the server, tools, and utils
 */
export * from '../server/types.js';
export * from '../tools/types.js';
export * from '../utils/types.js';
