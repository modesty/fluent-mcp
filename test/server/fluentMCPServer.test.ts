/**
 * Tests for FluentMcpServer's server-factory contract.
 *
 * Real end-to-end protocol behaviour is covered over an actual transport in
 * wireProtocol.test.ts. This file covers what a wire test cannot easily force:
 * the lifecycle contract `serveStdio` imposes on the factory, and the absence of
 * protocol surface that must never come back.
 *
 * Native runner: module mocks are registered before the server is imported.
 * Constructor mocks use `function` implementations, because a native mock.fn can
 * only be called with `new` when its implementation is constructible.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledTimes, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture } from '../support/fixtures.js';

type ServerFactory = () => unknown;

// --- MCP SDK ----------------------------------------------------------------

const mockRegisterTool = mock.fn();
const mockSetRequestHandler = mock.fn();
const mockSetNotificationHandler = mock.fn();
const mockRequest = mock.fn();
const mockGetClientCapabilities = mock.fn((): Record<string, unknown> => ({ roots: {} }));
const mockClose = mock.fn();

type ServerOptions = { capabilities: Record<string, Record<string, unknown> | undefined> };

const McpServer = mock.fn(function (_info?: unknown, _options?: ServerOptions) {
  return {
    registerTool: mockRegisterTool,
    connect: mock.fn(),
    close: mockClose,
    server: {
      setRequestHandler: mockSetRequestHandler,
      setNotificationHandler: mockSetNotificationHandler,
      request: mockRequest,
      getClientCapabilities: mockGetClientCapabilities,
    },
  };
});
mock.module('@modelcontextprotocol/server', { namedExports: { McpServer } });

// Capture the factory serveStdio is given, plus the handle it returns.
const mockHandleClose = mock.fn(async () => undefined);
const serveStdio = mock.fn((_factory: ServerFactory, _options?: { legacy?: string }) => ({
  close: mockHandleClose,
}));
mock.module('@modelcontextprotocol/server/stdio', { namedExports: { serveStdio } });

// --- Application collaborators ----------------------------------------------

const config = configFixture({
  name: 'test-mcp-server',
  version: '1.0.0',
  description: 'Test MCP Server',
  resourcePaths: {
    spec: '/mock/path/to/spec',
    snippet: '/mock/path/to/snippet',
    instruct: '/mock/path/to/instruct',
  },
});
mock.module('../../src/config.js', config.mockOptions);
const { findMissingResourcePaths } = config;

const ToolsManager = mock.fn(function () {
  return {
    getMCPTools: mock.fn(() => [
      { name: 'mock-tool', description: 'A mock tool', inputSchema: { type: 'object' } },
    ]),
    registerOn: mock.fn(),
  };
});
mock.module('../../src/tools/toolsManager.js', { namedExports: { ToolsManager } });

const ResourceManager = mock.fn(function () {
  return {
    initialize: mock.fn(async () => undefined),
    listResources: mock.fn(async () => []),
    readResource: mock.fn(async () => ({ contents: [] })),
  };
});
mock.module('../../src/res/resourceManager.js', { namedExports: { ResourceManager } });

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { FluentMcpServer } = await import('../../src/server/fluentMCPServer.js');
const { ServerStatus } = await import('../../src/types.js');

const allMocks: Array<{ mock: { resetCalls(): void } }> = [
  mockRegisterTool,
  mockSetRequestHandler,
  mockSetNotificationHandler,
  mockRequest,
  mockGetClientCapabilities,
  mockClose,
  McpServer,
  mockHandleClose,
  serveStdio,
  findMissingResourcePaths,
  ToolsManager,
  ResourceManager,
];

/** The factory serveStdio was handed on the most recent start(). */
function capturedFactory(): ServerFactory {
  const call = serveStdio.mock.calls.at(-1);
  if (!call) throw new Error('serveStdio was never called');
  return call.arguments[0];
}

