/**
 * Real wire tests for the dual-era stdio entry point.
 *
 * These drive the actual `serveStdio` entry over an `InMemoryTransport` pair and
 * assert on real JSON-RPC frames — no `McpServer` mocks. That matters because
 * this project has already shipped two protocol bugs that mock-shaped tests
 * structurally could not catch (a server-side `roots/list` request handler and
 * an outbound `roots/list_changed` notification): asserting "setRequestHandler
 * was called" cannot tell you what actually crosses the wire, or in which
 * direction.
 *
 * `ServeStdioOptions.transport` is the SDK's own "bring your own transport"
 * affordance, so nothing here is a test-only code path in the server.
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { configFixture, loggerFixture } from '../support/fixtures.js';

/**
 * Native runner: the server, transports and child processes are all real. Only
 * three collaborators are replaced, each registered before the server is
 * imported (native module mocks apply to later imports only):
 *  - SDK CLI resolution, so the cancellation tests can point `sdk_info` at the
 *    hanging fixture; every other test never reaches it.
 *  - the logger, to keep stderr quiet.
 *  - config, which reads the real shipped res/ content (the project root is the
 *    runner's cwd) so resources/read and tools/call exercise the bundled
 *    resources, exactly as the Jest suite's own config override did.
 */
type SdkCliInvocation = { command: string; baseArgs: string[] };

const resolveSdkCli = mock.fn((): SdkCliInvocation => undefined as unknown as SdkCliInvocation);
const resetSdkCliCache = mock.fn();
mock.module('../../src/utils/sdkCli.js', { namedExports: { resolveSdkCli, resetSdkCliCache } });

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const projectRoot = process.cwd();
const config = configFixture({
  name: 'wire-test-server',
  version: '0.0.0-test',
  description: 'Wire test server',
  logLevel: 'error',
  resourcePaths: {
    spec: path.join(projectRoot, 'res', 'spec'),
    snippet: path.join(projectRoot, 'res', 'snippet'),
    instruct: path.join(projectRoot, 'res', 'instruct'),
  },
});
config.getProjectRootPath.mock.mockImplementation(() => projectRoot);
mock.module('../../src/config.js', config.mockOptions);

const { FluentMcpServer } = await import('../../src/server/fluentMCPServer.js');

const MODERN_VERSION = '2026-07-28';
const LEGACY_VERSION = '2025-11-25';
const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const CLIENT_INFO_KEY = 'io.modelcontextprotocol/clientInfo';
const HANGING_SDK_CLI = path.resolve(process.cwd(), 'test/fixtures/hanging-sdk-cli.js');

type FluentMcpServerInstance = InstanceType<typeof FluentMcpServer>;
type Frame = Record<string, any>;
type PendingRequest = { requestId: number; response: Promise<Frame> };

/** Drives one end of a linked transport pair with raw JSON-RPC. */
class WireClient {
  readonly received: Frame[] = [];
  private nextId = 1;

  private constructor(private readonly client: InMemoryTransport, readonly server: FluentMcpServerInstance) {
    this.client.onmessage = (message) => { this.received.push(message as Frame); };
  }

  static async connect(): Promise<WireClient> {
    const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
    const server = new FluentMcpServer();
    await server.start(serverEnd);
    await clientEnd.start();
    return new WireClient(clientEnd, server);
  }

  /** Sends a 2026-era request: every request carries the `_meta` envelope. */
  async modern(method: string, params: Record<string, unknown> = {}): Promise<Frame> {
    return this.request(method, {
      ...params,
      _meta: this.modernMeta(),
    });
  }

  async modernPending(method: string, params: Record<string, unknown> = {}, timeoutMs = 10_000): Promise<PendingRequest> {
    return this.requestPending(method, {
      ...params,
      _meta: this.modernMeta(),
    }, timeoutMs);
  }

  /** Sends a plain 2025-era request (no envelope). */
  async legacy(method: string, params: Record<string, unknown> = {}): Promise<Frame> {
    return this.request(method, params);
  }

  async legacyPending(method: string, params: Record<string, unknown> = {}, timeoutMs = 10_000): Promise<PendingRequest> {
    return this.requestPending(method, params, timeoutMs);
  }

  async legacyInitialize(): Promise<Frame> {
    return this.request('initialize', {
      protocolVersion: LEGACY_VERSION,
      capabilities: { roots: { listChanged: true }, elicitation: {}, sampling: {} },
      clientInfo: { name: 'wire-test', version: '1.0.0' },
    });
  }

