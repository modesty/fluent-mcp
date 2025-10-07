/**
 * Tests for ResourceManager
 */
import { ResourceManager } from "../../src/res/resourceManager.js";

// Mock the Model Context Protocol SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  // Create mock implementation for the MCP Server
  const mockRegisterResource = jest.fn();
  
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      registerResource: mockRegisterResource,
    })),
    ResourceTemplate: jest.fn().mockImplementation((template, options) => ({
      template,
      options
    }))
  };
});

// Mock the ResourceLoader
jest.mock("../../src/utils/resourceLoader.js", () => {
  // Create a mock implementation with controlled behavior
  const mockGetAvailableMetadataTypes = jest.fn().mockResolvedValue([
    "business-rule",
    "script-action",
    "script-include",
    "service-portal",
    "table",
    "ui-action",
    "ui-page"
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

describe("ResourceManager", () => {
  let mockMcpServer: any;
  let resourceManager: ResourceManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockMcpServer = {
      registerResource: jest.fn()
    };
    resourceManager = new ResourceManager(mockMcpServer);
  });

  test("should initialize and load metadata types", async () => {
    await resourceManager.initialize();
    expect(resourceManager.getMetadataTypes()).toEqual([
      "business-rule",
      "script-action",
      "script-include",
      "service-portal",
      "table",
      "ui-action",
      "ui-page"
    ]);
  });
  
  test("should list resources correctly", async () => {
    await resourceManager.initialize();
    const resources = await resourceManager.listResources();
    
    // Should have 7 metadata types * (1 spec + 1 instruct + 1 snippet) = 21 resources
    expect(resources.length).toBe(21);
    
    // Check for spec resources
    const specResources = resources.filter(r => r.uri.startsWith('sn-spec://'));
    expect(specResources.length).toBe(7);
    
    // Check for instruction resources
    const instructResources = resources.filter(r => r.uri.startsWith('sn-instruct://'));
    expect(instructResources.length).toBe(7);
    
    // Check for snippet resources
    const snippetResources = resources.filter(r => r.uri.startsWith('sn-snippet://'));
    expect(snippetResources.length).toBe(7);
    
    // Check that each resource has the required properties
    resources.forEach(resource => {
      expect(resource).toHaveProperty('uri');
      expect(resource).toHaveProperty('title');
      expect(resource).toHaveProperty('mimeType', 'text/markdown');
    });
  });
});
