/**
 * Tests for ToolsManager
 *
 * Note: Resource tool tests are in fluentMCPServer.resources.test.ts
 * This file only tests the ToolsManager-specific functionality
 *
 * Native runner: collaborators are replaced with module mocks registered before
 * ToolsManager is imported. Constructor mocks use `function` implementations so
 * they can be called with `new`. The MCP SDK needs no mock here because
 * ToolsManager imports only types from it (erased at compile time).
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { assertCalledWith } from '../support/mockAssertions.js';
import { loggerFixture } from '../support/fixtures.js';

// The Jest setup silenced the logger for every suite; the fixture does the same here.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

// Mock command tools (split into individual modules)
mock.module('../../src/tools/processors/processRunner.js', {
  namedExports: { NodeProcessRunner: mock.fn() },
});
mock.module('../../src/tools/processors/cliExecutor.js', {
  namedExports: { CLIExecutor: mock.fn() },
});
mock.module('../../src/tools/processors/cliCmdWriter.js', {
  namedExports: { CLICmdWriter: mock.fn() },
});
mock.module('../../src/tools/registry/commandFactory.js', {
  namedExports: {
    CommandFactory: {
      createCommands: mock.fn(() => []),
    },
  },
});

const mockGetCommand = mock.fn();
const mockToMCPTools = mock.fn(() => [
  { id: 'mock-command', title: 'Mock Command', description: 'A mock command for testing' },
]);
mock.module('../../src/tools/registry/commandRegistry.js', {
  namedExports: {
    // Stores what is registered, so getAllCommands() reflects reality: since the
    // v2 swap, ToolsManager builds the registry in its constructor and iterates
    // getAllCommands() in registerOn(server).
    CommandRegistry: mock.fn(function () {
      const commands: unknown[] = [];
      return {
        register: mock.fn((command: unknown) => {
          commands.push(command);
        }),
        getAllCommands: mock.fn(() => commands),
        getCommand: mockGetCommand,
        toMCPTools: mockToMCPTools,
      };
    }),
  },
});

// Mock the resource tools module with proper arguments array. Commands carry
// empty arguments arrays to satisfy iteration.
function mockResourceCommand(name: string, description: string, output: string) {
  return mock.fn(function () {
    return {
      name,
      description,
      arguments: [],
      execute: mock.fn(async (_args?: unknown, _signal?: AbortSignal) => ({ success: true, output })),
    };
  });
}

const GetApiSpecCommand = mockResourceCommand('get-api-spec', 'Get API specification', 'Mock API spec');
const GetSnippetCommand = mockResourceCommand('get-snippet', 'Get code snippet', 'Mock snippet');
const GetInstructCommand = mockResourceCommand('get-instruct', 'Get instructions', 'Mock instructions');
const ListMetadataTypesCommand = mockResourceCommand('list-metadata-types', 'List metadata types', 'Mock output');
const CheckAuthStatusCommand = mockResourceCommand('check_auth_status', 'Check authentication status', 'Mock auth status');

mock.module('../../src/tools/resources/resourceTools.js', {
  namedExports: {
    GetApiSpecCommand,
    GetSnippetCommand,
    GetInstructCommand,
    ListMetadataTypesCommand,
    CheckAuthStatusCommand,
  },
});

const { ToolsManager } = await import('../../src/tools/toolsManager.js');

type ToolConfig = { inputSchema: z.ZodType };
type ToolHandler = (args: Record<string, unknown>, ctx: unknown) => Promise<unknown>;

/** A stand-in MCP server that records what ToolsManager registers on it. */
function createServerStub() {
  return {
    registerTool: mock.fn((_name: string, _config: ToolConfig, _handler: ToolHandler): void => undefined),
  };
}

