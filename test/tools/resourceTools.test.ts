/**
 * Unit tests for resource tool commands
 */
import fs from "node:fs";
import path from "node:path";
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
} from "../../src/tools/resourceTools.js";
import { ResourceLoader, ResourceType } from "../../src/utils/resourceLoader.js";
import { getProjectRootPath } from "../../src/config.js";

// Mock the file system operations for tests
jest.mock("node:fs", () => {
  const originalFs = jest.requireActual("node:fs");
  return {
    ...originalFs,
    promises: {
      ...originalFs.promises,
      readdir: jest.fn(),
      readFile: jest.fn(),
    },
    existsSync: jest.fn()
  };
});

describe("Resource Tool Commands", () => {
  // Test metadata type to use throughout tests
  const TEST_METADATA_TYPE = "business-rule";
  const TEST_SNIPPET_ID = "0001";

  // Set up ResourceLoader and mocks before each test
  let resourceLoader: ResourceLoader;
  const mockTypes = ["business-rule", "script-include", "client-script", "ui-action"];
  const mockSpecContent = "Business Rule spec\nBusinessRule(";
  const mockSnippetContent = "Business Rule API example\nBusinessRule(";
  const mockInstructContent = "Instructions for Fluent Business Rule API";

  beforeEach(() => {
    resourceLoader = new ResourceLoader();

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks for file operations
    (fs.promises.readdir as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("instruct")) {
        return Promise.resolve([
          "fluent_instruct_business-rule.md",
          "fluent_instruct_script-include.md",
          "fluent_instruct_client-script.md",
          "fluent_instruct_ui-action.md"
        ]);
      } else if (path.includes("snippet")) {
        return Promise.resolve([
          "fluent_snippet_business-rule_0001.md",
          "fluent_snippet_business-rule_0002.md",
          "fluent_snippet_business-rule_0003.md"
        ]);
      }
      return Promise.resolve([]);
    });

    (fs.promises.readFile as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("spec")) {
        return Promise.resolve(mockSpecContent);
      } else if (path.includes("snippet")) {
        return Promise.resolve(mockSnippetContent);
      } else if (path.includes("instruct")) {
        return Promise.resolve(mockInstructContent);
      }
      return Promise.resolve("");
    });

    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      return path.includes("business-rule") || path.includes("0001");
    });
  });

  describe("GetApiSpecCommand", () => {
    let command: GetApiSpecCommand;

    beforeEach(() => {
      command = new GetApiSpecCommand();
    });

    it("should return API specification for a valid metadata type", async () => {
      // Execute the command with a valid metadata type
      const result = await command.execute({ metadataType: TEST_METADATA_TYPE });

      // Verify the result contains the expected content
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(mockSpecContent);

      // Verify the content contains expected text for a business rule spec
      expect(result.output).toContain("Business Rule spec");
      expect(result.output).toContain("BusinessRule(");
    });

    it("should handle resource not found for non-existent metadata type", async () => {
      // Execute the command with a non-existent metadata type
      const result = await command.execute({ metadataType: "non-existent" });

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
      expect(result.output).toContain("Resource not found for metadata type: non-existent");
      expect(result.error).toBeDefined();
    });

    it("should list available metadata types when no argument provided", async () => {
      // Mock ResourceLoader to return our mock types
      jest.spyOn(ResourceLoader.prototype, 'getAvailableMetadataTypes').mockResolvedValue(mockTypes);

      // Execute the command without arguments - should list available types
      const result = await command.execute({});

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toContain("Available Fluent metadata types");
    });
  });

  describe("GetSnippetCommand", () => {
    let command: GetSnippetCommand;

    beforeEach(() => {
      command = new GetSnippetCommand();
    });

    it("should return specific snippet when ID is provided", async () => {
      // Execute the command with a valid metadata type and snippet ID
      const result = await command.execute({
        metadataType: TEST_METADATA_TYPE,
        id: TEST_SNIPPET_ID,
      });

      // Verify the result contains the expected snippet content
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(mockSnippetContent);

      // Verify the content contains expected text for a business rule snippet
      expect(result.output).toContain("Business Rule API example");
      expect(result.output).toContain("BusinessRule(");
    });

    it("should list available snippets when ID is not provided", async () => {
      // The mock will return snippet IDs: 0001, 0002, 0003
      const mockSnippetIds = ["0001", "0002", "0003"];

      // Execute the command without specifying a snippet ID
      const result = await command.execute({ metadataType: TEST_METADATA_TYPE });

      // Verify the result contains the default snippet content and lists other available snippets
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toContain(mockSnippetContent);

      // Verify that additional snippets are listed (excluding the default one)
      expect(result.output).toContain("Additional snippets available:");
      // Check for other snippet IDs (besides the default 0001)
      mockSnippetIds.filter(id => id !== "0001").forEach(id => {
        expect(result.output).toContain(id);
      });
    });

    it("should handle no snippets found for non-existent metadata type", async () => {
      // Execute the command with a non-existent metadata type
      const result = await command.execute({ metadataType: "non-existent" });

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
      expect(result.output).toContain("No snippets found for metadata type: non-existent");
      expect(result.error).toBeDefined();
    });
  });

  describe("GetInstructCommand", () => {
    let command: GetInstructCommand;

    beforeEach(() => {
      command = new GetInstructCommand();
    });

    it("should return instructions for a valid metadata type", async () => {
      // Execute the command with a valid metadata type
      const result = await command.execute({ metadataType: TEST_METADATA_TYPE });

      // Verify the result contains the expected instruction content
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.output).toBe(mockInstructContent);

      // Verify the content contains expected text for business rule instructions
      expect(result.output).toContain("Instructions for Fluent Business Rule API");
    });

    it("should handle resource not found for non-existent metadata type", async () => {
      // Execute the command with a non-existent metadata type
      const result = await command.execute({ metadataType: "non-existent" });

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
      expect(result.output).toContain("Resource not found for metadata type: non-existent");
      expect(result.error).toBeDefined();
    });

    it("should handle missing required arguments", async () => {
      // Execute the command without required arguments
      const result = await command.execute({});

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
      expect(result.output).toContain("Error: Missing required argument: metadataType");
      expect(result.error).toBeDefined();
    });
  });
});
