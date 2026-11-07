/**
 * Drives the resource templates a manager registers, without a transport.
 *
 * `registerOn()` is handed a recorder in place of an McpServer; the recorded
 * `ResourceTemplate` objects are then exercised through their public API
 * (`listCallback`, `uriTemplate.match`), exactly what the SDK's own
 * `resources/*` handlers call. End-to-end
 * protocol behaviour (error codes, cache hints, both eras) is covered in
 * test/server/wireProtocol.test.ts.
 */
import type { ReadResourceResult, Resource, ResourceTemplate, Variables } from '@modelcontextprotocol/server';

interface Registered {
  name: string;
  template: ResourceTemplate;
  config: Record<string, unknown>;
  read: (uri: URL, variables: Variables, ctx: never) => Promise<ReadResourceResult>;
}

export interface RegisteredTemplates {
  readonly registered: readonly Registered[];
  /** What `resources/list` returns: each template's listing, template metadata first. */
  list(): Promise<Array<Resource & Record<string, unknown>>>;
  /** Read through the first template whose URI template matches (as the SDK does). */
  read(uri: string): Promise<ReadResourceResult>;
}

export function registerTemplates(manager: { registerOn(server: never): void }): RegisteredTemplates {
  const registered: Registered[] = [];
  manager.registerOn({
    registerResource: (name: string, template: ResourceTemplate, config: Record<string, unknown>, read: Registered['read']) => {
      registered.push({ name, template, config, read });
    },
  } as never);

  return {
    registered,
    async list() {
      const resources = [];
      for (const { template, config } of registered) {
        const result = await template.listCallback?.({} as never);
        for (const resource of result?.resources ?? []) resources.push({ ...config, ...resource } as Resource);
      }
      return resources;
    },
    async read(uri) {
      const url = new URL(uri);
      for (const { template, read } of registered) {
        const variables = template.uriTemplate.match(url.toString());
        if (variables) return read(url, variables, {} as never);
      }
      throw new Error(`No registered template matches ${uri}`);
    },
  };
}
