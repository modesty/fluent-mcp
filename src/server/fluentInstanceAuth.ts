import logger from '../utils/logger.js';
import { ToolsManager } from '../tools/toolsManager.js';
import { SessionManager } from '../utils/sessionManager.js';
import { AuthValidationResult } from '../types.js';

/**
 * Perform auto-authentication validation if environment is configured
 *
 * Environment variables:
 * - SN_INSTANCE_URL: ServiceNow instance URL (required for auto-auth)
 * - SN_AUTH_TYPE: Authentication type ('basic' or 'oauth', defaults to 'oauth')
 * - SN_USER_NAME / SN_USERNAME: Username for basic auth
 * - SN_PASSWORD: Password for basic auth
 *
 * Rules:
 * 1. If SN_INSTANCE_URL is not set -> return skipped status
 * 2. List existing auth profiles via `npx now-sdk auth --list`
 *    - If a profile's host matches SN_INSTANCE_URL -> use that profile
 *    - Store the auth alias in session for use by all SDK commands
 * 3. If no matching profile found -> attempt to add auth profile automatically
 *    - For basic auth: uses SN_USER_NAME/SN_USERNAME and SN_PASSWORD env vars
 *    - For OAuth: opens browser for authentication
 *    - If successful, store the auth alias in session
 *    - If failed, return not_authenticated with setup instructions
 *
 * @returns AuthValidationResult with structured auth status for client notification
 */
export async function autoValidateAuthIfConfigured(toolsManager: ToolsManager): Promise<AuthValidationResult> {
  const instUrl = process.env.SN_INSTANCE_URL?.trim();
  const authType = process.env.SN_AUTH_TYPE?.trim() || 'oauth';
  const sessionManager = SessionManager.getInstance();
  const timestamp = new Date().toISOString();

  // Helper to create result and store in session
  const createResult = (result: AuthValidationResult): AuthValidationResult => {
    sessionManager.setAuthValidationResult(result);
    return result;
  };

  if (!instUrl) {
    logger.debug('Auto-auth skipped: SN_INSTANCE_URL is not set');
    return createResult({
      status: 'skipped',
      message: 'Auto-auth skipped: SN_INSTANCE_URL environment variable is not set',
      timestamp,
    });
  }

  // Extract hostname for display (no credentials)
  const host = extractHostname(instUrl);

  // Check if credentials are configured (don't log actual values)
  const username = process.env.SN_USER_NAME?.trim() || process.env.SN_USERNAME?.trim();
  const password = process.env.SN_PASSWORD;
  if (authType === 'basic') {
    logger.debug('Basic auth credential check', {
      hasUsername: !!username,
      hasPassword: !!password
    });
  }

  try {
    // Validate existing auth profiles using the registered AuthCommand via ToolsManager
    const listRes = await toolsManager.runAuth({ list: true });
    const profiles = parseAuthListOutput(listRes.output);

    const matched = profiles.find((p) => urlsEqual(p.host, instUrl));
    if (matched) {
      // Found a matching profile - store the alias in session
      sessionManager.setAuthAlias(matched.alias);

      if (matched.defaultYes) {
        logger.debug('Auto-auth validated: default profile matches SN_INSTANCE_URL');
        return createResult({
          status: 'authenticated',
          alias: matched.alias,
          host,
          authType: matched.type || authType,
          isDefault: true,
          message: 'Auto-auth validated: default profile matches SN_INSTANCE_URL',
          timestamp,
        });
      }

      // Found matching host but not default, switch default
      const useAlias = matched.alias;
      const useRes = await toolsManager.runAuth({ use: useAlias });
      if (useRes.exitCode === 0) {
        logger.debug('Auto-auth updated: switched default profile');
        return createResult({
          status: 'authenticated',
          alias: useAlias,
          host,
          authType: matched.type || authType,
          isDefault: true,
          message: 'Auto-auth validated: switched to matching profile',
          timestamp,
        });
      } else {
        // Profile exists but couldn't switch - still consider authenticated
        logger.warn('Auto-auth warning: failed to switch default profile');
        return createResult({
          status: 'authenticated',
          alias: useAlias,
          host,
          authType: matched.type || authType,
          isDefault: false,
          message: 'Profile found but could not set as default. Commands may need explicit --auth flag.',
          timestamp,
        });
      }
    }

    // Not found -> attempt to add auth profile automatically
    const alias = deriveAliasFromInstance(instUrl);
    const authCommand = buildAuthCommand(instUrl, authType, alias);

    logger.debug('No matching auth profile found, attempting to add automatically', { instUrl, authType, alias });

    try {
      // Attempt to add authentication profile
      // For basic auth: relies on SN_USER_NAME/SN_USERNAME and SN_PASSWORD env vars
      // For OAuth: will open browser for authentication
      const addRes = await toolsManager.runAuth({
        add: instUrl,
        type: authType,
        alias,
      });

      if (addRes.exitCode === 0) {
        // Auth add succeeded - store the alias in session
        sessionManager.setAuthAlias(alias);
        logger.debug('Auto-auth succeeded: added new profile', { alias, authType });

        return createResult({
          status: 'authenticated',
          alias,
          host,
          authType,
          isDefault: true,
          message: `Auto-auth succeeded: added new ${authType} profile for ${host}`,
          timestamp,
        });
      }

      // Auth add failed - return instructions for manual setup
      const setupHint = getAuthSetupHint(authType);

      logger.warn('Auto-auth failed to add profile', {
        exitCode: addRes.exitCode,
        output: addRes.output,
        error: addRes.error?.message
      });

      return createResult({
        status: 'not_authenticated',
        host,
        authType,
        message: `Auto-auth failed to add profile. ${setupHint}`,
        actionRequired: authCommand,
        timestamp,
      });
    } catch (addError) {
      // Error during auth add attempt - return instructions for manual setup
      const errorMessage = addError instanceof Error ? addError.message : String(addError);
      const setupHint = getAuthSetupHint(authType);

      logger.warn('Auto-auth error during profile add', { error: errorMessage });

      return createResult({
        status: 'not_authenticated',
        host,
        authType,
        message: `Auto-auth error: ${errorMessage}. ${setupHint}`,
        actionRequired: authCommand,
        timestamp,
      });
    }
  } catch (error) {
    const alias = deriveAliasFromInstance(instUrl);
    const authCommand = buildAuthCommand(instUrl, authType, alias);
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Auto-auth failed to validate', { error: errorMessage });

    return createResult({
      status: 'validation_error',
      host,
      authType,
      message: `Auth validation failed: ${errorMessage}`,
      actionRequired: authCommand,
      timestamp,
    });
  }
}

