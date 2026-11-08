/**
 * Regression + contract tests for the `atf` parent metadata type.
 *
 * The bug: `atf` had a `res/instruct/fluent_instruct_atf.md` but no spec and no
 * snippet, and was not a `ServiceNowMetadataType` member. So the former
 * `get-instruct atf` succeeded while `get-api-spec atf` / `get-snippet atf` always
 * failed, and `atf` never appeared in the spec listing (which enumerates res/spec/).
 * Those three tools are now `get_fluent_knowledge` with `kind`.
 *
 * The contract: `atf` is the ATF family entry point. Its spec, instruct, AND
 * snippet must each expose every one of the 18 `atf-*` step sub-types, so a
 * caller landing on the parent can route to the right sub-type without fetching
 * all 18. These tests read the real res/ tree — no fs mocking.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { configFixture, loggerFixture } from '../support/fixtures.js';

// Native runner: there is no implicit global mock. The logger is silenced, and the
// config points the resource loader at the repository's real res/ tree (the same
// tree this file reads directly below), keeping the suite independent of the
// .test-build staging copy. Mocks are registered before the modules under test are
// imported, so those are loaded with dynamic import().
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module(
  '../../src/config.js',
  configFixture({
    resourcePaths: {
      spec: path.join(process.cwd(), 'res', 'spec'),
      snippet: path.join(process.cwd(), 'res', 'snippet'),
      instruct: path.join(process.cwd(), 'res', 'instruct'),
    },
  }).mockOptions
);

const { GetFluentKnowledgeCommand } = await import('../../src/tools/resources/resourceTools.js');
const { ServiceNowMetadataType } = await import('../../src/types.js');

const RES = path.join(process.cwd(), 'res');

// Substring check that names the missing text on failure.
const assertIncludes = (text: string, expected: string): void =>
  assert.ok(text.includes(expected), `expected document to contain: ${expected}`);

// Whole-token check: `atf-form` must not be satisfied by `atf-form-action` and the like.
const assertNamesType = (text: string, type: string): void =>
  assert.match(text, new RegExp(`(?<![\\w-])${type}(?![\\w-])`), `expected document to name the type ${type}`);

/** The fenced code of a resource, without its surrounding prose. */
const code = (content: string): string =>
  [...content.matchAll(/```\w*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

/** The property names of the SDK's StandardStepValues type (sdk-core app/Test.d.ts). */
const standardStepValues = (): string[] => {
  const dts = fs.readFileSync(
    path.join(process.cwd(), 'node_modules', '@servicenow', 'sdk-core', 'dist', 'app', 'Test.d.ts'), 'utf-8');
  const body = /export type StandardStepValues = \{([\s\S]*?)\n\};/.exec(dts)?.[1] ?? '';
  return [...body.matchAll(/^\s+(\w+)\?:/gm)].map((m) => m[1]);
};

/** The 18 atf-* step sub-types, derived from the enum rather than hardcoded. */
const SUB_TYPES = (Object.values(ServiceNowMetadataType) as string[])
  .filter((t) => t.startsWith('atf-'))
  .sort();

describe('`atf` parent metadata type', () => {
  it('fronts exactly 18 atf-* step sub-types', () => {
    assert.equal(SUB_TYPES.length, 18);
  });

  describe('the original bug: every kind now resolves `atf`', () => {
    for (const kind of ['spec', 'snippet', 'instruct']) {
      it(`kind '${kind}' resolves metadataType "atf"`, async () => {
        const result = await new GetFluentKnowledgeCommand().execute({ kind, metadataType: 'atf' });
        assert.equal(result.success, true);
        assert.equal(result.exitCode, 0);
        assert.ok(result.output.length > 0);
      });
    }
  });

  describe('every sub-type is exposed from the parent', () => {
    const parentSpec = fs.readFileSync(path.join(RES, 'spec', 'fluent_spec_atf.md'), 'utf-8');
    const parentInstruct = fs.readFileSync(path.join(RES, 'instruct', 'fluent_instruct_atf.md'), 'utf-8');
    const parentSnippet = fs.readFileSync(path.join(RES, 'snippet', 'fluent_snippet_atf_0001.md'), 'utf-8');

    for (const t of SUB_TYPES) {
      it(`parent spec points at ${t}`, () => {
        assertNamesType(parentSpec, t);
      });
    }

    for (const t of SUB_TYPES) {
      it(`parent instruct points at ${t}`, () => {
        assertNamesType(parentInstruct, t);
      });
    }

    for (const t of SUB_TYPES) {
      it(`parent snippet points at ${t}`, () => {
        assertNamesType(parentSnippet, t);
      });
    }

    it('routes on to `test-suite` for grouping tests into a suite', () => {
      for (const doc of [parentSpec, parentInstruct, parentSnippet]) {
        assertNamesType(doc, 'test-suite');
      }
    });

    it('the whole-token check is not satisfied by a longer sub-type name (negative control)', () => {
      assert.throws(() => assertNamesType('see `atf-form-action` only', 'atf-form'));
      assert.doesNotThrow(() => assertNamesType('see `atf-form` here', 'atf-form'));
    });
  });

  describe('the parent is the authority on shared step mechanics', () => {
    const parentSpec = fs.readFileSync(path.join(RES, 'spec', 'fluent_spec_atf.md'), 'utf-8');

    it('documents the snake_case output / camelCase input rule', () => {
      assertIncludes(parentSpec, 'record_id');
      assert.match(parentSpec, /camelCase/);
      assert.match(parentSpec, /snake_case/);
    });

    it('documents the five StandardStepValues shared by every step, as step properties', () => {
      const props = standardStepValues();
      assert.deepEqual([...props].sort(), ['active', 'description', 'notes', 'timeout', 'warning']);
      assertIncludes(parentSpec, 'StandardStepValues');
      const body = code(parentSpec);
      for (const prop of props) {
        assert.match(body, new RegExp(`^\\s*${prop}:`, 'm'), `expected a ${prop}: property in the spec code`);
      }
    });

    it('states that only $id and name are mandatory on Test()', () => {
      assert.match(parentSpec, /Only `\$id` and `name` are mandatory/);
    });
  });
});
