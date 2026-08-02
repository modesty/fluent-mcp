/**
 * Tests for FluentMcpServer's server-factory contract.
 *
 * Real end-to-end protocol behaviour is covered over an actual transport in
 * wireProtocol.test.ts. This file covers what a wire test cannot easily force:
 * the lifecycle contract `serveStdio` imposes on the factory, and the absence of
 * protocol surface that must never come back.
 */
import { FluentMcpServer } from "../../src/server/fluentMCPServer.js";
import { ToolsManager } from "../../src/tools/toolsManager.js";
import { ResourceManager } from "../../src/res/resourceManager.js";
import { ServerStatus } from "../../src/types.js";

type ServerFactory = () => unknown;

// Mock the MCP server so each construction is observable.
jest.mock("@modelcontextprotocol/server", () => {
  const mockRegisterTool = jest.fn();
  const mockSetRequestHandler = jest.fn();
  const mockSetNotificationHandler = jest.fn();
  const mockRequest = jest.fn();
  const mockGetClientCapabilities = jest.fn().mockReturnValue({ roots: {} });
  const mockClose = jest.fn();

  return {
    __esModule: true,
    mockSetRequestHandler,
    mockSetNotificationHandler,
    mockRequest,
    mockGetClientCapabilities,
    McpServer: jest.fn().mockImplementation(() => ({
      registerTool: mockRegisterTool,
      connect: jest.fn(),
      close: mockClose,
      server: {
        setRequestHandler: mockSetRequestHandler,
        setNotificationHandler: mockSetNotificationHandler,
        request: mockRequest,
        getClientCapabilities: mockGetClientCapabilities,
      },
    })),
  };
});

// Capture the factory serveStdio is given, plus the handle it returns.
jest.mock("@modelcontextprotocol/server/stdio", () => {
  const mockHandleClose = jest.fn().mockResolvedValue(undefined);
  const serveStdio = jest.fn().mockImplementation(() => ({ close: mockHandleClose }));
  return { __esModule: true, serveStdio, mockHandleClose };
});

// Mock the config
jest.mock('../../src/config.js', () => ({
  getConfig: jest.fn().mockReturnValue({
    name: "test-mcp-server",
    version: "1.0.0",
    description: "Test MCP Server",
    resourcePaths: {
      spec: "/mock/path/to/spec",
      snippet: "/mock/path/to/snippet",
      instruct: "/mock/path/to/instruct",
    }
  }),
  getProjectRootPath: jest.fn().mockReturnValue("/mock/project/root"),
  findMissingResourcePaths: jest.fn().mockReturnValue([])
}));

// Mock the ToolsManager
jest.mock("../../src/tools/toolsManager.js", () => {
  return {
    ToolsManager: jest.fn().mockImplementation(() => ({
      getMCPTools: jest.fn().mockReturnValue([
        { name: "mock-tool", description: "A mock tool", inputSchema: { type: "object" } }
      ]),
      registerOn: jest.fn()
    }))
  };
});

// Mock the ResourceManager
jest.mock("../../src/res/resourceManager.js", () => {
  return {
    ResourceManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      listResources: jest.fn().mockResolvedValue([]),
      readResource: jest.fn().mockResolvedValue({ contents: [] })
    }))
  };
});

// Mock logger with LogLevel enum
jest.mock("../../src/utils/logger.js", () => {
  const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    NOTICE: 'notice',
    WARNING: 'warning',
    WARN: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
    ALERT: 'alert',
    EMERGENCY: 'emergency',
  };

  return {
    LogLevel,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    __esModule: true,
    default: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
  };
});

/** The factory serveStdio was handed on the most recent start(). */
function capturedFactory(): ServerFactory {
  const { serveStdio } = require("@modelcontextprotocol/server/stdio");
  const call = (serveStdio as jest.Mock).mock.calls.at(-1);
  if (!call) throw new Error('serveStdio was never called');
  return call[0] as ServerFactory;
}

