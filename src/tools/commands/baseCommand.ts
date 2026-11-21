import type { z } from 'zod';
import { CLICommand, CommandArgument, CommandProcessor, CommandResult, ProcessRunOptions } from '../../utils/types.js';
import { assertArguments, buildInputZodSchema } from '../toolSchema.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { getProjectRootPath } from '../../config.js';
import { buildSdkArgv, FlagConfig } from './cliArgv.js';

/** Options for running the bundled `now-sdk` CLI from `BaseCLICommand.runBundledSdk`. */
export interface RunSdkOptions {
  subcommand?: string | readonly string[];
  flags?: Record<string, FlagConfig>;
  positionals?: readonly string[];
  fixedFlags?: readonly string[];
  includeDebug?: boolean;
  /** Working directory to run in; defaults to the neutral package root. */
  cwd?: string;
  /** Timeout in ms; defaults to `this.timeoutMs`. */
  timeoutMs?: number;
  signal?: AbortSignal;
  processOptions?: ProcessRunOptions;
}

/** The `debug` argument, which `buildSdkArgv` maps to `--debug`. */
export const DEBUG_ARGUMENT: CommandArgument = {
  name: 'debug',
  type: 'boolean',
  required: false,
  description: 'Print debug output',
};

/**
 * Base abstract class for all CLI commands
 * Implements the Template Method pattern for validation
 */
export abstract class BaseCLICommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract arguments: CommandArgument[];
  timeoutMs?: number;

  constructor(protected commandProcessor: CommandProcessor) { }

  abstract execute(args: Record<string, unknown>): Promise<CommandResult>;

  private inputSchema?: z.ZodType;

  /**
   * Validate the arguments with the command's input schema: the same one
   * `tools/call` enforces (required arguments, types, each argument's domain,
   * and no control characters in plain text). A caller that reaches `execute()`
   * directly, such as the internal `AuthCommand` run, is held to the same
   * contract. There is no shell-metacharacter check: the executor spawns
   * shell-free, every option is one `--flag=value` entry (`cliOption`), and the
   * one path a shell sees shell-escapes every entry (`CLICmdWriter`).
   * @param args The arguments to validate
   * @throws Error naming every argument that fails
   */
  protected validateArgs(args: Record<string, unknown>): void {
    this.inputSchema ??= buildInputZodSchema(this.arguments);
    assertArguments(this.name, this.inputSchema, args);
  }

  /**
   * Resolve the bundled `now-sdk` CLI, assemble argv via `buildSdkArgv`, and
   * invoke `commandProcessor.process`. Defaults cwd to the neutral package root
   * for commands that do not depend on a Fluent project.
   */
  protected runBundledSdk(args: Record<string, unknown>, options: RunSdkOptions): Promise<CommandResult> {
    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs = buildSdkArgv({
      baseArgs,
      subcommand: options.subcommand,
      args,
      flags: options.flags,
      positionals: options.positionals,
      fixedFlags: options.fixedFlags,
      includeDebug: options.includeDebug,
    });
    return this.commandProcessor.process(
      command,
      sdkArgs,
      options.cwd ?? getProjectRootPath(),
      options.timeoutMs ?? this.timeoutMs,
      options.signal,
      options.processOptions
    );
  }
}
