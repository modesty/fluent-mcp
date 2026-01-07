/**
 * MCP-compliant error classes with proper JSON-RPC error codes
 * 
 * Standard JSON-RPC error codes used by MCP:
 * - -32602: Invalid params
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

  /**
   * Convert to JSON-RPC error format
   */
  toJsonRpcError(): { code: number; message: string; data?: unknown } {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Error thrown when a requested resource is not found
 * JSON-RPC error code: -32002
 */
export class McpResourceNotFoundError extends McpError {
  readonly code = -32002;
  readonly uri: string;

  constructor(uri: string, details?: string) {
    super(details ? `Resource not found: ${uri} - ${details}` : `Resource not found: ${uri}`);
    this.uri = uri;
  }

  toJsonRpcError(): { code: number; message: string; data?: { uri: string } } {
    return {
      code: this.code,
      message: this.message,
      data: { uri: this.uri },
    };
  }
}

/**
 * Error thrown when tool/method parameters are invalid
 * JSON-RPC error code: -32602
 */
export class McpInvalidParamsError extends McpError {
  readonly code = -32602;

  constructor(message: string) {
    super(`Invalid params: ${message}`);
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

/**
 * Error thrown when a tool is not found
 * JSON-RPC error code: -32602 (per MCP spec, unknown tools use invalid params code)
 */
export class McpUnknownToolError extends McpError {
  readonly code = -32602;

  constructor(toolName: string) {
    super(`Unknown tool: ${toolName}`);
  }
}