describe('ToolsManager', () => {
  let mockMcpServer: ReturnType<typeof createServerStub>;
  let toolsManager: InstanceType<typeof ToolsManager>;

  /** The most recently constructed check_auth_status command (the mock instance). */
  function lastCheckAuthCommand() {
    const call = CheckAuthStatusCommand.mock.calls.at(-1);
    assert.ok(call, 'CheckAuthStatusCommand was never constructed');
    return call.result as ReturnType<typeof CheckAuthStatusCommand>;
  }

  beforeEach(() => {
    for (const command of [
      GetApiSpecCommand,
      GetSnippetCommand,
      GetInstructCommand,
      ListMetadataTypesCommand,
      CheckAuthStatusCommand,
    ]) {
      command.mock.resetCalls();
    }
    mockMcpServer = createServerStub();
    // Construction builds the registry; registerOn() attaches it to a server.
    // The two are separate because serveStdio may build more than one server
    // instance per connection.
    toolsManager = new ToolsManager();
    toolsManager.registerOn(mockMcpServer as never);
  });

  it('should initialize and register tools', () => {
    assert.notEqual(toolsManager, undefined);
  });

  it('registers onto each server instance the factory produces', () => {
    // A second instance must receive the full tool set, because serveStdio can
    // discard a probe instance and ask the factory again.
    const secondServer = createServerStub();
    toolsManager.registerOn(secondServer as never);

    assert.equal(
      secondServer.registerTool.mock.callCount(),
      mockMcpServer.registerTool.mock.calls.length
    );
    assert.deepStrictEqual(
      secondServer.registerTool.mock.calls.map((call) => call.arguments[0]),
      mockMcpServer.registerTool.mock.calls.map((call) => call.arguments[0])
    );
  });

  it('registers every resource tool with a strict object input schema', () => {
    assert.equal(mockMcpServer.registerTool.mock.callCount(), 4);

    for (const call of mockMcpServer.registerTool.mock.calls) {
      const [name, config] = call.arguments;
      assert.ok(config.inputSchema instanceof z.ZodObject);
      assert.equal(config.inputSchema.safeParse({ undeclared: true }).success, false);

      if (name === 'check_auth_status') {
        assert.equal(config.inputSchema.safeParse({}).success, true);
      }
    }
  });

  it('passes empty args, not MCP callback metadata, to a zero-argument command', async () => {
    const checkAuthRegistration = mockMcpServer.registerTool.mock.calls.find(
      (call) => call.arguments[0] === 'check_auth_status'
    );
    assert.notEqual(checkAuthRegistration, undefined);

    const handler = checkAuthRegistration!.arguments[2];
    // v2 hands the handler a ServerContext, not v1's loose `extra` bag: the
    // abort signal is ctx.mcpReq.signal and the progress token is
    // ctx.mcpReq._meta.progressToken.
    const ctx = {
      mcpReq: {
        signal: undefined,
        _meta: { progressToken: 'token' },
        notify: mock.fn(async () => undefined),
      },
    };
    await handler({}, ctx);

    const command = lastCheckAuthCommand();
    // First arg is the tool args ({}), second is the (absent) abort signal — never
    // the MCP handler context object.
    assertCalledWith(command.execute, {}, undefined);
    assert.ok(!command.execute.mock.calls.some((call) => isDeepStrictEqual(call.arguments, [ctx])));
    assert.deepStrictEqual(command.execute.mock.calls[0].arguments[0], {});
  });

  it('threads the MCP abort signal from ctx.mcpReq into the command', async () => {
    const handler = mockMcpServer.registerTool.mock.calls.find(
      (call) => call.arguments[0] === 'check_auth_status'
    )!.arguments[2];
    const controller = new AbortController();
    await handler({}, {
      mcpReq: { signal: controller.signal, _meta: undefined, notify: mock.fn() },
    });

    const command = lastCheckAuthCommand();
    assertCalledWith(command.execute, {}, controller.signal);
  });

  it('should format command result correctly', () => {
    const successResult = {
      success: true,
      output: 'Success output',
    };

    const failResult = {
      success: false,
      output: 'Failure output',
      exitCode: 1,
      error: 'Error message',
    };

    const formattedSuccess = toolsManager.formatResult(successResult);
    const formattedFail = toolsManager.formatResult(failResult);

    // Success: clean output only (no emoji prefix, no "Command executed successfully" wrapper)
    assert.equal(formattedSuccess, 'Success output');

    // Failure: concise error with exit code and output context
    assert.ok(formattedFail.includes('Error (exit 1)'));
    assert.ok(formattedFail.includes('Failure output'));
    assert.ok(formattedFail.includes('Error message'));
  });
});
