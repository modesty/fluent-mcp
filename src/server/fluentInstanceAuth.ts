import logger from '../utils/logger.js';
import { ToolsManager } from '../tools/toolsManager.js';

/**
 * Perform auto-authentication validation if environment is configured
 * Rules:
 * 1. If SN_INSTANCE_URL is not set -> log and exit
 * 2. If SN_INSTANCE_URL, SN_USERNAME, SN_PASSWORD, SN_AUTH_TYPE are all set -> validate via `npx now-sdk auth --list`
 *    - If a profile's host matches SN_INSTANCE_URL and default = Yes -> validated
 *    - If host matches but default = No -> run `npx now-sdk auth --use <alias>`
 *    - Otherwise -> run `npx now-sdk auth --add <SN_INSTANCE_URL> --type <SN_AUTH_TYPE>` and
 *      for basic type, interactively provide username/password
 */
export async function autoValidateAuthIfConfigured(toolsManager: ToolsManager): Promise<void> {
  const instUrl = process.env.SN_INSTANCE_URL?.trim();
  const authType = process.env.SN_AUTH_TYPE?.trim() || 'oauth';
  if (!instUrl) {
    logger.info('Auto-auth skipped: SN_INSTANCE_URL is not set');
    return;
  }


  // const username = process.env.SN_USERNAME?.trim();
  // const password = process.env.SN_PASSWORD?.trim();

  // if (!username || !password) {
  //   logger.info('Auto-auth skipped: SN_USERNAME/SN_PASSWORD/SN_AUTH_TYPE not fully set');
  //   return;
  // }

  try {
    // Validate existing auth profiles using the registered AuthCommand via ToolsManager
    const listRes = await toolsManager.runAuth({ list: true });
    const profiles = parseAuthListOutput(listRes.output);

    const matched = profiles.find((p) => urlsEqual(p.host, instUrl));
    if (matched) {
      if (matched.defaultYes) {
        logger.info('Auto-auth validated: default profile matches SN_INSTANCE_URL', {
          alias: matched.alias,
          host: matched.host,
        });
        return;
      }

      // Found matching host but not default, switch default
      const useAlias = matched.alias;
      const useRes = await toolsManager.runAuth({ use: useAlias });
      if (useRes.exitCode === 0) {
        logger.info('Auto-auth updated: switched default profile', { alias: useAlias, host: matched.host });
      } else {
        logger.warn('Auto-auth warning: failed to switch default profile with now-sdk auth --use', {
          alias: useAlias,
          stderr: useRes.error?.message,
        });
      }
      return;
    }

    // Not found -> attempt to add credentials (simplified)
    const alias = deriveAliasFromInstance(instUrl);
    // logger.info('Auto-auth attempting to add credentials', { alias, host: instUrl, type: authType });
      
    // const addRes = await toolsManager.runAuth({ add: instUrl, type: authType, alias });
    // if (addRes.exitCode === 0) {
    //   logger.info('Auto-auth added credentials', { alias, host: instUrl, type: authType });
        
    //   // Try to set as default
    //   const useRes = await runNowSdk(['auth', '--use', alias]);
    //   if (useRes.exitCode === 0) {
    //     logger.info('Auto-auth set as default', { alias });
    //   }
    // } else {
    logger.notice('not authenticated, please run following shell command to login:', {
      shellCommand: `npx @servicenow/sdk auth --add ${instUrl} --type ${authType} --alias ${alias}`
    });
    // }
  } catch (error) {
    logger.warn('Auto-auth failed to validate', { error: error instanceof Error ? error.message : String(error) });
    logger.notice('please run following shell command to login:', {
      shellCommand: `npx @servicenow/sdk auth --add ${instUrl} --type ${authType}`
    });
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
