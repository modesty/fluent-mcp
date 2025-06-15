/**
 * Unit tests for resource tool commands
 */
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
  ListMetadataTypesCommand,
} from "../../tools/resourceTools";
import { ResourceLoader, ResourceType } from "../../utils/resourceLoader";

// Mock modules
jest.mock("../../utils/resourceLoader");

describe("Resource Tool Commands", () => {
  // Global mock object to access from tests
  const mockGetAvailableMetadataTypes = jest.fn();
  const mockGetResource = jest.fn();
  const mockListSnippets = jest.fn();
  
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the implementation of ResourceLoader
    (ResourceLoader as jest.Mock).mockImplementation(() => {
      return {
        getAvailableMetadataTypes: mockGetAvailableMetadataTypes,
        getResource: mockGetResource,
        listSnippets: mockListSnippets
      };
    });
  });

  describe("ListMetadataTypesCommand", () => {
    let command: ListMetadataTypesCommand;
    
    beforeEach(() => {
      command = new ListMetadataTypesCommand();
    });
    
    it("should return list of metadata types", async () => {
      const mockTypes = ["business-rule", "script-include", "client-script"];
      mockGetAvailableMetadataTypes.mockResolvedValue(mockTypes);
      
      const result = await command.execute();
      
      expect(result).toEqual({
        exitCode: 0,
        success: true,
        output: "Available metadata types:\nbusiness-rule\nscript-include\nclient-script",
      });
      expect(mockGetAvailableMetadataTypes).toHaveBeenCalled();
    });
    
    it("should handle empty metadata types list", async () => {
      mockGetAvailableMetadataTypes.mockResolvedValue([]);
      
      const result = await command.execute();
      
      expect(result).toEqual({
        exitCode: 0,
        success: true,
        output: "No metadata types found.",
      });
    });
    
    it("should handle errors", async () => {
      const mockError = new Error("Failed to get metadata types");
      mockGetAvailableMetadataTypes.mockRejectedValue(mockError);
      
      const result = await command.execute();
      
      expect(result).toEqual({
        exitCode: 1,
        success: false,
        output: "Error: Failed to get metadata types",
        error: mockError,
      });
    });
  });
  
  describe("GetApiSpecCommand", () => {
    let command: GetApiSpecCommand;
    
    beforeEach(() => {
      command = new GetApiSpecCommand();
    });
    
    it("should return API specification", async () => {
      const mockContent = "# API Spec for Business Rules\n... content ...";
      mockGetResource.mockResolvedValue({
        content: mockContent,
        path: "/mock/path/to/spec/fluent_spec_business-rule.md",
        metadataType: "business-rule",
        resourceType: "spec",
        found: true,
      });
      
      const result = await command.execute({ metadataType: "business-rule" });
      
      expect(result).toEqual({
        exitCode: 0,
        success: true,
        output: mockContent,
      });
      expect(mockGetResource).toHaveBeenCalledWith(
        ResourceType.SPEC,
        "business-rule",
        undefined
      );
    });
    
    it("should handle resource not found", async () => {
      mockGetResource.mockResolvedValue({
        content: "",
        path: "/mock/path/to/spec/fluent_spec_non-existent.md",
        metadataType: "non-existent",
        resourceType: "spec",
        found: false,
      });
      
      const result = await command.execute({ metadataType: "non-existent" });
      
      expect(result).toEqual({
        exitCode: 1,
        success: false,
        output: "Resource not found for metadata type: non-existent",
        error: expect.any(Error),
      });
    });
    
    it("should handle missing required arguments", async () => {
      const result = await command.execute({});
      
      expect(result).toEqual({
        exitCode: 1,
        success: false,
        output: "Error: Missing required argument: metadataType",
        error: expect.any(Error),
      });
      expect(mockGetResource).not.toHaveBeenCalled();
    });
  });
  
  describe("GetSnippetCommand", () => {
    let command: GetSnippetCommand;
    
    beforeEach(() => {
      command = new GetSnippetCommand();
    });
    
    it("should return specific snippet when ID is provided", async () => {
      const mockContent = "# Snippet 0002 for Business Rules\n... content ...";
      mockGetResource.mockResolvedValue({
        content: mockContent,
        path: "/mock/path/to/snippet/fluent_snippet_business-rule_0002.md",
        metadataType: "business-rule",
        resourceType: "snippet",
        found: true,
      });
      
      const result = await command.execute({
        metadataType: "business-rule",
        id: "0002",
      });
      
      expect(result).toEqual({
        exitCode: 0,
        success: true,
        output: mockContent,
      });
      expect(mockGetResource).toHaveBeenCalledWith(
        ResourceType.SNIPPET,
        "business-rule",
        "0002"
      );
    });
    
    it("should list available snippets when ID is not provided", async () => {
      const mockContent = "# Default Snippet for Business Rules\n... content ...";
      mockListSnippets.mockResolvedValue(["0001", "0002", "0003"]);
      mockGetResource.mockResolvedValue({
        content: mockContent,
        path: "/mock/path/to/snippet/fluent_snippet_business-rule_0001.md",
        metadataType: "business-rule",
        resourceType: "snippet",
        found: true,
      });
      
      const result = await command.execute({ metadataType: "business-rule" });
      
      expect(result).toEqual({
        exitCode: 0,
        success: true,
        output: mockContent + "\n\nAdditional snippets available: 0002, 0003",
      });
      expect(mockListSnippets).toHaveBeenCalledWith("business-rule");
      expect(mockGetResource).toHaveBeenCalledWith(
        ResourceType.SNIPPET,
        "business-rule",
        "0001"  // The actual implementation falls back to "0001" when ID is not provided
      );
    });
    
    it("should handle no snippets found", async () => {
      mockListSnippets.mockResolvedValue([]);
      
      const result = await command.execute({ metadataType: "non-existent" });
      
      expect(result).toEqual({
        exitCode: 1,
        success: false,
        output: "No snippets found for metadata type: non-existent",
        error: expect.any(Error),
      });
    });
  });
  
  describe("GetInstructCommand", () => {
    let command: GetInstructCommand;
    
    beforeEach(() => {
      command = new GetInstructCommand();
    });
    
    it("should return instructions", async () => {
      const mockContent = "# Instructions for Business Rules\n... content ...";
      mockGetResource.mockResolvedValue({
        content: mockContent,
        path: "/mock/path/to/instruct/fluent_instruct_business-rule.md",
        metadataType: "business-rule",
        resourceType: "instruct",
        found: true,
      });
      
      const result = await command.execute({ metadataType: "business-rule" });
      
      expect(result).toEqual({
        exitCode: 0,
        success: true,
        output: mockContent,
      });
      expect(mockGetResource).toHaveBeenCalledWith(
        ResourceType.INSTRUCT,
        "business-rule",
        undefined
      );
    });
  });
});
