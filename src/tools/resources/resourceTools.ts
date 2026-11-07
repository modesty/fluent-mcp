/**
 * MCP tools for reading the bundled Fluent knowledge (API specs, authoring
 * guides, code snippets) and checking authentication status
 */
import { z } from 'zod';
import { ResourceCatalog } from '../../res/resourceCatalog.js';
import { ServiceNowMetadataType } from '../../types.js';
import { assertArguments, buildInputZodSchema } from '../toolSchema.js';
import {
  CLICommand,
  CommandArgument,
  CommandResult,
  CommandResultFactory,
  EnsureAuthValidated,
  ResourceType,
} from '../../utils/types.js';
import { SessionManager } from '../../utils/sessionManager.js';
import logger from '../../utils/logger.js';

/** The one knowledge tool's name, for the pointers in prompts and instructions. */
export const KNOWLEDGE_TOOL_NAME = 'get_fluent_knowledge';

/** What each kind holds, with its article, for messages. */
const KIND_LABEL: Record<ResourceType, string> = {
  [ResourceType.SPEC]: 'an API specification',
  [ResourceType.INSTRUCT]: 'an authoring guide',
  [ResourceType.SNIPPET]: 'a code snippet',
};

const KINDS: readonly [ResourceType, ...ResourceType[]] = [ResourceType.SPEC, ResourceType.INSTRUCT, ResourceType.SNIPPET];

/** The supported metadata types (single source of truth: {@link ServiceNowMetadataType}), sorted. */
const METADATA_TYPES = Object.values(ServiceNowMetadataType).sort() as [string, ...string[]];

/** Output schema of the knowledge tool. Extra keys are stripped by Zod, so one shape covers reads and listings. */
const RESOURCE_OUTPUT_SCHEMA = {
  content: z.string().describe('The resource content (markdown).'),
  resourceType: z.string().describe('Resource kind: spec | snippet | instruct.'),
  metadataType: z.string().optional().describe('The ServiceNow metadata type, when a specific resource was returned.'),
  snippetId: z.string().optional().describe('The returned snippet id (snippets only).'),
  additionalSnippetIds: z.array(z.string()).optional().describe('Other available snippet ids (snippets only).'),
  availableTypes: z.array(z.string()).optional().describe('The metadata types that have this kind (listing mode).'),
};

/**
 * One read-only tool over the closed {@link ResourceCatalog}: `kind` selects the
 * spec, instruct or snippet collection, `metadataType` the entry, and
 * `snippetId` one snippet. The same content is served as `sn-spec://`,
 * `sn-instruct://` and `sn-snippet://` resources, for clients that read
 * resources rather than call tools.
 */
export class GetFluentKnowledgeCommand implements CLICommand {
  name = KNOWLEDGE_TOOL_NAME;
  description =
    'Read Fluent knowledge for a ServiceNow metadata type (e.g., business-rule, script-include). ' +
    "kind 'spec' returns the Fluent API specification, 'instruct' the authoring rules, conventions and pitfalls, " +
    "and 'snippet' a runnable code example (without snippetId, the first one plus the ids of the others). " +
    'Omit metadataType to list the metadata types that have that kind. ' +
    'For SDK APIs and guides beyond metadata types, use explain_fluent_api.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  outputSchema = RESOURCE_OUTPUT_SCHEMA;
  arguments: CommandArgument[] = [
    {
      name: 'kind',
      type: 'string',
      required: true,
      description: 'What to read: spec (API specification), instruct (authoring guide) or snippet (code example)',
      domain: { kind: 'choices', values: KINDS },
    },
    {
      name: 'metadataType',
      type: 'string',
      required: false,
      description: 'ServiceNow metadata type, lowercase (e.g., business-rule). Omit to list the types that have this kind',
      domain: { kind: 'choices', values: METADATA_TYPES },
    },
    {
      name: 'snippetId',
      type: 'string',
      required: false,
      description: "Snippet id such as 0001, for kind 'snippet' only. Omit for the first snippet; the result lists the other ids",
    },
  ];

  private inputSchema?: z.ZodType;

  constructor(private readonly resourceCatalog: ResourceCatalog = new ResourceCatalog()) {}

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      this.inputSchema ??= buildInputZodSchema(this.arguments);
      assertArguments(this.name, this.inputSchema, args);
      const kind = args.kind as ResourceType;
      const metadataType = (args.metadataType ?? undefined) as string | undefined;
      // An empty id is the "not provided" some clients send, like null.
      const snippetId = (args.snippetId || undefined) as string | undefined;