  async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    await this.client.send({ jsonrpc: '2.0', method, ...(params && { params }) } as never);
  }

  async modernNotify(method: string, params: Record<string, unknown> = {}): Promise<void> {
    await this.notify(method, { ...params, _meta: this.modernMeta() });
  }

  private async request(method: string, params: Record<string, unknown>): Promise<Frame> {
    const pending = await this.requestPending(method, params);
    return pending.response;
  }

  private async requestPending(method: string, params: Record<string, unknown>, timeoutMs = 10_000): Promise<PendingRequest> {
    const id = this.nextId++;
    const response = this.await(id, timeoutMs);
    await this.client.send({ jsonrpc: '2.0', id, method, params } as never);
    return { requestId: id, response };
  }

  private modernMeta(): Record<string, unknown> {
    return {
      [PROTOCOL_VERSION_KEY]: MODERN_VERSION,
      [CLIENT_CAPABILITIES_KEY]: {},
      [CLIENT_INFO_KEY]: { name: 'wire-test', version: '1.0.0' },
    };
  }

  private async await(id: number, timeoutMs = 10_000): Promise<Frame> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = this.received.find((m) => m.id === id);
      if (hit) return hit;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(`Timed out waiting for a response to request ${id} (${JSON.stringify(this.received)})`);
  }

  /** Requests the server itself originated — must always be empty. */
  serverInitiatedRequests(): Frame[] {
    return this.received.filter((m) => m.method !== undefined && m.id !== undefined);
  }

  async close(): Promise<void> {
    await this.server.stop();
  }
}

async function waitForPidFile(pidPath: string, timeoutMs = 5_000): Promise<number> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const pid = Number.parseInt((await readFile(pidPath, 'utf8')).trim(), 10);
      if (Number.isInteger(pid) && pid > 0) {
        return pid;
      }
    } catch {
      // The fixture has not started yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for hanging SDK CLI pid file: ${pidPath}`);
}

