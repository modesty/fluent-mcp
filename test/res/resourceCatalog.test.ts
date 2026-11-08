/**
 * ResourceCatalog: the closed index of bundled res/ content.
 *
 * Uses a real temporary directory tree, not filesystem mocks, so the
 * path-traversal cases exercise the same `path.join` + `readFile` an attacker
 * would. The tree places a README.md exactly where `x/../../../README` would
 * land if a file name were still built from caller input.
 */
import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configFixture } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);

const { ResourceCatalog, buildResourceIndex } = await import('../../src/res/resourceCatalog.js');
const { ResourceType } = await import('../../src/utils/types.js');

const listing = (spec: string[], snippet: string[], instruct: string[]) => ({
  [ResourceType.SPEC]: spec,
  [ResourceType.SNIPPET]: snippet,
  [ResourceType.INSTRUCT]: instruct,
});

describe('buildResourceIndex (pure)', () => {
  it('derives the supported types from the spec files, sorted, ignoring other names', () => {
    const index = buildResourceIndex(listing(
      ['fluent_spec_table.md', 'README.md', 'fluent_spec_acl.md', 'fluent_spec_atf-form.md', 'fluent_spec_x.txt'],
      [],
      [],
    ));
    assert.deepEqual(index.types, ['acl', 'atf-form', 'table']);
  });

  it('orders snippet ids and keeps an underscore inside the type name', () => {
    const index = buildResourceIndex(listing(
      [],
      ['fluent_snippet_table_0002.md', 'fluent_snippet_table_0001.md', 'fluent_snippet_my_type_0003.md', 'fluent_snippet_table_draft.md'],
      [],
    ));
    assert.deepEqual([...index.snippets.get('table')!.keys()], ['0001', '0002']);
    assert.deepEqual([...index.snippets.get('my_type')!.keys()], ['0003']);
  });

  it('indexes instructions independently of specs', () => {
    const index = buildResourceIndex(listing([], [], ['fluent_instruct_atf.md']));
    assert.equal(index.instruct.get('atf'), 'fluent_instruct_atf.md');
    assert.deepEqual(index.types, []);
  });
});