/**
 * Build the auth command string for display to the user
 */
function buildAuthCommand(instUrl: string, authType: string, alias: string): string {
  return `npx @servicenow/sdk auth --add ${instUrl} --type ${authType} --alias ${alias}`;
}

/**
 * Get setup hint message based on auth type
 */
function getAuthSetupHint(authType: string): string {
  return authType === 'basic'
    ? 'For basic auth, ensure SN_USER_NAME and SN_PASSWORD environment variables are set.'
    : 'For OAuth, a browser window will open for authentication.';
}

/**
 * Extract hostname from URL for safe display (no credentials)
 */
function extractHostname(instUrl: string): string {
  try {
    const u = new URL(instUrl);
    return u.hostname;
  } catch {
    // If URL parsing fails, return sanitized string
    return instUrl.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/** Normalize and compare two URLs/hosts for equality (ignores trailing slashes) */
function urlsEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = a.trim().replace(/\/?$/, '');
  const nb = b.trim().replace(/\/?$/, '');
  return na === nb;
}

/** Derive a reasonable alias name from SN_INSTANCE_URL or raw value */
function deriveAliasFromInstance(instUrl: string): string {
  try {
    const u = new URL(instUrl);
    // Use hostname if available; fallback to sanitized string
    return u.hostname || instUrl.replace(/\W+/g, '-');
  } catch {
    return instUrl.replace(/\W+/g, '-');
  }
}

/** Parse `now-sdk auth --list` stdout into profiles */
function parseAuthListOutput(stdout: string): { alias: string; host?: string; type?: string; username?: string; defaultYes: boolean }[] {
  const profiles: { alias: string; host?: string; type?: string; username?: string; defaultYes: boolean }[] = [];
  if (!stdout) return profiles;

  const lines = stdout.split(/\r?\n/);
  let current: { alias: string; host?: string; type?: string; username?: string; defaultYes: boolean } | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const headerMatch = line.match(/^\*?\[([^\]]+)\]/);
    if (headerMatch) {
      if (current) profiles.push(current);
      // Mark default if the header starts with '*'
      const isDefault = line.trimStart().startsWith('*');
      current = { alias: headerMatch[1], defaultYes: isDefault };
      continue;
    }
    const kvMatch = line.match(/^\s*([a-zA-Z_]+)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      const key = kvMatch[1].toLowerCase();
      const value = kvMatch[2].trim();
      if (key === 'host') current.host = value;
      else if (key === 'type') current.type = value;
      else if (key === 'username') current.username = value;
      else if (key === 'default') current.defaultYes = /^yes$/i.test(value);
    }
  }
  if (current) profiles.push(current);
  return profiles;
}
