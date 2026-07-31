import {
  McpInternalError,
  McpResourceNotFoundError,
} from '../../src/utils/mcpErrors.js';

describe('MCP protocol errors', () => {
  it('classifies a missing resource as invalid params', () => {
    const error = new McpResourceNotFoundError('sn-spec://missing');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('McpResourceNotFoundError');
    expect(error.code).toBe(-32602);
    expect(error.message).toBe('Resource not found: sn-spec://missing');
  });

  it('includes optional resource details', () => {
    const error = new McpResourceNotFoundError(
      'sn-snippet://table/9999',
      'Unknown snippet id'
    );

    expect(error.message).toBe(
      'Resource not found: sn-snippet://table/9999 - Unknown snippet id'
    );
  });

  it('preserves the internal-error cause', () => {
    const cause = new Error('disk unavailable');
    const error = new McpInternalError('Could not load resource', cause);

    expect(error.name).toBe('McpInternalError');
    expect(error.code).toBe(-32603);
    expect(error.message).toBe('Internal error: Could not load resource');
    expect(error.cause).toBe(cause);
  });
});
