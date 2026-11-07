import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { EXIT_CODE_CANCELLED, EXIT_CODE_TIMEOUT, MAX_TIMER_DELAY_MS, ProcessResult, ProcessRunOptions, ProcessRunner } from '../../utils/types.js';
import { BoundedBuffer, DEFAULT_MAX_OUTPUT_CHARS } from '../../utils/boundedOutput.js';
import { getConfig } from '../../config.js';
import logger from '../../utils/logger.js';

/**
 * Fallback process timeout (ms) used only when neither a per-call timeout nor a
 * configured default is available (e.g. tests that mock config without a
 * `servicenowSdk` block). Real runs resolve the default from
 * `config.servicenowSdk.commandTimeoutMs`.
 */
const FALLBACK_PROCESS_TIMEOUT_MS = 30_000;

/**
 * Spawns child processes to execute CLI commands.
 *
 * Responsibilities:
 * - shell-free execution (injection defense — see H1),
 * - non-interactive stdin: input is written whole and stdin closed at spawn,
 * - a timeout that terminates the child and resolves with the buffered *partial*
 *   output (rather than discarding it) plus a non-zero exit code (P0.2),
 * - propagation of an external abort signal so an MCP client can cancel a
 *   long-running command (P0.3),
 * - bounded stdout/stderr retention to protect memory and token budget (P0.4).
 */
export class NodeProcessRunner implements ProcessRunner {
  private readonly defaultTimeoutMs: number;
  private readonly overrideTimeoutMs?: number;
  private readonly maxOutputChars: number;

  /**
   * @param options Test/DI overrides. `overrideTimeoutMs` (an operator global
   *   override sourced from `FLUENT_MCP_COMMAND_TIMEOUT_MS`) wins over any
   *   per-call timeout; `defaultTimeoutMs` is the fallback when a call omits one.
   *   Both default from `config.servicenowSdk`. `maxOutputChars` caps retained
   *   output per stream; a call may raise its stdout cap (`maxStdoutChars`).
   */
  constructor(options?: { defaultTimeoutMs?: number; overrideTimeoutMs?: number; maxOutputChars?: number }) {
    // Defensive read: some tests mock config without a `servicenowSdk` block.
    const sdk = getConfig()?.servicenowSdk as
      | { commandTimeoutMs?: number; commandTimeoutOverrideMs?: number }
      | undefined;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? sdk?.commandTimeoutMs ?? FALLBACK_PROCESS_TIMEOUT_MS;
    this.overrideTimeoutMs = options?.overrideTimeoutMs ?? sdk?.commandTimeoutOverrideMs;

    this.maxOutputChars = options?.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  }

  /**
   * Resolve the effective timeout for a call. Operator override wins over the
   * per-call value, which wins over the configured default. A budget a timer
   * cannot hold is capped at `MAX_TIMER_DELAY_MS`: budgets are derived from
   * caller values (exec `timeoutMs` up to 2^31 - 1 plus 60 s of headroom,
   * download/transform `timeoutSeconds` × 1000), and Node fires an oversized
   * timer after 1 ms, which killed such a command at once.
   */
  private resolveTimeout(timeoutMs?: number): number {
    return Math.min(this.overrideTimeoutMs ?? timeoutMs ?? this.defaultTimeoutMs, MAX_TIMER_DELAY_MS);
  }

