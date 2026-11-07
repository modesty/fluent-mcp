import { McpServer, ResourceNotFoundError, ResourceTemplate } from '@modelcontextprotocol/server';
import type { ReadResourceResult, Resource, Variables } from '@modelcontextprotocol/server';
import { ResourceCatalog } from './resourceCatalog.js';
import { CommandResultFactory, ResourceType } from '../utils/types.js';
import logger from '../utils/logger.js';

const MIME_TYPE = 'text/markdown';

/** One URI scheme of bundled `res/` content, served as one SDK resource template. */
interface ResourceKind {
  resourceType: ResourceType;
  /** URI scheme, also the template name, e.g. 'sn-spec' */
  scheme: string;
  uriTemplate: string;
  /** Title of the template in `resources/templates/list` */
  title: string;
  /** Label used in "not found" messages */
  label: string;
}

/**
 * Ordered to match the `resources/list` output: specs, then instructions, then
 * snippets (the SDK lists templates in registration order).
 */
const RESOURCE_KINDS: readonly ResourceKind[] = [
  {
    resourceType: ResourceType.SPEC,
    scheme: 'sn-spec',
    uriTemplate: 'sn-spec://{metadataType}',
    title: 'Fluent (ServiceNow SDK) API Specification',
    label: 'API specification',
  },
  {
    resourceType: ResourceType.INSTRUCT,
    scheme: 'sn-instruct',
    uriTemplate: 'sn-instruct://{metadataType}',
    title: 'Fluent (ServiceNow SDK) Instructions',
    label: 'Instructions',
  },
  {
    resourceType: ResourceType.SNIPPET,
    scheme: 'sn-snippet',
    uriTemplate: 'sn-snippet://{metadataType}/{snippetId}',
    title: 'Fluent (ServiceNow SDK) Code Snippet',
    label: 'Snippet',
  },
];

/** A simple `{var}` expansion always matches a single string. */
const variable = (variables: Variables, name: string): string => String(variables[name] ?? '');

/**
 * Serves the `sn-spec://`, `sn-instruct://`, and `sn-snippet://` resources as
 * three SDK resource templates. The SDK owns `resources/list`,
 * `resources/templates/list` and `resources/read` (including the not-found
 * answer for a URI no template matches); this class only supplies listings and
 * reads and `completion/complete` suggestions from the shared catalog.
 */
export class ResourceManager {
  /**
   * @param resourceCatalog The shared index of bundled `res/` content
   */
  constructor(private readonly resourceCatalog: ResourceCatalog = new ResourceCatalog()) {}

  /** Register the three resource templates on one server instance. */
  registerOn(mcpServer: McpServer): void {
    for (const kind of RESOURCE_KINDS) {
      const template = new ResourceTemplate(kind.uriTemplate, {
        list: async () => ({ resources: await this.list(kind) }),
        complete: {
          metadataType: (value) => this.completeMetadataType(kind, value),
          ...(kind.resourceType === ResourceType.SNIPPET && {
            snippetId: (value, context) => this.completeSnippetId(value, context?.arguments?.metadataType),
          }),
        },
      });
      mcpServer.registerResource(
        kind.scheme,
        template,
        { title: kind.title, mimeType: MIME_TYPE },
        (uri, variables) => this.read(kind, uri, variables)
      );
    }
  }

  /** Metadata types that have a resource of this kind, by prefix. */
  private async completeMetadataType(kind: ResourceKind, value: string): Promise<string[]> {
    const prefix = value.toLowerCase();
    return (await this.resourceCatalog.listMetadataTypes(kind.resourceType)).filter((type) => type.startsWith(prefix));
  }

  /** Snippet ids of the already-chosen metadata type, by prefix; none until a type is chosen. */
  private async completeSnippetId(value: string, metadataType: string | undefined): Promise<string[]> {
    if (!metadataType) return [];
    return (await this.resourceCatalog.listSnippets(metadataType)).filter((id) => id.startsWith(value));
  }

  /** Every concrete resource of one kind, for `resources/list`. */
  private async list(kind: ResourceKind): Promise<Resource[]> {
    // Each kind lists only the types that have that kind of resource: an instruct
    // listing built from the spec types would advertise URIs that read as not found.
    const types = await this.resourceCatalog.listMetadataTypes(kind.resourceType);
    switch (kind.resourceType) {
      case ResourceType.SPEC:
        return types.map((type) => ({
          uri: `sn-spec://${type}`,
          name: `sn-spec-${type}`,
          title: `${type} API Specification for Fluent (ServiceNow SDK)`,
        }));
      case ResourceType.INSTRUCT:
        return types.map((type) => ({
          uri: `sn-instruct://${type}`,
          name: `sn-instruct-${type}`,
          title: `${type} Instructions for Fluent (ServiceNow SDK)`,
        }));
      case ResourceType.SNIPPET: {
        const perType = await Promise.all(types.map(async (type) =>
          (await this.resourceCatalog.listSnippets(type)).map((id) => ({
            uri: `sn-snippet://${type}/${id}`,
            name: `sn-snippet-${type}-${id}`,
            title: `${type} Code Snippet ${id} for Fluent (ServiceNow SDK)`,
          }))
        ));
        return perType.flat();
      }
    }
  }

  /**
   * Read one resource. A key missing from the catalog is not found (-32602); a
   * failed file read is logged and reaches the client as -32603 (the SDK's
   * answer for an error without a numeric code).
   */
  private async read(kind: ResourceKind, uri: URL, variables: Variables): Promise<ReadResourceResult> {
    logger.debug('Reading resource', { uri: uri.href });
    const snippetId = kind.resourceType === ResourceType.SNIPPET ? variable(variables, 'snippetId') : undefined;
    const result = await this.resourceCatalog
      .getResource(kind.resourceType, variable(variables, 'metadataType'), snippetId)
      .catch((error: unknown) => {
        logger.error('Error reading resource', CommandResultFactory.normalizeError(error), { uri: uri.href });
        throw error;
      });

    if (!result.found) {
      logger.warn('Resource not found', { uri: uri.href });
      throw new ResourceNotFoundError(
        uri.href,
        `Resource not found: ${uri.href} - ${kind.label} not found for ${result.metadataType}`
      );
    }

    return { contents: [{ uri: uri.href, text: result.content, mimeType: MIME_TYPE }] };
  }
}
