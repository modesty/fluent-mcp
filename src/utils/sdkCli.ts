/**
 * Resolves how to invoke the ServiceNow SDK CLI ("now-sdk").
 *
 * Why this exists: invoking the CLI as `npx now-sdk …` only works when the
 * current working directory has `@servicenow/sdk` installed locally (its bin is
 * named `now-sdk`). Global operations like `auth` run from arbitrary client
 * roots that are not Fluent projects, so `npx` tries to fetch a registry
 * package literally named `now-sdk` → 404. fluent-mcp bundles
 * `@servicenow/sdk`, so we resolve and run its bundled CLI directly regardless
 * of cwd, falling back to `npx -y @servicenow/sdk` only if resolution fails.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

import { getProjectRootPath } from '../config.js';
import logger from './logger.js';

/** A resolved CLI invocation: the executable plus its leading arguments. */
export interface SdkCliInvocation {
  /** The command to spawn (`node` for the bundled CLI, or `npx`). */
  command: string;
  /** Leading args before the SDK subcommand (e.g. the bin path, or `-y @servicenow/sdk`). */
  baseArgs: string[];
}

/** Robust fallback that fetches/uses the published package by name. */
const NPX_FALLBACK: SdkCliInvocation = { command: 'npx', baseArgs: ['-y', '@servicenow/sdk'] };

let cached: SdkCliInvocation | undefined;

/**
 * Resolve the path to the bundled `@servicenow/sdk` CLI entry (`bin/index.js`).
 *
 * The package's `exports` map blocks resolving `./bin/index.js` and
 * `./package.json` directly, so we resolve an exposed subpath (`/core`) and
 * walk up to the package root, then join `bin/index.js`. Resolution is
 * anchored at the fluent-mcp project root so it finds the bundled dependency
 * regardless of the process cwd.
 *
 * @returns the absolute bin path, or undefined if it can't be located.
 */
function resolveBundledSdkBin(): string | undefined {
  try {
    const require = createRequire(path.join(getProjectRootPath(), 'index.js'));
    const coreEntry = require.resolve('@servicenow/sdk/core');

    let dir = path.dirname(coreEntry);
    while (dir !== path.dirname(dir)) {
      if (path.basename(dir) === 'sdk' && path.basename(path.dirname(dir)) === '@servicenow') {
        break;
      }
      dir = path.dirname(dir);
    }

    const binPath = path.join(dir, 'bin', 'index.js');
    return fs.existsSync(binPath) ? binPath : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve how to invoke the SDK CLI. Prefers the bundled copy (`node <bin>`),
 * falls back to `npx -y @servicenow/sdk`. Result is cached for the process.
 */
export function resolveSdkCli(): SdkCliInvocation {
  if (cached) return cached;

  const binPath = resolveBundledSdkBin();
  if (binPath) {
    logger.debug(`Resolved bundled ServiceNow SDK CLI: ${binPath}`);
    cached = { command: 'node', baseArgs: [binPath] };
  } else {
    logger.debug('Bundled ServiceNow SDK CLI not found; falling back to npx -y @servicenow/sdk');
    cached = NPX_FALLBACK;
  }
  return cached;
}

/** Test-only: reset the memoized resolution. */
export function resetSdkCliCache(): void {
  cached = undefined;
}
