/**
 * The MCPB manifest is versioned and its tool list written by hand next to
 * package.json and the command registry. The version drifted once (manifest
 * 0.8.0 while package.json was 0.9.3), so this guards that a release bump
 * updates both, and that the declared tools are exactly the ones the server
 * advertises on `tools/list`.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loggerFixture } from './support/fixtures.js';
import { listTools } from './support/listTools.js';

mock.module('../src/utils/logger.js', loggerFixture().mockOptions);

const { ToolsManager } = await import('../src/tools/toolsManager.js');
const { ResourceCatalog } = await import('../src/res/resourceCatalog.js');

interface Manifest {
  version?: unknown;
  tools?: Array<{ name?: unknown; description?: unknown }>;
}

const PROJECT_ROOT = process.cwd();
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8')) as Manifest;

describe('manifest.json', () => {
  const manifest = readJson('manifest.json');

  it('carries the same version as package.json', () => {
    const packageVersion = readJson('package.json').version;
    assert.equal(typeof packageVersion, 'string');
    assert.equal(manifest.version, packageVersion);
  });

  it('declares exactly the tools the server registers, in tools/list order', async () => {
    const registered = (await listTools(new ToolsManager(new ResourceCatalog()))).map((tool) => tool.name);
    assert.deepEqual(manifest.tools?.map((tool) => tool.name), registered);
  });

  it('gives every declared tool a non-empty description', () => {
    assert.ok(manifest.tools?.length);
    for (const tool of manifest.tools) {
      assert.equal(typeof tool.description, 'string', String(tool.name));
      assert.notEqual((tool.description as string).trim(), '', String(tool.name));
    }
  });
});
