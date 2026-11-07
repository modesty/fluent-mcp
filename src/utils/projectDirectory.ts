/**
 * The project-directory contract, shared by every command that works in a
 * Fluent project and by `init_fluent_app`, which creates one.
 *
 * A project directory is absolute, canonical (`realpath`), and never the
 * filesystem root. The root check runs on the resolved path, so a symlink to
 * `/` (or a Windows drive root) is refused like `/` itself.
 *
 * A local conversion source (`init_fluent_app` `from`) follows the same rule
 * through `resolveExistingDirectory`.
 *
 * What a project cwd does and does not give: the SDK writes the project it
 * builds, creates or downloads into that directory, so project output stays
 * there. It is not an OS filesystem sandbox. The CLI and npm still write their
 * own state elsewhere (credential store, caches, temp files).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CommandResultFactory } from './types.js';
import logger from './logger.js';

/** The remedy a project command's directory error ends with. */
const PROJECT_REMEDY = 'Supply the absolute path of a Fluent project directory.';

/** The remedy an init destination error ends with. */
export const INIT_DESTINATION_REMEDY =
  'Supply an empty absolute directory or a new absolute directory path to create.';

/** Where an init project will be written, and whether that directory must be created first. */
export interface InitDestination {
  /** The canonical destination path. */
  directory: string;
  /** True when the destination does not exist yet; its parent does. */
  create: boolean;
}

/**
 * Resolve an existing project directory for a project command.
 * @param value The configured or supplied path
 * @param source What supplied it, named in every error (for example `FLUENT_MCP_WORKING_DIR`)
 * @returns The canonical directory
 * @throws Error naming the source when the path is not absolute, missing, not a directory, or the root
 */
export function resolveProjectDirectory(value: unknown, source: string): string {
  return resolveExistingDirectory(value, source, PROJECT_REMEDY);
}

/**
 * Resolve an existing directory: absolute, canonical, and not the root.
 * @param value The supplied path
 * @param source What supplied it, named in every error
 * @param remedy The sentence every error ends with
 * @param kind What the directory must be, for the root error
 * @returns The canonical directory
 * @throws Error when the path is not absolute, missing, not a directory, or the root
 */
export function resolveExistingDirectory(
  value: unknown,
  source: string,
  remedy: string,
  kind = 'a dedicated project directory'
): string {
  const requested = absolutePath(value, source, remedy);
  rejectRoot(requested, requested, source, remedy, kind);

  const directory = canonicalPath(requested, source, remedy);
  if (directory === undefined) {
    throw new Error(`${source} does not exist: ${requested}. ${remedy}`);
  }
  rejectRoot(requested, directory, source, remedy, kind);
  if (!fs.statSync(directory).isDirectory()) {
    throw new Error(`${source} is not a directory: ${requested}. ${remedy}`);
  }
  return directory;
}

/**
 * Check an init destination without changing anything: an existing empty
 * directory, or a path that does not exist yet under an existing directory.
 * The same rule holds for every intent: creation, conversion from an
 * instance sys_id, and conversion from a local directory.
 * @param value The `workingDirectory` argument
 * @param conversionSource For a local conversion, the canonical source
 *   directory; the destination must not be it or inside it (the SDK copies the
 *   source into the new project's `metadata/`, so a destination inside the
 *   source would be copied into itself)
 * @returns The canonical destination and whether it must be created
 * @throws Error with an actionable message for any other path
 */
export function checkInitDestination(value: unknown, conversionSource?: string): InitDestination {
  const source = 'workingDirectory';
  const requested = absolutePath(value, source, INIT_DESTINATION_REMEDY);
  rejectRoot(requested, requested, source, INIT_DESTINATION_REMEDY);

  const existing = canonicalPath(requested, source, INIT_DESTINATION_REMEDY);
  if (existing !== undefined) {
    rejectRoot(requested, existing, source, INIT_DESTINATION_REMEDY);
    if (!fs.statSync(existing).isDirectory()) {
      throw new Error(`${source} is not a directory: ${requested}. ${INIT_DESTINATION_REMEDY}`);
    }
    rejectInsideSource(requested, existing, conversionSource);
    rejectPopulated(requested, fs.readdirSync(existing));
    return { directory: existing, create: false };
  }

  const parent = path.dirname(requested);
  const canonicalParent = canonicalPath(parent, `The parent of ${source}`, INIT_DESTINATION_REMEDY);
  if (canonicalParent === undefined || !fs.statSync(canonicalParent).isDirectory()) {
    throw new Error(
      `The parent directory of ${source} does not exist: ${parent}. Create it first, or choose a new directory under an existing one.`
    );
  }
  const directory = path.join(canonicalParent, path.basename(requested));
  rejectInsideSource(requested, directory, conversionSource);
  return { directory, create: true };
}

