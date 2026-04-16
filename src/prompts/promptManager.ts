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
import { CommandResultFactory } from '../utils/types.js';
import loggingManager from '../utils/loggingManager.js';


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
   * Initialize prompts by scanning the res/prompt/ directory and loading all .md files
   */
  async initialize(): Promise<void> {
    try {
      logger.debug(`Project root path: ${getProjectRootPath()}`);
      logger.debug(`Current working directory: ${process.cwd()}`);

      const promptDir = path.join(getProjectRootPath(), 'res', 'prompt');
      await this.registerAllPrompts(promptDir);
      if (this.prompts.size === 0) {
        logger.warn(`No prompts found in ${promptDir} — expected at least one .md file`);
      }
      logger.debug(`Initialized PromptManager with ${this.prompts.size} prompts`);
    } catch (error) {
      logger.error(
        'Error initializing prompts',
        CommandResultFactory.normalizeError(error)
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
   * Parse YAML-style frontmatter from a markdown file.
   * Returns the frontmatter fields and the body content (without the frontmatter block).
   * If no frontmatter is present, returns empty metadata and full content.
   */
  private static parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      return { meta: {}, body: raw };
    }

    const yamlBlock = match[1];
    const body = match[2];
    const meta: Record<string, unknown> = {};

    // Lightweight YAML parser — handles scalar key: value pairs and simple arrays
    let currentKey: string | null = null;
    let currentArray: Record<string, unknown>[] | null = null;
    let currentItem: Record<string, unknown> | null = null;

    for (const line of yamlBlock.split('\n')) {
      // Top-level "key: value" (value may be quoted)
      const scalarMatch = line.match(/^(\w+):\s*(.+)$/);
      if (scalarMatch) {
        if (currentKey && currentArray) {
          if (currentItem && Object.keys(currentItem).length > 0) currentArray.push(currentItem);
          meta[currentKey] = currentArray;
        }
        currentKey = null;
        currentArray = null;
        currentItem = null;

        let val: string = scalarMatch[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        meta[scalarMatch[1]] = val === 'true' ? true : val === 'false' ? false : val;
        continue;
      }

      // Top-level "key:" (start of array or nested object)
      const blockKeyMatch = line.match(/^(\w+):$/);
      if (blockKeyMatch) {
        if (currentKey && currentArray) {
          if (currentItem && Object.keys(currentItem).length > 0) currentArray.push(currentItem);
          meta[currentKey] = currentArray;
        }
        currentKey = blockKeyMatch[1];
        currentArray = [];
        currentItem = null;
        continue;
      }

      // Array item start "  - key: value"
      const arrayItemMatch = line.match(/^\s+-\s+(\w+):\s*(.+)$/);
      if (arrayItemMatch && currentArray !== null) {
        if (currentItem && Object.keys(currentItem).length > 0) currentArray.push(currentItem);
        let val: string = arrayItemMatch[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        currentItem = { [arrayItemMatch[1]]: val === 'true' ? true : val === 'false' ? false : val };
        continue;
      }

      // Continuation "    key: value" inside an array item
      const contMatch = line.match(/^\s{4,}(\w+):\s*(.+)$/);
      if (contMatch && currentItem) {
        let val: string = contMatch[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        currentItem[contMatch[1]] = val === 'true' ? true : val === 'false' ? false : val;
      }
    }

    // Flush last array
    if (currentKey && currentArray) {
      if (currentItem && Object.keys(currentItem).length > 0) currentArray.push(currentItem);
      meta[currentKey] = currentArray;
    }

    return { meta, body };
  }

  /**
   * Scan the prompt directory and register all .md files as prompts.
   * Metadata (title, description, arguments) is read from YAML frontmatter in each
   * file. When frontmatter fields are absent, title is derived from the filename and
   * description from the first markdown heading.
   */
  private async registerAllPrompts(promptDir: string): Promise<void> {
    let files: string[];
    try {
      files = await fs.readdir(promptDir);
    } catch (error) {
      logger.warn(`Could not read prompt directory ${promptDir}: ${CommandResultFactory.normalizeError(error).message}`);
      return;
    }

    const mdFiles = files.filter(f => f.endsWith('.md')).sort();

    for (const file of mdFiles) {
      const promptName = file.replace(/\.md$/, '');
      const filePath = path.join(promptDir, file);

      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const { meta, body } = PromptManager.parseFrontmatter(raw);

        // Derive title from frontmatter or from filename
        const title = (typeof meta.title === 'string' ? meta.title : null)
          ?? promptName.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Derive description from frontmatter or from first markdown heading
        let description = typeof meta.description === 'string' ? meta.description : null;
        if (!description) {
          const headingMatch = body.match(/^#\s+(.+)$/m);
          description = headingMatch ? headingMatch[1] : `Prompt: ${promptName}`;
        }

        // Parse arguments from frontmatter array
        let promptArgs: Prompt['arguments'] | undefined;
        if (Array.isArray(meta.arguments)) {
          promptArgs = (meta.arguments as Record<string, unknown>[]).map(a => ({
            name: String(a.name ?? ''),
            description: String(a.description ?? ''),
            required: a.required === true || a.required === 'true',
          }));
        }

        const prompt: Prompt = {
          name: promptName,
          title,
          description,
          ...(promptArgs && { arguments: promptArgs }),
        };

        this.prompts.set(promptName, prompt);
        // Store the body (without frontmatter) as the content sent to clients
        this.promptContents.set(promptName, body);
        logger.debug(`Registered prompt: ${promptName} (${body.length} bytes)`);
      } catch (error) {
        logger.error(`Failed to load prompt ${promptName}: ${CommandResultFactory.normalizeError(error).message}`);
      }
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
