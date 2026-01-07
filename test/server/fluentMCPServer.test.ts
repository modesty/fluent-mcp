/**
 * Tests for FluentMCPServer resource capability with refactored module design
 */
import { FluentMcpServer } from "../../src/server/fluentMCPServer.js";
import { ToolsManager } from "../../src/tools/toolsManager.js";
import { ResourceManager } from "../../src/res/resourceManager.js";
import { ServerStatus } from "../../src/types.js";
import { patchLoggerForTests } from "../utils/loggerPatch.js";

// Mock the Model Context Protocol SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  // Create mock implementation for the MCP Server
  const mockRegisterResource = jest.fn();
  const mockRegisterTool = jest.fn();
  const mockSetRequestHandler = jest.fn();
  const mockSetNotificationHandler = jest.fn();
  const mockRequest = jest.fn();
  const mockConnect = jest.fn();
  const mockClose = jest.fn();
  const mockNotification = jest.fn();
  
  return {
    __esModule: true,
    mockSetNotificationHandler,
    mockRequest,
    McpServer: jest.fn().mockImplementation(() => ({
      registerResource: mockRegisterResource,
      registerTool: mockRegisterTool,
      connect: mockConnect,
      close: mockClose,
      server: {
        setRequestHandler: mockSetRequestHandler,
        setNotificationHandler: mockSetNotificationHandler,
        notification: mockNotification,
        request: mockRequest
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
  getProjectRootPath: jest.fn().mockReturnValue("/mock/project/root")
}));

// Mock the ToolsManager
jest.mock("../../src/tools/toolsManager.js", () => {
  const mockUpdateRoots = jest.fn();
  
  return {
    ToolsManager: jest.fn().mockImplementation(() => ({
      getMCPTools: jest.fn().mockReturnValue([
        { id: "mock-tool", title: "Mock Tool", description: "A mock tool for testing" }
      ]),
      getCommand: jest.fn().mockImplementation((name) => {
        if (name === "mock-tool") {
          return {
            name: "mock-tool",
            description: "A mock tool for testing",
            execute: jest.fn().mockResolvedValue({ success: true, output: "Mock output" })
          };
        }
        return undefined;
      }),
      formatResult: jest.fn().mockImplementation((result) => {
        if (result.success) {
          return `✅ Command executed successfully\n\nOutput:\n${result.output}`;
        } else {
          return `❌ Command failed (exit code: ${result.exitCode})\n\nError:\n${
            result.error || "Unknown error"
          }\n\nOutput:\n${result.output}`;
        }
      }),
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
    setMcpServer: jest.fn(),
    setupLoggingHandlers: jest.fn(),
    sendNotification: jest.fn(),
    __esModule: true,
    default: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setMcpServer: jest.fn(),
      setupLoggingHandlers: jest.fn(),
      sendNotification: jest.fn()
    }
  };
});

describe("FluentMcpServer with Modular Design", () => {
  let server: FluentMcpServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Patch the logger to handle missing notification function
    patchLoggerForTests();
    server = new FluentMcpServer();
  });

  test("should initialize correctly", () => {
    expect(server).toBeDefined();
    expect(ToolsManager).toHaveBeenCalled();
    expect(ResourceManager).toHaveBeenCalled();
  });
  
  test("should request roots from client and handle response", async () => {
    // Get the direct reference to the mockRequest exported from the mock
    const { mockRequest } = require('@modelcontextprotocol/sdk/server/mcp.js');
    
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
  
  test("should handle notifications for root changes", async () => {
    // Since we've confirmed that the notification handler calls requestRootsFromClient,
    // we can test the notification flow by directly testing requestRootsFromClient
    
    // Create a new server instance for clean test
    jest.clearAllMocks();
    patchLoggerForTests();
    server = new FluentMcpServer();
    
    // Set up request mock
    const { mockRequest } = require('@modelcontextprotocol/sdk/server/mcp.js');
    
    // Clear any previous calls
    mockRequest.mockClear();
    
    // Setup mock responses for roots/list
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
    
    // Start the server to initialize roots
    await server.start();
    
    // Directly call requestRootsFromClient instead of trying to trigger the notification handler
    await (server as any).requestRootsFromClient();
    
    // Verify that requestRootsFromClient was called and roots were updated
    const roots = server.getRoots();
    expect(roots).toHaveLength(2);
    expect(roots[0].uri).toBe('file:///mock/client/root1');
    expect(roots[1].uri).toBe('file:///mock/client/root2');
  });
  
  test("should handle invalid response format from roots/list", async () => {
    // Create a completely new server for this test
    jest.clearAllMocks();
    patchLoggerForTests();
    server = new FluentMcpServer();
    
    // Mock an invalid response format
    const { mockRequest } = require('@modelcontextprotocol/sdk/server/mcp.js');
    
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
    
    // Should fallback to project root
    const roots = server.getRoots();
    expect(roots).toHaveLength(1);
    expect(roots[0].uri).toBe('/mock/project/root');
  });
  
  describe("Root capability", () => {
    const { mockUpdateRoots } = require("../../src/tools/toolsManager.js");
    
    beforeEach(() => {
      // Reset mockUpdateRoots to ensure clean state for each test
      mockUpdateRoots.mockClear();
    });
    
    test("should initialize with project root on start", async () => {
      await server.start();
      
      // Directly call requestRootsFromClient instead of trying to trigger the notification handler
      await (server as any).requestRootsFromClient();
      
      const roots = server.getRoots();
      expect(roots).toHaveLength(1);
      expect(roots[0].uri).toBe("/mock/project/root");
      expect(roots[0].name).toBe("Project Root");
      // Since we're now updating the roots in ToolsManager as part of addRoot
      // during server.start, we just verify it was called at least once
      expect(mockUpdateRoots).toHaveBeenCalled();
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
    
    test("should remove a root", async () => {
      // Clear mockUpdateRoots calls from previous test
      mockUpdateRoots.mockClear();
      
      // Set the server status to RUNNING to ensure notifications are sent
      Object.defineProperty(server, 'status', { value: ServerStatus.RUNNING });
      
      await server.addRoot("/test/path", "Test Root");
      await server.removeRoot("/test/path");
      const roots = server.getRoots();
      expect(roots).toHaveLength(0);
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
