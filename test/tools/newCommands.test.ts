/**
 * Tests for new SDK commands: Download, Clean, and Pack
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

// Session replacement: commands resolve their working directory from the
// initialized session, which this suite pins to a fixed path.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

// Neutral cwd for commands that need no Fluent project (explain) is the project root.
const config = configFixture();
config.getProjectRootPath.mock.mockImplementation(() => '/mock/project/root');

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', config.mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { CommandFactory } = await import('../../src/tools/registry/commandFactory.js');
const { DownloadCommand, CleanCommand, PackCommand, ExplainCommand } = await import(
  '../../src/tools/commands/index.js'
);

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

describe('New SDK Commands', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn<ProcessFn>(async () => ({
        success: true,
        output: 'Mock command output',
        exitCode: 0
      }))
    };
  });

  describe('DownloadCommand', () => {
    it('should create DownloadCommand with correct metadata', () => {
      const command = new DownloadCommand(mockProcessor);

      assert.equal(command.name, 'download_fluent_app');
      assert.ok(command.description.includes('Download application metadata from a ServiceNow instance'));
      assert.deepStrictEqual(command.arguments.map((arg) => arg.name), [
        'workingDirectory',
        'auth',
        'directory',
        'source',
        'incremental',
        'timeoutSeconds',
        'debug',
      ]);

      // Check required directory argument
      const directoryArg = command.arguments.find(arg => arg.name === 'directory');
      assert.notEqual(directoryArg, undefined);
      assert.equal(directoryArg?.required, true);
      assert.equal(directoryArg?.type, 'string');
      assert.equal(directoryArg?.description, 'Path to expand application');

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      assert.notEqual(sourceArg, undefined);
      assert.equal(sourceArg?.required, false);
      assert.equal(sourceArg?.type, 'string');

      // Check optional incremental argument
      const incrementalArg = command.arguments.find(arg => arg.name === 'incremental');
      assert.notEqual(incrementalArg, undefined);
      assert.equal(incrementalArg?.required, false);
      assert.equal(incrementalArg?.type, 'boolean');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      assert.notEqual(debugArg, undefined);
      assert.equal(debugArg?.required, false);
      assert.equal(debugArg?.type, 'boolean');
    });

    it('should execute download command with required directory', async () => {
      const command = new DownloadCommand(mockProcessor);

      const result = await command.execute({ directory: 'my-app' });

      assert.equal(result.success, true);
      assert.ok(result.output.includes('Mock command output'));
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'download', 'my-app'],
        '/mock/working/dir',
        undefined, // stdinInput
        600000,   // timeoutMs
        undefined  // signal
      );
    });

    it('should execute download command with all arguments', async () => {
      const command = new DownloadCommand(mockProcessor);

      const result = await command.execute({
        directory: 'my-app',
        source: './src',
        incremental: true,
        debug: true
      });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'download', 'my-app', '--source', './src', '--incremental', '--debug'],
        '/mock/working/dir',
        undefined, // stdinInput
        600000,   // timeoutMs
        undefined  // signal
      );
    });
  });

  describe('CleanCommand', () => {
    it('should create CleanCommand with correct metadata', () => {
      const command = new CleanCommand(mockProcessor);

      assert.equal(command.name, 'clean_fluent_app');
      assert.ok(command.description.includes('Delete the build output directory'));
      assert.deepStrictEqual(command.arguments.map((arg) => arg.name), [
        'workingDirectory',
        'source',
        'debug',
      ]);

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      assert.notEqual(sourceArg, undefined);
      assert.equal(sourceArg?.required, false);
      assert.equal(sourceArg?.type, 'string');
      assert.equal(sourceArg?.description, 'Path to the directory that contains package.json configuration');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      assert.notEqual(debugArg, undefined);
      assert.equal(debugArg?.required, false);
      assert.equal(debugArg?.type, 'boolean');
    });

    it('should execute clean command without arguments', async () => {
      const command = new CleanCommand(mockProcessor);

      const result = await command.execute({});

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'clean'],
        '/mock/working/dir',
        undefined, // stdinInput
        15000,    // timeoutMs
        undefined  // signal
      );
    });

    it('should execute clean command with source and debug', async () => {
      const command = new CleanCommand(mockProcessor);

      const result = await command.execute({
        source: 'src',
        debug: true
      });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'clean', '--source', 'src', '--debug'],
        '/mock/working/dir',
        undefined, // stdinInput
        15000,    // timeoutMs
        undefined  // signal
      );
    });
  });

  describe('PackCommand', () => {
    it('should create PackCommand with correct metadata', () => {
      const command = new PackCommand(mockProcessor);

      assert.equal(command.name, 'pack_fluent_app');
      assert.ok(command.description.includes('Package a built Fluent'));
      assert.deepStrictEqual(command.arguments.map((arg) => arg.name), [
        'workingDirectory',
        'source',
        'debug',
      ]);

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      assert.notEqual(sourceArg, undefined);
      assert.equal(sourceArg?.required, false);
      assert.equal(sourceArg?.type, 'string');
      assert.equal(sourceArg?.description, 'Path to the directory that contains package.json configuration');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      assert.notEqual(debugArg, undefined);
      assert.equal(debugArg?.required, false);
      assert.equal(debugArg?.type, 'boolean');
    });

    it('should execute pack command without arguments', async () => {
      const command = new PackCommand(mockProcessor);

      const result = await command.execute({});

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'pack'],
        '/mock/working/dir',
        undefined, // stdinInput
        30000,    // timeoutMs
        undefined  // signal
      );
    });

    it('should execute pack command with source and debug', async () => {
      const command = new PackCommand(mockProcessor);

      const result = await command.execute({
        source: './build',
        debug: true
      });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'pack', '--source', './build', '--debug'],
        '/mock/working/dir',
        undefined, // stdinInput
        30000,    // timeoutMs
        undefined  // signal
      );
    });
  });

  describe('ExplainCommand', () => {
    it('should create ExplainCommand with correct metadata', () => {
      const command = new ExplainCommand(mockProcessor);

      assert.equal(command.name, 'explain_fluent_api');
      assert.ok(command.description.includes('Look up Fluent SDK documentation'));
      assert.ok(command.description.includes('no authentication or active Fluent project required'));
      assert.deepStrictEqual(command.annotations, { readOnlyHint: true, idempotentHint: true });
      assert.equal(command.arguments.length, 5);

      // topic is optional in v4.6.0 (required only when list=false)
      const topicArg = command.arguments.find(arg => arg.name === 'topic');
      assert.notEqual(topicArg, undefined);
      assert.equal(topicArg?.required, false);
      assert.equal(topicArg?.type, 'string');

      const listArg = command.arguments.find(arg => arg.name === 'list');
      assert.notEqual(listArg, undefined);
      assert.equal(listArg?.required, false);
      assert.equal(listArg?.type, 'boolean');

      const peekArg = command.arguments.find(arg => arg.name === 'peek');
      assert.notEqual(peekArg, undefined);
      assert.equal(peekArg?.required, false);
      assert.equal(peekArg?.type, 'boolean');

      const formatArg = command.arguments.find(arg => arg.name === 'format');
      assert.notEqual(formatArg, undefined);
      assert.equal(formatArg?.required, false);
      assert.equal(formatArg?.type, 'string');

      // `now-sdk explain` declares no --source option (through SDK v4.14.0), so none is advertised.
      assert.equal(command.arguments.find(arg => arg.name === 'source'), undefined);

      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      assert.notEqual(debugArg, undefined);
      assert.equal(debugArg?.required, false);
      assert.equal(debugArg?.type, 'boolean');
    });

    it('should execute basic topic lookup', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({ topic: 'BusinessRule' });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'explain', 'BusinessRule'],
        '/mock/project/root',
        undefined,
        15000,
        undefined
      );
    });

    it('should never forward --source, which the explain CLI does not declare', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({
        topic: 'Acl',
        source: './src',
        debug: true,
      });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'explain', 'Acl', '--debug'],
        '/mock/project/root',
        undefined,
        15000,
        undefined
      );
    });

    it('should pass --list when list=true (no topic required)', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({ list: true });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'explain', '--list'],
        '/mock/project/root',
        undefined,
        15000,
        undefined
      );
    });

    it('should combine --list with a topic filter', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({ list: true, topic: 'flow' });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'explain', 'flow', '--list'],
        '/mock/project/root',
        undefined,
        15000,
        undefined
      );
    });

    it('should pass --peek and --format=raw', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({
        topic: 'BusinessRule',
        peek: true,
        format: 'raw',
      });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'explain', 'BusinessRule', '--format', 'raw', '--peek'],
        '/mock/project/root',
        undefined,
        15000,
        undefined
      );
    });

    it('should return error when neither topic nor list is provided', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({});

      assert.equal(result.success, false);
      assert.ok(result.output.includes('Provide a topic'));
      assertNotCalled(mockProcessor.process);
    });

    it('should reject invalid format value', async () => {
      const command = new ExplainCommand(mockProcessor);

      const result = await command.execute({ topic: 'BusinessRule', format: 'json' });

      assert.equal(result.success, false);
      assert.ok(result.output.includes('Invalid format'));
      assertNotCalled(mockProcessor.process);
    });
  });

  describe('CommandFactory Integration', () => {
    it('should include new commands in CommandFactory.createCommands', () => {
      const mockExecutor = { process: mock.fn<ProcessFn>() };
      const commands = CommandFactory.createCommands(mockExecutor);

      const commandNames = commands.map(cmd => cmd.name);

      assert.ok(commandNames.includes('download_fluent_app'));
      assert.ok(commandNames.includes('clean_fluent_app'));
      assert.ok(commandNames.includes('pack_fluent_app'));
      assert.ok(commandNames.includes('explain_fluent_api'));
    });
  });
});