      if (snippetId !== undefined && kind !== ResourceType.SNIPPET) {
        return CommandResultFactory.error(`snippetId applies only to kind 'snippet', not '${kind}'.`);
      }
      if (metadataType === undefined) {
        return snippetId === undefined
          ? await this.listTypes(kind)
          : CommandResultFactory.error('snippetId needs a metadataType.');
      }
      return kind === ResourceType.SNIPPET
        ? await this.readSnippet(metadataType, snippetId)
        : await this.read(kind, metadataType);
    } catch (error) {
      logger.error(`Error executing ${this.name}`, CommandResultFactory.normalizeError(error));
      return CommandResultFactory.fromError(error);
    }
  }

  /** The metadata types that have a resource of this kind, from that kind's index. */
  private async listTypes(kind: ResourceType): Promise<CommandResult> {
    const types = await this.resourceCatalog.listMetadataTypes(kind);
    if (types.length === 0) {
      return CommandResultFactory.error(`No metadata types with ${KIND_LABEL[kind]} found.`);
    }
    const output =
      `Available Fluent metadata types with ${KIND_LABEL[kind]} (${types.length}):\n${types.join('\n')}\n\n` +
      `Call ${KNOWLEDGE_TOOL_NAME} with kind '${kind}' and a metadataType to read one.`;
    return CommandResultFactory.success(output, 0, { content: output, resourceType: kind, availableTypes: types });
  }

  private async read(kind: ResourceType, metadataType: string): Promise<CommandResult> {
    const result = await this.resourceCatalog.getResource(kind, metadataType);
    if (!result.found) {
      return CommandResultFactory.error(
        `No ${kind} resource found for metadata type '${metadataType}'. ` +
        `Call ${KNOWLEDGE_TOOL_NAME} with only kind '${kind}' to list the types that have one.`
      );
    }
    return CommandResultFactory.success(result.content, 0, { content: result.content, resourceType: kind, metadataType });
  }

  /**
   * An explicit id is served exactly or reported missing with the ids that do
   * exist; it is never silently replaced by another snippet. Without an id, the
   * first snippet is returned and the others are named.
   */
  private async readSnippet(metadataType: string, snippetId: string | undefined): Promise<CommandResult> {
    const snippetIds = await this.resourceCatalog.listSnippets(metadataType);
    if (snippetIds.length === 0) {
      return CommandResultFactory.error(
        `No snippets found for metadata type '${metadataType}'. ` +
        `Call ${KNOWLEDGE_TOOL_NAME} with only kind 'snippet' to list the types that have one.`
      );
    }
    if (snippetId !== undefined && !snippetIds.includes(snippetId)) {
      return CommandResultFactory.error(
        `Snippet '${snippetId}' not found for metadata type '${metadataType}'. ` +
        `Available snippet ids: ${snippetIds.join(', ')}.`
      );
    }

    const id = snippetId ?? snippetIds[0];
    const result = await this.resourceCatalog.getResource(ResourceType.SNIPPET, metadataType, id);
    if (!result.found) {
      return CommandResultFactory.error(`Snippet '${id}' not found for metadata type '${metadataType}'.`);
    }
    const others = snippetId === undefined ? snippetIds.slice(1) : [];
    const additionalInfo = others.length > 0 ? `\n\nAdditional snippets available: ${others.join(', ')}` : '';
    return CommandResultFactory.success(result.content + additionalInfo, 0, {
      content: result.content,
      resourceType: ResourceType.SNIPPET,
      metadataType,
      snippetId: id,
      ...(others.length > 0 && { additionalSnippetIds: others }),
    });
  }
}

/**
 * Command for checking current authentication status
 * Lazily resolves configured auth once, then returns the cached session result.
 */
export class CheckAuthStatusCommand implements CLICommand {
  name = 'check_auth_status';
  description = 'Check current ServiceNow authentication status. Lazily validates configured auth once and returns JSON including status, profile alias, instance host, auth type, and any required user action. Call this before commands that require authentication (deploy_fluent_app, fluent_transform, download_fluent_dependencies, download_fluent_app) to verify credentials are configured.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  arguments: CommandArgument[] = [];
  outputSchema = {
    status: z.string().describe("Auth status: 'authenticated' | 'not_authenticated' | 'validation_error' | 'skipped' | 'unknown'."),
    message: z.string().describe('Human-readable status message.'),
    alias: z.string().optional().describe('The matched auth profile alias.'),
    host: z.string().optional().describe('The ServiceNow instance host.'),
    authType: z.string().optional().describe("Auth type: 'oauth' | 'basic'."),
    isDefault: z.boolean().optional().describe('Whether this is the default auth profile.'),
    actionRequired: z.string().optional().describe('A shell command to run if manual auth setup is needed.'),
    timestamp: z.string().optional().describe('ISO timestamp of the validation.'),
  };

  constructor(
    private readonly ensureAuthValidated: EnsureAuthValidated = async () => {}
  ) {}

  /**
   * Execute the command to check auth status
   * @returns Command result with auth status information
   */
  async execute(): Promise<CommandResult> {
    try {
      await this.ensureAuthValidated();
      const sessionManager = SessionManager.getInstance();
      const authResult = sessionManager.getAuthValidationResult();

      if (!authResult) {
        const unknownStatus = {
          status: 'unknown',
          message: 'Auth validation completed without a cached result.',
          timestamp: new Date().toISOString(),
        };
        return CommandResultFactory.success(JSON.stringify(unknownStatus, null, 2), 0, unknownStatus);
      }

      // Return the auth result as formatted JSON plus structured content
      return CommandResultFactory.success(
        JSON.stringify(authResult, null, 2),
        0,
        { ...authResult }
      );
    } catch (error) {
      logger.error('Error checking auth status', CommandResultFactory.normalizeError(error));
      return CommandResultFactory.fromError(error);
    }
  }
}