  async run(
    command: string,
    args: string[] = [],
    cwd?: string,
    stdinInput?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
    runOptions?: ProcessRunOptions
  ): Promise<ProcessResult> {
    const effectiveTimeout = this.resolveTimeout(timeoutMs);

    return new Promise((resolve, reject) => {
      const env = { ...process.env }; // ensure full environment inheritance

      // Commands and arguments are always separate argv entries. Never infer a
      // shell requirement from an arbitrary command string: doing so would turn
      // otherwise-literal user input into executable shell syntax.
      const options: SpawnOptionsWithoutStdio = {
        stdio: 'pipe',
        shell: false,
        cwd, env,
      };
      logger.debug(`Spawning child process (shell=false): ${command} ${args.join(' ')}`, { cwd });

      let child;
      try {
        child = spawn(command, args, options);
      } catch (error) {
        // Spawn-time failure (e.g. ENOENT): nothing was buffered, surface as a rejection.
        reject(error);
        return;
      }

      const stdout = new BoundedBuffer(runOptions?.maxStdoutChars ?? this.maxOutputChars);
      const stderr = new BoundedBuffer(this.maxOutputChars);

      // Single-settle guard: the timeout, an external abort, `close`, and `error`
      // can all fire around a kill. Whichever wins settles the promise exactly
      // once; the rest are ignored.
      let settled = false;
      let timedOut = false;
      let cancelled = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        logger.warn(`Command execution timed out after ${effectiveTimeout}ms: ${command} ${args.join(' ')}`);
        if (!child.killed) child.kill('SIGKILL');
      }, effectiveTimeout);

      const onAbort = () => {
        cancelled = true;
        logger.warn(`Command cancelled by client: ${command} ${args.join(' ')}`);
        if (!child.killed) child.kill('SIGKILL');
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
      };

      const settle = (result: ProcessResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      // Propagate client cancellation (P0.3). Handle an already-aborted signal too.
      if (signal) {
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort);
        }
      }

      // Input is written whole and stdin is closed at once, for a CLI that
      // reads stdin to EOF. (No command passes input since the server stopped
      // adding auth profiles; W9 review.) The runner never answers prompts: it used to write the next input line whenever
      // stdout ended in "? <text>", so any child diagnostic of that shape
      // received a credential (W9 review). Without input, stdin stays open.
      if (stdinInput !== undefined && child.stdin) {
        // A child that exits before reading makes the write fail with EPIPE;
        // its exit code reports the failure, so the stream error is only logged.
        child.stdin.on('error', (error: Error) => logger.debug(`stdin write failed: ${error.message}`));
        child.stdin.end(stdinInput);
      }

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout.append(text);
        // Log real-time output for debugging
        logger.debug(`[STDOUT] ${text.trim()}`);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr.append(text);
        // Log real-time errors for debugging
        logger.debug(`[STDERR] ${text.trim()}`);
      });

      child.on('close', (code: number | null) => {
        logger.debug(`Process exited with code ${code}: ${command} ${args.join(' ')}`);

        // On timeout/cancellation the buffered output is partial; return it with
        // a note and a distinct non-zero exit rather than discarding it (P0.2).
        if (timedOut) {
          settle(this.buildResult(stdout, stderr, EXIT_CODE_TIMEOUT,
            `Process timed out after ${effectiveTimeout}ms and was terminated (SIGKILL). Output above is partial.`));
          return;
        }
        if (cancelled) {
          settle(this.buildResult(stdout, stderr, EXIT_CODE_CANCELLED,
            'Process was cancelled by the client and terminated (SIGKILL). Output above is partial.'));
          return;
        }
        settle(this.buildResult(stdout, stderr, code ?? 0));
      });

      child.on('error', (error: Error) => {
        // A kill we initiated may surface here; let the `close` handler produce
        // the partial-output result in that case.
        if (timedOut || cancelled) return;
        logger.error(`Process error: ${error.message}`);
        fail(error);
      });
    });
  }

  /**
   * Assemble a ProcessResult from the bounded buffers, optionally appending a
   * status note to stderr (used for timeout/cancellation).
   */
  private buildResult(
    stdout: BoundedBuffer,
    stderr: BoundedBuffer,
    exitCode: number,
    note?: string
  ): ProcessResult {
    const err = stderr.toString().trim();
    return {
      stdout: stdout.toString().trim(),
      stderr: note ? [err, note].filter(Boolean).join('\n') : err,
      exitCode,
      ...(stdout.truncated ? { stdoutTruncated: true } : {}),
    };
  }
}
