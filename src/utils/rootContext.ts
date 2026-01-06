import { fileURLToPath } from 'node:url';
import { getProjectRootPath } from '../config.js';

let roots: { uri: string; name?: string }[] = [];

export function setRoots(newRoots: { uri: string; name?: string }[]): void {
  roots = Array.isArray(newRoots) ? [...newRoots] : [];
}

export function getRoots(): { uri: string; name?: string }[] {
  return [...roots];
}

/**
 * Resolve a file path from a URI, handling file:// protocol
 * @param uri The URI to resolve
 * @returns The resolved path or null if resolution fails
 */
function resolveUriToPath(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    return uri.startsWith('file://') ? fileURLToPath(new URL(uri)) : uri;
  } catch {
    return null;
  }
}

/**
 * Get the primary root path from the global roots, fallback to project root
 */
export function getPrimaryRootPath(): string {
  return resolveUriToPath(roots[0]?.uri) ?? getProjectRootPath();
}

/**
 * Resolve a primary root path from a provided roots array, fallback to project root
 */
export function getPrimaryRootPathFrom(
  providedRoots?: { uri: string; name?: string }[]
): string {
  return resolveUriToPath(providedRoots?.[0]?.uri) ?? getProjectRootPath();
}
