import { fileURLToPath } from 'node:url';
import { getProjectRootPath } from '../config.js';

let roots: { uri: string; name?: string }[] = [];

export function setRoots(newRoots: { uri: string; name?: string }[]): void {
  roots = Array.isArray(newRoots) ? [...newRoots] : [];
}

export function getRoots(): { uri: string; name?: string }[] {
  return [...roots];
}

export function getPrimaryRootPath(): string {
  if (roots && roots.length > 0) {
    const uri = roots[0]?.uri;
    if (uri) {
      try {
        if (uri.startsWith('file://')) {
          return fileURLToPath(new URL(uri));
        }
        return uri;
      } catch {
        // fall through
      }
    }
  }
  return getProjectRootPath();
}

/** Resolve a primary root path from a provided roots array, fallback to project root */
export function getPrimaryRootPathFrom(
  providedRoots?: { uri: string; name?: string }[]
): string {
  if (providedRoots && providedRoots.length > 0) {
    const uri = providedRoots[0]?.uri;
    if (uri) {
      try {
        if (uri.startsWith('file://')) {
          return fileURLToPath(new URL(uri));
        }
        return uri;
      } catch {
        // ignore and fall through
      }
    }
  }
  // Default fallback when no provided roots
  return getProjectRootPath();
}
