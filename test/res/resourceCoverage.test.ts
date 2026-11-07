/**
 * Resource coverage: the one place that pins the bundled res/ content against
 * the metadata-type enum (src/types.ts).
 *
 * - every enum type has a spec, an instruct and at least one snippet
 *   (SNIPPET_EXEMPT lists the deliberate gaps);
 * - no res file names a type the enum does not know (orphans);
 * - the enum's exact size and sort order;
 * - every Markdown file under res/ closes each ``` code fence it opens.
 *
 * Per-SDK-version test files must not repeat these checks.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../../src/types.js';

const RES_DIR = path.join(process.cwd(), 'res');
const TYPES = Object.values(ServiceNowMetadataType) as string[];
const EXPECTED_TYPE_COUNT = 76;

/** Types that deliberately ship without a snippet, with the reason. */
const SNIPPET_EXEMPT: ReadonlyMap<string, string> = new Map([
  ['atf-form-sp', 'Service Portal form steps: spec and instruct only, no compiled example yet'],
]);

const SPEC_FILE = /^fluent_spec_(.+)\.md$/;
const INSTRUCT_FILE = /^fluent_instruct_(.+)\.md$/;
/** Same shape as ResourceCatalog's SNIPPET_FILE (src/res/resourceCatalog.ts). */
const SNIPPET_FILE = /^fluent_snippet_(.+)_(\d+)\.md$/;

const listing = (dir: string): string[] =>
  fs.readdirSync(path.join(RES_DIR, dir)).filter((f) => !f.startsWith('.'));

const typesIn = (files: string[], pattern: RegExp): Map<string, string[]> => {
  const byType = new Map<string, string[]>();
  for (const file of files) {
    const type = pattern.exec(file)?.[1];
    if (type !== undefined) byType.set(type, [...(byType.get(type) ?? []), file]);
  }
  return byType;
};

const KINDS = [
  { dir: 'spec', pattern: SPEC_FILE },
  { dir: 'instruct', pattern: INSTRUCT_FILE },
  { dir: 'snippet', pattern: SNIPPET_FILE },
] as const;

const markdownFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });

/**
 * CommonMark backtick fences: an opener is up to three spaces, then three or
 * more backticks and an optional info string; the closer is a run of at least
 * as many backticks with nothing after it. Returns the 1-based line of an
 * unclosed opener, or null when every fence closes.
 */
const unclosedFenceLine = (markdown: string): number | null => {
  let open: { line: number; width: number } | null = null;
  const lines = markdown.split(/\r?\n/);
  for (const [index, text] of lines.entries()) {
    const fence = /^ {0,3}(`{3,})(.*)$/.exec(text);
    if (!fence) continue;
    const [, ticks, rest] = fence;
    if (open === null) {
      if (!rest.includes('`')) open = { line: index + 1, width: ticks.length };
    } else if (ticks.length >= open.width && rest.trim() === '') {
      open = null;
    }
  }
  return open?.line ?? null;
};

describe('metadata type enum', () => {
  it(`has exactly ${EXPECTED_TYPE_COUNT} unique types, sorted by value`, () => {
    assert.equal(TYPES.length, EXPECTED_TYPE_COUNT);
    assert.equal(new Set(TYPES).size, TYPES.length);
    assert.deepStrictEqual(TYPES, [...TYPES].sort());
  });
});

