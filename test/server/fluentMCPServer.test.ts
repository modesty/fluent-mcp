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
  const mockConnect = jest.fn();
  const mockClose = jest.fn();
  const mockNotification = jest.fn();
  
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      registerResource: mockRegisterResource,
      registerTool: mockRegisterTool,
      connect: mockConnect,
      close: mockClose,
      server: {
        setRequestHandler: mockSetRequestHandler,
        notification: mockNotification
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
      })
    }))
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

// Mock logger
jest.mock("../../src/utils/logger.js", () => {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setMcpServer: jest.fn(),
    setupLoggingHandlers: jest.fn(),
    __esModule: true,
    default: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setMcpServer: jest.fn(),
      setupLoggingHandlers: jest.fn()
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
  
  test("should start server correctly", async () => {
    await server.start();
    expect(server.getStatus()).toBe(ServerStatus.RUNNING);
  });
  
  test("should stop server correctly", async () => {
    await server.start();
    await server.stop();
    expect(server.getStatus()).toBe(ServerStatus.STOPPED);
  });
});
