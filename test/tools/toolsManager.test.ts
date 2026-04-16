/**
 * Tests for ToolsManager
 * 
 * Note: Resource tool tests are in fluentMCPServer.resources.test.ts
 * This file only tests the ToolsManager-specific functionality
 */
import { ToolsManager } from "../../src/tools/toolsManager.js";

// Mock the Model Context Protocol SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  // Create mock implementation for the MCP Server
  const mockRegisterTool = jest.fn();
  
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      registerTool: mockRegisterTool
    }))
  };
});

// Mock command tools (split into individual modules)
jest.mock("../../src/tools/processors/processRunner.js", () => ({
  NodeProcessRunner: jest.fn()
}));
jest.mock("../../src/tools/processors/cliExecutor.js", () => ({
  CLIExecutor: jest.fn()
}));
jest.mock("../../src/tools/processors/cliCmdWriter.js", () => ({
  CLICmdWriter: jest.fn()
}));
jest.mock("../../src/tools/registry/commandFactory.js", () => ({
  CommandFactory: {
    createCommands: jest.fn().mockImplementation(() => [])
  }
}));
jest.mock("../../src/tools/registry/commandRegistry.js", () => {
  const mockRegister = jest.fn();
  const mockGetCommand = jest.fn();
  const mockToMCPTools = jest.fn().mockReturnValue([
    { id: "mock-command", title: "Mock Command", description: "A mock command for testing" }
  ]);
  return {
    CommandRegistry: jest.fn().mockImplementation(() => ({
      register: mockRegister,
      getCommand: mockGetCommand,
      toMCPTools: mockToMCPTools
    }))
  };
});

// Mock the resource tools module with proper arguments array
jest.mock("../../src/tools/resources/resourceTools.js", () => {
  // Create commands with empty arguments arrays to satisfy iteration
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
      execute: jest.fn().mockResolvedValue({ success: true, output: "Mock output" })
    })),
    CheckAuthStatusCommand: jest.fn().mockImplementation(() => ({
      name: "check_auth_status",
      description: "Check authentication status",
      arguments: [],
      execute: jest.fn().mockResolvedValue({ success: true, output: "Mock auth status" })
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
    
    // Success: clean output only (no emoji prefix, no "Command executed successfully" wrapper)
    expect(formattedSuccess).toBe("Success output");

    // Failure: concise error with exit code and output context
    expect(formattedFail).toContain("Error (exit 1)");
    expect(formattedFail).toContain("Failure output");
    expect(formattedFail).toContain("Error message");
  });
});
