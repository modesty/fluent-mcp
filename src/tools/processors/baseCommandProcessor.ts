import { CommandProcessor, CommandResult } from '../../utils/types.js';
import { resolveWorkingDirectory } from '../../utils/rootContext.js';

/**
 * Abstract base class for command processors with working directory resolution.
 */
export abstract class BaseCommandProcessor implements CommandProcessor {
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
      cwd = resolveWorkingDirectory();
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
    timeoutMs?: number,
    signal?: AbortSignal
  ): Promise<CommandResult>;
}
