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
 *    resources.
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

/** Every tool the server registers, in the name order tools/list serves them. */
const EXPECTED_TOOLS = [
  'build_fluent_app',
  'check_auth_status',
  'cicd_fluent_app',
  'cicd_fluent_test',
  'clean_fluent_app',
  'deploy_fluent_app',
  'download_fluent_app',
  'download_fluent_dependencies',
  'explain_fluent_api',
  'fluent_exec_script',
  'fluent_transform',
  'get_fluent_knowledge',
  'init_fluent_app',
  'pack_fluent_app',
  'query_fluent_records',
  'sdk_info',
];

/** The three resource templates, as [name, uriTemplate, mimeType]. */
const EXPECTED_TEMPLATES = [
  ['sn-spec', 'sn-spec://{metadataType}', 'text/markdown'],
  ['sn-instruct', 'sn-instruct://{metadataType}', 'text/markdown'],
  ['sn-snippet', 'sn-snippet://{metadataType}/{snippetId}', 'text/markdown'],
];
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

  static async connect(firstRequestId = 1): Promise<WireClient> {
    const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
    const server = new FluentMcpServer();
    await server.start(serverEnd);
    await clientEnd.start();
    const wire = new WireClient(clientEnd, server);
    wire.nextId = firstRequestId;
    return wire;
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

type Send = (method: string, params?: Record<string, unknown>) => Promise<Frame>;

/** resources/read of one resource per template returns that file's content verbatim. */
async function assertResourceReads(send: Send): Promise<void> {
  for (const [uri, file] of [
    ['sn-spec://business-rule', 'spec/fluent_spec_business-rule.md'],
    ['sn-instruct://business-rule', 'instruct/fluent_instruct_business-rule.md'],
    ['sn-snippet://business-rule/0002', 'snippet/fluent_snippet_business-rule_0002.md'],
  ]) {
    const res = await send('resources/read', { uri });
    assert.equal(res.error, undefined, uri);
    assert.deepStrictEqual(
      res.result.contents,
      [{ uri, mimeType: 'text/markdown', text: await readFile(path.join(projectRoot, 'res', file), 'utf8') }],
      uri
    );
  }
}

/** completion/complete on every advertised prompt argument and template variable. */
async function assertCompletions(send: Send): Promise<void> {
  const complete = async (ref: Frame, name: string, value: string, context?: Frame) => {
    const res = await send('completion/complete', { ref, argument: { name, value }, ...(context && { context }) });
    assert.equal(res.error, undefined, `${JSON.stringify(ref)} ${name}`);
    return res.result.completion.values as string[];
  };
  const prompt = { type: 'ref/prompt', name: 'coding_in_fluent' };
  assert.deepEqual(await complete(prompt, 'metadata_list', 'table,business-r'), ['table,business-rule']);
  assert.ok((await complete(prompt, 'metadata_list', '')).includes('ui-macro'));

  const spec = { type: 'ref/resource', uri: 'sn-spec://{metadataType}' };
  const instruct = { type: 'ref/resource', uri: 'sn-instruct://{metadataType}' };
  const snippet = { type: 'ref/resource', uri: 'sn-snippet://{metadataType}/{snippetId}' };
  assert.deepEqual(await complete(spec, 'metadataType', 'script-i'), ['script-include']);
  assert.deepEqual(await complete(instruct, 'metadataType', 'business-'), ['business-rule']);
  assert.deepEqual(await complete(snippet, 'metadataType', 'business-'), ['business-rule']);
  const ids = await complete(snippet, 'snippetId', '', { arguments: { kind: 'spec', metadataType: 'business-rule' } });
  assert.ok(ids.includes('0001') && ids.includes('0002'));
  assert.deepEqual(await complete(snippet, 'snippetId', ''), []);

  for (const ref of [{ type: 'ref/prompt', name: 'no_such_prompt' }, { type: 'ref/resource', uri: 'sn-nope://{x}' }]) {
    const res = await send('completion/complete', { ref, argument: { name: 'x', value: '' } });
    assert.equal(res.error?.code, -32602, JSON.stringify(ref));
  }
}

/** prompts/list and prompts/get as served by the SDK from registerPrompt. */
async function assertPrompts(send: Send): Promise<void> {
  const list = await send('prompts/list');
  assert.deepStrictEqual(list.result.prompts.map((p: Frame) => [p.name, p.arguments]), [
    ['coding_in_fluent', [{
      name: 'metadata_list',
      description: 'Comma-separated list of metadata types to include in the guide (e.g., "table,business-rule,script-include")',
      required: false,
    }]],
    ['create_custom_ui', undefined],
  ]);

  // Prompt arguments are strings on the wire: the comma-separated form is split.
  const got = await send('prompts/get', { name: 'coding_in_fluent', arguments: { metadata_list: 'state-model, atf-list' } });
  const text = got.result.messages[0].content.text;
  assert.ok(text.includes('### state-model') && text.includes('### atf-list'));
  assert.ok(!text.includes('not a recognized Fluent metadata type'));

  const ui = await send('prompts/get', { name: 'create_custom_ui' });
  assert.ok(ui.result.messages[0].content.text.includes('# Create a Custom UI with React'));

  // metadata_list is optional: without it the guide is returned uncustomized.
  for (const args of [undefined, {}, { metadata_list: '' }]) {
    const bare = await send('prompts/get', { name: 'coding_in_fluent', ...(args && { arguments: args }) });
    const bareText = bare.result.messages[0].content.text;
    assert.ok(bareText.includes('# Coding in ServiceNow Fluent'), JSON.stringify(args));
    assert.ok(!bareText.includes('## Selected Metadata Types'), JSON.stringify(args));
  }

  const unknown = await send('prompts/get', { name: 'no_such_prompt' });
  assert.equal(unknown.error?.code, -32602);

  // Mosey: SDK quirk (present before W4, on both eras). Prompt arguments are
  // Record<string, string>; the SDK checks request params against the protocol
  // schema before any prompt handler runs and reports a non-string value as
  // -32603 with the raw Zod issues, not -32602. Pinned so an SDK fix shows up
  // here; until then a client must send the comma-separated string.
  for (const value of [['table', 'flow'], 42]) {
    const res = await send('prompts/get', { name: 'coding_in_fluent', arguments: { metadata_list: value } });
    assert.equal(res.error?.code, -32603, JSON.stringify(value));
    assert.match(res.error.message, /invalid_type/);
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

      assert.deepStrictEqual(res.result.tools.map((t: Frame) => t.name), EXPECTED_TOOLS);
    });

    it('advertises one knowledge tool with kind and metadataType enums', async () => {
      // EXPECTED_TOOLS above pins that the tools it replaced are gone.
      const res = await wire.modern('tools/list');
      const tool = res.result.tools.find((t: Frame) => t.name === 'get_fluent_knowledge');
      assert.deepStrictEqual(tool.inputSchema.required, ['kind']);
      assert.deepStrictEqual(tool.inputSchema.properties.kind.enum, ['spec', 'instruct', 'snippet']);
      assert.ok(tool.inputSchema.properties.metadataType.enum.includes('business-rule'));
      assert.equal(tool.inputSchema.properties.snippetId.type, 'string');
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.idempotentHint, true);
    });

    it('stamps the required resultType on results', async () => {
      // resultType is SDK-populated and required on every 2026-era result.
      const res = await wire.modern('tools/list');
      assert.equal(res.result.resultType, 'complete');
    });

    it('serves resources/list and resources/read for every template', async () => {
      const list = await wire.modern('resources/list');
      assert.ok(list.result.resources.length > 100);

      await assertResourceReads((method, params) => wire.modern(method, params));
    });

    it('advertises the three resource templates', async () => {
      const res = await wire.modern('resources/templates/list');

      assert.equal(res.error, undefined);
      assert.deepStrictEqual(
        res.result.resourceTemplates.map((t: Frame) => [t.name, t.uriTemplate, t.mimeType]),
        EXPECTED_TEMPLATES
      );
    });

    it('lists every snippet, not only the first per type', async () => {
      const list = await wire.modern('resources/list');
      const uris = list.result.resources.map((r: Frame) => r.uri);
      assert.ok(uris.includes('sn-snippet://business-rule/0001'));
      assert.ok(uris.includes('sn-snippet://business-rule/0002'));
      assert.equal(new Set(list.result.resources.map((r: Frame) => r.name)).size, uris.length);
    });

    it('reports a missing resource or a URI no template matches as -32602 with data.uri (was -32002/-32603)', async () => {
      for (const uri of ['sn-spec://no-such-type', 'unknown-scheme://x', 'sn-snippet://business-rule', 'sn-snippet://business-rule/9999']) {
        const res = await wire.modern('resources/read', { uri });
        assert.equal(res.error?.code, -32602, uri);
        assert.equal(res.error.data?.uri, uri);
      }
    });

    it('declares completions and completes every prompt argument and template variable', async () => {
      const discover = await wire.modern('server/discover');
      assert.deepEqual(discover.result.capabilities.completions, {});
      await assertCompletions((method, params) => wire.modern(method, params));
    });

    it('serves prompts from registerPrompt; an unknown prompt is -32602, metadata_list is optional', async () => {
      await assertPrompts((method, params) => wire.modern(method, params));
    });

    it('executes a tool call and returns its content', async () => {
      const res = await wire.modern('tools/call', {
        name: 'get_fluent_knowledge',
        arguments: { kind: 'spec', metadataType: 'business-rule' },
      });

      assert.ok(!res.result.isError);
      assert.ok(res.result.content[0].text.length > 100);
    });

    it('rejects an unknown tool argument via the enforced input schema', async () => {
      const res = await wire.modern('tools/call', {
        name: 'get_fluent_knowledge',
        arguments: { kind: 'spec', metadataType: 'business-rule', bogusArgument: 1 },
      });

      // Enforced by the strict Zod object shared with the advertised schema.
      assert.equal(res.error, undefined);
      assert.equal(res.result.isError, true);
      assert.match(res.result.content[0].text, /^Input validation error: Invalid arguments for tool get_fluent_knowledge: /);
      assert.match(res.result.content[0].text, /bogusArgument/);
    });

    // Argument domains: one declaration, advertised on tools/list and enforced
    // on tools/call, before any handler or process runs.
    it('advertises argument domains as enum and pattern', async () => {
      const res = await wire.modern('tools/list');
      const props = (name: string) =>
        res.result.tools.find((t: { name: string }) => t.name === name).inputSchema.properties;
      assert.deepEqual(props('cicd_fluent_app').action.enum, ['install', 'publish', 'rollback']);
      assert.deepEqual(props('explain_fluent_api').format.enum, ['pretty', 'raw']);
      assert.equal(typeof props('query_fluent_records').select.pattern, 'string');
      assert.equal(props('query_fluent_records').table.pattern, '^[A-Za-z0-9_]+$');
      // Plain strings advertise no pattern: the control-character rule is enforced, not advertised.
      assert.equal(props('cicd_fluent_app').devNotes.pattern, undefined);
    });

    it('advertises no $id or $ref in any schema (fast-uri in the SDK compiles both)', async () => {
      const res = await wire.modern('tools/list');
      const text = JSON.stringify(res.result.tools);
      assert.doesNotMatch(text, /"\$id"|"\$ref"/);
    });

    for (const [label, name, args, message] of [
      ['a value outside choices', 'cicd_fluent_app', { action: 'deploy' }, /action: Argument 'action' must be one of: install, publish, rollback\. Received: "deploy"\./],
      ['a value outside a pattern', 'query_fluent_records', { table: '../x', query: 'a=b' }, /table: Argument 'table' must be a table name/],
      ['a control character in plain text', 'cicd_fluent_app', { action: 'publish', scope: 'x_a', devNotes: 'a\nb' }, /devNotes: Invalid characters in argument 'devNotes': control characters are not allowed/],
      ['a missing required argument', 'fluent_exec_script', { script: 'gs.info(1)', reason: 'r' }, /Missing required argument 'scope'/],
    ] as const) {
      it(`rejects ${label} on tools/call with the argument named`, async () => {
        const res = await wire.modern('tools/call', { name, arguments: args });
        assert.equal(res.result.isError, true);
        assert.match(res.result.content[0].text, /^Input validation error: Invalid arguments for tool /);
        assert.match(res.result.content[0].text, message);
      });
    }

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
        name: 'get_fluent_knowledge',
        arguments: { kind: 'spec', metadataType: 'business-rule' },
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

    it('rebuilds after a modern discovery probe followed by a legacy initialize', async () => {
      const probe = await wire.modern('server/discover');
      assert.equal(probe.error, undefined);

      const initialized = await wire.legacyInitialize();
      assert.equal(initialized.error, undefined);
      assert.equal(initialized.result.protocolVersion, LEGACY_VERSION);
      await wire.notify('notifications/initialized');

      const tools = await wire.legacy('tools/list');
      assert.equal(tools.error, undefined);
      assert.ok(tools.result.tools.some((tool: Frame) => tool.name === 'get_fluent_knowledge'));
      assert.equal(tools.result.ttlMs, undefined);
      const called = await wire.legacy('tools/call', {
        name: 'get_fluent_knowledge', arguments: { kind: 'spec', metadataType: 'business-rule' },
      });
      assert.equal(called.error, undefined);
      assert.equal(called.result.isError, false);
      assert.ok(called.result.content[0].text.length > 100);
      assert.deepStrictEqual(wire.serverInitiatedRequests(), []);
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
      assert.equal(caps.tools?.listChanged, false);
      assert.equal(caps.prompts?.listChanged, false);
      assert.equal(caps.resources?.listChanged, false);
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

    it('serves identical tool schemas and annotations in both eras', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const res = await wire.legacy('tools/list');
      assert.deepStrictEqual(res.result.tools.map((t: Frame) => t.name), EXPECTED_TOOLS);

      const modernWire = await WireClient.connect();
      try {
        const modern = await modernWire.modern('tools/list');
        assert.equal(modern.error, undefined);
        // Compared as JSON, which is what crosses a real transport: the SDK
        // object for one era carries keys set to undefined (`execution`) that
        // JSON drops and the in-memory transport keeps.
        const asJson = (tools: unknown) => JSON.parse(JSON.stringify(tools));
        assert.deepStrictEqual(asJson(res.result.tools), asJson(modern.result.tools));
      } finally {
        await modernWire.close();
      }
    });

    it('serves resources and prompts, and still reports a miss as -32602', async () => {
      await wire.legacyInitialize();
      await wire.notify('notifications/initialized');

      const list = await wire.legacy('resources/list');
      assert.ok(list.result.resources.length > 100);
      await assertResourceReads((method, params) => wire.legacy(method, params));

      const miss = await wire.legacy('resources/read', { uri: 'sn-spec://no-such-type' });
      assert.equal(miss.error.code, -32602);
      const unknownScheme = await wire.legacy('resources/read', { uri: 'unknown-scheme://x' });
      assert.equal(unknownScheme.error.code, -32602);

      const templates = await wire.legacy('resources/templates/list');
      assert.deepStrictEqual(
        templates.result.resourceTemplates.map((t: Frame) => [t.name, t.uriTemplate, t.mimeType]),
        EXPECTED_TEMPLATES
      );

      const prompts = await wire.legacy('prompts/list');
      assert.ok(prompts.result.prompts.length > 0);
    });

    it('declares completions and serves the same prompts and completions as the modern era', async () => {
      const init = await wire.legacyInitialize();
      await wire.notify('notifications/initialized');
      assert.deepEqual(init.result.capabilities.completions, {});
      await assertPrompts((method, params) => wire.legacy(method, params));
      await assertCompletions((method, params) => wire.legacy(method, params));
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

  afterEach(async () => {
    await wire?.close();
  });

  const cases: Array<[string, boolean, number]> = [
    ['2026-07-28', true, 0],
    ['2026-07-28', true, 1],
    ['2025-11-25', false, 0],
    ['2025-11-25', false, 1],
  ];
  for (const [_era, modern, requestId] of cases) {
    it(`cancels tools/call id ${requestId} through the child process for the ${_era} era`, { timeout: 20_000 }, async () => {
      // Legacy consumes one id for initialize. Negative ids are legal JSON-RPC
      // ids, so starting at -1 lets the first tool request exercise id zero.
      wire = await WireClient.connect(requestId - (modern ? 0 : 1));
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
        assert.equal(pending.requestId, requestId);
        const cancelledResponse = pending.response.catch(() => undefined);

        childPid = await waitForPidFile(pidPath);

        if (modern) {
          await wire.modernNotify('notifications/cancelled', { requestId: pending.requestId });
        } else {
          await wire.notify('notifications/cancelled', { requestId: pending.requestId });
        }

        await waitForProcessExit(childPid);

        // The SDK aborts a cancelled request and intentionally suppresses its
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
