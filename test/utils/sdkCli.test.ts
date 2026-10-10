/**
 * Tests for resolveSdkCli. Uses the real implementation and the real config
 * (sdkCliFixture is deliberately NOT registered) so we verify it locates the
 * bundled @servicenow/sdk CLI in this repo. Only the logger is silenced.
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loggerFixture } from '../support/fixtures.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { resolveSdkCli, resetSdkCliCache } = await import('../../src/utils/sdkCli.js');

describe('resolveSdkCli', () => {
  beforeEach(() => resetSdkCliCache());
  afterEach(() => resetSdkCliCache());

  it('resolves the bundled SDK CLI with the current Node executable', () => {
    const { command, baseArgs } = resolveSdkCli();

    assert.equal(command, process.execPath);
    assert.equal(baseArgs.length, 1);
    const binPath = baseArgs[0];
    assert.equal(binPath.endsWith('bin/index.js'), true);
    assert.ok(binPath.includes('@servicenow/sdk'));
    assert.equal(fs.existsSync(binPath), true);
  });

  it('never returns a package-runner invocation', () => {
    const { command, baseArgs } = resolveSdkCli();
    assert.notEqual(command, 'now-sdk');
    assert.notEqual(command, 'npx');
    assert.ok(!baseArgs.includes('now-sdk'));
    assert.ok(!baseArgs.includes('@servicenow/sdk'));
  });

  it('memoizes the resolution', () => {
    const first = resolveSdkCli();
    const second = resolveSdkCli();
    assert.equal(second, first);
  });

  it('fails closed instead of falling back to npx when the bundled CLI is missing', (t) => {
    t.mock.method(fs, 'existsSync', () => false);

    assert.throws(
      () => resolveSdkCli(),
      /Unable to resolve the bundled @servicenow\/sdk CLI.*installation is incomplete/
    );
  });
});