describe('res/ coverage of the enum', () => {
  for (const { dir, pattern } of KINDS) {
    it(`every res/${dir} file follows the naming convention`, () => {
      assert.deepEqual(listing(dir).filter((f) => !pattern.test(f)), []);
    });

    it(`res/${dir} has no orphan files for types outside the enum`, () => {
      const orphans = [...typesIn(listing(dir), pattern).keys()].filter((t) => !TYPES.includes(t));
      assert.deepEqual(orphans, []);
    });
  }

  it('every type has a spec and an instruct', () => {
    const specs = typesIn(listing('spec'), SPEC_FILE);
    const instructs = typesIn(listing('instruct'), INSTRUCT_FILE);
    assert.deepEqual(TYPES.filter((t) => !specs.has(t)), [], 'types without a spec');
    assert.deepEqual(TYPES.filter((t) => !instructs.has(t)), [], 'types without an instruct');
  });

  it('every type has at least one snippet, except the explicit exemptions', () => {
    const snippets = typesIn(listing('snippet'), SNIPPET_FILE);
    const missing = TYPES.filter((t) => !snippets.has(t));
    assert.deepEqual(missing, [...SNIPPET_EXEMPT.keys()]);
  });

  it('the snippet exemptions are all enum types', () => {
    for (const type of SNIPPET_EXEMPT.keys()) assert.ok(TYPES.includes(type), type);
  });
});

describe('Markdown code fences', () => {
  it('detects an unclosed fence and accepts balanced ones (self-check)', () => {
    assert.equal(unclosedFenceLine('# t\n\n```typescript\nconst a = 1\n'), 3);
    assert.equal(unclosedFenceLine('```ts\na\n```\n\n````md\n```\ninner\n```\n````\n'), null);
    assert.equal(unclosedFenceLine('```js\n```not a closer\n'), 1);
    assert.equal(unclosedFenceLine('text with ```inline``` code\n'), null);
  });

  it('every res/**/*.md closes each code fence it opens', () => {
    const files = markdownFiles(RES_DIR);
    assert.ok(files.length >= EXPECTED_TYPE_COUNT * 3, `expected res/ Markdown, found ${files.length} files`);
    const unclosed = files.flatMap((file) => {
      const line = unclosedFenceLine(fs.readFileSync(file, 'utf-8'));
      return line === null ? [] : [`${path.relative(process.cwd(), file)}:${line}`];
    });
    assert.deepEqual(unclosed, []);
  });
});

/**
 * `get_sys_id(...)` is not a Fluent API: a real `now-sdk build` fails with
 * TS2304. A res/ line may name it only to warn that it is not an SDK API and
 * fails with TS2304; the files that carry such a warning are pinned.
 */
const GET_SYS_ID_WARNING_FILES = ['res/instruct/fluent_instruct_atf.md', 'res/prompt/coding_in_fluent.md'];

const isGetSysIdWarning = (line: string): boolean =>
  /\bnot\b\**\s+an SDK API\b/.test(line) && line.includes('TS2304');

const getSysIdLines = (markdown: string): { line: number; text: string }[] =>
  markdown
    .split(/\r?\n/)
    .flatMap((text, index) => (text.includes('get_sys_id') ? [{ line: index + 1, text }] : []));

describe('get_sys_id is not an SDK API', () => {
  it('accepts only a not-an-SDK-API TS2304 warning (self-check)', () => {
    assert.equal(isGetSysIdWarning("`get_sys_id(...)` is **not** an SDK API: it fails with TS2304"), true);
    assert.equal(isGetSysIdWarning('Do not use get_sys_id(...): it is not an SDK API and fails the build (TS2304).'), true);
    assert.equal(isGetSysIdWarning("roles: [get_sys_id('sys_user_role', 'name=admin')],"), false);
    assert.equal(isGetSysIdWarning('`get_sys_id` is not an SDK API'), false);
  });

  it('no res/**/*.md calls get_sys_id; the only mentions are the pinned warnings', () => {
    const mentions = markdownFiles(RES_DIR).flatMap((file) => {
      const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
      return getSysIdLines(fs.readFileSync(file, 'utf-8')).map(({ line, text }) => ({
        where: `${relative}:${line}`,
        file: relative,
        text,
      }));
    });
    assert.deepEqual(mentions.filter((m) => !isGetSysIdWarning(m.text)).map((m) => m.where), []);
    assert.deepEqual([...new Set(mentions.map((m) => m.file))].sort(), GET_SYS_ID_WARNING_FILES);
  });
});
