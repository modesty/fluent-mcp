import { completable, McpServer } from '@modelcontextprotocol/server';
import type { GetPromptResult } from '@modelcontextprotocol/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getProjectRootPath } from '../config.js';
import logger from '../utils/logger.js';
import { CommandResultFactory, ResourceType } from '../utils/types.js';
import { ResourceCatalog } from '../res/resourceCatalog.js';
import { ServiceNowMetadataType } from '../types.js';

/** Single source of truth for the supported metadata types (see src/types.ts). */
const ALL_METADATA_TYPES: readonly string[] = Object.values(ServiceNowMetadataType);

/** The one prompt argument the server knows how to render and complete. */
const METADATA_LIST = 'metadata_list';

/** One `arguments` entry of a prompt's front matter. */
export interface PromptArgumentSpec {
  name: string;
  description: string;
  required: boolean;
}

/** A prompt as loaded from `res/prompt/<name>.md`. */
export interface PromptDefinition {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgumentSpec[];
  /** The markdown after the front matter: the message text sent to clients. */
  body: string;
}

const unquote = (value: string): string => value.trim().replace(/^(["'])(.*)\1$/, '$2');

/**
 * Parse one prompt file. The front matter has exactly the shape the bundled
 * prompts use: `key: value` scalars plus one `arguments:` list of maps
 * (`- name: …` then indented `description:` / `required:`). Anything else is
 * rejected rather than silently ignored. CRLF is read as LF: the repository has
 * no `.gitattributes`, so a Windows checkout may convert the files.
 */
export function parsePromptFile(name: string, raw: string): PromptDefinition {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Prompt ${name}: missing front matter`);

  const scalars: Record<string, string> = {};
  const items: Record<string, string>[] = [];
  let inArguments = false;
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const key = line.match(/^(\w+):\s*(.*)$/);
    const item = line.match(/^\s+-\s+(\w+):\s*(.+)$/);
    const field = line.match(/^\s+(\w+):\s*(.+)$/);
    if (key && key[2]) {
      scalars[key[1]] = unquote(key[2]);
      inArguments = false;
    } else if (key?.[1] === 'arguments') {
      inArguments = true;
    } else if (inArguments && item) {
      items.push({ [item[1]]: unquote(item[2]) });
    } else if (inArguments && field && items.length > 0) {
      items[items.length - 1][field[1]] = unquote(field[2]);
    } else {
      throw new Error(`Prompt ${name}: unsupported front matter line: ${line}`);
    }
  }

  const { title, description } = scalars;
  if (!title || !description) throw new Error(`Prompt ${name}: front matter needs a title and a description`);

  const args = items.map((entry) => {
    if (entry.name !== METADATA_LIST) {
      throw new Error(`Prompt ${name}: unsupported argument "${entry.name}" (only ${METADATA_LIST} is rendered)`);
    }
    return { name: entry.name, description: entry.description ?? '', required: entry.required === 'true' };
  });

  return { name, title, description, arguments: args, body: match[2] };
}

/**
 * Complete the last entry of a comma-separated `metadata_list`, keeping the
 * entries already typed: "table,bus" → "table,business-rule".
 */
export function completeMetadataList(value: string): string[] {
  const entries = value.split(',');
  const current = entries.pop()!.trim().toLowerCase();
  const chosen = new Set(entries.map((entry) => entry.trim().toLowerCase()));
  const prefix = entries.length > 0 ? `${entries.join(',')},` : '';
  return ALL_METADATA_TYPES
    .filter((type) => type.startsWith(current) && !chosen.has(type))
    .map((type) => prefix + type);
}

/** The Zod arguments schema advertised in `prompts/list` and enforced on `prompts/get`. */
function argsSchemaFor(args: readonly PromptArgumentSpec[]) {
  const shape: Record<string, z.ZodType<string | undefined>> = {};
  for (const arg of args) {
    const field = completable(z.string().describe(arg.description), completeMetadataList);
    shape[arg.name] = arg.required ? field : field.optional();
  }
  return z.object(shape);
}

/**
 * Serves the `res/prompt/*.md` prompts through the SDK's `registerPrompt`. The
 * SDK owns `prompts/list`, `prompts/get` (including the -32602 answer for an
 * unknown prompt or invalid arguments) and `completion/complete`; this class
 * loads the files once and renders the message text.
 */
export class PromptManager {
  private prompts: PromptDefinition[] = [];

  /**
   * Prompt content is loaded once by `initialize()` and shared; prompts are
   * registered per MCP server instance by `registerOn()`, because the stdio
   * entry may build more than one instance per connection (see ToolsManager).
   */
  constructor(private readonly resourceCatalog: ResourceCatalog = new ResourceCatalog()) {}

  /** Load every `res/prompt/*.md` file, in name order. */
  async initialize(): Promise<void> {
    const promptDir = path.join(getProjectRootPath(), 'res', 'prompt');
    let files: string[];
    try {
      files = await fs.readdir(promptDir);
    } catch (error) {
      logger.warn(`Could not read prompt directory ${promptDir}: ${CommandResultFactory.normalizeError(error).message}`);
      return;
    }

    const loaded: PromptDefinition[] = [];
    for (const file of files.filter((f) => f.endsWith('.md')).sort()) {
      const name = file.replace(/\.md$/, '');
      try {
        loaded.push(parsePromptFile(name, await fs.readFile(path.join(promptDir, file), 'utf-8')));
      } catch (error) {
        logger.error(`Failed to load prompt ${name}: ${CommandResultFactory.normalizeError(error).message}`);
      }
    }
    this.prompts = loaded;
    if (loaded.length === 0) logger.warn(`No prompts found in ${promptDir} — expected at least one .md file`);
    logger.debug(`Initialized PromptManager with ${loaded.length} prompts`);
  }

  /** Register every loaded prompt on one server instance. */
  registerOn(mcpServer: McpServer): void {
    for (const prompt of this.prompts) {
      const config = { title: prompt.title, description: prompt.description };
      if (prompt.arguments.length === 0) {
        mcpServer.registerPrompt(prompt.name, config, () => this.result(prompt, prompt.body));
      } else {
        mcpServer.registerPrompt(
          prompt.name,
          { ...config, argsSchema: argsSchemaFor(prompt.arguments) },
          async (args) => this.result(prompt, await this.render(prompt.body, args[METADATA_LIST]))
        );
      }
    }
  }

  private result(prompt: PromptDefinition, text: string): GetPromptResult {
    return { description: prompt.description, messages: [{ role: 'user', content: { type: 'text', text } }] };
  }

  /**
   * Render a prompt for the requested metadata types. For each requested type
   * it injects a real authoring summary drawn from the shipped instruction
   * resource plus explicit pointers to the knowledge tool
   * (`get_fluent_knowledge`) and URIs (`sn-spec://` etc.),
   * then appends the complete, enum-derived catalog of supported types.
   * @param metadataList The comma-separated `metadata_list` argument (MCP prompt
   *   arguments are strings on the wire, e.g. "table,business-rule"). An absent
   *   or empty value renders the body unchanged.
   */
  private async render(body: string, metadataList: string | undefined): Promise<string> {
    if (!metadataList) return body;
    const requested = metadataList
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);

    const sections = await Promise.all(requested.map((type) => this.renderTypeSection(type)));

    const total = ALL_METADATA_TYPES.length;
    const catalog =
      `---\n\nAll ${total} supported metadata types (call \`get_fluent_knowledge\` with only a kind to list them at any time):\n\n` +
      `${ALL_METADATA_TYPES.join(', ')}.`;

    const selected = sections.length > 0
      ? `\n\n## Selected Metadata Types\n\n${sections.join('\n\n')}`
      : '';

    return `${body}${selected}\n\n${catalog}`;
  }

  /**
   * Render one metadata type's guidance block: a concise summary from its
   * instruction resource (when available) followed by explicit tool/URI pointers.
   * Unknown types get an actionable correction instead of a stub.
   */
  private async renderTypeSection(type: string): Promise<string> {
    if (!ALL_METADATA_TYPES.includes(type)) {
      return `### ${type}\n\n\`${type}\` is not a recognized Fluent metadata type. ` +
        `Call \`get_fluent_knowledge\` with only a kind to see all ${ALL_METADATA_TYPES.length} supported types.`;
    }

    const pointers =
      `Fetch full details on demand: \`get_fluent_knowledge\` (metadataType: "${type}", kind: "spec", "instruct" or "snippet") ` +
      `— or read \`sn-spec://${type}\`, \`sn-instruct://${type}\`, \`sn-snippet://${type}/0001\`.`;

    let summary = '';
    try {
      const instruct = await this.resourceCatalog.getResource(ResourceType.INSTRUCT, type);
      if (instruct.found) {
        summary = PromptManager.summarizeInstruct(instruct.content);
      }
    } catch (error) {
      // A missing/unreadable instruct resource must not break prompt rendering;
      // the tool/URI pointers below still guide the caller to the content.
      logger.debug(`Instruct summary unavailable for '${type}': ${CommandResultFactory.normalizeError(error).message}`);
    }

    const body = summary ? `${summary}\n\n${pointers}` : pointers;
    return `### ${type}\n\n${body}`;
  }

  /**
   * Extract a concise summary from an instruction resource: the first couple of
   * substantive guidance lines, skipping the heading and the boilerplate
   * "Always reference ..." lead-in. Bounded so a multi-type prompt stays compact.
   */
  private static summarizeInstruct(content: string, maxChars = 600): string {
    const points: string[] = [];
    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      if (/^always reference/i.test(line)) continue;
      points.push(line);
      if (points.length >= 2) break;
    }
    const summary = points.join(' ');
    return summary.length > maxChars ? `${summary.slice(0, maxChars).trimEnd()}…` : summary;
  }
}