async function waitForProcessExit(pid: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        return;
      }
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for hanging SDK CLI process ${pid} to exit`);
}

/** Best-effort read of a pid file that may not exist yet; never throws. */
async function readPidIfPresent(pidPath: string): Promise<number | undefined> {
  try {
    const pid = Number.parseInt((await readFile(pidPath, 'utf8')).trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

describe('dual-era wire protocol', () => {
  let wire: WireClient;

  afterEach(async () => {
    await wire?.close();
  });

  describe('2026-07-28 era', () => {
    beforeEach(async () => {
      wire = await WireClient.connect();
    });

    it('answers server/discover, which the revision makes mandatory', async () => {
      const res = await wire.modern('server/discover');

      assert.equal(res.error, undefined);
      // The SDK installs this handler itself for modern connections.
      assert.ok(res.result.supportedVersions.includes(MODERN_VERSION));
      assert.ok(res.result.instructions.includes('explain_fluent_api'));
      // Servers SHOULD identify themselves on every response; the 2026 codec
      // stamps this into result _meta (and never on a 2025-era response).
      assert.notEqual(res.result._meta?.['io.modelcontextprotocol/serverInfo']?.name, undefined);
    });

    it('advertises no listChanged on server/discover either', async () => {
      const res = await wire.modern('server/discover');

      const caps = res.result.capabilities;
      assert.equal(caps.tools?.listChanged, false);
      assert.equal(caps.resources?.listChanged, false);
      assert.equal(caps.prompts?.listChanged, false);
    });

    it('serves tools/list with the full tool set in deterministic name order', async () => {
      const res = await wire.modern('tools/list');

      const names = res.result.tools.map((t: Frame) => t.name);
      assert.ok(names.length > 10);
      assert.deepStrictEqual(names, [...names].sort());
      assert.ok(names.includes('init_fluent_app'));
      assert.ok(names.includes('get-api-spec'));
    });

    it('stamps the required resultType on results', async () => {
      // resultType is SDK-populated and required on every 2026-era result.
      const res = await wire.modern('tools/list');
      assert.equal(res.result.resultType, 'complete');
    });

    it('serves resources/list and resources/read', async () => {
      const list = await wire.modern('resources/list');
      assert.ok(list.result.resources.length > 100);

      const read = await wire.modern('resources/read', { uri: 'sn-spec://business-rule' });
      assert.ok(read.result.contents[0].text.length > 100);
      assert.equal(read.result.contents[0].mimeType, 'text/markdown');
    });

    it('reports a missing resource as -32602, not -32002', async () => {
      const res = await wire.modern('resources/read', { uri: 'sn-spec://no-such-type' });
      assert.equal(res.error.code, -32602);
    });

    it('answers resources/templates/list rather than Method not found', async () => {
      // A server that declares a capability MUST answer that capability's
      // methods, potentially with an empty result. Under sdk@1.x this returned
      // -32601 because nothing registered the handler.
      const res = await wire.modern('resources/templates/list');

      assert.equal(res.error, undefined);
      assert.equal(Array.isArray(res.result.resourceTemplates), true);
    });

    it('serves prompts/list and prompts/get', async () => {
      const list = await wire.modern('prompts/list');
      assert.ok(list.result.prompts.length > 0);

      const name = list.result.prompts[0].name;
      const got = await wire.modern('prompts/get', { name });
      assert.ok(got.result.messages[0].content.text.length > 0);
    });

    it('executes a tool call and returns its content', async () => {
      const res = await wire.modern('tools/call', {
        name: 'get-api-spec',
        arguments: { metadataType: 'business-rule' },
      });

      assert.ok(!res.result.isError);
      assert.ok(res.result.content[0].text.length > 100);
    });

    it('rejects an unknown tool argument via the enforced input schema', async () => {
      const res = await wire.modern('tools/call', {
        name: 'get-api-spec',
        arguments: { metadataType: 'business-rule', bogusArgument: 1 },
      });

      // Enforced by the strict Zod object shared with the advertised schema.
      const text = JSON.stringify(res);
      assert.match(text, /bogus|unrecognized|strict/i);
    });

    // ttlMs + cacheScope are required on the cacheable results (SEP-2549).
    // Everything this server returns on them is immutable for the process
    // lifetime, so a long public TTL is safe. Without hints, v2 emits the
    // conservative ttlMs: 0 / cacheScope: 'private'.
    const cacheableMethods: Array<[string, Record<string, unknown>]> = [
      ['server/discover', {}],
      ['tools/list', {}],
      ['prompts/list', {}],
      ['resources/list', {}],
      ['resources/templates/list', {}],
      ['resources/read', { uri: 'sn-spec://business-rule' }],
    ];
    for (const [method, params] of cacheableMethods) {
      it(`emits a non-zero public cache hint on ${method}`, async () => {
        const res = await wire.modern(method, params);

        assert.equal(res.error, undefined);
        assert.ok(res.result.ttlMs > 0);
        assert.equal(res.result.cacheScope, 'public');
      });
    }

    it('does not cache-hint a non-cacheable result', async () => {
      // The cacheable list is closed; tools/call must never carry cache fields.
      const res = await wire.modern('tools/call', {
        name: 'get-api-spec',
        arguments: { metadataType: 'business-rule' },
      });

      assert.equal(res.result.ttlMs, undefined);
      assert.equal(res.result.cacheScope, undefined);
    });

    it('never issues a server-initiated request', async () => {
      await wire.modern('tools/list');
      await wire.modern('resources/list');
      await wire.modern('prompts/list');

      assert.deepStrictEqual(wire.serverInitiatedRequests(), []);
    });

    it('emits nothing on the wire for a request without a logLevel', async () => {
      // 2026-07-28: servers MUST NOT emit notifications/message for requests
      // that did not include the per-request logLevel _meta field. This server
      // logs to stderr only, so no notifications/message can ever appear.
      await wire.modern('tools/list');
      await wire.modern('resources/list');

      const logNotifications = wire.received.filter((m) => m.method === 'notifications/message');
      assert.deepStrictEqual(logNotifications, []);
    });
  });

  describe('2025-11-25 era (same factory, legacy shim)', () => {
    beforeEach(async () => {
      wire = await WireClient.connect();
    });

    it('completes the legacy initialize handshake', async () => {
      const res = await wire.legacyInitialize();

      assert.equal(res.error, undefined);
      assert.equal(res.result.protocolVersion, LEGACY_VERSION);
      assert.notEqual(res.result.serverInfo.name, undefined);
      assert.ok(res.result.instructions.includes('explain_fluent_api'));
    });

    it('does not declare roots, sampling, elicitation or logging as server capabilities', async () => {
      const res = await wire.legacyInitialize();

      const caps = res.result.capabilities;
      assert.notEqual(caps.tools, undefined);
      assert.notEqual(caps.resources, undefined);
      assert.notEqual(caps.prompts, undefined);
      assert.equal(caps.roots, undefined);
      assert.equal(caps.sampling, undefined);
      assert.equal(caps.elicitation, undefined);
      assert.equal(caps.logging, undefined);
    });

    it('does not advertise listChanged for notifications it never sends', async () => {
      const res = await wire.legacyInitialize();

      const caps = res.result.capabilities;
      assert.ok(!caps.tools?.listChanged);
      assert.ok(!caps.prompts?.listChanged);
      assert.ok(!caps.resources?.listChanged);
    });

    it('emits no cache fields on 2025-era results', async () => {
      // The 2025 codec has no cache code path at all; hints must never leak
      // onto a legacy response.
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/list');
      assert.equal(res.result.ttlMs, undefined);
      assert.equal(res.result.cacheScope, undefined);
    });

    it('serves the same tool set as the modern era', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/list');
      const names = res.result.tools.map((t: Frame) => t.name);
      assert.ok(names.includes('init_fluent_app'));
      assert.deepStrictEqual(names, [...names].sort());
    });

    it('serves resources and prompts, and still reports a miss as -32602', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const list = await wire.legacy('resources/list');
      assert.ok(list.result.resources.length > 100);

      const miss = await wire.legacy('resources/read', { uri: 'sn-spec://no-such-type' });
      assert.equal(miss.error.code, -32602);

      const prompts = await wire.legacy('prompts/list');
      assert.ok(prompts.result.prompts.length > 0);
    });

    it('issues no server-initiated request even when the client advertises roots and elicitation', async () => {
      // The legacy path is where a server→client request would still be *legal*,
      // which is exactly why it needs asserting: nothing here may reach back to
      // the client for roots or elicitation.
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');
      await wire.legacy('tools/list');

      assert.deepStrictEqual(wire.serverInitiatedRequests(), []);
    });

    it('runs init_fluent_app without prompting for missing input', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/call', {
        name: 'init_fluent_app',
        arguments: { workingDirectory: '/nonexistent-wire-test-dir' },
      });

      // Fails locally with an actionable message rather than eliciting.
      assert.equal(res.result.isError, true);
      assert.ok(res.result.content[0].text.includes('Cannot determine intent'));
      assert.deepStrictEqual(wire.serverInitiatedRequests(), []);
    });
  });
});

describe('wire-level cancellation at the process boundary (W13)', () => {
  let wire: WireClient;

  beforeEach(async () => {
    wire = await WireClient.connect();
  });

  afterEach(async () => {
    await wire?.close();
  });

  const eras: Array<[string, boolean]> = [
    ['2026-07-28', true],
    ['2025-11-25', false],
  ];
  for (const [_era, modern] of eras) {
    it(`cancels a live tools/call through the child process for the ${_era} era`, { timeout: 20_000 }, async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcp-cancel-'));
      const pidPath = path.join(tempDir, 'child.pid');
      let childPid: number | undefined;

      resolveSdkCli.mock.mockImplementation(() => ({ command: process.execPath, baseArgs: [HANGING_SDK_CLI, pidPath] }));

      try {
        if (!modern) {
          await wire.legacyInitialize();
          await wire.notify('notifications/initialized');
        }

        const pending = modern
          ? await wire.modernPending('tools/call', {
            name: 'sdk_info',
            arguments: { flag: '-v' },
          }, 1_000)
          : await wire.legacyPending('tools/call', {
            name: 'sdk_info',
            arguments: { flag: '-v' },
          }, 1_000);
        const cancelledResponse = pending.response.catch(() => undefined);

        childPid = await waitForPidFile(pidPath);

        if (modern) {
          await wire.modernNotify('notifications/cancelled', { requestId: pending.requestId });
        } else {
          await wire.notify('notifications/cancelled', { requestId: pending.requestId });
        }

        await waitForProcessExit(childPid);

        // sdk@2.0.0 aborts a cancelled request and intentionally suppresses its
        // response. The existing process-runner robustness test proves the
        // underlying result is exit 130 with the cancellation/SIGKILL text;
        // this wire test proves the cancellation reaches that process boundary.
        assert.equal(await cancelledResponse, undefined);
        assert.equal(wire.received.some((message) => message.id === pending.requestId), false);
      } finally {
        // The child may have started without the test having observed its pid
        // (an early failure): recover it from the pid file so it cannot leak.
        childPid ??= await readPidIfPresent(pidPath);
        if (childPid !== undefined) {
          try {
            process.kill(childPid, 'SIGKILL');
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
              throw error;
            }
          }
        }
        resolveSdkCli.mock.restore();
        resolveSdkCli.mock.resetCalls();
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  }
});
