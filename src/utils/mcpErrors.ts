/**
 * MCP-compliant error classes with proper JSON-RPC error codes.
 * The MCP SDK serializes thrown errors using their `code` field.
 *
 * Standard JSON-RPC error codes used by MCP:
 * - -32002: Resource not found
 * - -32603: Internal error
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources#error-handling
 * @see https://modelcontextprotocol.io/docs/concepts/tools#error-handling
 */

/**
 * Base class for MCP protocol errors
 */
export abstract class McpError extends Error {
  abstract readonly code: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a requested resource is not found
 * JSON-RPC error code: -32002
 */
export class McpResourceNotFoundError extends McpError {
  readonly code = -32002;

  constructor(uri: string, details?: string) {
    super(details ? `Resource not found: ${uri} - ${details}` : `Resource not found: ${uri}`);
  }
}

/**
 * Error thrown for internal server errors
 * JSON-RPC error code: -32603
 */
export class McpInternalError extends McpError {
  readonly code = -32603;

  constructor(message: string, public readonly cause?: Error) {
    super(`Internal error: ${message}`);
  }
}
