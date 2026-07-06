/**
 * Resolves how to invoke the ServiceNow SDK CLI ("now-sdk").
 *
 * Why this exists: invoking the CLI as `npx now-sdk …` only works when the
 * current working directory has `@servicenow/sdk` installed locally (its bin is
 * named `now-sdk`). Global operations like `auth` run from arbitrary client
 * roots that are not Fluent projects, so `npx` tries to fetch a registry
 * package literally named `now-sdk` → 404. fluent-mcp bundles
 * `@servicenow/sdk`, so we resolve and run its bundled CLI directly regardless
 * of cwd. Since the SDK is a runtime dependency, failure to resolve it indicates
 * a broken installation and must fail closed rather than downloading code at
 * execution time.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

import { getProjectRootPath } from '../config.js';
import logger from './logger.js';

/** A resolved CLI invocation: the executable plus its leading arguments. */
export interface SdkCliInvocation {
  /** The current Node.js executable used to run the bundled CLI. */
  command: string;
  /** Leading args before the SDK subcommand (the bundled CLI entry path). */
  baseArgs: string[];
}

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
 * Resolve how to invoke the bundled SDK CLI. The result is cached for the
 * process.
 *
 * @throws Error when the required runtime dependency cannot be resolved.
 */
export function resolveSdkCli(): SdkCliInvocation {
  if (cached) return cached;

  const binPath = resolveBundledSdkBin();
  if (!binPath) {
    throw new Error(
      'Unable to resolve the bundled @servicenow/sdk CLI. ' +
      'The fluent-mcp installation is incomplete; reinstall its dependencies before running SDK commands.'
    );
  }
  logger.debug(`Resolved bundled ServiceNow SDK CLI: ${binPath}`);
  cached = { command: process.execPath, baseArgs: [binPath] };
  return cached;
}

/** Test-only: reset the memoized resolution. */
export function resetSdkCliCache(): void {
  cached = undefined;
}
