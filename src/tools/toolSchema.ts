import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CommandArgument } from '../utils/types.js';

/**
 * Single source of truth for a tool's INPUT schema.
 *
 * A tool is described in two places that must agree:
 *  - **enforced** on `tools/call` — `ToolsManager` passes this strict Zod object to
 *    `mcpServer.registerTool()`, which validates incoming arguments against it;
 *  - **advertised** on `tools/list` — `CommandRegistry.toMCPTools()` emits JSON
 *    Schema so clients know what to send.
 *
 * Deriving both from {@link buildInputZodSchema} guarantees advertised == enforced
 * (previously the two were hand-built independently and could drift).
 */

/**
 * Build the Zod raw shape for a command's input arguments.
 * @param args The command's declared arguments
 * @returns A Zod raw shape keyed by argument name
 */
export function buildInputZodShape(args: CommandArgument[]): z.ZodRawShape {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const arg of args) {
    let zodType: z.ZodTypeAny;

    // Map command argument types to Zod types, carrying the description so it
    // survives into the advertised JSON Schema.
    switch (arg.type) {
      case 'string':
        zodType = z.string().describe(arg.description);
        break;
      case 'number':
        zodType = z.number().describe(arg.description);
        break;
      case 'boolean':
        zodType = z.boolean().describe(arg.description);
        break;
      case 'array':
        zodType = z.array(z.any()).describe(arg.description);
        break;
      default:
        zodType = z.any().describe(arg.description);
    }

    // Optional args use .nullable().optional() because LLMs commonly send null
    // for "not provided" parameters, and z.string().optional() rejects null.
    if (!arg.required) {
      zodType = zodType.nullable().optional();
    }

    shape[arg.name] = zodType;
  }

  return shape;
}

/**
 * Build the strict object schema used for both tool registration and
 * tools/list JSON Schema generation. Keeping the object wrapper here is
 * important for zero-argument tools: an empty schema must still be registered
 * so the MCP SDK invokes the handler as `(args, extra)` and rejects unknown
 * arguments.
 * @param args The command's declared arguments
 * @returns A strict Zod object schema for the command input
 */
export function buildInputZodSchema(args: CommandArgument[]): z.ZodObject<z.ZodRawShape> {
  return z.strictObject(buildInputZodShape(args));
}

/**
 * Convert a command's input arguments to the JSON Schema advertised in
 * `tools/list`, derived from the exact Zod object enforced on `tools/call`.
 *
 * Uses zod v4's native JSON-Schema conversion (`z.toJSONSchema`) rather than the
 * v3 `zod-to-json-schema` package, which mis-converts zod v4 shapes.
 * @param args The command's declared arguments
 * @returns A JSON Schema object suitable for `Tool.inputSchema`
 */
export function buildInputJsonSchema(args: CommandArgument[]): Tool['inputSchema'] {
  return z.toJSONSchema(buildInputZodSchema(args)) as Tool['inputSchema'];
}
