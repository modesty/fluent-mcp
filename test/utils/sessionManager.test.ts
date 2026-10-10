import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';

// SessionManager only logs through the shared logger; keep the run quiet as Jest did.
const { logger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

const { SessionManager } = await import('../../src/utils/sessionManager.js');

/** SessionManager is a singleton; dropping the cached instance gives each test a fresh one. */
function resetSingleton(): void {
  (SessionManager as unknown as { instance?: unknown }).instance = undefined;
}

describe('SessionManager', () => {
  beforeEach(() => {
    for (const level of Object.values(logger)) level.mock.resetCalls();
    // Reset the singleton instance before each test
    resetSingleton();
  });

  it('should initialize with empty session data', () => {
    const manager = SessionManager.getInstance();
    assert.equal(manager.getWorkingDirectory(), undefined);
  });

  it('should maintain singleton instance', () => {
    const manager1 = SessionManager.getInstance();
    const manager2 = SessionManager.getInstance();
    assert.equal(manager1, manager2);
  });

  it('should set working directory', () => {
    const manager = SessionManager.getInstance();

    manager.setWorkingDirectory('/new-dir');
    assert.equal(manager.getWorkingDirectory(), '/new-dir');
  });

  it('should clear session data', () => {
    const manager = SessionManager.getInstance();

    manager.setWorkingDirectory('/test-dir');
    assert.equal(manager.getWorkingDirectory(), '/test-dir');

    manager.clearSession();
    assert.equal(manager.getWorkingDirectory(), undefined);
  });

  it('should reset session on new instance', () => {
    // Get first instance and set working directory
    const manager1 = SessionManager.getInstance();
    manager1.setWorkingDirectory('/test-dir');

    // Force new instance
    resetSingleton();

    // Get new instance and verify it starts with empty data
    const manager2 = SessionManager.getInstance();
    assert.equal(manager2.getWorkingDirectory(), undefined);
  });
});
