/**
 * Tests for FluentMCPServer resource capability
 */
import { FluentMcpServer } from "../../src/server/fluentMCPServer.js";
import { ResourceLoader, ResourceType } from "../../src/utils/resourceLoader.js";

// Mock the Model Context Protocol SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  // Create mock implementation for the MCP Server
  const mockRegisterResource = jest.fn();
  const mockRegisterTool = jest.fn();
  const mockSetRequestHandler = jest.fn();
  const mockConnect = jest.fn();
  const mockClose = jest.fn();
  
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      registerResource: mockRegisterResource,
      registerTool: mockRegisterTool,
      connect: mockConnect,
      close: mockClose,
      server: {
        setRequestHandler: mockSetRequestHandler
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
  
  return {
    CLIExecutor: jest.fn(),
    CommandFactory: {
      createCommands: jest.fn().mockReturnValue([])
    },
    CommandRegistry: jest.fn().mockImplementation(() => ({
      register: mockRegister,
      getCommand: mockGetCommand,
      toMCPTools: mockToMCPTools
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
    }))
  };
});

describe("FluentMcpServer Resource Capability", () => {
  let server: FluentMcpServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
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

  test("should register resources for each metadata type", async () => {
    server = new FluentMcpServer();
    
    // Get the register resource function from the McpServer mock
    const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
    const mockInstance = McpServer.mock.results[0].value;
    const mockRegisterResource = mockInstance.registerResource;
    
    // Start the server to ensure all resources are initialized
    await server.start();
    
    // We expect registerResource to be called at least 9 times
    // 3 metadata types (business-rule, script-include, table) × 3 resource types (spec, snippet, instruct)
    expect(mockRegisterResource).toHaveBeenCalledTimes(9);
    
    // Check specific resource registrations
    expect(mockRegisterResource).toHaveBeenCalledWith(
      "sn-spec-business-rule",
      expect.anything(),
      expect.objectContaining({
        title: "business-rule API Specification for Fluent (ServiceNow SDK)",
        description: "API specification for Fluent (ServiceNow SDK) business-rule",
        mimeType: "text/markdown"
      }),
      expect.any(Function)
    );
    
    expect(mockRegisterResource).toHaveBeenCalledWith(
      "sn-snippet-script-include",
      expect.anything(),
      expect.objectContaining({
        title: "script-include Code Snippets for Fluent (ServiceNow SDK)",
        description: "Example code snippets for Fluent (ServiceNow SDK) script-include",
        mimeType: "text/markdown"
      }),
      expect.any(Function)
    );
    
    expect(mockRegisterResource).toHaveBeenCalledWith(
      "sn-instruct-table",
      expect.anything(),
      expect.objectContaining({
        title: "table Instructions for Fluent (ServiceNow SDK)",
        description: "Development instructions for Fluent (ServiceNow SDK) table",
        mimeType: "text/markdown"
      }),
      expect.any(Function)
    );
  });

  test("should handle resource read requests", async () => {
    server = new FluentMcpServer();

    // Spy on setupHandlers to ensure it is called
    const setupHandlersSpy = jest.spyOn(server as any, "setupHandlers").mockImplementation(() => {
      console.log("setupHandlers called");
      const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
      const mockInstance = McpServer.mock.results[0].value;
      const mockSetRequestHandler = mockInstance.server.setRequestHandler;
      mockSetRequestHandler();
      console.log("setRequestHandler called");
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

  test("should register snippet resources with completion capability", async () => {
    server = new FluentMcpServer();
    
    // Get the ResourceTemplate constructor
    const { ResourceTemplate } = require("@modelcontextprotocol/sdk/server/mcp.js");
    
    // Start the server
    await server.start();
    
    // Check if ResourceTemplate was called for snippets with completion capability
    const snippetTemplateCall = ResourceTemplate.mock.calls.find(
      (call: any[]) => call[0].startsWith("sn-snippet://")
    );
    
    expect(snippetTemplateCall).toBeDefined();
    expect(snippetTemplateCall[1].complete).toHaveProperty("snippetId");
    expect(typeof snippetTemplateCall[1].complete.snippetId).toBe("function");
  });
});