/**
 * Whether `child` is `parent` or lies under it. Both must be canonical. A
 * path-segment comparison, not a string prefix: `/a/src-copy` is not inside `/a/src`.
 */
export function isWithinDirectory(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Create a destination that `checkInitDestination` reported as new. Not
 * recursive: the parent was checked to exist.
 * @returns True when this call created the directory, so the caller owns it
 * @throws Error when the directory cannot be created, including when it appeared since the check
 */
export function createInitDestination(destination: InitDestination): boolean {
  if (!destination.create) return false;
  try {
    fs.mkdirSync(destination.directory);
    return true;
  } catch (error) {
    throw new Error(
      `Failed to create workingDirectory ${destination.directory}: ${CommandResultFactory.normalizeError(error).message}`,
      { cause: error }
    );
  }
}

/**
 * Best-effort removal of a destination this invocation created, after the
 * tool failed. Non-recursive: a directory that is no longer empty, or that
 * cannot be removed, is left as it is, and nothing is thrown, so the caller
 * reports its original error.
 */
export function removeCreatedDestination(directory: string): void {
  try {
    fs.rmdirSync(directory);
    logger.info(`Removed working directory created for the failed init: ${directory}`);
  } catch (error) {
    logger.warn(`Left working directory in place after the failed init: ${directory}`, {
      error: CommandResultFactory.normalizeError(error).message,
    });
  }
}

/** A trimmed, normalized absolute path, or an error that says what was wrong. */
function absolutePath(value: unknown, source: string, remedy: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${source} must be a non-empty absolute path. ${remedy}`);
  }
  const trimmed = value.trim();
  if (!path.isAbsolute(trimmed)) {
    // `~` and bare names are not expanded: the server's own cwd and home are
    // not the caller's, so a guess could put the project anywhere.
    throw new Error(`${source} must be an absolute path, not "${trimmed}". ${remedy}`);
  }
  return path.resolve(trimmed);
}

/**
 * The real path, or undefined when nothing exists there. The native resolver
 * also returns the on-disk letter case, so two spellings of one directory on a
 * case-insensitive filesystem (macOS, Windows) compare equal.
 */
function canonicalPath(requested: string, source: string, remedy: string): string | undefined {
  try {
    return fs.realpathSync.native(requested);
  } catch (error) {
    if ((error as { code?: unknown }).code === 'ENOENT') return undefined;
    throw new Error(
      `${source} cannot be resolved: ${requested} (${CommandResultFactory.normalizeError(error).message}). ${remedy}`,
      { cause: error }
    );
  }
}

function rejectRoot(
  requested: string,
  resolved: string,
  source: string,
  remedy: string,
  kind = 'a dedicated project directory'
): void {
  if (path.parse(resolved).root !== resolved) return;
  const shown = requested === resolved ? `"${resolved}"` : `"${requested}" (it resolves to "${resolved}")`;
  throw new Error(`${source} must identify ${kind}, not ${shown}. ${remedy}`);
}

function rejectInsideSource(requested: string, destination: string, conversionSource: string | undefined): void {
  if (conversionSource === undefined || !isWithinDirectory(conversionSource, destination)) return;
  throw new Error(
    `workingDirectory must not be the conversion source or inside it: ${requested} is inside ${conversionSource}. ` +
    'Supply an empty absolute directory, or a new absolute directory path to create, outside the source.'
  );
}

function rejectPopulated(requested: string, entries: string[]): void {
  if (entries.length === 0) return;
  const listed = entries.slice(0, 5).join(', ') + (entries.length > 5 ? ', …' : '');
  const existingProject = entries.includes('now.config.json')
    ? ' It already holds a Fluent project: to work in it, pass it as workingDirectory to the project tools or set FLUENT_MCP_WORKING_DIR.'
    : '';
  throw new Error(
    `workingDirectory is not empty: ${requested} (contains ${listed}).${existingProject} ${INIT_DESTINATION_REMEDY}`
  );
}
