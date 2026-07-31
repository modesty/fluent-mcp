import { fileURLToPath } from 'node:url';

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
 * Get the primary root path from the global roots.
 */
export function getPrimaryRootPath(): string | undefined {
  return resolveUriToPath(roots[0]?.uri) ?? undefined;
}

/**
 * Resolve the transitional MCP roots working directory.
 * 
 * Resolution order:
 * 1. Instance-specific roots (if provided and non-empty)
 * 2. Global roots from RootContext
 * @param instanceRoots Optional instance-specific roots to prefer over global roots
 * @returns The resolved root path, or undefined when the client provided no usable root
 */
export function resolveWorkingDirectory(
  instanceRoots?: { uri: string; name?: string }[]
): string | undefined {
  // Try instance roots first
  if (instanceRoots && instanceRoots.length > 0) {
    const resolved = resolveUriToPath(instanceRoots[0]?.uri);
    if (resolved) {
      return resolved;
    }
  }

  // Fall back to the global roots cache. There is deliberately no package-dir
  // or process.cwd() guess: callers must fail with actionable configuration.
  return getPrimaryRootPath();
}
