import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  GetPromptRequestSchema,
  GetPromptResult,
  ListPromptsRequestSchema,
  ListPromptsResult,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getProjectRootPath } from '../config.js';
import logger from '../utils/logger.js';
import loggingManager from '../utils/loggingManager.js';

/**
 * Utility function to find a file by trying multiple possible locations
 * @param filename The relative path to the file
 * @returns The resolved file path if found
 */
async function findFile(filename: string): Promise<string | null> {
  const possiblePaths = [
    // Standard path from project root
    path.join(getProjectRootPath(), filename),
    // Try from current working directory
    path.join(process.cwd(), filename),
    // Try direct path if it's an absolute path
    filename,
    // Try one level up (if src is the current directory)
    path.join(process.cwd(), '..', filename),
  ];
  
  logger.debug(`Looking for file ${filename} in possible locations:`);
  
  for (const tryPath of possiblePaths) {
    try {
      logger.debug(`- Checking: ${tryPath}`);
      await fs.access(tryPath);
      logger.debug(`- File found at: ${tryPath}`);
      return tryPath;
    } catch (err) {
      // File not found at this location
    }
  }
  
  logger.error(`File not found in any location: ${filename}`);
  return null;
}



/**
 * Manager for handling MCP prompts registration and access
 */
export class PromptManager {
  private mcpServer: McpServer;
  private prompts: Map<string, Prompt> = new Map();
  private promptContents: Map<string, string> = new Map();

  /**
   * Create a new PromptManager
   * @param mcpServer The MCP server instance
   */
  constructor(mcpServer: McpServer) {
    this.mcpServer = mcpServer;
  }

  /**
   * Initialize prompts by loading prompt files
   */
  async initialize(): Promise<void> {
    try {
      logger.debug(`Project root path: ${getProjectRootPath()}`);
      logger.debug(`Current working directory: ${process.cwd()}`);
      
      // Register the main coding_in_fluent prompt
      await this.registerCodingInFluentPrompt();
      logger.debug(`Initialized PromptManager with ${this.prompts.size} prompts`);
    } catch (error) {
      logger.error(
        'Error initializing prompts',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Register all prompt handlers with the MCP server
   */
  setupHandlers(): void {
    const server = this.mcpServer?.server;
    if (!server) return;

    // Set up the prompts/list handler
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        const prompts = Array.from(this.prompts.values());
        return { prompts } as ListPromptsResult;
      } catch (error) {
        loggingManager.logPromptListingFailed(error);
        return { prompts: [] } as ListPromptsResult;
      }
    });

    // Set up the prompts/get handler
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.debug(`GetPromptRequest for prompt: ${name}, args: ${JSON.stringify(args)}`);
      
      const prompt = this.prompts.get(name);
      if (!prompt) {
        logger.error(`Unknown prompt requested: ${name}`);
        throw new Error(`Unknown prompt: ${name}`);
      }

      try {
        // Get the prompt content
        const content = this.promptContents.get(name);
        logger.debug(`Content map has keys: ${Array.from(this.promptContents.keys()).join(', ')}`);
        logger.debug(`Content for ${name} exists: ${!!content}, length: ${content ? content.length : 0}`);
        
        if (!content) {
          logger.error(`Prompt content not loaded for: ${name}`);
          throw new Error(`Prompt content not loaded for: ${name}`);
        }

        // Process any arguments
        let processedContent = content;
        if (name === 'coding_in_fluent' && args?.metadata_list) {
          const metadataList = Array.isArray(args.metadata_list) ? args.metadata_list : [args.metadata_list];
          // Add section for each metadata type
          const metadataTypesContent = metadataList
            .map(type => `### ${type.toUpperCase()}\n\nFor working with ${type}, follow these guidelines:\n\n- Use the appropriate Fluent API methods\n- Reference the specific instructions for ${type} in the documentation\n`)
            .join('\n');
          
          // Replace placeholder if it exists, or append
          if (processedContent.includes('You are currently interested in working with the following metadata types:')) {
            processedContent = processedContent.replace(
              'You are currently interested in working with the following metadata types:',
              `You are currently interested in working with the following metadata types:\n\n${metadataTypesContent}`
            );
          } else {
            processedContent += `\n\n## Selected Metadata Types\n\n${metadataTypesContent}`;
          }
        }

        // Construct the prompt messages
        const result = {
          description: prompt.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: processedContent
              }
            }
          ]
        } as GetPromptResult;

        logger.debug(`GetPromptRequest for '${name}' is returning content length: ${processedContent.length} bytes`);
        
        return result;
      } catch (error) {
        loggingManager.logPromptRetrievalFailed(name, error);
        throw error;
      }
    });
  }

  /**
   * Register the coding_in_fluent prompt
   */
  private async registerCodingInFluentPrompt(): Promise<void> {
    const promptName = 'coding_in_fluent';
    // Use our findFile utility to locate the file
    const relativePath = 'res/prompt/coding_in_fluent.md';
    
    try {
      let content = null;
      
      // First try to load the file using our utility
      const promptPath = await findFile(relativePath);
      
      if (promptPath) {
        try {
          // Read the prompt content from the file
          content = await fs.readFile(promptPath, 'utf-8');
          logger.debug(`Prompt content loaded from file: ${promptPath}, length: ${content.length}`);
        } catch (fileErr) {
          logger.warn(`Could not read from located file ${promptPath}: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`);
        }
      } else {
        logger.warn(`Could not find prompt file: ${relativePath}`);
      }
      
      // If we're in a test environment and couldn't load the file, use a mock content
      if (!content && process.env.NODE_ENV === 'test') {
        content = '# Mock Coding in Fluent Guide for Testing\n\nThis is a mock prompt for testing purposes.\n\nYou are currently interested in working with the following metadata types:';
        logger.debug('Using mock content for testing environment');
      }
      
      // Final check - if we still have no content, throw an error
      if (!content) {
        throw new Error(`Failed to load prompt content from file or fallback: ${relativePath}`);
      }
      
      
      // Register the prompt
      const prompt: Prompt = {
        name: promptName,
        title: 'Coding in Fluent (ServiceNow SDK)',
        description: 'Guide for coding in Fluent (ServiceNow SDK) with examples for specific metadata types',
        arguments: [
          {
            name: 'metadata_list',
            description: 'List of metadata types to include in the guide',
            type: 'array',
            items: {
              type: 'string'
            },
            required: true
          }
        ]
      };
      
      this.prompts.set(promptName, prompt);
      this.promptContents.set(promptName, content);
      
      logger.debug(`Registered prompt: ${promptName}`);
      logger.debug(`Prompt content length: ${content ? content.length : 0} bytes`);
      logger.debug(`Prompt content beginning: ${content ? content.substring(0, 100) + '...' : 'empty'}`);
      
    } catch (error) {      
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * List all registered prompts
   * @returns Array of registered prompts
   */
  listPrompts(): Prompt[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Get a specific prompt by name
   * @param name The name of the prompt to get
   * @returns The prompt if found, undefined otherwise
   */
  getPrompt(name: string): Prompt | undefined {
    return this.prompts.get(name);
  }
}
