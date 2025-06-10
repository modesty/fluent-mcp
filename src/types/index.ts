/**
 * Type definitions for the Fluent MCP for ServiceNow SDK
 */

/**
 * ServiceNow metadata types supported by the server
 */
export enum ServiceNowMetadataType {
  ACL = 'acl',
  APPLICATION_MENU = 'application-menu',
  BUSINESS_RULE = 'business-rule',
  CLIENT_SCRIPT = 'client-script',
  CROSS_SCOPE_PRIVILEGE = 'cross-scope-privilege',
  FORM = 'form',
  LIST = 'list',
  PROPERTY = 'property',
  ROLE = 'role',
  SCHEDULED_SCRIPT = 'scheduled-script',
  SCRIPT_INCLUDE = 'script-include',
  SCRIPTED_REST = 'scripted-rest',
  TABLE = 'table',
  UI_ACTION = 'ui-action',
  USER_PREFERENCE = 'user-preference',
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
export * from '../server/types';
export * from '../tools/types';
export * from '../utils/types';