describe("FluentMcpServer with Modular Design", () => {
  let server: FluentMcpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new FluentMcpServer();
  });

  test("should initialize correctly", () => {
    expect(server).toBeDefined();
    expect(ToolsManager).toHaveBeenCalled();
    expect(ResourceManager).toHaveBeenCalled();
  });

  test("should fail fast when required resource directories are missing", async () => {
    const { findMissingResourcePaths } = require("../../src/config.js");
    // Simulate a broken install: a configured resource directory cannot be resolved.
    findMissingResourcePaths.mockReturnValueOnce(["/mock/path/to/spec"]);

    await expect(server.start()).rejects.toThrow(/Missing required resource directories/);
    expect(server.getStatus()).toBe(ServerStatus.STOPPED);
  });

  // serveStdio owns the transport and the era decision; the server's only job is
  // to hand it a factory that satisfies its lifecycle contract.
  describe("server factory contract", () => {
    test("serves both eras from one factory", async () => {
      const { serveStdio } = require("@modelcontextprotocol/server/stdio");

      await server.start();

      expect(serveStdio).toHaveBeenCalledTimes(1);
      const [factory, options] = (serveStdio as jest.Mock).mock.calls[0];
      expect(typeof factory).toBe('function');
      // 'serve' (not 'reject') is what makes a 2025-era opening work.
      expect(options.legacy).toBe('serve');
    });

    test("builds no MCP server until the factory is invoked", async () => {
      const { McpServer } = require("@modelcontextprotocol/server");

      await server.start();

      // Construction is deferred to the factory, so nothing is built up-front.
      expect(McpServer).not.toHaveBeenCalled();
    });

    test("returns a FRESH server instance on every factory call", async () => {
      // Load-bearing: serveStdio builds an optimistic instance to answer a
      // `server/discover` opening, then closes it and calls the factory AGAIN if
      // the client instead opens with a 2025-era `initialize`. A shared instance
      // would be handed back already closed.
      const { McpServer } = require("@modelcontextprotocol/server");
      await server.start();
      const factory = capturedFactory();

      const first = factory();
      const second = factory();

      expect(McpServer).toHaveBeenCalledTimes(2);
      expect(first).not.toBe(second);
    });

    test("fully registers tools, prompts and resource handlers on each instance", async () => {
      const { mockSetRequestHandler } = require("@modelcontextprotocol/server");
      await server.start();

      capturedFactory()();
      const methods = mockSetRequestHandler.mock.calls.map(([method]: [string]) => method);

      expect(methods).toContain('tools/list');
      expect(methods).toContain('resources/list');
      expect(methods).toContain('resources/read');
      // prompts/* come from PromptManager.registerOn, which is not mocked here.
      expect(methods).toContain('prompts/list');
      expect(methods).toContain('prompts/get');
      // tools/call is dispatched by registerTool, never hand-registered.
      expect(methods).not.toContain('tools/call');
      // resources/templates/list is deliberately left to the SDK's default so
      // the declared `resources` capability stays answerable rather than -32601.
      expect(methods).not.toContain('resources/templates/list');
    });

    test("stop() closes the transport handle", async () => {
      const { mockHandleClose } = require("@modelcontextprotocol/server/stdio");
      await server.start();

      await server.stop();

      expect(mockHandleClose).toHaveBeenCalled();
      expect(server.getStatus()).toBe(ServerStatus.STOPPED);
    });
  });

  // MCP 2026-07-28 (SEP-2322) forbids server-initiated requests, and SEP-2577
  // deprecated Roots. These tests assert the *direction* of the protocol
  // surface, not merely which handlers exist — the gap that let a server-side
  // `roots/list` handler and an outbound `roots/list_changed` notification ship
  // unnoticed, because nothing exercised them.
  describe("no server-initiated protocol traffic", () => {
    test("issues no server→client request while building an instance", async () => {
      const { mockRequest, mockGetClientCapabilities } = require('@modelcontextprotocol/server');
      // Even a client that advertises roots must not be asked for them.
      mockGetClientCapabilities.mockReturnValue({ roots: {}, elicitation: {} });

      await server.start();
      capturedFactory()();

      expect(mockRequest).not.toHaveBeenCalled();
    });

    test("registers no notification handler", async () => {
      // The only notification handler this server ever had was
      // notifications/initialized, whose sole remaining job was triggering the
      // transitional roots fetch. 2026-07-28 removed that handshake entirely.
      const { mockSetNotificationHandler } = require('@modelcontextprotocol/server');

      await server.start();
      capturedFactory()();

      expect(mockSetNotificationHandler).not.toHaveBeenCalled();
    });

    test("exposes no roots API surface", () => {
      // Guards against reintroduction: the working directory now comes only from
      // the explicit tool argument, the initialized session, or
      // FLUENT_MCP_WORKING_DIR.
      const surface = server as unknown as Record<string, unknown>;
      expect(surface.getRoots).toBeUndefined();
      expect(surface.addRoot).toBeUndefined();
      expect(surface.updateRoots).toBeUndefined();
      expect(surface.requestRootsFromClient).toBeUndefined();
    });

    test("declares no client-side capability and no unsent listChanged", async () => {
      const { McpServer } = require('@modelcontextprotocol/server');
      await server.start();
      capturedFactory()();

      const options = (McpServer as jest.Mock).mock.calls[0][1];
      expect(options.capabilities).not.toHaveProperty('roots');
      expect(options.capabilities).not.toHaveProperty('elicitation');
      expect(options.capabilities).not.toHaveProperty('sampling');
      expect(options.capabilities).not.toHaveProperty('logging');
      // v2 defaults each listChanged to true once it installs a handler set, so
      // these must be explicitly false — nothing here ever sends them.
      expect(options.capabilities.tools.listChanged).toBe(false);
      expect(options.capabilities.resources.listChanged).toBe(false);
      expect(options.capabilities.prompts.listChanged).toBe(false);
    });
  });
});
