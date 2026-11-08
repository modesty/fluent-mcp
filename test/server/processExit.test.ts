/// <reference path="../../src/index.ts" />
/**
 * The entry point's exit status, observed on a real child process: a requested
 * shutdown exits 0, and a fatal error, a failed or hung cleanup, or a fatal error
 * that overlaps a signal exits 1. (The reference above stages src/index.ts.)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const entry = fileURLToPath(new URL('../../src/index.js', import.meta.url));
const serverModule = pathToFileURL(fileURLToPath(new URL('../../src/server/fluentMCPServer.js', import.meta.url))).href;

/**
 * Preloaded into the child. FLUENT_TEST_STOP replaces FluentMcpServer.stop
 * (the same module instance the entry point imports); SIGUSR2 raises the fault
 * FLUENT_TEST_FATAL names, from outside any handler the entry point owns.
 */
const PRELOAD = `
const { FluentMcpServer } = await import(process.env.FLUENT_TEST_SERVER_MODULE);
const stop = FluentMcpServer.prototype.stop;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const replacements = {
  rejects: async function () { await stop.call(this); throw new Error('injected stop failure'); },
  hangs: () => new Promise(() => {}),
  slow: async function () { await sleep(300); return stop.call(this); },
};
if (replacements[process.env.FLUENT_TEST_STOP]) FluentMcpServer.prototype.stop = replacements[process.env.FLUENT_TEST_STOP];
process.on('SIGUSR2', () => {
  if (process.env.FLUENT_TEST_FATAL === 'rejection') void Promise.reject(new Error('injected rejection'));
  else throw new Error('injected fatal error');
});
`;

type Run = { code: number | null; signal: NodeJS.Signals | null; stderr: string };

/**
 * Start the server, wait until it is ready, send the signals in order (with a
 * short gap), and resolve with how the process ended.
 */
function runServer(signals: NodeJS.Signals[], env: Record<string, string> = {}): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(PRELOAD)}`, entry], {
      // stdin stays open: EOF would close the transport on its own.
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH ?? '',
        FLUENT_MCP_LOG_LEVEL: 'info',
        FLUENT_TEST_SERVER_MODULE: serverModule,
        ...env,
      },
    });
    let stderr = '';
    let signalled = false;
    const guard = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`server did not exit in time; stderr:\n${stderr}`));
    }, 15_000);
    child.stdout.resume();
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      if (signalled || !stderr.includes('Fluent MCP Server is ready')) return;
      signalled = true;
      void (async () => {
        for (const [i, signal] of signals.entries()) {
          if (i > 0) await new Promise((r) => setTimeout(r, 50));
          child.kill(signal);
        }
      })();
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      clearTimeout(guard);
      resolve({ code, signal, stderr });
    });
  });
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

describe('entry point exit status', { skip: process.platform === 'win32' && 'POSIX signals' }, () => {
  it('exits 0 after SIGTERM', async () => {
    const run = await runServer(['SIGTERM']);
    assert.deepEqual([run.code, run.signal], [0, null], run.stderr);
    assert.match(run.stderr, /Server stopped successfully/);
  });

  it('exits 0 after SIGINT', async () => {
    const run = await runServer(['SIGINT']);
    assert.deepEqual([run.code, run.signal], [0, null], run.stderr);
  });

  it('exits 1 after an uncaught exception', async () => {
    const run = await runServer(['SIGUSR2']);
    assert.deepEqual([run.code, run.signal], [1, null], run.stderr);
    assert.match(run.stderr, /Uncaught exception/);
    assert.match(run.stderr, /Server stopped successfully/);
  });

  it('exits 1 after an unhandled rejection', async () => {
    const run = await runServer(['SIGUSR2'], { FLUENT_TEST_FATAL: 'rejection' });
    assert.deepEqual([run.code, run.signal], [1, null], run.stderr);
    assert.match(run.stderr, /Unhandled promise rejection/);
  });

  it('exits 1 when cleanup fails after SIGTERM', async () => {
    const run = await runServer(['SIGTERM'], { FLUENT_TEST_STOP: 'rejects' });
    assert.deepEqual([run.code, run.signal], [1, null], run.stderr);
    assert.match(run.stderr, /Error during shutdown/);
  });

  it('exits 1 when cleanup hangs, once the shutdown bound passes', async () => {
    const run = await runServer(['SIGTERM'], { FLUENT_TEST_STOP: 'hangs' });
    assert.deepEqual([run.code, run.signal], [1, null], run.stderr);
    assert.match(run.stderr, /Shutdown did not finish within/);
  });

  it('keeps exit 1 when a signal arrives during a fatal shutdown', async () => {
    const run = await runServer(['SIGUSR2', 'SIGTERM'], { FLUENT_TEST_STOP: 'slow' });
    assert.deepEqual([run.code, run.signal], [1, null], run.stderr);
    assert.equal(count(run.stderr, 'Shutting down server...'), 1, 'shutdown runs once');
  });

  it('exits 1 when a fatal error arrives during a requested shutdown', async () => {
    const run = await runServer(['SIGTERM', 'SIGUSR2'], { FLUENT_TEST_STOP: 'slow' });
    assert.deepEqual([run.code, run.signal], [1, null], run.stderr);
    assert.equal(count(run.stderr, 'Shutting down server...'), 1, 'shutdown runs once');
  });
});
