import { CommandProcessor, CommandResult } from '../../utils/types.js';
import { resolveWorkingDirectory } from '../../utils/rootContext.js';
import logger from '../../utils/logger.js';

/**
 * Abstract base class for command processors with shared roots management
 * and working directory resolution
 */
export abstract class BaseCommandProcessor implements CommandProcessor {
  protected roots: { uri: string; name?: string }[] = [];

  /**
   * Sets the roots from the MCP server
   * @param roots Array of root URIs and optional names
   */
  setRoots(roots: { uri: string; name?: string }[]): void {
    const hasChanged = this.roots.length !== roots.length ||
      this.roots.some((root, index) =>
        root.uri !== roots[index]?.uri ||
        root.name !== roots[index]?.name
      );

    if (hasChanged) {
      this.roots = [...roots];
      logger.debug(`Updated roots in ${this.constructor.name}`, { roots });
    }
  }

  /**
   * Resolve the working directory for a command.
   * Priority: customWorkingDir > roots-based resolution (if useMcpCwd) > undefined
   * @throws Error if resolved directory is system root
   */
  protected resolveCommandWorkingDirectory(
    useMcpCwd: boolean,
    customWorkingDir?: string
  ): string | undefined {
    let cwd = customWorkingDir;
    if (!cwd && useMcpCwd) {
      cwd = resolveWorkingDirectory(this.roots);
    }
    if (cwd === '/' || cwd === '\\') {
      throw new Error('ERROR: Command should never be executed with system root (/) as working directory');
    }
    return cwd;
  }

  abstract process(
    command: string,
    args: string[],
    useMcpCwd?: boolean,
    customWorkingDir?: string,
    stdinInput?: string,
    timeoutMs?: number
  ): Promise<CommandResult>;
}