describe('ResourceCatalog (real directory tree)', () => {
  let root: string;
  let dirs: Record<string, string>;

  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-mcp-catalog-'));
    // <root>/pkg/res/{spec,snippet,instruct}; README.md at <root>/pkg/README.md
    const res = path.join(root, 'pkg', 'res');
    dirs = {
      [ResourceType.SPEC]: path.join(res, 'spec'),
      [ResourceType.SNIPPET]: path.join(res, 'snippet'),
      [ResourceType.INSTRUCT]: path.join(res, 'instruct'),
    };
    for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(root, 'pkg', 'README.md'), 'SECRET README');
    fs.writeFileSync(path.join(dirs.spec, 'fluent_spec_table.md'), 'table spec');
    fs.writeFileSync(path.join(dirs.instruct, 'fluent_instruct_table.md'), 'table instruct');
    fs.writeFileSync(path.join(dirs.snippet, 'fluent_snippet_table_0001.md'), 'snippet one');
    fs.writeFileSync(path.join(dirs.snippet, 'fluent_snippet_table_0002.md'), 'snippet two');
  });

  after(() => fs.rmSync(root, { recursive: true, force: true }));

  const catalog = () => new ResourceCatalog(dirs as never);

  it('reads specs, instructions, and snippets by key, case-insensitively', async () => {
    const c = catalog();
    assert.equal((await c.getResource(ResourceType.SPEC, 'TABLE')).content, 'table spec');
    assert.equal((await c.getResource(ResourceType.INSTRUCT, 'table')).content, 'table instruct');
    assert.equal((await c.getResource(ResourceType.SNIPPET, 'table', '0001')).content, 'snippet one');
    assert.equal((await c.getResource(ResourceType.SNIPPET, 'table', '0002')).content, 'snippet two');
    assert.deepEqual((await c.load()).types, ['table']);
    assert.deepEqual(await c.listSnippets('table'), ['0001', '0002']);
  });

  it('lists, per kind, the supported types that kind has a file for', async () => {
    const sparse = fs.mkdtempSync(path.join(root, 'sparse-'));
    const sparseDirs = {
      [ResourceType.SPEC]: path.join(sparse, 'spec'),
      [ResourceType.SNIPPET]: path.join(sparse, 'snippet'),
      [ResourceType.INSTRUCT]: path.join(sparse, 'instruct'),
    };
    for (const dir of Object.values(sparseDirs)) fs.mkdirSync(dir);
    for (const type of ['acl', 'business-rule', 'table']) fs.writeFileSync(path.join(sparseDirs.spec, `fluent_spec_${type}.md`), type);
    fs.writeFileSync(path.join(sparseDirs.instruct, 'fluent_instruct_business-rule.md'), 'guide');
    // A guide or snippet for a type without a spec is not a supported type.
    fs.writeFileSync(path.join(sparseDirs.instruct, 'fluent_instruct_orphan.md'), 'orphan');
    fs.writeFileSync(path.join(sparseDirs.snippet, 'fluent_snippet_table_0001.md'), 'snippet');
    fs.writeFileSync(path.join(sparseDirs.snippet, 'fluent_snippet_orphan_0001.md'), 'orphan');

    const c = new ResourceCatalog(sparseDirs as never);
    assert.deepEqual(await c.listMetadataTypes(ResourceType.SPEC), ['acl', 'business-rule', 'table']);
    assert.deepEqual(await c.listMetadataTypes(ResourceType.INSTRUCT), ['business-rule']);
    assert.deepEqual(await c.listMetadataTypes(ResourceType.SNIPPET), ['table']);
  });

  it('reports a missing or unknown snippet id as not found, never another snippet', async () => {
    for (const id of ['9999', undefined]) {
      const result = await catalog().getResource(ResourceType.SNIPPET, 'table', id);
      assert.equal(result.found, false, String(id));
      assert.equal(result.content, '');
    }
  });

  it('cannot be steered outside res/ by a path-like metadata type or snippet id', async () => {
    // Negative control: under the old string-built path, this input reached README.md.
    const escaped = path.join(dirs.spec, 'fluent_spec_x/../../../README.md');
    assert.equal(fs.readFileSync(escaped, 'utf-8'), 'SECRET README');

    const c = catalog();
    for (const [kind, type, id] of [
      [ResourceType.SPEC, 'x/../../../README', undefined],
      [ResourceType.INSTRUCT, 'x/../../../README', undefined],
      [ResourceType.SNIPPET, 'table', '/../../../../README'],
      [ResourceType.SNIPPET, 'x/../../../README', undefined],
    ] as const) {
      const result = await c.getResource(kind, type, id);
      assert.equal(result.found, false, `${kind} ${type} ${id ?? ''}`);
      assert.notEqual(result.content, 'SECRET README');
    }
    assert.deepEqual(await c.listSnippets('../snippet/fluent_snippet_table'), []);
  });

  it('reads each directory once across lookups (single-flight load)', async (t) => {
    const readdir = t.mock.method(fs.promises, 'readdir');
    const c = catalog();
    await Promise.all([c.listMetadataTypes(ResourceType.SPEC), c.listSnippets('table'), c.getResource(ResourceType.SPEC, 'table')]);
    await c.getResource(ResourceType.INSTRUCT, 'table');
    assert.equal(readdir.mock.callCount(), 3);
  });

  it('rejects (and retries next time) when a directory cannot be listed', async () => {
    const c = new ResourceCatalog({ ...dirs, [ResourceType.SPEC]: path.join(root, 'missing') } as never);
    await assert.rejects(c.listMetadataTypes(ResourceType.SPEC), { code: 'ENOENT' });
    await assert.rejects(c.load(), { code: 'ENOENT' });
  });
});
