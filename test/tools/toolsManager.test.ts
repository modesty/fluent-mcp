/**
 * Tests for ToolsManager
 */
import { ToolsManager } from "../../src/tools/toolsManager.js";

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
    }))
  };
});

// Mock command registry
jest.mock("../../src/tools/cliCommandTools.js", () => {
  const mockRegister = jest.fn();
  const mockGetCommand = jest.fn();
  const mockToMCPTools = jest.fn().mockReturnValue([
    { id: "mock-command", title: "Mock Command", description: "A mock command for testing" }
  ]);
  
  return {
    CLIExecutor: jest.fn(),
    CLICmdWriter: jest.fn(),
    CommandFactory: {
      createCommands: jest.fn().mockImplementation((executor, writer) => [
        {
          name: "mock-command",
          description: "A mock command for testing",
          arguments: [],
          execute: jest.fn().mockResolvedValue({ success: true, output: "Mock output" })
        }
      ])
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

describe("ToolsManager", () => {
  let mockMcpServer: any;
  let toolsManager: ToolsManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockMcpServer = {
      registerTool: jest.fn()
    };
    toolsManager = new ToolsManager(mockMcpServer);
  });

  test("should initialize and register tools", () => {
    expect(toolsManager).toBeDefined();
  });
  
  test("should format command result correctly", () => {
    const successResult = {
      success: true,
      output: "Success output"
    };
    
    const failResult = {
      success: false,
      output: "Failure output",
      exitCode: 1,
      error: "Error message"
    };
    
    const formattedSuccess = toolsManager.formatResult(successResult);
    const formattedFail = toolsManager.formatResult(failResult);
    
    expect(formattedSuccess).toContain("✅");
    expect(formattedSuccess).toContain("Success output");
    
    expect(formattedFail).toContain("❌");
    expect(formattedFail).toContain("Failure output");
    expect(formattedFail).toContain("Error message");
  });
});
