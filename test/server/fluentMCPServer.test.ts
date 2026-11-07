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
import { assertCalledTimes, assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture } from '../support/fixtures.js';

type ServerFactory = () => unknown;

// --- MCP SDK ----------------------------------------------------------------

const mockRegisterTool = mock.fn();
const mockRegisterPrompt = mock.fn();
const mockSetRequestHandler = mock.fn();
const mockSetNotificationHandler = mock.fn();
const mockClose = mock.fn();

type ServerOptions = { capabilities: Record<string, Record<string, unknown> | undefined> };

const McpServer = mock.fn(function (_info?: unknown, _options?: ServerOptions) {
  return {
    registerTool: mockRegisterTool,
    registerPrompt: mockRegisterPrompt,
    connect: mock.fn(),
    close: mockClose,
    server: {
      setRequestHandler: mockSetRequestHandler,
      setNotificationHandler: mockSetNotificationHandler,
    },
  };
});
// PromptManager builds its argument schemas with `completable`; the identity
// stand-in is enough here because completion is covered over the wire.
const completable = (schema: unknown) => schema;
mock.module('@modelcontextprotocol/server', { namedExports: { McpServer, completable } });

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
// The shipped res/prompt files load from the real project root (the runner's cwd).
config.getProjectRootPath.mock.mockImplementation(() => process.cwd());
mock.module('../../src/config.js', config.mockOptions);
const { findMissingResourcePaths } = config;

const mockToolsRegisterOn = mock.fn();
const ToolsManager = mock.fn(function () {
  return { registerOn: mockToolsRegisterOn };
});
mock.module('../../src/tools/toolsManager.js', { namedExports: { ToolsManager } });

const mockResourceRegisterOn = mock.fn();
const ResourceManager = mock.fn(function () {
  return { registerOn: mockResourceRegisterOn };
});
mock.module('../../src/res/resourceManager.js', { namedExports: { ResourceManager } });

const ResourceCatalog = mock.fn(function () {
  return { load: mock.fn(async () => ({ types: [], spec: new Map(), instruct: new Map(), snippets: new Map() })) };
});
mock.module('../../src/res/resourceCatalog.js', { namedExports: { ResourceCatalog } });

const { logger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

const { FluentMcpServer } = await import('../../src/server/fluentMCPServer.js');

const allMocks: Array<{ mock: { resetCalls(): void } }> = [
  mockRegisterTool,
  mockRegisterPrompt,
  mockSetRequestHandler,
  mockSetNotificationHandler,
  mockClose,
  McpServer,
  mockHandleClose,
  serveStdio,
  findMissingResourcePaths,
  ToolsManager,
  mockToolsRegisterOn,
  ResourceManager,
  mockResourceRegisterOn,
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
    for (const level of Object.values(logger)) level.mock.resetCalls();
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
    assertNotCalled(serveStdio);
    assert.ok(logger.error.mock.calls.some(({ arguments: args }) => args[0] === 'Failed to start MCP server'));

    // Nothing is left running, so the next start() serves.
    await server.start();
    assertCalledTimes(serveStdio, 1);
  });

  describe('lifecycle', () => {
    it('a second start() is a no-op while running', async () => {
      await server.start();
      await server.start();

      assertCalledTimes(serveStdio, 1);
      assertCalledWith(logger.info, 'MCP server is already running');
    });

    it('stop() before start() is a no-op', async () => {
      await server.stop();

      assertNotCalled(mockHandleClose);
      assertCalledWith(logger.info, 'MCP server is not running');
    });

    it('stop() closes the handle once; the server can then start again', async () => {
      await server.start();
      await server.stop();
      await server.stop();

      assertCalledTimes(mockHandleClose, 1);
      assertCalledWith(logger.info, 'MCP server stopped');
      assertCalledWith(logger.info, 'MCP server is not running');

      await server.start();
      assertCalledTimes(serveStdio, 2);
    });

    it('a failed close still leaves the server stopped', async () => {
      await server.start();
      mockHandleClose.mock.mockImplementationOnce(async () => {
        throw new Error('close failed');
      });

      await assert.rejects(server.stop(), /close failed/);
      assert.ok(logger.error.mock.calls.some(({ arguments: args }) => args[0] === 'Error stopping MCP server'));

      await server.start();
      assertCalledTimes(serveStdio, 2);
    });
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
      const factory = capturedFactory();

      // Two instances, as serveStdio builds for a discover probe followed by a
      // legacy initialize: each must carry the full registration.
      const instances = [factory(), factory()];

      // Tools are registered through registerTool; the SDK serves tools/list
      // and tools/call from them.
      assert.deepEqual(mockToolsRegisterOn.mock.calls.map((call) => call.arguments[0]), instances);
      // Resources are registered as SDK templates; the SDK serves every
      // resources/* method and completion/complete from them.
      assert.deepEqual(mockResourceRegisterOn.mock.calls.map((call) => call.arguments[0]), instances);
      // Prompts go through registerPrompt (PromptManager is not mocked here);
      // the SDK serves prompts/* and completion/complete from them.
      assert.deepEqual(mockRegisterPrompt.mock.calls.map((call) => call.arguments[0]),
        ['coding_in_fluent', 'create_custom_ui', 'coding_in_fluent', 'create_custom_ui']);
      // No method is hand-registered.
      assertCalledTimes(mockSetRequestHandler, 0);
    });
  });

  // MCP 2026-07-28 (SEP-2322) forbids server-initiated requests, and SEP-2577
  // deprecated Roots. These tests assert the *direction* of the protocol
  // surface, not merely which handlers exist — the gap that let a server-side
  // `roots/list` handler and an outbound `roots/list_changed` notification ship
  // unnoticed, because nothing exercised them. That no server→client request is
  // ever sent is checked on the wire (wireProtocol.test.ts,
  // serverInitiatedRequests()); this suite checks what the factory declares.
  describe('no server-initiated protocol traffic', () => {
    it('registers no notification handler', async () => {
      // The only notification handler this server ever had was
      // notifications/initialized, whose sole remaining job was triggering the
      // transitional roots fetch. 2026-07-28 removed that handshake entirely.
      await server.start();
      capturedFactory()();

      assertNotCalled(mockSetNotificationHandler);
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
