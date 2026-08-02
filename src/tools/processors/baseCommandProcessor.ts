import { CommandProcessor, CommandResult } from '../../utils/types.js';

/**
 * Abstract base class for command processors with working directory resolution.
 */
export abstract class BaseCommandProcessor implements CommandProcessor {
  /**
   * Guard the working directory a command resolved.
   *
   * The command layer owns directory selection (see
   * `SessionAwareCLICommand.getWorkingDirectory`) and hands down an
   * already-validated absolute path, so this is a last-line guard rather than a
   * resolution step. There is deliberately no fallback: not `process.cwd()`, not
   * the installed-package directory, and — since MCP 2026-07-28 removed
   * server-initiated requests — no MCP Roots lookup either.
   * @throws Error if the directory is the system root
   */
  protected resolveCommandWorkingDirectory(customWorkingDir?: string): string | undefined {
    if (customWorkingDir === '/' || customWorkingDir === '\\') {
      throw new Error('ERROR: Command should never be executed with system root (/) as working directory');
    }
    return customWorkingDir;
  }

  abstract process(
    command: string,
    args: string[],
    customWorkingDir?: string,
    stdinInput?: string,
    timeoutMs?: number,
    signal?: AbortSignal
  ): Promise<CommandResult>;
}
