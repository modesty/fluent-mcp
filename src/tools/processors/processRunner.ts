import { ChildProcess, spawn, spawnSync, SpawnOptionsWithoutStdio } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { EXIT_CODE_CANCELLED, EXIT_CODE_TIMEOUT, MAX_TIMER_DELAY_MS, ProcessResult, ProcessRunOptions, ProcessRunner } from '../../utils/types.js';
import { BoundedBuffer, DEFAULT_MAX_OUTPUT_CHARS } from '../../utils/boundedOutput.js';
import { resolveCredentialsDir } from '../../utils/credentialStore.js';
import { getConfig } from '../../config.js';
import logger from '../../utils/logger.js';

/** Live child processes tracked so a server exit or signal never leaves detached groups behind. */
const activeChildren = new Set<ChildProcess>();
let exitHookRegistered = false;

/** POSIX/Node signal name accepted by `child.kill` and `process.kill`. */
type ProcessSignal = Extract<Parameters<ChildProcess['kill']>[0], string>;

/** Upper bound on synchronous Windows `taskkill.exe` so a hung kill never stalls the event loop. */
const WINDOWS_TASKKILL_TIMEOUT_MS = 5_000;

/** Grace window for child stdio to close after tree termination fell back to killing only the leader. */
const FAILED_TREE_KILL_CLOSE_GRACE_MS = 500;

/** Defense-in-depth grace window for child stdio to close after any timeout/abort tree kill. */
const TREE_KILL_CLOSE_GRACE_MS = 5_000;