describe('FluentMcpServer with Modular Design', () => {
  let server: InstanceType<typeof FluentMcpServer>;

  beforeEach(() => {
    for (const fn of allMocks) fn.mock.resetCalls();
    server = new FluentMcpServer();
  });

  it('should initialize correctly', () => {
    assert.ok(server);
    assert.ok(ToolsManager.mock.callCount() > 0);
    assert.ok(ResourceManager.mock.callCount() > 0);
  });

  it('should fail fast when required resource directories are missing', async () => {
    // Simulate a broken install: a configured resource directory cannot be resolved.
    findMissingResourcePaths.mock.mockImplementationOnce(() => ['/mock/path/to/spec']);

    await assert.rejects(server.start(), /Missing required resource directories/);
    assert.equal(server.getStatus(), ServerStatus.STOPPED);
  });

  // serveStdio owns the transport and the era decision; the server's only job is
  // to hand it a factory that satisfies its lifecycle contract.
  describe('server factory contract', () => {
    it('serves both eras from one factory', async () => {
      await server.start();

      assertCalledTimes(serveStdio, 1);
      const [factory, options] = serveStdio.mock.calls[0].arguments;
      assert.equal(typeof factory, 'function');
      // 'serve' (not 'reject') is what makes a 2025-era opening work.
      assert.equal(options?.legacy, 'serve');
    });

    it('builds no MCP server until the factory is invoked', async () => {
      await server.start();

      // Construction is deferred to the factory, so nothing is built up-front.
      assertNotCalled(McpServer);
    });

    it('returns a FRESH server instance on every factory call', async () => {
      // Load-bearing: serveStdio builds an optimistic instance to answer a
      // `server/discover` opening, then closes it and calls the factory AGAIN if
      // the client instead opens with a 2025-era `initialize`. A shared instance
      // would be handed back already closed.
      await server.start();
      const factory = capturedFactory();

      const first = factory();
      const second = factory();

      assertCalledTimes(McpServer, 2);
      assert.notEqual(first, second);
    });

    it('fully registers tools, prompts and resource handlers on each instance', async () => {
      await server.start();

      capturedFactory()();
      const methods = mockSetRequestHandler.mock.calls.map((call) => call.arguments[0]);

      assert.ok(methods.includes('tools/list'));
      assert.ok(methods.includes('resources/list'));
      assert.ok(methods.includes('resources/read'));
      // prompts/* come from PromptManager.registerOn, which is not mocked here.
      assert.ok(methods.includes('prompts/list'));
      assert.ok(methods.includes('prompts/get'));
      // tools/call is dispatched by registerTool, never hand-registered.
      assert.ok(!methods.includes('tools/call'));
      // resources/templates/list is deliberately left to the SDK's default so
      // the declared `resources` capability stays answerable rather than -32601.
      assert.ok(!methods.includes('resources/templates/list'));
    });

    it('stop() closes the transport handle', async () => {
      await server.start();

      await server.stop();

      assert.ok(mockHandleClose.mock.callCount() > 0);
      assert.equal(server.getStatus(), ServerStatus.STOPPED);
    });
  });

  // MCP 2026-07-28 (SEP-2322) forbids server-initiated requests, and SEP-2577
  // deprecated Roots. These tests assert the *direction* of the protocol
  // surface, not merely which handlers exist — the gap that let a server-side
  // `roots/list` handler and an outbound `roots/list_changed` notification ship
  // unnoticed, because nothing exercised them.
  describe('no server-initiated protocol traffic', () => {
    it('issues no server→client request while building an instance', async () => {
      // Even a client that advertises roots must not be asked for them.
      mockGetClientCapabilities.mock.mockImplementation(() => ({ roots: {}, elicitation: {} }));

      await server.start();
      capturedFactory()();

      assertNotCalled(mockRequest);
    });

    it('registers no notification handler', async () => {
      // The only notification handler this server ever had was
      // notifications/initialized, whose sole remaining job was triggering the
      // transitional roots fetch. 2026-07-28 removed that handshake entirely.
      await server.start();
      capturedFactory()();

      assertNotCalled(mockSetNotificationHandler);
    });

    it('exposes no roots API surface', () => {
      // Guards against reintroduction: the working directory now comes only from
      // the explicit tool argument, the initialized session, or
      // FLUENT_MCP_WORKING_DIR.
      const surface = server as unknown as Record<string, unknown>;
      assert.equal(surface.getRoots, undefined);
      assert.equal(surface.addRoot, undefined);
      assert.equal(surface.updateRoots, undefined);
      assert.equal(surface.requestRootsFromClient, undefined);
    });

    it('declares no client-side capability and no unsent listChanged', async () => {
      await server.start();
      capturedFactory()();

      const capabilities = McpServer.mock.calls[0].arguments[1]?.capabilities ?? {};
      assert.ok(!('roots' in capabilities));
      assert.ok(!('elicitation' in capabilities));
      assert.ok(!('sampling' in capabilities));
      assert.ok(!('logging' in capabilities));
      // v2 defaults each listChanged to true once it installs a handler set, so
      // these must be explicitly false — nothing here ever sends them.
      assert.equal(capabilities.tools?.listChanged, false);
      assert.equal(capabilities.resources?.listChanged, false);
      assert.equal(capabilities.prompts?.listChanged, false);
    });
  });
});
