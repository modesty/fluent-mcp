/** Real stdio streams exercise EOF handling that InMemoryTransport cannot cover. */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { configFixture, loggerFixture } from '../support/fixtures.js';

type Frame = Record<string, any>;
type Invocation = { command: string; baseArgs: string[] };
const resolveSdkCli = mock.fn((): Invocation => { throw new Error('Unexpected SDK CLI execution'); });
mock.module('../../src/utils/sdkCli.js', {
  namedExports: { resolveSdkCli, resetSdkCliCache: mock.fn() },
});
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const projectRoot = process.cwd();
const config = configFixture({
  resourcePaths: {
    spec: path.join(projectRoot, 'res/spec'),
    snippet: path.join(projectRoot, 'res/snippet'),
    instruct: path.join(projectRoot, 'res/instruct'),
  },
});
config.getProjectRootPath.mock.mockImplementation(() => projectRoot);
mock.module('../../src/config.js', config.mockOptions);
const { FluentMcpServer } = await import('../../src/server/fluentMCPServer.js');

async function waitFor<T>(read: () => T | Promise<T>, description: string): Promise<NonNullable<T>> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value as NonNullable<T>;
    await delay(10);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function readPid(pidPath: string): Promise<number | undefined> {
  try {
    const pid = Number.parseInt(await readFile(pidPath, 'utf8'), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}

async function connect(modern: boolean) {
  const input = new PassThrough();
  const output = new PassThrough();
  const transport = new StdioServerTransport(input, output);
  const frames: Frame[] = [];
  let buffered = '';
  output.setEncoding('utf8');
  output.on('data', (chunk: string) => {
    buffered += chunk;
    let newline: number;
    while ((newline = buffered.indexOf('\n')) >= 0) {
      frames.push(JSON.parse(buffered.slice(0, newline)) as Frame);
      buffered = buffered.slice(newline + 1);
    }
  });
  const server = new FluentMcpServer();
  await server.start(transport);
  const closed = mock.fn(transport.onclose ?? (() => {}));
  transport.onclose = closed;
  let nextId = 1;
  const write = (method: string, params: Frame = {}, id?: number) => {
    input.write(`${JSON.stringify({
      jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method,
      params: modern ? { ...params, _meta: {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientCapabilities': {},
        'io.modelcontextprotocol/clientInfo': { name: 'stdio-test', version: '1.0.0' },
      } } : params,
    })}\n`);
  };
  const send = (method: string, params: Frame = {}) => {
    const id = nextId++;
    write(method, params, id);
    return id;
  };
  const response = (id: number) => waitFor(() => frames.find(frame => frame.id === id), `response ${id}`);
  const request = (method: string, params: Frame = {}) => response(send(method, params));
  if (modern) {
    const discovery = await request('server/discover');
    assert.equal(discovery.error, undefined);
  } else {
    const initialized = await request('initialize', {
      protocolVersion: '2025-11-25', capabilities: {},
      clientInfo: { name: 'stdio-test', version: '1.0.0' },
    });
    assert.equal(initialized.error, undefined);
    write('notifications/initialized');
  }
  return { input, output, server, closed, frames, send, request,
    async close() {
      await server.stop();
      input.destroy();
      output.destroy();
    },
  };
}

describe('stdio lifecycle through the real transport', () => {
  for (const modern of [true, false]) {
    const era = modern ? '2026-07-28' : '2025-11-25';

    it(`answers requests while stdin stays open (${era})`, async () => {
      const client = await connect(modern);
      try {
        const tools = await client.request('tools/list');
        assert.equal(tools.error, undefined);
        assert.ok(tools.result.tools.some((tool: Frame) => tool.name === 'get-api-spec'));
        const result = await client.request('tools/call', {
          name: 'get-api-spec', arguments: { metadataType: 'business-rule' },
        });
        assert.equal(result.error, undefined);
        assert.ok(!result.result.isError);
        assert.ok(result.result.content[0].text.length > 100);
        assert.equal(client.input.readableEnded, false);
        assert.equal(client.closed.mock.callCount(), 0);
      } finally {
        await client.close();
      }
      assert.equal(client.closed.mock.callCount(), 1);
    });

    it(`aborts a live CLI request without a response and closes once on stdin EOF (${era})`, { timeout: 15_000 }, async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'fluent-stdio-eof-'));
      const pidPath = path.join(tempDir, 'child.pid');
      resolveSdkCli.mock.mockImplementation(() => ({
        command: process.execPath,
        baseArgs: [path.join(projectRoot, 'test/fixtures/hanging-sdk-cli.js'), pidPath],
      }));
      const client = await connect(modern);
      let pid: number | undefined;
      try {
        const requestId = client.send('tools/call', { name: 'sdk_info', arguments: { flag: '-v' } });
        pid = await waitFor(() => readPid(pidPath), 'the CLI child to start');
        assert.equal(isAlive(pid), true);
        client.input.end();
        await waitFor(() => client.closed.mock.callCount() === 1, 'transport close');
        await waitFor(() => !isAlive(pid!), 'the aborted CLI child to exit');
        await client.server.stop();
        assert.equal(client.closed.mock.callCount(), 1);
        assert.equal(client.frames.some(frame => frame.id === requestId), false);
      } finally {
        await client.close();
        pid ??= await readPid(pidPath);
        if (pid !== undefined && isAlive(pid)) process.kill(pid, 'SIGKILL');
        resolveSdkCli.mock.restore();
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  }
});
