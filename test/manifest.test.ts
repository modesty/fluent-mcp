/**
 * The MCPB manifest is versioned by hand next to package.json. It drifted once
 * (manifest 0.8.0 while package.json was 0.9.3), so this guards that a release
 * bump updates both.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8')) as { version?: unknown };

describe('manifest.json', () => {
  it('carries the same version as package.json', () => {
    const packageVersion = readJson('package.json').version;
    assert.equal(typeof packageVersion, 'string');
    assert.equal(readJson('manifest.json').version, packageVersion);
  });
});
