import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config.js';
import { ResourceResult, ResourceType } from '../utils/types.js';

/**
 * The bundled `res/` content as a closed, immutable index.
 *
 * Every spec, instruction, and snippet is discovered once from its directory
 * listing. Lookups take a metadata type and an optional snippet id as **keys**;
 * a file path is only ever a name the directory listing returned, never one
 * built from caller input. A type or id that is not in the index is simply not
 * found — `x/../../README` cannot address a file outside `res/`.
 */

/** File names per resource kind, as returned by `readdir`. */
export type ResourceListing = Record<ResourceType, readonly string[]>;

/** The parsed index: metadata type → file name (snippets: id → file name, ids in order). */
export interface ResourceIndex {
  /** Metadata types with an API spec, sorted. The spec set defines the supported types. */
  readonly types: readonly string[];
  readonly spec: ReadonlyMap<string, string>;
  readonly instruct: ReadonlyMap<string, string>;
  readonly snippets: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

const SPEC_FILE = /^fluent_spec_(.+)\.md$/;
const INSTRUCT_FILE = /^fluent_instruct_(.+)\.md$/;
/** `<type>` may itself contain underscores; the id is the final all-digit segment. */
const SNIPPET_FILE = /^fluent_snippet_(.+)_(\d+)\.md$/;

const byName = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function indexByType(files: readonly string[], pattern: RegExp): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of [...files].sort(byName)) {
    const match = pattern.exec(file);
    if (match) index.set(match[1], file);
  }
  return index;
}

/**
 * Build the index from directory listings. Pure: no I/O, no defaults.
 * Non-matching names (README, temp files) are ignored.
 */
export function buildResourceIndex(listing: ResourceListing): ResourceIndex {
  const spec = indexByType(listing[ResourceType.SPEC], SPEC_FILE);
  const instruct = indexByType(listing[ResourceType.INSTRUCT], INSTRUCT_FILE);

  const snippets = new Map<string, Map<string, string>>();
  for (const file of [...listing[ResourceType.SNIPPET]].sort(byName)) {
    const match = SNIPPET_FILE.exec(file);
    if (!match) continue;
    const [, type, id] = match;
    const ids = snippets.get(type) ?? new Map<string, string>();
    ids.set(id, file);
    snippets.set(type, ids);
  }

  return { types: [...spec.keys()], spec, instruct, snippets };
}

/** Directories per resource kind, from configuration. */
function configuredDirectories(): Record<ResourceType, string> {
  const { resourcePaths } = getConfig();
  return {
    [ResourceType.SPEC]: resourcePaths.spec,
    [ResourceType.SNIPPET]: resourcePaths.snippet,
    [ResourceType.INSTRUCT]: resourcePaths.instruct,
  };
}

/**
 * The one shared view of `res/`. Constructed synchronously; the index is read
 * once, on {@link load} or the first lookup (single-flight). A listing failure
 * rejects instead of degrading: the directories ship with the package and are
 * checked at startup (`findMissingResourcePaths`), so a failure is a broken
 * install, not an empty catalog.
 */
export class ResourceCatalog {
  private readonly directories: Record<ResourceType, string>;
  private indexPromise?: Promise<ResourceIndex>;

  constructor(directories: Record<ResourceType, string> = configuredDirectories()) {
    this.directories = directories;
  }

  /** Read and index the resource directories (idempotent). */
  load(): Promise<ResourceIndex> {
    if (!this.indexPromise) {
      const read = (kind: ResourceType) => fs.promises.readdir(this.directories[kind]);
      this.indexPromise = Promise.all([read(ResourceType.SPEC), read(ResourceType.SNIPPET), read(ResourceType.INSTRUCT)])
        .then(([spec, snippet, instruct]) => buildResourceIndex({
          [ResourceType.SPEC]: spec,
          [ResourceType.SNIPPET]: snippet,
          [ResourceType.INSTRUCT]: instruct,
        }));
      // A failed load must not be cached: let the next call retry.
      this.indexPromise.catch(() => { this.indexPromise = undefined; });
    }
    return this.indexPromise;
  }

  /**
   * The supported metadata types that have a resource of this kind, from that
   * kind's own index: a spec type without a guide or a snippet is not listed
   * for `instruct` or `snippet`.
   */
  async listMetadataTypes(kind: ResourceType): Promise<string[]> {
    const index = await this.load();
    const entries: ReadonlyMap<string, unknown> =
      kind === ResourceType.SPEC ? index.spec : kind === ResourceType.INSTRUCT ? index.instruct : index.snippets;
    return index.types.filter((type) => entries.has(type));
  }

  /** Snippet ids for a metadata type, in order; empty when it has none. */
  async listSnippets(metadataType: string): Promise<string[]> {
    const ids = (await this.load()).snippets.get(metadataType.toLowerCase());
    return ids ? [...ids.keys()] : [];
  }

  /**
   * Read one resource. A snippet is addressed by its id: a missing id, or one
   * that does not exist, is **not found** (never another snippet).
   */
  async getResource(resourceType: ResourceType, metadataType: string, id?: string): Promise<ResourceResult> {
    const type = metadataType.toLowerCase();
    const file = this.fileFor(await this.load(), resourceType, type, id);
    if (!file) return { content: '', metadataType: type, found: false };

    const content = await fs.promises.readFile(path.join(this.directories[resourceType], file), 'utf-8');
    return { content, metadataType: type, found: true };
  }

  private fileFor(index: ResourceIndex, resourceType: ResourceType, type: string, id?: string): string | undefined {
    switch (resourceType) {
      case ResourceType.SPEC:
        return index.spec.get(type);
      case ResourceType.INSTRUCT:
        return index.instruct.get(type);
      case ResourceType.SNIPPET:
        return id === undefined ? undefined : index.snippets.get(type)?.get(id);
    }
  }
}
