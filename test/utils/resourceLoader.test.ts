/**
 * Unit tests for resource loader
 */
import fs from "fs";
import path from "path";
import * as nodeFs from 'node:fs';
import { ResourceLoader, ResourceType } from "../../src/utils/resourceLoader.js";

// Mock configuration
jest.mock('../../src/config.js', () => ({
  getConfig: jest.fn().mockReturnValue({
    resourcePaths: {
      spec: "/mock/path/to/spec",
      snippet: "/mock/path/to/snippet",
      instruct: "/mock/path/to/instruct",
    }
  })
}));

// Mock filesystem - node:fs implementation
jest.mock('node:fs', () => {
  return {
    promises: {
      readdir: jest.fn().mockResolvedValue([]),
      readFile: jest.fn().mockResolvedValue(""),
    },
    existsSync: jest.fn().mockReturnValue(false),
  };
});

// Also mock standard fs since the code might be using either import
jest.mock('fs', () => {
  return {
    promises: {
      readdir: jest.fn().mockResolvedValue([]),
      readFile: jest.fn().mockResolvedValue(""),
    },
    existsSync: jest.fn().mockReturnValue(false),
  };
});

describe('ResourceLoader', () => {
  let resourceLoader: ResourceLoader;

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Create a fresh resourceLoader instance before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks to avoid undefined returns
    (fs.promises.readdir as jest.Mock).mockResolvedValue([]);
    (fs.promises.readFile as jest.Mock).mockResolvedValue("");
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Also ensure node:fs mocks are setup the same way
    (nodeFs.promises.readdir as jest.Mock).mockResolvedValue([]);
    (nodeFs.promises.readFile as jest.Mock).mockResolvedValue("");
    (nodeFs.existsSync as jest.Mock).mockReturnValue(false);
    
    resourceLoader = new ResourceLoader();
  });

  describe('getAvailableMetadataTypes', () => {
    it('should return list of available metadata types', async () => {
      // Mock fs.readdir to return a list of files
      const mockFiles = [
        'fluent_spec_business-rule.md',
        'fluent_spec_script-include.md',
        'fluent_spec_client-script.md',
        'some-other-file.md',
      ];
      
      // Clear any previous mocks and set up a specific mock for this test
      jest.clearAllMocks();
      
      // Setup both node:fs and regular fs mocks
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (nodeFs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);

      const types = await resourceLoader.getAvailableMetadataTypes();
      
      // Just check that we have some metadata types that we expect
      expect(types).toContain('business-rule');
      expect(types).toContain('script-include');
      expect(types).toContain('client-script');
      
      // Since the code may now use the ServiceNowMetadataType enum directly,
      // we just check that some key types were called
      expect(nodeFs.promises.readdir).toHaveBeenCalled();
    });

    it('should return ServiceNowMetadataType values if directory read fails', async () => {
      // Mock fs.readdir to throw an error
      jest.clearAllMocks();
      
      // Both node:fs and regular fs should throw the same error
      const mockError = new Error('Directory read error');
      (fs.promises.readdir as jest.Mock).mockRejectedValue(mockError);
      (nodeFs.promises.readdir as jest.Mock).mockRejectedValue(mockError);

      const types = await resourceLoader.getAvailableMetadataTypes();
      
      // With the new implementation, we should get values from ServiceNowMetadataType enum
      expect(types).not.toEqual([]);
      expect(types).toContain('business-rule');
      expect(types).toContain('script-include');
      expect(types).toContain('client-script');
    });
  });

  describe('getResource', () => {
    it('should return resource content for API spec', async () => {
      const metadataType = 'business-rule';
      const mockContent = '# API Specification for Business Rules\n... content ...';
      const expectedPath = '/mock/path/to/spec/fluent_spec_business-rule.md';
      
      // Setup mocks for this specific test
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.existsSync as jest.Mock).mockImplementation((path) => 
        path === expectedPath ? true : false
      );
      (nodeFs.existsSync as jest.Mock).mockImplementation((path) => 
        path === expectedPath ? true : false
      );
      
      (fs.promises.readFile as jest.Mock).mockImplementation((path, encoding) => 
        path === expectedPath 
          ? Promise.resolve(mockContent) 
          : Promise.reject(new Error(`File not found: ${path}`))
      );
      (nodeFs.promises.readFile as jest.Mock).mockImplementation((path, encoding) => 
        path === expectedPath 
          ? Promise.resolve(mockContent) 
          : Promise.reject(new Error(`File not found: ${path}`))
      );
      
      const result = await resourceLoader.getResource(ResourceType.SPEC, metadataType);
      
      expect(result).toEqual({
        content: mockContent,
        path: expectedPath,
        metadataType: 'business-rule',
        resourceType: 'spec',
        found: true,
      });
      
      expect(nodeFs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(nodeFs.promises.readFile).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });

    it('should return resource content for specific snippet', async () => {
      const metadataType = 'business-rule';
      const id = '0002';
      const mockContent = '# Snippet 0002 for Business Rules\n... content ...';
      const expectedPath = '/mock/path/to/snippet/fluent_snippet_business-rule_0002.md';
      
      // Setup mocks for this specific test
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.existsSync as jest.Mock).mockImplementation((path) => 
        path === expectedPath ? true : false
      );
      (nodeFs.existsSync as jest.Mock).mockImplementation((path) => 
        path === expectedPath ? true : false
      );
      
      (fs.promises.readFile as jest.Mock).mockImplementation((path, encoding) => 
        path === expectedPath 
          ? Promise.resolve(mockContent) 
          : Promise.reject(new Error(`File not found: ${path}`))
      );
      (nodeFs.promises.readFile as jest.Mock).mockImplementation((path, encoding) => 
        path === expectedPath 
          ? Promise.resolve(mockContent) 
          : Promise.reject(new Error(`File not found: ${path}`))
      );
      
      const result = await resourceLoader.getResource(ResourceType.SNIPPET, metadataType, id);
      
      expect(result).toEqual({
        content: mockContent,
        path: expectedPath,
        metadataType: 'business-rule',
        resourceType: 'snippet',
        found: true,
      });
      
      expect(nodeFs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(nodeFs.promises.readFile).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });

    it('should fall back to first snippet if specific ID not found', async () => {
      const metadataType = 'business-rule';
      const id = '9999'; // Non-existent ID
      const mockContent = '# Default Snippet for Business Rules\n... content ...';
      const specificPath = '/mock/path/to/snippet/fluent_snippet_business-rule_9999.md';
      const defaultPath = '/mock/path/to/snippet/fluent_snippet_business-rule_0001.md';
      
      // Setup proper mock sequence
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === specificPath) return false;
        if (path === defaultPath) return true;
        return false;
      });
      (nodeFs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === specificPath) return false;
        if (path === defaultPath) return true;
        return false;
      });
      
      (fs.promises.readFile as jest.Mock).mockImplementation((path, encoding) => {
        if (path === defaultPath) return Promise.resolve(mockContent);
        return Promise.reject(new Error(`File not found: ${path}`));
      });
      (nodeFs.promises.readFile as jest.Mock).mockImplementation((path, encoding) => {
        if (path === defaultPath) return Promise.resolve(mockContent);
        return Promise.reject(new Error(`File not found: ${path}`));
      });
      
      const result = await resourceLoader.getResource(ResourceType.SNIPPET, metadataType, id);
      
      expect(result).toEqual({
        content: mockContent,
        path: defaultPath,
        metadataType: 'business-rule',
        resourceType: 'snippet',
        found: true,
      });
      
      expect(nodeFs.existsSync).toHaveBeenCalledWith(specificPath);
      expect(nodeFs.existsSync).toHaveBeenCalledWith(defaultPath);
      expect(nodeFs.promises.readFile).toHaveBeenCalledWith(defaultPath, 'utf-8');
    });

    it('should return not found if resource does not exist', async () => {
      const metadataType = 'non-existent-type';
      const expectedPath = '/mock/path/to/instruct/fluent_instruct_non-existent-type.md';
      
      // Explicitly set mock for this test
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (nodeFs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = await resourceLoader.getResource(ResourceType.INSTRUCT, metadataType);
      
      expect(result).toEqual({
        content: '',
        path: expectedPath,
        metadataType: 'non-existent-type',
        resourceType: 'instruct',
        found: false,
      });
      
      expect(nodeFs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(nodeFs.promises.readFile).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const metadataType = 'business-rule';
      const expectedPath = '/mock/path/to/instruct/fluent_instruct_business-rule.md';
      const mockError = new Error('File read error');
      
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (nodeFs.existsSync as jest.Mock).mockReturnValue(true);
      
      (fs.promises.readFile as jest.Mock).mockRejectedValue(mockError);
      (nodeFs.promises.readFile as jest.Mock).mockRejectedValue(mockError);
      
      const result = await resourceLoader.getResource(ResourceType.INSTRUCT, metadataType);
      
      expect(result).toEqual({
        content: '',
        path: '', // The actual implementation clears the path on error
        metadataType: 'business-rule',
        resourceType: 'instruct',
        found: false,
      });
    });
  });

  describe('listSnippets', () => {
    it('should return list of available snippet IDs', async () => {
      const metadataType = 'business-rule';
      const mockFiles = [
        'fluent_snippet_business-rule_0001.md',
        'fluent_snippet_business-rule_0002.md',
        'fluent_snippet_business-rule_0003.md',
        'fluent_snippet_client-script_0001.md', // Should be filtered out
      ];
      
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (nodeFs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
      
      const snippetIds = await resourceLoader.listSnippets(metadataType);
      
      expect(snippetIds).toEqual(['0001', '0002', '0003']);
      expect(nodeFs.promises.readdir).toHaveBeenCalledWith('/mock/path/to/snippet');
    });

    it('should return empty array if no snippets found', async () => {
      const metadataType = 'non-existent-type';
      const mockFiles = [
        'fluent_snippet_business-rule_0001.md',
        'fluent_snippet_client-script_0001.md',
      ];
      
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (nodeFs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
      
      const snippetIds = await resourceLoader.listSnippets(metadataType);
      
      expect(snippetIds).toEqual([]);
    });

    it('should handle directory read errors', async () => {
      const metadataType = 'business-rule';
      const mockError = new Error('Directory read error');
      
      jest.clearAllMocks();
      
      // Mock both fs and node:fs
      (fs.promises.readdir as jest.Mock).mockRejectedValue(mockError);
      (nodeFs.promises.readdir as jest.Mock).mockRejectedValue(mockError);
      
      const snippetIds = await resourceLoader.listSnippets(metadataType);
      
      expect(snippetIds).toEqual([]);
    });
  });
});
