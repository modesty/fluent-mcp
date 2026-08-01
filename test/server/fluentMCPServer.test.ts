/**
 * Tests for FluentMCPServer resource capability with refactored module design
 */
import { FluentMcpServer } from "../../src/server/fluentMCPServer.js";
import { ToolsManager } from "../../src/tools/toolsManager.js";
import { ResourceManager } from "../../src/res/resourceManager.js";
import { ServerStatus } from "../../src/types.js";

// Mock the Model Context Protocol SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  // Create mock implementation for the MCP Server
  const mockRegisterResource = jest.fn();
  const mockRegisterTool = jest.fn();
  const mockSetRequestHandler = jest.fn();
  const mockSetNotificationHandler = jest.fn();
  const mockRequest = jest.fn();
  const mockGetClientCapabilities = jest.fn().mockReturnValue({ roots: {} });
  const mockConnect = jest.fn();
  const mockClose = jest.fn();
  const mockNotification = jest.fn();
  
  return {
    __esModule: true,
    mockSetNotificationHandler,
    mockRequest,
    mockGetClientCapabilities,
    McpServer: jest.fn().mockImplementation(() => ({
      registerResource: mockRegisterResource,
      registerTool: mockRegisterTool,
      connect: mockConnect,
      close: mockClose,
      server: {
        setRequestHandler: mockSetRequestHandler,
        setNotificationHandler: mockSetNotificationHandler,
        notification: mockNotification,
        request: mockRequest,
        getClientCapabilities: mockGetClientCapabilities,
      }
    })),
    ResourceTemplate: jest.fn().mockImplementation((template, options) => ({
      template,
      options
    }))
  };
});

// Mock the StdioServerTransport
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: jest.fn().mockImplementation(() => ({}))
  };
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
        { id: "mock-tool", title: "Mock Tool", description: "A mock tool for testing" }
      ])
    }))
  };
});

// Mock the ResourceManager
jest.mock("../../src/res/resourceManager.js", () => {
  return {
    ResourceManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      listResources: jest.fn().mockResolvedValue([
        {
          uri: "sn-spec://business-rule",
          title: "business-rule API Specification for Fluent (ServiceNow SDK)",
          mimeType: "text/markdown"
        },
        {
          uri: "sn-instruct://business-rule",
          title: "business-rule Instructions for Fluent (ServiceNow SDK)",
          mimeType: "text/markdown"
        },
        {
          uri: "sn-snippet://business-rule/0001",
          title: "business-rule Code Snippet for Fluent (ServiceNow SDK)",
          mimeType: "text/markdown"
        }
      ])
    }))
  };
});

// Mock logger with LogLevel enum
jest.mock("../../src/utils/logger.js", () => {
  // Define LogLevel enum for the mock
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

describe("FluentMcpServer with Modular Design", () => {
  let server: FluentMcpServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    const { mockGetClientCapabilities } = require('@modelcontextprotocol/sdk/server/mcp.js');
    mockGetClientCapabilities.mockReturnValue({ roots: {} });
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

  // MCP 2026-07-28 (SEP-2322) forbids server-initiated requests, and SEP-2577
  // deprecated Roots. These tests assert the *direction* of the protocol
  // surface, not merely which handlers exist — the gap that let a server-side
  // `roots/list` handler and an outbound `roots/list_changed` notification ship
  // unnoticed, because nothing exercised them.
  describe("no server-initiated protocol traffic", () => {
    test("issues no server→client request at any point in startup", async () => {
      const { mockRequest, mockGetClientCapabilities } = require('@modelcontextprotocol/sdk/server/mcp.js');
      mockRequest.mockClear();
      // Even a client that advertises roots must not be asked for them.
      mockGetClientCapabilities.mockReturnValue({ roots: {}, elicitation: {} });

      await server.start();

      expect(mockRequest).not.toHaveBeenCalled();
    });

    test("registers no notification handler", async () => {
      // The only notification handler this server ever had was
      // notifications/initialized, whose sole remaining job was triggering the
      // transitional roots fetch. 2026-07-28 removed that handshake entirely.
      const { mockSetNotificationHandler } = require('@modelcontextprotocol/sdk/server/mcp.js');
      mockSetNotificationHandler.mockClear();

      await server.start();

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

    test("does not advertise roots or elicitation as server capabilities", () => {
      const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
      const options = (McpServer as jest.Mock).mock.calls[0][1];
      expect(options.capabilities).not.toHaveProperty('roots');
      expect(options.capabilities).not.toHaveProperty('elicitation');
      expect(options.capabilities).not.toHaveProperty('sampling');
      expect(options.capabilities).not.toHaveProperty('logging');
    });
  });
});
