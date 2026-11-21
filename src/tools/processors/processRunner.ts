import { ChildProcess, spawn, spawnSync, SpawnOptionsWithoutStdio } from 'node:child_process';
import os from 'node:os';
import { EXIT_CODE_CANCELLED, EXIT_CODE_TIMEOUT, MAX_TIMER_DELAY_MS, ProcessResult, ProcessRunOptions, ProcessRunner } from '../../utils/types.js';
import { BoundedBuffer, DEFAULT_MAX_OUTPUT_CHARS } from '../../utils/boundedOutput.js';
import { getConfig } from '../../config.js';
import logger from '../../utils/logger.js';

/** Live child processes tracked so a server exit never leaves detached groups behind. */
const activeChildren = new Set<ChildProcess>();
let exitHookRegistered = false;

/** POSIX/Node signal name accepted by `child.kill` and `process.kill`. */
type ProcessSignal = Extract<Parameters<ChildProcess['kill']>[0], string>;

/**
 * Terminate a child process and its descendants.
 * POSIX: children are spawned as process-group leaders (`detached: true`), so
 * signaling `-pid` stops grandchildren too (e.g. build workers spawned by the SDK).
 * Windows: `detached` creates a console window, so children stay attached and
 * `taskkill /T /F` ends the tree.
 */
function killProcessTree(child: ChildProcess, signal: ProcessSignal = 'SIGKILL'): void {
  const leaderExited = child.exitCode !== null || child.signalCode !== null;
  const pid = child.pid;
  if (pid === undefined) {
    if (!leaderExited) child.kill(signal);
    return;
  }
  if (process.platform === 'win32') {
    // On Windows a PID may be reused once the leader exits; only kill live trees.
    if (leaderExited) return;
    const res = spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    if (res.error) child.kill(signal);
    return;
  }
  try {
    // On POSIX the process group stays reserved while any descendant is alive,
    // even if the leader already exited while a grandchild still holds stdio open.
    process.kill(-pid, signal);
  } catch (error) {
    if ((error as { code?: unknown }).code !== 'ESRCH' && !leaderExited) {
      child.kill(signal);
    }
  }
}

/** Register one process-exit sweep so detached POSIX children never outlive this server. */
function trackActiveChild(child: ChildProcess): void {
  if (!exitHookRegistered) {
    exitHookRegistered = true;
    process.once('exit', () => {
      for (const live of activeChildren) {
        killProcessTree(live, 'SIGKILL');
      }
      activeChildren.clear();
    });
  }
  activeChildren.add(child);
}

/** Conventional non-zero exit code for a signal-terminated child (`128 + signum`, else `1`). */
function exitCodeForSignal(signal: ProcessSignal | null): number {
  if (!signal) return 1;
  const signalNumber = (os.constants.signals as Record<string, number | undefined>)[signal];
  return typeof signalNumber === 'number' ? 128 + signalNumber : 1;
}

/**
 * Spawns child processes to execute CLI commands.
 *
 * Responsibilities:
 * - shell-free execution (injection defense — see H1),
 * - no input: stdin stays open and the runner never writes to it (it never
 *   answers prompts),
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
    const sdk = getConfig().servicenowSdk;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? sdk.commandTimeoutMs;
    this.overrideTimeoutMs = options?.overrideTimeoutMs ?? sdk.commandTimeoutOverrideMs;

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
        // POSIX: make the child a process-group leader so timeout/abort kills
        // grandchildren too. Windows: detached opens a console window, so stay
        // attached and use taskkill /T /F instead.
        detached: process.platform !== 'win32',
        cwd, env,
      };
      logger.debug(`Spawning child process (shell=false): ${command} ${args.join(' ')}`, { cwd });

      let child: ChildProcess;
      try {
        child = spawn(command, args, options);
      } catch (error) {
        // Spawn-time failure (e.g. ENOENT): nothing was buffered, surface as a rejection.
        reject(error);
        return;
      }
      trackActiveChild(child);

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
        killProcessTree(child, 'SIGKILL');
      }, effectiveTimeout);

      const onAbort = () => {
        cancelled = true;
        logger.warn(`Command cancelled by client: ${command} ${args.join(' ')}`);
        killProcessTree(child, 'SIGKILL');
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        activeChildren.delete(child);
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

      child.on('close', (code: number | null, termSignal: ProcessSignal | null) => {
        logger.debug(`Process exited with code ${code}${termSignal ? ` (signal ${termSignal})` : ''}: ${command} ${args.join(' ')}`);

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
        // An externally killed child (e.g. OOM SIGKILL, SIGTERM, SIGSEGV) exits
        // with code=null and a signal name — never report that as exit 0 / success.
        if (code === null) {
          const exitCode = exitCodeForSignal(termSignal);
          const detail = termSignal ? `signal ${termSignal}` : 'an unknown signal';
          settle(this.buildResult(stdout, stderr, exitCode,
            `Process was terminated by ${detail}. Output above may be partial.`));
          return;
        }
        settle(this.buildResult(stdout, stderr, code));
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
