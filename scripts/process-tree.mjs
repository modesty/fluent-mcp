/**
 * Process-tree control for the children the test wrapper starts: the TypeScript compiler,
 * the staging compile, and the Node test runner.
 *
 * POSIX: a detached child leads a process group of its own, and the processes it starts
 * stay in that group. A terminal's signal reaches only the wrapper, which decides what each
 * child gets. The group keeps its id while any member runs, so it can outlive its leader:
 * spawnOwned ends whatever a child leaves behind when the child exits.
 *
 * Windows: process.kill cannot address a group, and a detached child gets its own console
 * window, so children are not detached. Windows does not end a process's children when the
 * process exits, so the wrapper keeps the ownership itself: while a child runs, its
 * descendants are recorded by PID and creation time (sampleOwnedTrees), and when the child
 * exits, the recorded processes that are still the same ones are ended. A creation time
 * tells a process from a later one that reused its PID, and a parent PID is trusted only while
 * it still has the creation time recorded for it. A process that starts and ends between two
 * samples is not recorded, and neither is a descendant whose parent ended before any sample
 * saw it, except a direct child of the exited child, which is found while its PID is free.
 */
import { execFile, spawn, spawnSync } from 'node:child_process';

/** Windows: how often the descendants of live owned children are recorded. */
const SAMPLE_INTERVAL_MS = 5000;

/**
 * Windows process table: one "pid ppid creation" line per process, where creation is the
 * process's FILETIME (100 ns ticks since 1601, UTC). Processes without a creation time are
 * left out.
 */
const PROCESS_TABLE_SCRIPT =
  'Get-CimInstance Win32_Process | Where-Object { $_.CreationDate } | ForEach-Object ' +
  '{ "$($_.ProcessId) $($_.ParentProcessId) $($_.CreationDate.ToFileTimeUtc())" }';
const PROCESS_TABLE_ARGS = [
  '-NoProfile',
  '-NonInteractive',
  // Encoded, so the script needs no quoting on the command line.
  '-EncodedCommand',
  Buffer.from(PROCESS_TABLE_SCRIPT, 'utf16le').toString('base64'),
];

/** Windows: each owned child mapped to the descendants recorded for it (pid -> creation time). */
const windowsTrees = new Map();
let sampleTimer = null;
let sampling = null;

/**
 * Spawn options that give an owned child a process group of its own on POSIX.
 * @param {NodeJS.Platform} [platform]
 * @returns {{ detached: boolean }}
 */
export function ownedSpawnOptions(platform = process.platform) {
  return { detached: platform !== 'win32' };
}

/**
 * Starts a child this process owns. When the child exits, what it left running ends with it:
 * its POSIX process group is signaled once more, and on Windows the descendants recorded for
 * it are ended.
 * @param {string} command
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} options
 * @param {NodeJS.Platform} [platform]
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnOwned(command, args, options, platform = process.platform) {
  const child = spawn(command, args, { ...options, ...ownedSpawnOptions(platform) });
  if (platform === 'win32') {
    windowsTrees.set(child, new Map());
    startSampling();
    sampleOwnedTrees();
    child.once('exit', () => endWindowsTree(child));
  } else {
    child.once('exit', () => signalGroup(child.pid, 'SIGTERM'));
  }
  return child;
}

/**
 * Signals a live child's whole process tree. Nothing is sent to an exited child: spawnOwned
 * has already ended what it left running, and on Windows its PID may now belong to another
 * process.
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} signal sent to the group on POSIX; Windows always ends the tree forcibly
 * @param {NodeJS.Platform} [platform]
 */
export function signalTree(child, signal, platform = process.platform) {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  if (platform === 'win32') {
    // /F is needed: a console application ignores the close request that a plain taskkill sends.
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  signalGroup(child.pid, signal);
}

/**
 * Records the descendants of every live Windows child. A call made while a sample is still
 * reading returns that sample, so samples never overlap. An unreadable process table records
 * nothing this time. Exported so a test can sample at a chosen moment.
 * @returns {Promise<void>}
 */
export function sampleOwnedTrees() {
  sampling ??= readProcessTable()
    .then(
      (rows) => recordDescendants(rows),
      () => {} // no process table this time: nothing is recorded
    )
    .finally(() => {
      sampling = null;
    });
  return sampling;
}

/**
 * Parses the output of the process table script.
 * @param {string} text
 * @returns {{ pid: number, ppid: number, created: bigint }[]}
 */
export function parseProcessTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const [pid, ppid, created] = line.trim().split(/\s+/);
    if (/^\d+$/.test(pid ?? '') && /^\d+$/.test(ppid ?? '') && /^\d+$/.test(created ?? '')) {
      rows.push({ pid: Number(pid), ppid: Number(ppid), created: BigInt(created) });
    }
  }
  return rows;
}

