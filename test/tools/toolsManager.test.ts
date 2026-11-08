/**
 * Tests for ToolsManager
 *
 * Covers registration, the tools/call handler (argument passing, abort
 * signal, thrown errors, progress notifications) and result formatting. The
 * resource tools themselves are tested in resourceTools.test.ts.
 *
 * Native runner: collaborators are replaced with module mocks registered before
 * ToolsManager is imported. Constructor mocks use `function` implementations so
 * they can be called with `new`. The MCP SDK needs no mock here because
 * ToolsManager imports only types from it (erased at compile time).
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { assertCalledWith } from '../support/mockAssertions.js';
import { loggerFixture } from '../support/fixtures.js';

// The logger fixture keeps the run quiet; its handle lets a test read what was logged.
const { logger: mockedLogger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

// Mock command tools (split into individual modules)
mock.module('../../src/tools/processors/processRunner.js', {
  namedExports: { NodeProcessRunner: mock.fn() },
});
// A test can give the next constructed executor a process() to observe.
const CLIExecutor = mock.fn(function (): object | void {});
mock.module('../../src/tools/processors/cliExecutor.js', {
  namedExports: { CLIExecutor },
});
mock.module('../../src/tools/processors/cliCmdWriter.js', {
  namedExports: { CLICmdWriter: mock.fn() },
});
// The CLI commands a ToolsManager built from now on registers. Empty by
// default; the tools/call suite adds one command per test.
const factoryCommands: unknown[] = [];
const createCommands = mock.fn((_executor: unknown, _writer: unknown, _ensureAuth: unknown) => [...factoryCommands]);
mock.module('../../src/tools/registry/commandFactory.js', {
  namedExports: {
    CommandFactory: { createCommands },
  },
});

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

const GetFluentKnowledgeCommand = mockResourceCommand('get_fluent_knowledge', 'Read Fluent knowledge', 'Mock knowledge');
const CheckAuthStatusCommand = mockResourceCommand('check_auth_status', 'Check authentication status', 'Mock auth status');

mock.module('../../src/tools/resources/resourceTools.js', {
  namedExports: {
    GetFluentKnowledgeCommand,
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
      GetFluentKnowledgeCommand,
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
    assert.equal(mockMcpServer.registerTool.mock.callCount(), 2);

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
    // check_auth_status is not long-running, so the progress token is ignored.
    assert.equal(ctx.mcpReq.notify.mock.callCount(), 0);

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

  it('formats a successful result as its output alone', () => {
    // No emoji prefix, no "Command executed successfully" wrapper. Failures are
    // pinned exactly by the next test.
    assert.equal(toolsManager.formatResult({ success: true, output: 'Success output' }), 'Success output');
  });

  it('never reports "Unknown error" and does not repeat a message that equals the output', () => {
    // A command-layer rejection carries the same text as output and error: print it once.
    const rejection = toolsManager.formatResult({ success: false, output: 'Script file not found: /x.js', exitCode: 1, error: 'Script file not found: /x.js' });
    assert.equal(rejection, 'Error (exit 1): Script file not found: /x.js');

    // A CLI envelope plus its recovered message: the message leads, the envelope stays as context.
    const envelope = '{"ok":false,"error":{"message":"No logs found"}}';
    const cli = toolsManager.formatResult({ success: false, output: envelope, exitCode: 1, error: 'No logs found' });
    assert.equal(cli, `Error (exit 1): No logs found\n\nOutput:\n${envelope}`);

    // No message from either stream (the CLI's own --select over an error envelope prints only null;
    // the tools apply select themselves, so this is only a fallback).
    const silent = toolsManager.formatResult({ success: false, output: 'null', exitCode: 1 });
    assert.ok(!silent.includes('Unknown error'));
    assert.equal(silent, 'Error (exit 1): the command reported no error message\n\nOutput:\nnull');
  });

  it('lists auth profiles with auth --list through the shared executor', async () => {
    const listed = { success: true, output: '[now-sdk] Listing all credentials: ', exitCode: 0 };
    const process = mock.fn(async (_command: string, _argv: string[], _cwd: string) => listed);
    const executor = { process };
    CLIExecutor.mock.mockImplementationOnce(function () {
      return executor;
    });
    createCommands.mock.resetCalls();

    const manager = new ToolsManager();
    const result = await manager.listAuthProfiles();

    // The executor the CLI commands were built with is the one that runs the listing.
    assert.equal(createCommands.mock.calls[0].arguments[0], executor);
    assert.equal(process.mock.callCount(), 1);
    assert.deepEqual(process.mock.calls[0].arguments[1].slice(-2), ['auth', '--list']);
    assert.equal(result, listed);
  });
});

describe('ToolsManager tools/call handler', () => {
  type Execute = (args: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
  type Notify = (notification: { method: string; params: Record<string, unknown> }) => Promise<void>;

  afterEach(() => {
    factoryCommands.length = 0;
  });

  /** Registers one CLI command and returns its tools/call handler. */
  function handlerFor(command: { name: string; timeoutMs?: number; execute: Execute }): ToolHandler {
    factoryCommands.push({ description: `${command.name} description`, arguments: [], ...command });
    const server = createServerStub();
    new ToolsManager().registerOn(server as never);
    const registration = server.registerTool.mock.calls.find((call) => call.arguments[0] === command.name);
    assert.ok(registration, `${command.name} was not registered`);
    return registration.arguments[2];
  }

  function context(notify: Notify) {
    return { mcpReq: { signal: undefined, _meta: { progressToken: 'tok-1' }, notify: mock.fn(notify) } };
  }

  /** The progress messages sent so far, in order. */
  function progressMessages(ctx: ReturnType<typeof context>): unknown[] {
    return ctx.mcpReq.notify.mock.calls.map((call) => {
      const { method, params } = call.arguments[0];
      assert.equal(method, 'notifications/progress');
      assert.equal(params.progressToken, 'tok-1');
      return params.message;
    });
  }

  it('formats a throw from execute() like any failed result', async () => {
    const handler = handlerFor({ name: 'failing_cmd', execute: async () => { throw new Error('spawn exploded'); } });

    const result = await handler({}, context(async () => undefined));

    assert.deepEqual(result, { content: [{ type: 'text', text: 'Error (exit 1): spawn exploded' }], isError: true });
  });

  it('sends an initial notice, heartbeats and a final notice for a long-running command', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    let finish!: (result: unknown) => void;
    const handler = handlerFor({
      name: 'long_cmd',
      timeoutMs: 30_000,
      execute: () => new Promise((resolve) => { finish = resolve; }),
    });
    const ctx = context(async () => undefined);

    const call = handler({}, ctx);
    assert.deepEqual(progressMessages(ctx), ['Running long_cmd…']);

    t.mock.timers.tick(3_000);
    assert.deepEqual(progressMessages(ctx), ['Running long_cmd…', 'Still running long_cmd…']);

    finish({ success: true, output: 'done' });
    await call;
    assert.deepEqual(progressMessages(ctx), ['Running long_cmd…', 'Still running long_cmd…', 'Finished long_cmd']);
    assert.deepEqual(ctx.mcpReq.notify.mock.calls.map((c) => c.arguments[0].params.progress), [1, 2, 3]);

    // The heartbeat stops with the command.
    t.mock.timers.tick(30_000);
    assert.equal(ctx.mcpReq.notify.mock.callCount(), 3);
  });

  it('clears the heartbeat when execute() throws', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const handler = handlerFor({ name: 'long_cmd', timeoutMs: 60_000, execute: async () => { throw new Error('boom'); } });
    const ctx = context(async () => undefined);

    const result = await handler({}, ctx);

    assert.equal((result as { isError: boolean }).isError, true);
    assert.deepEqual(progressMessages(ctx), ['Running long_cmd…', 'Finished long_cmd']);
    t.mock.timers.tick(30_000);
    assert.equal(ctx.mcpReq.notify.mock.callCount(), 2);
  });

  it('swallows a rejected progress notification', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    mockedLogger.debug.mock.resetCalls();
    const handler = handlerFor({ name: 'long_cmd', timeoutMs: 30_000, execute: async () => ({ success: true, output: 'ok' }) });
    const ctx = context(async () => { throw new Error('transport closed'); });

    const result = await handler({}, ctx);
    // Let the notify rejections reach their catch handlers.
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(result, { content: [{ type: 'text', text: 'ok' }], isError: false });
    assert.equal(ctx.mcpReq.notify.mock.callCount(), 2);
    const logged = mockedLogger.debug.mock.calls.map((call) => String(call.arguments[0]));
    assert.equal(logged.filter((line) => line.startsWith("Progress notification failed for 'long_cmd'")).length, 2);
  });

  it('sends no progress for a command below the long-running threshold', async () => {
    const handler = handlerFor({ name: 'short_cmd', timeoutMs: 29_999, execute: async () => ({ success: true, output: 'ok' }) });
    const ctx = context(async () => undefined);

    await handler({}, ctx);

    assert.equal(ctx.mcpReq.notify.mock.callCount(), 0);
  });
});