/** Terminal interruption signals that end a process without running `process.on('exit')`. */
const TERMINATION_SIGNALS: readonly ProcessSignal[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const signalHandlers = new Map<ProcessSignal, () => void>();

/**
 * Resolve Windows `taskkill.exe` from the trusted System32 directory rather than
 * searching cwd/PATH (where a workspace-controlled binary could hijack timeout or
 * cancellation kills with the server's environment).
 */
export function resolveWindowsTaskkillPath(env: Record<string, string | undefined> = process.env): string {
  const rawRoot = (env.SystemRoot || env.windir || '').trim();
  const systemRoot = rawRoot && path.win32.isAbsolute(rawRoot) ? rawRoot : 'C:\\Windows';
  return path.win32.join(systemRoot, 'System32', 'taskkill.exe');
}

/** Minimal result shape returned by `spawnSync` for `taskkill.exe`. */
export interface TaskkillOutcome {
  error?: Error;
  status: number | null;
}

/**
 * Terminate a Windows process tree via the trusted `taskkill.exe`, bounded by
 * `WINDOWS_TASKKILL_TIMEOUT_MS`. Falls back to `fallbackKill()` if `taskkill`
 * fails to launch, times out, or exits non-zero.
 */
export function killWindowsProcessTree(
  pid: number,
  fallbackKill: () => boolean,
  runTaskkill: (
    command: string,
    args: string[],
    options: { stdio: 'ignore'; windowsHide: true; timeout: number }
  ) => TaskkillOutcome = (cmd, args, opts) => spawnSync(cmd, args, opts),
  env: Record<string, string | undefined> = process.env
): TreeTerminationOutcome {
  const res = runTaskkill(
    resolveWindowsTaskkillPath(env),
    ['/pid', String(pid), '/T', '/F'],
    { stdio: 'ignore', windowsHide: true, timeout: WINDOWS_TASKKILL_TIMEOUT_MS }
  );
  return !res.error && res.status === 0 ? 'terminated' : signalLeader(fallbackKill);
}

/** Report only what the OS accepted. A false return from child.kill means no signal was sent. */
function signalLeader(kill: () => boolean): TreeTerminationOutcome {
  try {
    return kill() ? 'leader_only' : 'failed';
  } catch {
    return 'failed';
  }
}

export type TreeTerminationOutcome =
  | 'terminated' | 'leader_only' | 'skipped_leader_exited' | 'group_gone' | 'not_started' | 'failed';

const terminationNotes: Record<TreeTerminationOutcome, string> = {
  terminated: '. Sent a termination request to the process tree.',
  leader_only: '. Only the leader was signaled; a descendant may still be running.',
  skipped_leader_exited: ' while waiting for child stdio to close. Process-tree termination was skipped because the leader process had already exited; a descendant may still be running.',
  group_gone: '. The process group had already exited.',
  not_started: '. No child process was started.',
  failed: '. Process-tree termination failed; the leader or a descendant may still be running.',
};

/** Optional platform/DI overrides for {@link killProcessTree} (used in cross-platform tests). */
export interface KillProcessTreeOptions {
  platform?: typeof process.platform;
  runTaskkill?: (
    command: string,
    args: string[],
    options: { stdio: 'ignore'; windowsHide: true; timeout: number }
  ) => TaskkillOutcome;
  env?: Record<string, string | undefined>;
}

/**
 * Terminate a child process and its descendants.
 * POSIX: children are spawned as process-group leaders (`detached: true`), so
 * signaling `-pid` stops grandchildren too (e.g. build workers spawned by the SDK).
 * Windows: `detached` creates a console window, so children stay attached and
 * `taskkill.exe /T /F` from System32 ends the tree. If the Windows leader has
 * already exited, `taskkill.exe` is skipped (the PID may be reused) and
 * `'skipped_leader_exited'` is returned so the caller never claims SIGKILL and
 * warns that a descendant may still be alive.
 */
export function killProcessTree(
  child: ChildProcess,
  signal: ProcessSignal = 'SIGKILL',
  options?: KillProcessTreeOptions
): TreeTerminationOutcome {
  const platform = options?.platform ?? process.platform;
  const leaderExited = child.exitCode !== null || child.signalCode !== null;
  const pid = child.pid;
  // A failed spawn can return a ChildProcess before Node emits its error.
  // Never signal this handle: it has no child PID.
  if (pid === undefined) return 'not_started';
  if (platform === 'win32') {
    // On Windows a PID may be reused once the leader exits; never signal a dead
    // leader PID, and report the skipped kill so callers warn about descendants.
    if (leaderExited) return 'skipped_leader_exited';
    return killWindowsProcessTree(pid, () => child.kill(signal), options?.runTaskkill, options?.env);
  }
  try {
    // On POSIX the process group stays reserved while any descendant is alive,
    // even if the leader already exited while a grandchild still holds stdio open.
    process.kill(-pid, signal);
    return 'terminated';
  } catch (error) {
    if ((error as { code?: unknown }).code === 'ESRCH') {
      return 'group_gone';
    }
    return leaderExited ? 'failed' : signalLeader(() => child.kill(signal));
  }
}

function detachSignalHandlers(): void {
  for (const [signal, handler] of signalHandlers) {
    process.off(signal, handler);
  }
  signalHandlers.clear();
}

function sweepActiveChildren(): void {
  for (const live of activeChildren) {
    killProcessTree(live, 'SIGKILL');
  }
  activeChildren.clear();
  detachSignalHandlers();
}

/**
 * While any detached POSIX child is live, sweep owned groups on SIGINT/SIGTERM/SIGHUP.
 * A process terminated by default signal disposition (such as a `node --test` worker
 * interrupted via its own process group) skips `process.on('exit')`, which would
 * otherwise orphan detached children. Re-raises the signal only when no other listener
 * (such as `src/index.ts` graceful shutdown) owns termination.
 */
function attachSignalHandlers(): void {
  if (process.platform === 'win32' || signalHandlers.size > 0) return;
  for (const signal of TERMINATION_SIGNALS) {
    const handler = () => {
      const ownsSignal = process.listenerCount(signal) === 1;
      sweepActiveChildren();
      if (ownsSignal) {
        process.kill(process.pid, signal);
      }
    };
    signalHandlers.set(signal, handler);
    // Count existing owners before a once listener removes itself to start cleanup.
    process.prependListener(signal, handler);
  }
}

/** Register process-exit and POSIX signal sweeps so detached children never outlive this owner. */
function trackActiveChild(child: ChildProcess): void {
  if (!exitHookRegistered) {
    exitHookRegistered = true;
    process.once('exit', sweepActiveChildren);
  }
  activeChildren.add(child);
  attachSignalHandlers();
}

function untrackActiveChild(child: ChildProcess): void {
  activeChildren.delete(child);
  if (activeChildren.size === 0) {
    detachSignalHandlers();
  }
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
/** Test/DI options for {@link NodeProcessRunner}. */
export interface NodeProcessRunnerOptions {
  defaultTimeoutMs?: number;
  overrideTimeoutMs?: number;
  maxOutputChars?: number;
  /** Grace window (ms) to wait for child stdio to close after failed or skipped tree termination. */
  failedTreeKillCloseGraceMs?: number;
  /** Process-tree termination hook. */
  terminateTree?: (child: ChildProcess, signal: ProcessSignal) => TreeTerminationOutcome;
}

export class NodeProcessRunner implements ProcessRunner {
  private readonly defaultTimeoutMs: number;
  private readonly overrideTimeoutMs?: number;
  private readonly maxOutputChars: number;
  private readonly failedTreeKillCloseGraceMs: number;
  private readonly terminateTree: (child: ChildProcess, signal: ProcessSignal) => TreeTerminationOutcome;

  /**
   * @param options Test/DI overrides. `overrideTimeoutMs` (an operator global
   *   override sourced from `FLUENT_MCP_COMMAND_TIMEOUT_MS`) wins over any
   *   per-call timeout; `defaultTimeoutMs` is the fallback when a call omits one.
   *   Both default from `config.servicenowSdk`. `maxOutputChars` caps retained
   *   output per stream; a call may raise its stdout cap (`maxStdoutChars`).
   */
  constructor(options?: NodeProcessRunnerOptions) {
    const sdk = getConfig().servicenowSdk;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? sdk.commandTimeoutMs;
    this.overrideTimeoutMs = options?.overrideTimeoutMs ?? sdk.commandTimeoutOverrideMs;

    this.maxOutputChars = options?.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
    this.failedTreeKillCloseGraceMs = options?.failedTreeKillCloseGraceMs ?? FAILED_TREE_KILL_CLOSE_GRACE_MS;
    this.terminateTree = options?.terminateTree ?? killProcessTree;
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
    if (signal?.aborted) {
      return { stdout: '', stderr: 'Process was cancelled by the client before starting.', exitCode: EXIT_CODE_CANCELLED };
    }
    const effectiveTimeout = this.resolveTimeout(timeoutMs);

    return new Promise((resolve, reject) => {
      const env = { ...process.env }; // ensure full environment inheritance
      // Resolve any relative SN_SDK_CREDENTIALS_DIR once against the server's
      // launch directory so every child (regardless of project cwd) reads the
      // exact same credential store that auth validation checked.
      const resolvedCredDir = resolveCredentialsDir(env);
      if (resolvedCredDir !== undefined) {
        env.SN_SDK_CREDENTIALS_DIR = resolvedCredDir;
      }

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

      // Single-settle guard: the timeout, an external abort, the post-kill close
      // grace timer, `close`, and `error` can all fire around a kill. Whichever
      // wins settles the promise exactly once; the rest are ignored.
      // `stop` latches the FIRST stop trigger so a later deadline can never
      // overwrite an earlier cancellation (or vice versa).
      let settled = false;
      let stop: { reason: 'timeout' | 'cancel'; outcome: TreeTerminationOutcome } | undefined;
      let closeGraceId: ReturnType<typeof setTimeout> | undefined;

      const settleStopped = (graceMs?: number) => {
        if (!stop) return;
        const { reason, outcome } = stop;
        const prefix = reason === 'timeout'
          ? `Process timed out after ${effectiveTimeout}ms` : 'Process was cancelled by the client';
        const wait = graceMs === undefined ? '' : ` Child stdio did not close within ${graceMs}ms; a descendant may still hold an output pipe.`;
        settle(this.buildResult(
          stdout, stderr, reason === 'timeout' ? EXIT_CODE_TIMEOUT : EXIT_CODE_CANCELLED,
          `${prefix}${terminationNotes[outcome]}${wait} Output above is partial.`
        ));
      };

      const stopChildFor = (reason: 'timeout' | 'cancel') => {
        // child.kill can emit an error synchronously. Latch the stop first so the
        // error handler leaves the result to close or the grace timer.
        stop = { reason, outcome: 'failed' };
        const outcome = this.terminateTree(child, 'SIGKILL');
        stop.outcome = outcome;
        // Bound the wait even when a surviving descendant holds the pipes open.
        const graceMs = outcome === 'terminated'
          ? Math.max(this.failedTreeKillCloseGraceMs, TREE_KILL_CLOSE_GRACE_MS)
          : this.failedTreeKillCloseGraceMs;
        closeGraceId = setTimeout(() => {
          if (settled) return;
          child.stdout?.destroy();
          child.stderr?.destroy();
          child.stdin?.destroy();
          child.unref();
          settleStopped(graceMs);
        }, graceMs);
      };

      const onAbort = () => {
        if (settled || stop) return;
        clearTimeout(timeoutId);
        logger.warn(`Command cancelled by client: ${command} ${args.join(' ')}`);
        stopChildFor('cancel');
      };

      const timeoutId = setTimeout(() => {
        if (settled || stop) return;
        signal?.removeEventListener('abort', onAbort);
        logger.warn(`Command execution timed out after ${effectiveTimeout}ms: ${command} ${args.join(' ')}`);
        stopChildFor('timeout');
      }, effectiveTimeout);

      const cleanup = (sweepGroup: boolean) => {
        clearTimeout(timeoutId);
        if (closeGraceId !== undefined) {
          clearTimeout(closeGraceId);
          closeGraceId = undefined;
        }
        signal?.removeEventListener('abort', onAbort);
        if (sweepGroup && process.platform !== 'win32') {
          // Safety-net sweep before dropping ownership from activeChildren.
          this.terminateTree(child, 'SIGKILL');
        }
        untrackActiveChild(child);
      };

      const settle = (result: ProcessResult) => {
        if (settled) return;
        settled = true;
        cleanup(true);
        resolve(result);
      };

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup(false);
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

      child.once('exit', () => {
        // On POSIX, a descendant that inherited stdout/stderr keeps `close`
        // pending even after the leader exits cleanly, which would otherwise
        // turn a successful CLI run into a timeout. Sweep the detached process
        // group as soon as the leader exits; bytes the leader already wrote
        // stay buffered in the OS pipe and drain into `close`.
        if (!settled && process.platform !== 'win32') {
          this.terminateTree(child, 'SIGKILL');
        }
      });


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
        // Preserve the cleanup diagnostic even when `close` arrives within the
        // grace window (e.g. a descendant with independent stdio survived).
        if (stop) {
          settleStopped();
          return;
        }
        // An externally killed child (e.g. OOM SIGKILL, SIGTERM, SIGSEGV) exits
        // with code=null and a signal name — never report that as exit 0 / success.
        if (code === null) {
          const exitCode = exitCodeForSignal(termSignal);
          const detail = termSignal ? `signal ${termSignal}` : 'an unknown signal';
          settle(this.buildResult(
            stdout,
            stderr,
            exitCode,
            `Process was terminated by ${detail}. Output above may be partial.`,
            termSignal ?? 'unknown'
          ));
          return;
        }
        settle(this.buildResult(stdout, stderr, code));
      });

      child.on('error', (error: Error) => {
        // A kill we initiated may surface here; let the `close` handler produce
        // the partial-output result in that case.
        if (stop) return;
        logger.error(`Process error: ${error.message}`);
        fail(error);
      });
    });
  }

  /**
   * Assemble a ProcessResult from the bounded buffers, optionally appending a
   * status note to stderr (used for timeout/cancellation/external signals).
   */
  private buildResult(
    stdout: BoundedBuffer,
    stderr: BoundedBuffer,
    exitCode: number,
    note?: string,
    terminatedBySignal?: string
  ): ProcessResult {
    const err = stderr.toString().trim();
    return {
      stdout: stdout.toString().trim(),
      stderr: note ? [err, note].filter(Boolean).join('\n') : err,
      exitCode,
      ...(stdout.truncated ? { stdoutTruncated: true } : {}),
      ...(terminatedBySignal ? { terminatedBySignal } : {}),
    };
  }
}
