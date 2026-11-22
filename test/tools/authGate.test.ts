/**
 * The pre-spawn auth check for commands whose `auth` is optional: with
 * SN_INSTANCE_URL configured and no alias resolved, the command stops before
 * spawn, because without `--auth` the CLI would use its default profile, which
 * may name an unrelated instance. Without SN_INSTANCE_URL (validation skipped),
 * the command still runs on the CLI default, and an explicit `auth` always runs.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, loggerFixture, sdkCliFixture, tempProjectDir } from '../support/fixtures.js';
import { hasOption, optionValue } from '../support/argv.js';
import type { CommandProcessor, CommandResult } from '../../src/utils/types.js';

const WORKING_DIR = tempProjectDir('auth-gate');

const session = {
  getWorkingDirectory: mock.fn((): string | undefined => WORKING_DIR),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn((): unknown => undefined),
  setAuthValidationResult: mock.fn(),
};

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { InstallCommand } = await import('../../src/tools/commands/installCommand.js');
const { DownloadCommand } = await import('../../src/tools/commands/downloadCommand.js');
const { TransformCommand } = await import('../../src/tools/commands/transformCommand.js');
const { DependenciesCommand } = await import('../../src/tools/commands/dependenciesCommand.js');

type ProcessFn = CommandProcessor['process'];
type Command = { execute(args: Record<string, unknown>): Promise<CommandResult> };

const REJECTED = {
  status: 'not_authenticated',
  message: 'No auth profile matches target.invalid. The server does not add profiles; add one in a terminal with the command below.',
  actionRequired: 'npx @servicenow/sdk auth --add https://target.invalid --type oauth --alias target.invalid',
  timestamp: '2026-11-21T00:00:00.000Z',
};

const COMMANDS: ReadonlyArray<[string, (p: CommandProcessor) => Command, Record<string, unknown>]> = [
  ['deploy_fluent_app', (p) => new InstallCommand(p), {}],
  ['download_fluent_app', (p) => new DownloadCommand(p), { directory: 'metadata' }],
  ['fluent_transform (instance)', (p) => new TransformCommand(p), {}],
  ['download_fluent_dependencies', (p) => new DependenciesCommand(p), {}],
];

describe('pre-spawn auth check for optional-auth commands', () => {
  let processor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  beforeEach(() => {
    session.getAuthAlias.mock.mockImplementation(() => undefined);
    session.getAuthValidationResult.mock.mockImplementation(() => undefined);
    processor = { process: mock.fn<ProcessFn>(async () => ({ success: true, output: 'ok', exitCode: 0 })) };
  });

  const argv = (): string[] => processor.process.mock.calls[0].arguments[1];

  for (const [name, make, args] of COMMANDS) {
    it(`${name}: stops before spawn when SN_INSTANCE_URL resolved no alias`, async () => {
      session.getAuthValidationResult.mock.mockImplementation(() => REJECTED);

      const result = await make(processor).execute(args);

      assert.equal(result.success, false);
      assert.equal(processor.process.mock.callCount(), 0);
      assert.equal(result.error?.message, `${REJECTED.message}\n\n${REJECTED.actionRequired}`);
    });

    it(`${name}: runs with an explicit auth even when validation failed`, async () => {
      session.getAuthValidationResult.mock.mockImplementation(() => REJECTED);

      const result = await make(processor).execute({ ...args, auth: 'explicit' });

      assert.equal(result.success, true);
      assert.equal(optionValue(argv(), '--auth'), 'explicit');
    });

    it(`${name}: runs on the CLI default profile when SN_INSTANCE_URL is not configured`, async () => {
      session.getAuthValidationResult.mock.mockImplementation(() => ({ status: 'skipped', message: 'skipped', timestamp: '' }));

      const result = await make(processor).execute(args);

      assert.equal(result.success, true);
      assert.equal(hasOption(argv(), '--auth'), false);
    });
  }

  it('fluent_transform (offline from): never consults auth, even when validation failed', async () => {
    session.getAuthValidationResult.mock.mockImplementation(() => REJECTED);

    const result = await new TransformCommand(processor).execute({ from: 'metadata' });

    assert.equal(result.success, true);
    assert.equal(hasOption(argv(), '--auth'), false);
  });
});
