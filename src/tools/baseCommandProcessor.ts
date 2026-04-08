import { CommandProcessor, CommandResult } from '../utils/types.js';
import logger from '../utils/logger.js';

/**
 * Abstract base class for command processors with shared roots management
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

  abstract process(
    command: string,
    args: string[],
    useMcpCwd?: boolean,
    customWorkingDir?: string,
    stdinInput?: string
  ): Promise<CommandResult>;
}
