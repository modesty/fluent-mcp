import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { defaultConfig, findMissingResourcePaths, getConfig, getProjectRootPath } from '../src/config.js';
import { withEnvironment } from './support/fixtures.js';

// Runs under the native runner with the REAL config module (no global mocks).
// The root resolves from the compiled module location, so these tests check the
// staged package layout that .test-build/<stage>/ must provide, and that the
// resource resolver detects a wrong root or resource path.

const RESOURCE_ENV = {
  FLUENT_MCP_RESOURCE_PATH_SPEC: undefined,
  FLUENT_MCP_RESOURCE_PATH_SNIPPET: undefined,
  FLUENT_MCP_RESOURCE_PATH_INSTRUCT: undefined,
};

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

  it('getProjectRootPath is a staged package root (package.json is ESM)', () => {
    // src/*.js uses ESM import syntax, which only loads when the staged
    // package.json declares "type": "module" next to the compiled output.
    const pkg = JSON.parse(fs.readFileSync(path.join(getProjectRootPath(), 'package.json'), 'utf8'));
    assert.equal(pkg.type, 'module');
    assert.equal(typeof pkg.version, 'string');
  });

  it('getProjectRootPath is module-relative, not the working directory', () => {
    // Tests run from the repository root, but the root must come from the
    // compiled module location. A cwd fallback would make these equal.
    assert.notEqual(getProjectRootPath(), process.cwd());
  });

  it('getConfig resolves the resource directories under the package root', () => {
    const rootPath = getProjectRootPath();
    const restore = withEnvironment(RESOURCE_ENV);
    try {
      const config = getConfig();

      assert.equal(config.resourcePaths.spec, path.join(rootPath, 'res', 'spec'));
      assert.equal(config.resourcePaths.snippet, path.join(rootPath, 'res', 'snippet'));
      assert.equal(config.resourcePaths.instruct, path.join(rootPath, 'res', 'instruct'));
    } finally {
      restore();
    }
  });

  it('defaultConfig resource directories match the staged res tree', () => {
    const rootPath = getProjectRootPath();

    assert.equal(defaultConfig.resourcePaths.spec, path.join(rootPath, 'res', 'spec'));
    assert.equal(defaultConfig.resourcePaths.snippet, path.join(rootPath, 'res', 'snippet'));
    assert.equal(defaultConfig.resourcePaths.instruct, path.join(rootPath, 'res', 'instruct'));
  });

  it('findMissingResourcePaths reports nothing for the staged layout', () => {
    const restore = withEnvironment(RESOURCE_ENV);
    try {
      assert.deepEqual(findMissingResourcePaths(getConfig()), []);
    } finally {
      restore();
    }
  });

  it('findMissingResourcePaths detects a deliberately incorrect resource path', () => {
    const rootPath = getProjectRootPath();
    const wrongSpec = path.join(rootPath, 'res', 'spec-does-not-exist');
    const config = getConfig();

    const missing = findMissingResourcePaths({
      ...config,
      resourcePaths: { ...config.resourcePaths, spec: wrongSpec },
    });

    assert.deepEqual(missing, [wrongSpec]);
  });

  it('findMissingResourcePaths detects a wrong package root', () => {
    // A path that exists but is not the package root (a regular file) must not
    // count as a resource directory.
    const packageJson = path.join(getProjectRootPath(), 'package.json');
    const config = getConfig();

    const missing = findMissingResourcePaths({
      ...config,
      resourcePaths: { ...config.resourcePaths, instruct: packageJson },
    });

    assert.deepEqual(missing, [packageJson]);
  });
});