/**
 * Adds to `tree` every process in `rows` that a process in `tree` started: a child is created
 * at or after its parent. A parent counts only while its PID still has the creation time
 * recorded for it, so a PID that an unrelated process reused adopts nothing. `exitedPid` is the
 * owned child whose exit this read handles: its direct children may have started after the last
 * sample, and it is trusted as their parent only while no process holds its PID.
 * @param {Map<number, bigint>} tree pid -> creation time; updated in place
 * @param {{ pid: number, ppid: number, created: bigint }[]} rows
 * @param {number | null} [exitedPid]
 * @returns {Map<number, bigint>} the same tree
 */
export function extendTree(tree, rows, exitedPid = null) {
  const liveByPid = new Map(rows.map((row) => [row.pid, row]));
  for (let grew = true; grew; ) {
    grew = false;
    for (const row of rows) {
      const parentCreated = trustedParentCreated(tree, liveByPid, row.ppid, exitedPid);
      if (parentCreated === undefined || row.created < parentCreated) continue;
      if (tree.get(row.pid) === row.created) continue;
      tree.set(row.pid, row.created);
      grew = true;
    }
  }
  return tree;
}

/**
 * The recorded creation time of `pid` if a child of it may be adopted, otherwise undefined. A
 * live process with that PID must have the recorded creation time. A PID with no live process
 * has no live identity to check, so only the exited owned child qualifies.
 * @param {Map<number, bigint>} tree
 * @param {Map<number, { pid: number, created: bigint }>} liveByPid
 * @param {number} pid
 * @param {number | null} exitedPid
 * @returns {bigint | undefined}
 */
function trustedParentCreated(tree, liveByPid, pid, exitedPid) {
  const recorded = tree.get(pid);
  if (recorded === undefined) return undefined;
  const live = liveByPid.get(pid);
  if (live) return live.created === recorded ? recorded : undefined;
  return pid === exitedPid ? recorded : undefined;
}

/**
 * PIDs in `rows` that `tree` records under the same creation time. A PID that a later process
 * reused has another creation time, so that process is not matched.
 * @param {Map<number, bigint>} tree
 * @param {{ pid: number, created: bigint }[]} rows
 * @returns {number[]}
 */
export function recordedPids(tree, rows) {
  return rows.filter((row) => tree.get(row.pid) === row.created).map((row) => row.pid);
}

/** Records a live child's own entry, once. Only the live process with that PID is the child. */
function anchorRoot(child, tree, rows) {
  if (tree.has(child.pid) || child.exitCode !== null || child.signalCode !== null) return;
  const root = rows.find((row) => row.pid === child.pid);
  if (root) tree.set(root.pid, root.created);
}

function recordDescendants(rows) {
  for (const [child, tree] of windowsTrees) {
    anchorRoot(child, tree, rows);
    extendTree(tree, rows);
  }
}

/**
 * A Windows child has exited: reads the process table again, so its direct children that started
 * since the last sample are recorded too, then ends the recorded processes that are still running.
 * @param {import('node:child_process').ChildProcess} child
 */
function endWindowsTree(child) {
  const tree = windowsTrees.get(child);
  windowsTrees.delete(child);
  if (windowsTrees.size === 0) stopSampling();
  const rows = readProcessTableSync();
  if (rows === null) {
    process.stderr.write('Could not read the Windows process table: descendants of an exited child were not ended.\n');
    return;
  }
  for (const pid of recordedPids(extendTree(tree, rows, child.pid), rows)) endPid(pid);
}

function startSampling() {
  if (sampleTimer !== null) return;
  sampleTimer = setInterval(sampleOwnedTrees, SAMPLE_INTERVAL_MS);
  sampleTimer.unref();
}

function stopSampling() {
  clearInterval(sampleTimer);
  sampleTimer = null;
}

/** @returns {Promise<{ pid: number, ppid: number, created: bigint }[]>} */
function readProcessTable() {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', PROCESS_TABLE_ARGS, { windowsHide: true }, (error, stdout) => {
      if (error) reject(error);
      else resolve(parseProcessTable(stdout));
    });
  });
}

/** @returns {{ pid: number, ppid: number, created: bigint }[] | null} null when the table cannot be read */
function readProcessTableSync() {
  const result = spawnSync('powershell.exe', PROCESS_TABLE_ARGS, { encoding: 'utf8', windowsHide: true });
  return result.error || result.status !== 0 ? null : parseProcessTable(result.stdout);
}

/** Ends one Windows process. Used only for a recorded process that still has its creation time. */
function endPid(pid) {
  spawnSync('taskkill', ['/F', '/PID', String(pid)], { stdio: 'ignore' });
}

/**
 * Sends a signal to a process group. An empty group is not an error.
 * @param {number} pgid
 * @param {NodeJS.Signals} signal
 */
function signalGroup(pgid, signal) {
  try {
    process.kill(-pgid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error; // no member left
  }
}
