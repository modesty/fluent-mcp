import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { ProcessResult, ProcessRunner } from '../../utils/types.js';
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
 * Default cap on retained stdout/stderr per stream (characters). Protects server
 * memory against a runaway child and the model's token budget against oversized
 * output. Kept as head + tail with an elision marker (see BoundedBuffer).
 */
const DEFAULT_MAX_OUTPUT_CHARS = 60_000;

/** Fraction of the output budget retained from the head (the rest is the tail). */
const HEAD_BUDGET_RATIO = 0.6;

/** Delay before checking for prompts after stdout data (allows buffering) */
const STDIN_PROMPT_CHECK_DELAY_MS = 50;

/** Delay before closing stdin after all input lines written */
const STDIN_CLOSE_DELAY_MS = 200;

/** Exit code reported when a command is terminated for exceeding its timeout. */
const EXIT_CODE_TIMEOUT = 124;

/** Exit code reported when a command is cancelled by the MCP client. */
const EXIT_CODE_CANCELLED = 130;

/**
 * Accumulates streamed text while retaining at most `headMax + tailMax`
 * characters — the head (start of output) plus a sliding tail (most recent
 * output). Memory stays bounded regardless of how much a child process emits;
 * when output exceeds the budget the middle is dropped and reported via an
 * elision marker. `.toString()` reconstructs head + marker + tail.
 */
class BoundedBuffer {
  private head = '';
  private tail = '';
  private total = 0;

  constructor(private readonly headMax: number, private readonly tailMax: number) {}

  append(text: string): void {
    if (!text) return;
    this.total += text.length;

    // Fill the head first; overflow (and everything after) feeds the sliding tail.
    if (this.head.length < this.headMax) {
      const room = this.headMax - this.head.length;
      this.head += text.slice(0, room);
      const overflow = text.slice(room);
      if (overflow) this.pushTail(overflow);
    } else {
      this.pushTail(text);
    }
  }

  private pushTail(text: string): void {
    // Keep only the last `tailMax` chars. The transient `tail + text` is bounded
    // by tailMax plus one stream chunk (Node caps 'data' events well below this).
    this.tail = this.tailMax > 0 ? (this.tail + text).slice(-this.tailMax) : '';
  }

  private get truncated(): boolean {
    return this.total > this.head.length + this.tail.length;
  }

  toString(): string {
    if (!this.truncated) return this.head + this.tail;
    const elided = this.total - this.head.length - this.tail.length;
    return `${this.head}\n\n... [${elided} characters truncated] ...\n\n${this.tail}`;
  }
}

/**
 * Spawns child processes to execute CLI commands.
 *
 * Responsibilities:
 * - shell-free execution (injection defense — see H1),
 * - interactive stdin prompt detection with secure credential handling,
 * - a timeout that terminates the child and resolves with the buffered *partial*
 *   output (rather than discarding it) plus a non-zero exit code (P0.2),
 * - propagation of an external abort signal so an MCP client can cancel a
 *   long-running command (P0.3),
 * - bounded stdout/stderr retention to protect memory and token budget (P0.4).
 */
export class NodeProcessRunner implements ProcessRunner {
  private readonly defaultTimeoutMs: number;
  private readonly overrideTimeoutMs?: number;
  private readonly headMax: number;
  private readonly tailMax: number;

  /**
   * @param options Test/DI overrides. `overrideTimeoutMs` (an operator global
   *   override sourced from `FLUENT_MCP_COMMAND_TIMEOUT_MS`) wins over any
   *   per-call timeout; `defaultTimeoutMs` is the fallback when a call omits one.
   *   Both default from `config.servicenowSdk`. `maxOutputChars` caps retained
   *   output per stream.
   */
  constructor(options?: { defaultTimeoutMs?: number; overrideTimeoutMs?: number; maxOutputChars?: number }) {
    // Defensive read: some tests mock config without a `servicenowSdk` block.
    const sdk = getConfig()?.servicenowSdk as
      | { commandTimeoutMs?: number; commandTimeoutOverrideMs?: number }
      | undefined;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? sdk?.commandTimeoutMs ?? FALLBACK_PROCESS_TIMEOUT_MS;
    this.overrideTimeoutMs = options?.overrideTimeoutMs ?? sdk?.commandTimeoutOverrideMs;

    const maxOutputChars = options?.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
    this.headMax = Math.max(1, Math.floor(maxOutputChars * HEAD_BUDGET_RATIO));
    this.tailMax = Math.max(0, maxOutputChars - this.headMax);
  }

  /**
   * Resolve the effective timeout for a call. Operator override wins over the
   * per-call value, which wins over the configured default.
   */
  private resolveTimeout(timeoutMs?: number): number {
    return this.overrideTimeoutMs ?? timeoutMs ?? this.defaultTimeoutMs;
  }

  async run(
    command: string,
    args: string[] = [],
    cwd?: string,
    stdinInput?: string,
    timeoutMs?: number,
    signal?: AbortSignal
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

      const stdout = new BoundedBuffer(this.headMax, this.tailMax);
      const stderr = new BoundedBuffer(this.headMax, this.tailMax);

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

      // Log if stdin input is provided (actual writing happens in response to prompts)
      if (stdinInput && child.stdin) {
        logger.debug('Stdin input provided, will write in response to detected prompts');
      }

      // For interactive input, track state and detect prompts
      const stdinState = {
        lines: stdinInput?.split('\n').filter(line => line.length > 0) || [],
        lineIndex: 0,
        pendingStdout: '',
        inputComplete: false
      };

      // Function to check for prompts and write next input line
      const writeNextLineIfPrompted = () => {
        if (stdinState.inputComplete || stdinState.lineIndex >= stdinState.lines.length) {
          return;
        }
        if (!child.stdin || child.stdin.destroyed) {
          return;
        }

        // Detect inquirer-style prompts (start with "?") or other input requests
        // Match: "? Question text" - inquirer prompts start with question mark
        const hasPrompt = /\?\s+[^\n]+$/.test(stdinState.pendingStdout);

        if (hasPrompt) {
          const line = stdinState.lines[stdinState.lineIndex];
          logger.debug(`Prompt detected, writing stdin line ${stdinState.lineIndex + 1}/${stdinState.lines.length}`);
          child.stdin.write(line + '\n');
          // Security: Clear the credential line from memory after writing
          stdinState.lines[stdinState.lineIndex] = '';
          stdinState.lineIndex++;
          stdinState.pendingStdout = ''; // Reset to wait for next prompt

          // If all lines written, close stdin after a small delay
          if (stdinState.lineIndex >= stdinState.lines.length) {
            stdinState.inputComplete = true;
            // Security: Clear all stdin lines from memory
            stdinState.lines.length = 0;
            setTimeout(() => {
              if (child.stdin && !child.stdin.destroyed) {
                logger.debug('Closing stdin after writing all lines');
                child.stdin.end();
              }
            }, STDIN_CLOSE_DELAY_MS);
          }
        }
      };

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout.append(text);
        // Log real-time output for debugging
        logger.debug(`[STDOUT] ${text.trim()}`);

        // Accumulate stdout for prompt detection if we have stdin to write
        if (stdinInput && !stdinState.inputComplete) {
          stdinState.pendingStdout += text;
          // Check for prompts after a tiny delay to allow buffering
          setTimeout(writeNextLineIfPrompted, STDIN_PROMPT_CHECK_DELAY_MS);
        }
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
    };
  }
}
