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
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { FluentMcpServer } from '../../src/server/fluentMCPServer.js';
import { resolveSdkCli } from '../../src/utils/sdkCli.js';

jest.mock('../../src/utils/sdkCli.js', () => ({
  resolveSdkCli: jest.fn(),
  resetSdkCliCache: jest.fn(),
}));

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());

// Override test/setup.js's global config mock, whose resourcePaths point at a
// nonexistent /test/res/*. These tests read the real shipped res/ content so
// that resources/read and tools/call exercise the actual bundled resources.
jest.mock('../../src/config.js', () => {
  const path = require('node:path');
  const root = process.cwd();
  return {
    getProjectRootPath: jest.fn(() => root),
    getConfig: jest.fn(() => ({
      name: 'wire-test-server',
      version: '0.0.0-test',
      description: 'Wire test server',
      logLevel: 'error',
      resourcePaths: {
        spec: path.join(root, 'res', 'spec'),
        snippet: path.join(root, 'res', 'snippet'),
        instruct: path.join(root, 'res', 'instruct'),
      },
      servicenowSdk: { cliPath: 'snc', commandTimeoutMs: 30000 },
    })),
    findMissingResourcePaths: jest.fn(() => []),
  };
});

const MODERN_VERSION = '2026-07-28';
const LEGACY_VERSION = '2025-11-25';
const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const CLIENT_INFO_KEY = 'io.modelcontextprotocol/clientInfo';
const HANGING_SDK_CLI = path.resolve(process.cwd(), 'test/fixtures/hanging-sdk-cli.js');

type Frame = Record<string, any>;
type PendingRequest = { requestId: number; response: Promise<Frame> };

/** Drives one end of a linked transport pair with raw JSON-RPC. */
class WireClient {
  readonly received: Frame[] = [];
  private nextId = 1;

