import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { getProjectRootPath } from '../src/config.js';

// Runs under the native runner with the real config module (no global mocks):
// the root resolves from the compiled module location, so this asserts the
// staged package layout that .test-build/ must provide.

describe('Config Module', () => {
  it('getProjectRootPath returns a valid directory path', () => {
    const rootPath = getProjectRootPath();

    // Check if the path exists and is a directory
    assert.equal(fs.existsSync(rootPath), true);
    assert.equal(fs.statSync(rootPath).isDirectory(), true);

    // The root path should contain package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    assert.equal(fs.existsSync(packageJsonPath), true);

    // It should also contain the src and res folders
    assert.equal(fs.existsSync(path.join(rootPath, 'src')), true);
    assert.equal(fs.existsSync(path.join(rootPath, 'res')), true);
  });
});
