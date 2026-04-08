import { CommandResult, CommandResultFactory, ProcessRunner } from '../../utils/types.js';
import { BaseCommandProcessor } from './baseCommandProcessor.js';
import logger from '../../utils/logger.js';

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
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    stdinInput?: string
  ): Promise<CommandResult> {
    return this.execute(command, args, useMcpCwd, customWorkingDir, stdinInput);
  }

  async execute(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    stdinInput?: string
  ): Promise<CommandResult> {
    try {
      const cwd = this.resolveCommandWorkingDirectory(useMcpCwd, customWorkingDir);

      // Better logging with clear working directory information
      logger.info(`Executing command: ${command} ${args.join(' ')}`, { cwd });

      const result = await this.processRunner.run(command, args, cwd, stdinInput);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr ? new Error(result.stderr) : undefined,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }
}
