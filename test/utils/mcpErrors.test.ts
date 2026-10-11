import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  McpInternalError,
  McpResourceNotFoundError,
} from '../../src/utils/mcpErrors.js';

describe('MCP protocol errors', () => {
  it('classifies a missing resource as invalid params', () => {
    const error = new McpResourceNotFoundError('sn-spec://missing');

    assert.ok(error instanceof Error);
    assert.equal(error.name, 'McpResourceNotFoundError');
    assert.equal(error.code, -32602);
    assert.equal(error.message, 'Resource not found: sn-spec://missing');
  });

  it('includes optional resource details', () => {
    const error = new McpResourceNotFoundError(
      'sn-snippet://table/9999',
      'Unknown snippet id'
    );

    assert.equal(
      error.message,
      'Resource not found: sn-snippet://table/9999 - Unknown snippet id'
    );
  });

  it('preserves the internal-error cause', () => {
    const cause = new Error('disk unavailable');
    const error = new McpInternalError('Could not load resource', cause);

    assert.equal(error.name, 'McpInternalError');
    assert.equal(error.code, -32603);
    assert.equal(error.message, 'Internal error: Could not load resource');
    assert.equal(error.cause, cause);
  });
});
