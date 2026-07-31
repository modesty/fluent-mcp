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
  const mockUpdateRoots = jest.fn();
  
  return {
    ToolsManager: jest.fn().mockImplementation(() => ({
      getMCPTools: jest.fn().mockReturnValue([
        { id: "mock-tool", title: "Mock Tool", description: "A mock tool for testing" }
      ]),
      updateRoots: mockUpdateRoots
    })),
    mockUpdateRoots
  };
});

// Mock the ResourceManager
jest.mock("../../src/res/resourceManager.js", () => {
  return {
    ResourceManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      registerAll: jest.fn(),
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

  test("should request roots from client and handle response", async () => {
    // Get the direct reference to the mockRequest exported from the mock
    const { mockRequest, mockGetClientCapabilities } = require('@modelcontextprotocol/sdk/server/mcp.js');
    mockGetClientCapabilities.mockReturnValue({ roots: {} });
    
    // Clear any previous calls
    mockRequest.mockClear();
    
    // Mock the request response with roots
    mockRequest.mockImplementation((request: { method: string }, schema: any) => {
      if (request.method === 'roots/list') {
        return {
          roots: [
            { uri: 'file:///mock/client/root1', name: 'Client Root 1' },
            { uri: 'file:///mock/client/root2', name: 'Client Root 2' }
          ]
        };
      }
      return {};
    });
    
    await server.start();
    
    // Instead of trying to trigger the notification handler, 
    // directly call requestRootsFromClient method (it's private, but we can access it for testing)
    await (server as any).requestRootsFromClient();
    
    // Verify the request was made with correct parameters
    expect(mockRequest).toHaveBeenCalledWith(
      { method: 'roots/list' },
      expect.any(Object) // This will match the schema
    );
    
    // Get the roots
    const roots = server.getRoots();
    expect(roots).toHaveLength(2);
    expect(roots[0].uri).toBe('file:///mock/client/root1');
    expect(roots[0].name).toBe('Client Root 1');
    expect(roots[1].uri).toBe('file:///mock/client/root2');
    expect(roots[1].name).toBe('Client Root 2');
  });

  test("should not request roots when the client does not advertise the capability", async () => {
    const { mockRequest, mockGetClientCapabilities } = require('@modelcontextprotocol/sdk/server/mcp.js');
    mockRequest.mockClear();
    mockGetClientCapabilities.mockReturnValue({});

    await server.start();
    await (server as any).requestRootsFromClient();

    expect(mockRequest).not.toHaveBeenCalled();
    expect(server.getRoots()).toEqual([]);
  });
  
  test("should handle invalid response format from roots/list", async () => {
    // Create a completely new server for this test
    jest.clearAllMocks();
    server = new FluentMcpServer();
    
    // Mock an invalid response format
    const { mockRequest, mockGetClientCapabilities } = require('@modelcontextprotocol/sdk/server/mcp.js');
    mockGetClientCapabilities.mockReturnValue({ roots: {} });
    
    // Clear previous mock implementations
    mockRequest.mockReset();
    
    // Set up new mock that throws an error
    mockRequest.mockImplementation((request: { method: string }, schema: any) => {
      if (request.method === 'roots/list') {
        throw new Error('Invalid response format');
      }
      return {};
    });
    
    await server.start();
    
    // Directly call requestRootsFromClient instead of trying to trigger the notification handler
    await (server as any).requestRootsFromClient();
    
    // Invalid roots must not silently become the installed package directory.
    const roots = server.getRoots();
    expect(roots).toEqual([]);
  });
  
  describe("Root capability", () => {
    const { mockUpdateRoots } = require("../../src/tools/toolsManager.js");
    
    beforeEach(() => {
      // Reset mockUpdateRoots to ensure clean state for each test
      mockUpdateRoots.mockClear();
    });
    
    test("should not invent a package-directory root when the client has none", async () => {
      const { mockGetClientCapabilities } = require('@modelcontextprotocol/sdk/server/mcp.js');
      mockGetClientCapabilities.mockReturnValue({});
      await server.start();
      
      // Directly call requestRootsFromClient instead of trying to trigger the notification handler
      await (server as any).requestRootsFromClient();
      
      const roots = server.getRoots();
      expect(roots).toEqual([]);
      expect(mockUpdateRoots).not.toHaveBeenCalled();
    });
    
    test("should add a new root", async () => {
      // Clear mockUpdateRoots calls from previous test
      mockUpdateRoots.mockClear();
      
      // Set the server status to RUNNING to ensure notifications are sent
      // This mimics the real server behavior where roots are only updated when running
      Object.defineProperty(server, 'status', { value: ServerStatus.RUNNING });
      
      await server.addRoot("/test/path", "Test Root");
      const roots = server.getRoots();
      expect(roots).toHaveLength(1);
      expect(roots[0].uri).toBe("/test/path");
      expect(roots[0].name).toBe("Test Root");
      expect(mockUpdateRoots).toHaveBeenCalled();
    });
    
    test("should update an existing root", async () => {
      // Clear mockUpdateRoots calls from previous test
      mockUpdateRoots.mockClear();
      
      // Set the server status to RUNNING to ensure notifications are sent
      Object.defineProperty(server, 'status', { value: ServerStatus.RUNNING });
      
      await server.addRoot("/test/path", "Test Root");
      await server.addRoot("/test/path", "Updated Root Name");
      const roots = server.getRoots();
      expect(roots).toHaveLength(1);
      expect(roots[0].uri).toBe("/test/path");
      expect(roots[0].name).toBe("Updated Root Name");
      expect(mockUpdateRoots).toHaveBeenCalledTimes(2);
    });
    
    test("should update multiple roots", async () => {
      // Clear mockUpdateRoots calls from previous test
      mockUpdateRoots.mockClear();
      
      // Set the server status to RUNNING to ensure notifications are sent
      Object.defineProperty(server, 'status', { value: ServerStatus.RUNNING });
      
      const newRoots = [
        { uri: "/root1", name: "Root 1" },
        { uri: "/root2", name: "Root 2" }
      ];
      await server.updateRoots(newRoots);
      const roots = server.getRoots();
      expect(roots).toHaveLength(2);
      expect(roots[0].uri).toBe("/root1");
      expect(roots[1].uri).toBe("/root2");
      expect(mockUpdateRoots).toHaveBeenCalled();
    });
  });
});
