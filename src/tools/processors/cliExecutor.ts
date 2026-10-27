import { CommandResult, CommandResultFactory, ProcessRunOptions, ProcessRunner } from '../../utils/types.js';
import { BaseCommandProcessor } from './baseCommandProcessor.js';
import logger from '../../utils/logger.js';
import { cliErrorMessage } from '../../utils/cliError.js';

/**
 * Executes CLI commands via a ProcessRunner and returns results
 */
export class CLIExecutor extends BaseCommandProcessor {
  constructor(private processRunner: ProcessRunner) {
    super();
  }

  /**
   * Process a command by executing it and returning the result
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    customWorkingDir?: string,
    stdinInput?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
    options?: ProcessRunOptions
  ): Promise<CommandResult> {
    return this.execute(command, args, customWorkingDir, stdinInput, timeoutMs, signal, options);
  }

  async execute(
    command: string,
    args: string[],
    customWorkingDir?: string,
    stdinInput?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
    options?: ProcessRunOptions
  ): Promise<CommandResult> {
    try {
      const cwd = this.resolveCommandWorkingDirectory(customWorkingDir);

      // Command invocation detail is verbose; outcomes surface via CommandResult.
      logger.debug(`Executing command: ${command} ${args.join(' ')}`, { cwd });

      const result = await this.processRunner.run(command, args, cwd, stdinInput, timeoutMs, signal, options);

      const success = result.exitCode === 0;
      // The SDK CLI reports failures on stdout (logger lines, or a machine-mode
      // {"ok":false,"error":{...}} envelope), not stderr — recover the real message.
      const message = success ? (result.stderr || undefined) : cliErrorMessage(result.stdout, result.stderr, result.exitCode);
      return {
        success,
        output: result.stdout,
        error: message ? new Error(message) : undefined,
        exitCode: result.exitCode,
        ...(result.stdoutTruncated ? { outputTruncated: true } : {}),
      };
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }
}
