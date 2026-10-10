/**
 * Unit tests for FluentAppValidator
 *
 * Native runner: node:fs and node:path are shared builtin objects, so method stubs
 * installed with the test context's mock tracker replace the methods for the
 * validator too and are restored automatically when each test ends.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loggerFixture } from '../support/fixtures.js';

// The Jest setup silenced the logger for every suite; the fixture does the same here.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { FluentAppValidator } = await import('../../src/utils/fluentAppValidator.js');

describe('FluentAppValidator', () => {
  beforeEach((hook) => {
    // A beforeEach hook runs with the current test's context, so this stub is
    // restored when the test ends. Joining with '/' keeps the expected paths
    // identical on every platform.
    (hook as TestContext).mock.method(path, 'join', (dir: string, file: string) => `${dir}/${file}`);
  });

  it('should detect Fluent app from now.config.json', async (t) => {
    // Mock file existence
    t.mock.method(fs, 'existsSync', (filePath: unknown) => {
      return String(filePath) === '/test-dir/now.config.json';
    });

    // Mock file content
    t.mock.method(fs, 'readFileSync', (filePath: unknown) => {
      if (String(filePath) === '/test-dir/now.config.json') {
        return JSON.stringify({
          scope: 'x_test_scope',
          name: 'test-app',
        });
      }
      throw new Error('File not found');
    });

    const result = await FluentAppValidator.checkFluentAppExists('/test-dir');
    assert.equal(result.hasApp, true);
    assert.equal(result.scopeName, 'x_test_scope');
    assert.equal(result.packageName, 'test-app');
  });

  it('should detect Fluent app from package.json with ServiceNow SDK dependency', async (t) => {
    // Mock file existence
    t.mock.method(fs, 'existsSync', (filePath: unknown) => {
      if (String(filePath) === '/test-dir/now.config.json') {
        return false;
      }
      if (String(filePath) === '/test-dir/package.json') {
        return true;
      }
      return false;
    });

    // Mock file content
    t.mock.method(fs, 'readFileSync', (filePath: unknown) => {
      if (String(filePath) === '/test-dir/package.json') {
        return JSON.stringify({
          name: 'test-app',
          dependencies: {
            '@servicenow/sdk': '3.0.3',
          },
        });
      }
      throw new Error('File not found');
    });

    const result = await FluentAppValidator.checkFluentAppExists('/test-dir');
    assert.equal(result.hasApp, true);
    assert.equal(result.packageName, 'test-app');
  });

  it('should return hasApp=false when no Fluent app is detected', async (t) => {
    // Mock file existence - no config files
    t.mock.method(fs, 'existsSync', () => false);

    const result = await FluentAppValidator.checkFluentAppExists('/empty-dir');
    assert.equal(result.hasApp, false);
    assert.equal(result.scopeName, undefined);
    assert.equal(result.packageName, undefined);
  });

  it('should handle errors when reading file', async (t) => {
    // Mock file existence
    t.mock.method(fs, 'existsSync', (filePath: unknown) => {
      return String(filePath) === '/test-dir/now.config.json';
    });

    // Mock readFileSync to throw error
    t.mock.method(fs, 'readFileSync', () => {
      throw new Error('Test error reading file');
    });

    const result = await FluentAppValidator.checkFluentAppExists('/test-dir');
    assert.equal(result.hasApp, true); // We know the file exists, so it's considered an app
    assert.equal(result.scopeName, 'unknown');
    assert.equal(result.packageName, 'unknown');
  });
});
