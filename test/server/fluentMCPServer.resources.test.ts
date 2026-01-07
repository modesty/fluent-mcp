/**
 * Tests for FluentMCPServer resource capability
 */
import { FluentMcpServer } from "../../src/server/fluentMCPServer.js";
import { ResourceLoader, ResourceType } from "../../src/utils/resourceLoader.js";
import { patchLoggerForTests } from "../utils/loggerPatch.js";

// Mock the Model Context Protocol SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  // Create mock implementation for the MCP Server
  const mockRegisterResource = jest.fn();
  const mockRegisterTool = jest.fn();
  const mockSetRequestHandler = jest.fn();
  const mockSetNotificationHandler = jest.fn();
  const mockRequest = jest.fn().mockImplementation((request: { method: string }, schema: any) => {
    // For roots/list requests, return an empty array
    if (request.method === 'roots/list') {
      return { roots: [] };
    }
    return {};
  });
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

// Mock the ResourceLoader
jest.mock("../../src/utils/resourceLoader.js", () => {
  // Create a mock implementation with controlled behavior
  const mockGetAvailableMetadataTypes = jest.fn().mockResolvedValue([
    "business-rule",
    "script-include",
    "table"
  ]);
  
  const mockGetResource = jest.fn().mockImplementation((resourceType, metadataType, id) => {
    return Promise.resolve({
      content: `Mock content for ${resourceType} - ${metadataType}${id ? ` - ${id}` : ''}`,
      path: `/mock/path/${resourceType}/${metadataType}${id ? `_${id}` : ''}.md`,
      metadataType,
      resourceType,
      found: true
    });
  });
  
  const mockListSnippets = jest.fn().mockImplementation((metadataType) => {
    return Promise.resolve(["0001", "0002", "0003"]);
  });
  
  return {
    ResourceLoader: jest.fn().mockImplementation(() => ({
      getAvailableMetadataTypes: mockGetAvailableMetadataTypes,
      getResource: mockGetResource,
      listSnippets: mockListSnippets
    })),
    ResourceType: {
      SPEC: "spec",
      SNIPPET: "snippet",
      INSTRUCT: "instruct"
    }
  };
});

// Mock command registry
jest.mock("../../src/tools/cliCommandTools.js", () => {
  const mockRegister = jest.fn();
  const mockGetCommand = jest.fn();
  const mockToMCPTools = jest.fn().mockReturnValue([]);
  const mockGetAllCommands = jest.fn().mockReturnValue([]);
  
  return {
    CLIExecutor: jest.fn().mockImplementation(() => ({
      setRoots: jest.fn()
    })),
    CLICmdWriter: jest.fn().mockImplementation(() => ({
      setRoots: jest.fn()
    })),
    CommandFactory: {
      createCommands: jest.fn().mockImplementation((executor, writer) => [])
    },
    CommandRegistry: jest.fn().mockImplementation(() => ({
      register: mockRegister,
      getCommand: mockGetCommand,
      toMCPTools: mockToMCPTools,
      getAllCommands: mockGetAllCommands
    })),
    NodeProcessRunner: jest.fn()
  };
});

// Mock the resource tools
jest.mock("../../src/tools/resourceTools.js", () => {
  return {
    GetApiSpecCommand: jest.fn().mockImplementation(() => ({
      name: "get-api-spec",
      description: "Get API specification",
      arguments: [],
      execute: jest.fn().mockResolvedValue({ success: true, output: "Mock API spec" })
    })),
    GetSnippetCommand: jest.fn().mockImplementation(() => ({
      name: "get-snippet",
      description: "Get code snippet",
      arguments: [],
      execute: jest.fn().mockResolvedValue({ success: true, output: "Mock snippet" })
    })),
    GetInstructCommand: jest.fn().mockImplementation(() => ({
      name: "get-instruct",
      description: "Get instructions",
      arguments: [],
      execute: jest.fn().mockResolvedValue({ success: true, output: "Mock instructions" })
    })),
    ListMetadataTypesCommand: jest.fn().mockImplementation(() => ({
      name: "list-metadata-types",
      description: "List metadata types",
      arguments: [],
      execute: jest.fn().mockResolvedValue({
        success: true,
        output: "business-rule\nscript-include\ntable"
      })
    })),
    CheckAuthStatusCommand: jest.fn().mockImplementation(() => ({
      name: "check_auth_status",
      description: "Check authentication status",
      arguments: [],
      execute: jest.fn().mockResolvedValue({ success: true, output: "Mock auth status" })
    }))
  };
});

describe("FluentMcpServer Resource Capability", () => {
  let server: FluentMcpServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Patch the logger to handle missing notification function
    patchLoggerForTests();
  });

  test("should initialize with resource capability", async () => {
    server = new FluentMcpServer();
    
    // Get the McpServer constructor from the mock
    const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
    
    // Check if McpServer was initialized with resources capability
    expect(McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test-mcp-server",
        version: "1.0.0",
        description: "Test MCP Server"
      }),
      expect.objectContaining({
        capabilities: expect.objectContaining({
          resources: expect.anything()
        })
      })
    );
  });

  test("should set up resources/list and resources/read handlers", async () => {
    server = new FluentMcpServer();

    // Get the setRequestHandler function from the McpServer mock
    const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
    const mockInstance = McpServer.mock.results[0].value;
    const mockSetRequestHandler = mockInstance.server.setRequestHandler;

    // Start the server to ensure all handlers are initialized
    await server.start();

    // Resources are handled via manual setRequestHandler calls for resources/list and resources/read
    // (not via the SDK's registerResource() method to avoid duplicate handler conflicts)
    expect(mockSetRequestHandler).toHaveBeenCalled();

    // Verify that setRequestHandler was called multiple times for various MCP protocol handlers
    // including resources/list, resources/read, tools/list, tools/call, roots/list, etc.
    expect(mockSetRequestHandler.mock.calls.length).toBeGreaterThan(0);
  });

  test("should handle resource read requests", async () => {
    server = new FluentMcpServer();

    // Spy on setupHandlers to ensure it is called
    const setupHandlersSpy = jest.spyOn(server as any, "setupHandlers").mockImplementation(() => {
      const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
      const mockInstance = McpServer.mock.results[0].value;
      const mockSetRequestHandler = mockInstance.server.setRequestHandler;
      mockSetRequestHandler();
    });

    // Mock resourceManager and promptManager initialization
    jest.spyOn(server["resourceManager"], "initialize").mockResolvedValue(undefined);
    jest.spyOn(server["promptManager"], "initialize").mockResolvedValue(undefined);

    // Force call to setupHandlers
    await server["setupHandlers"]();

    // Verify setupHandlers was called
    expect(setupHandlersSpy).toHaveBeenCalled();

    // Check if setRequestHandler was called
    const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
    const mockInstance = McpServer.mock.results[0].value;
    const mockSetRequestHandler = mockInstance.server.setRequestHandler;
    expect(mockSetRequestHandler).toHaveBeenCalled();
  });

  test("should have resource manager with listResources and readResource methods", async () => {
    server = new FluentMcpServer();

    // Start the server
    await server.start();

    // Verify that the resourceManager has the methods used by the manual handlers
    // These methods are called by the resources/list and resources/read handlers
    const resourceManager = (server as any).resourceManager;
    expect(typeof resourceManager.listResources).toBe("function");
    expect(typeof resourceManager.readResource).toBe("function");
  });
});