  private constructor(private readonly client: InMemoryTransport, readonly server: FluentMcpServer) {
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

      expect(res.error).toBeUndefined();
      // The SDK installs this handler itself for modern connections.
      expect(res.result.supportedVersions).toContain(MODERN_VERSION);
      expect(res.result.instructions).toContain('explain_fluent_api');
      // Servers SHOULD identify themselves on every response; the 2026 codec
      // stamps this into result _meta (and never on a 2025-era response).
      expect(res.result._meta?.['io.modelcontextprotocol/serverInfo']?.name).toBeDefined();
    });

    it('advertises no listChanged on server/discover either', async () => {
      const res = await wire.modern('server/discover');

      const caps = res.result.capabilities;
      expect(caps.tools?.listChanged).toBe(false);
      expect(caps.resources?.listChanged).toBe(false);
      expect(caps.prompts?.listChanged).toBe(false);
    });

    it('serves tools/list with the full tool set in deterministic name order', async () => {
      const res = await wire.modern('tools/list');

      const names = res.result.tools.map((t: Frame) => t.name);
      expect(names.length).toBeGreaterThan(10);
      expect(names).toEqual([...names].sort());
      expect(names).toContain('init_fluent_app');
      expect(names).toContain('get-api-spec');
    });

    it('stamps the required resultType on results', async () => {
      // resultType is SDK-populated and required on every 2026-era result.
      const res = await wire.modern('tools/list');
      expect(res.result.resultType).toBe('complete');
    });

    it('serves resources/list and resources/read', async () => {
      const list = await wire.modern('resources/list');
      expect(list.result.resources.length).toBeGreaterThan(100);

      const read = await wire.modern('resources/read', { uri: 'sn-spec://business-rule' });
      expect(read.result.contents[0].text.length).toBeGreaterThan(100);
      expect(read.result.contents[0].mimeType).toBe('text/markdown');
    });

    it('reports a missing resource as -32602, not -32002', async () => {
      const res = await wire.modern('resources/read', { uri: 'sn-spec://no-such-type' });
      expect(res.error.code).toBe(-32602);
    });

    it('answers resources/templates/list rather than Method not found', async () => {
      // A server that declares a capability MUST answer that capability's
      // methods, potentially with an empty result. Under sdk@1.x this returned
      // -32601 because nothing registered the handler.
      const res = await wire.modern('resources/templates/list');

      expect(res.error).toBeUndefined();
      expect(Array.isArray(res.result.resourceTemplates)).toBe(true);
    });

    it('serves prompts/list and prompts/get', async () => {
      const list = await wire.modern('prompts/list');
      expect(list.result.prompts.length).toBeGreaterThan(0);

      const name = list.result.prompts[0].name;
      const got = await wire.modern('prompts/get', { name });
      expect(got.result.messages[0].content.text.length).toBeGreaterThan(0);
    });

    it('executes a tool call and returns its content', async () => {
      const res = await wire.modern('tools/call', {
        name: 'get-api-spec',
        arguments: { metadataType: 'business-rule' },
      });

      expect(res.result.isError).toBeFalsy();
      expect(res.result.content[0].text.length).toBeGreaterThan(100);
    });

    it('rejects an unknown tool argument via the enforced input schema', async () => {
      const res = await wire.modern('tools/call', {
        name: 'get-api-spec',
        arguments: { metadataType: 'business-rule', bogusArgument: 1 },
      });

      // Enforced by the strict Zod object shared with the advertised schema.
      const text = JSON.stringify(res);
      expect(text).toMatch(/bogus|unrecognized|strict/i);
    });

    // ttlMs + cacheScope are required on the cacheable results (SEP-2549).
    // Everything this server returns on them is immutable for the process
    // lifetime, so a long public TTL is safe. Without hints, v2 emits the
    // conservative ttlMs: 0 / cacheScope: 'private'.
    it.each([
      ['server/discover', {}],
      ['tools/list', {}],
      ['prompts/list', {}],
      ['resources/list', {}],
      ['resources/templates/list', {}],
      ['resources/read', { uri: 'sn-spec://business-rule' }],
    ])('emits a non-zero public cache hint on %s', async (method, params) => {
      const res = await wire.modern(method, params);

      expect(res.error).toBeUndefined();
      expect(res.result.ttlMs).toBeGreaterThan(0);
      expect(res.result.cacheScope).toBe('public');
    });

    it('does not cache-hint a non-cacheable result', async () => {
      // The cacheable list is closed; tools/call must never carry cache fields.
      const res = await wire.modern('tools/call', {
        name: 'get-api-spec',
        arguments: { metadataType: 'business-rule' },
      });

      expect(res.result.ttlMs).toBeUndefined();
      expect(res.result.cacheScope).toBeUndefined();
    });

    it('never issues a server-initiated request', async () => {
      await wire.modern('tools/list');
      await wire.modern('resources/list');
      await wire.modern('prompts/list');

      expect(wire.serverInitiatedRequests()).toEqual([]);
    });

    it('emits nothing on the wire for a request without a logLevel', async () => {
      // 2026-07-28: servers MUST NOT emit notifications/message for requests
      // that did not include the per-request logLevel _meta field. This server
      // logs to stderr only, so no notifications/message can ever appear.
      await wire.modern('tools/list');
      await wire.modern('resources/list');

      const logNotifications = wire.received.filter((m) => m.method === 'notifications/message');
      expect(logNotifications).toEqual([]);
    });
  });

  describe('2025-11-25 era (same factory, legacy shim)', () => {
    beforeEach(async () => {
      wire = await WireClient.connect();
    });

    it('completes the legacy initialize handshake', async () => {
      const res = await wire.legacyInitialize();

      expect(res.error).toBeUndefined();
      expect(res.result.protocolVersion).toBe(LEGACY_VERSION);
      expect(res.result.serverInfo.name).toBeDefined();
      expect(res.result.instructions).toContain('explain_fluent_api');
    });

    it('does not declare roots, sampling, elicitation or logging as server capabilities', async () => {
      const res = await wire.legacyInitialize();

      const caps = res.result.capabilities;
      expect(caps.tools).toBeDefined();
      expect(caps.resources).toBeDefined();
      expect(caps.prompts).toBeDefined();
      expect(caps.roots).toBeUndefined();
      expect(caps.sampling).toBeUndefined();
      expect(caps.elicitation).toBeUndefined();
      expect(caps.logging).toBeUndefined();
    });

    it('does not advertise listChanged for notifications it never sends', async () => {
      const res = await wire.legacyInitialize();

      const caps = res.result.capabilities;
      expect(caps.tools?.listChanged).toBeFalsy();
      expect(caps.prompts?.listChanged).toBeFalsy();
      expect(caps.resources?.listChanged).toBeFalsy();
    });

    it('emits no cache fields on 2025-era results', async () => {
      // The 2025 codec has no cache code path at all; hints must never leak
      // onto a legacy response.
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/list');
      expect(res.result.ttlMs).toBeUndefined();
      expect(res.result.cacheScope).toBeUndefined();
    });

    it('serves the same tool set as the modern era', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/list');
      const names = res.result.tools.map((t: Frame) => t.name);
      expect(names).toContain('init_fluent_app');
      expect(names).toEqual([...names].sort());
    });

    it('serves resources and prompts, and still reports a miss as -32602', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const list = await wire.legacy('resources/list');
      expect(list.result.resources.length).toBeGreaterThan(100);

      const miss = await wire.legacy('resources/read', { uri: 'sn-spec://no-such-type' });
      expect(miss.error.code).toBe(-32602);

      const prompts = await wire.legacy('prompts/list');
      expect(prompts.result.prompts.length).toBeGreaterThan(0);
    });

    it('issues no server-initiated request even when the client advertises roots and elicitation', async () => {
      // The legacy path is where a server→client request would still be *legal*,
      // which is exactly why it needs asserting: nothing here may reach back to
      // the client for roots or elicitation.
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');
      await wire.legacy('tools/list');

      expect(wire.serverInitiatedRequests()).toEqual([]);
    });

    it('runs init_fluent_app without prompting for missing input', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/call', {
        name: 'init_fluent_app',
        arguments: { workingDirectory: '/nonexistent-wire-test-dir' },
      });

      // Fails locally with an actionable message rather than eliciting.
      expect(res.result.isError).toBe(true);
      expect(res.result.content[0].text).toContain('Cannot determine intent');
      expect(wire.serverInitiatedRequests()).toEqual([]);
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

  it.each([
    ['2026-07-28', true],
    ['2025-11-25', false],
  ])('cancels a live tools/call through the child process for the %s era', async (_era, modern) => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcp-cancel-'));
    const pidPath = path.join(tempDir, 'child.pid');
    let childPid: number | undefined;

    const sdkCliMock = resolveSdkCli as jest.MockedFunction<typeof resolveSdkCli>;
    sdkCliMock.mockReturnValue({ command: process.execPath, baseArgs: [HANGING_SDK_CLI, pidPath] });

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
      expect(await cancelledResponse).toBeUndefined();
      expect(wire.received.some((message) => message.id === pending.requestId)).toBe(false);
    } finally {
      if (childPid !== undefined) {
        try {
          process.kill(childPid, 'SIGKILL');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
            throw error;
          }
        }
      }
      sdkCliMock.mockReset();
      await rm(tempDir, { recursive: true, force: true });
    }
  }, 20_000);
});
