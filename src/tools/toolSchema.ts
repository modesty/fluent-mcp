import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/server';
import type { ArgumentDomain, CommandArgument } from '../utils/types.js';

/**
 * Single source of truth for a tool's INPUT schema.
 *
 * A tool is described in two places that must share one contract:
 *  - **enforced** on `tools/call` — `ToolsManager` passes this strict Zod object to
 *    `mcpServer.registerTool()`, which validates incoming arguments against it;
 *  - **advertised** on `tools/list` — `CommandRegistry.toMCPTools()` emits the
 *    canonical JSON Schema so clients know what to send.
 *
 * Deriving both from {@link buildInputZodSchema} keeps the canonical types and
 * required set aligned. The enforced schema additionally accepts null for
 * optional values as an input compatibility behavior; that normalization is
 * intentionally not exposed as a nullable union to clients.
 */

/** The input of a failed check, as the Zod issue reports it. */
type IssueInput = { input?: unknown };

/** Values that mean "not provided": a missing key, or the null LLMs send for one. */
const isAbsent = (input: unknown): boolean => input === undefined || input === null;

/** The message for a value of the wrong type, worded as the hand checks were. */
function wrongTypeMessage(arg: CommandArgument, input: unknown): string {
  switch (arg.type) {
    case 'string':
      return `Argument '${arg.name}' must be a string, got ${typeof input}`;
    case 'number':
      return `Argument '${arg.name}' must be a valid number`;
    case 'boolean':
      return `Argument '${arg.name}' must be a boolean`;
    case 'array':
      return `Argument '${arg.name}' must be an array`;
  }
}

/**
 * The error function for one argument: a missing required value names the
 * argument, its purpose and type; anything else uses the type or domain message.
 */
function argumentError(arg: CommandArgument, otherwise: (input: unknown) => string) {
  return (issue: IssueInput): string =>
    isAbsent(issue.input)
      ? `Missing required argument '${arg.name}'. ${arg.description}. Expected type: ${arg.type}.`
      : otherwise(issue.input);
}

// eslint-disable-next-line no-control-regex -- control characters are intentionally rejected
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;
/**
 * Control characters that are not line formatting (newline, carriage return,
 * tab): rejected in `multilineText` arguments, and in script file content.
 */
// eslint-disable-next-line no-control-regex -- control characters are intentionally rejected
export const CONTROL_CHARACTERS_EXCEPT_LINE_FORMATTING = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;

/**
 * Compile a string argument and its domain. Plain text rejects every control
 * character: they can obscure argv boundaries in logs, and a newline would end
 * the `// now-sdk exec:` comment the CLI writes a `reason` into. That check is a
 * refinement, so it is enforced but not advertised as a pattern on every string.
 */
function stringType(arg: CommandArgument, domain: ArgumentDomain | undefined): z.ZodTypeAny {
  const typeError = argumentError(arg, (input) => wrongTypeMessage(arg, input));
  const text = z.string({ error: typeError });
  switch (domain?.kind) {
    case undefined:
      return text.refine((value) => !CONTROL_CHARACTERS.test(value), {
        error: `Invalid characters in argument '${arg.name}': control characters are not allowed.`,
      });
    case 'multilineText':
      return text.refine((value) => !CONTROL_CHARACTERS_EXCEPT_LINE_FORMATTING.test(value), {
        error: `Invalid characters in argument '${arg.name}': control characters other than newline, carriage return, and tab are not allowed.`,
      });
    case 'choices': {
      const { values } = domain;
      return z.enum(values, {
        error: argumentError(arg, (input) =>
          `Argument '${arg.name}' must be one of: ${values.join(', ')}. Received: "${String(input)}".`),
      });
    }
    case 'pattern': {
      const { regex, expected } = domain;
      if (regex.flags !== '' || !regex.source.startsWith('^') || !regex.source.endsWith('$')) {
        throw new Error(`Argument '${arg.name}': a domain pattern must be anchored (^…$) and flag-free, got ${String(regex)}`);
      }
      return text.regex(regex, {
        error: (issue: IssueInput) => `Argument '${arg.name}' must be ${expected}. Received: "${String(issue.input)}".`,
      });
    }
  }
}

/**
 * Build the Zod raw shape for a command's input arguments.
 * @param args The command's declared arguments
 * @returns A Zod raw shape keyed by argument name
 */
export function buildInputZodShape(args: CommandArgument[]): z.ZodRawShape {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const arg of args) {
    if (arg.domain !== undefined && arg.type !== 'string') {
      throw new Error(`Argument '${arg.name}': a domain applies only to string arguments, not ${arg.type}`);
    }
    const typeError = argumentError(arg, (input) => wrongTypeMessage(arg, input));
    let zodType: z.ZodTypeAny;

    // Map command argument types to Zod types, carrying the description so it
    // survives into the advertised JSON Schema.
    switch (arg.type) {
      case 'string':
        zodType = stringType(arg, arg.domain);
        break;
      case 'number':
        zodType = z.number({ error: typeError });
        break;
      case 'boolean':
        zodType = z.boolean({ error: typeError });
        break;
      case 'array':
        zodType = z.array(z.any(), { error: typeError });
        break;
    }
    zodType = zodType.describe(arg.description);

    // LLMs commonly send null for "not provided" parameters. Normalize that
    // compatibility value before applying .optional(): using
    // .nullable().optional() would advertise every optional property as
    // anyOf[value, null], which the MCP Inspector (and some other clients)
    // cannot render as a normal form field. The advertised schema therefore
    // describes the actual value type while the enforced schema still accepts
    // null and treats it as omitted.
    if (!arg.required) {
      zodType = z.preprocess(
        (value) => value === null ? undefined : value,
        zodType.optional()
      );
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
 * legacy conversion packages, which can mis-convert zod v4 shapes.
 * Optional properties advertise their canonical value type while the matching
 * enforced schema accepts null as an omitted-value compatibility form.
 * @param args The command's declared arguments
 * @returns A JSON Schema object suitable for `Tool.inputSchema`
 */
export function buildInputJsonSchema(args: CommandArgument[]): Tool['inputSchema'] {
  return z.toJSONSchema(buildInputZodSchema(args)) as Tool['inputSchema'];
}

/**
 * Check arguments against a command's input schema, for callers that reach a
 * command without the `tools/call` boundary (the internal `AuthCommand`, direct
 * `execute()` calls). The message matches the MCP SDK's own for the same
 * failure, so a rejection reads the same on either path.
 * @param toolName The command name
 * @param schema The command's input schema ({@link buildInputZodSchema})
 * @param values The arguments
 * @throws Error naming every failed argument
 */
export function assertArguments(toolName: string, schema: z.ZodType, values: Record<string, unknown>): void {
  const result = schema.safeParse(values);
  if (!result.success) {
    const issues = result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.map(String).join('.')}: ${issue.message}` : issue.message);
    throw new Error(`Input validation error: Invalid arguments for tool ${toolName}: ${issues.join(', ')}`);
  }
}
