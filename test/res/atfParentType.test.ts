/**
 * Regression + contract tests for the `atf` parent metadata type.
 *
 * The bug: `atf` had a `res/instruct/fluent_instruct_atf.md` but no spec and no
 * snippet, and was not a `ServiceNowMetadataType` member. So `get-instruct atf`
 * succeeded while `get-api-spec atf` / `get-snippet atf` always failed, and `atf`
 * never appeared in the `get-api-spec` listing (which enumerates res/spec/).
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

const { GetApiSpecCommand, GetSnippetCommand, GetInstructCommand } = await import(
  '../../src/tools/resources/resourceTools.js'
);
const { ServiceNowMetadataType } = await import('../../src/types.js');

const RES = path.join(process.cwd(), 'res');

// Substring check that names the missing text on failure.
const assertIncludes = (text: string, expected: string): void =>
  assert.ok(text.includes(expected), `expected document to contain: ${expected}`);

/** The 18 atf-* step sub-types, derived from the enum rather than hardcoded. */
const SUB_TYPES = (Object.values(ServiceNowMetadataType) as string[])
  .filter((t) => t.startsWith('atf-'))
  .sort();

describe('`atf` parent metadata type', () => {
  it('is a registered metadata type', () => {
    assert.equal(ServiceNowMetadataType.ATF, 'atf');
    assert.equal(SUB_TYPES.length, 18);
  });

  describe('the original bug: all three tools now resolve `atf`', () => {
    const tools = [
      ['get-api-spec', () => new GetApiSpecCommand()],
      ['get-snippet', () => new GetSnippetCommand()],
      ['get-instruct', () => new GetInstructCommand()],
    ] as const;
    for (const [name, make] of tools) {
      it(`${name} resolves metadataType "atf"`, async () => {
        const result = await make().execute({ metadataType: 'atf' });
        assert.equal(result.success, true);
        assert.equal(result.exitCode, 0);
        assert.ok(result.output.length > 0);
      });
    }

    for (const variant of ['ATF', 'Atf', 'aTf']) {
      it(`get-api-spec normalizes the casing of ${variant}`, async () => {
        const result = await new GetApiSpecCommand().execute({ metadataType: variant });
        assert.equal(result.success, true);
        assert.equal(result.structuredContent?.metadataType, 'atf');
      });
    }

    it('lists `atf` among the available types', async () => {
      const result = await new GetApiSpecCommand().execute({});
      const availableTypes = result.structuredContent?.availableTypes as string[] | undefined;
      assert.ok(Array.isArray(availableTypes) && availableTypes.includes('atf'));
    });
  });

  describe('every sub-type is exposed from the parent', () => {
    const parentSpec = fs.readFileSync(path.join(RES, 'spec', 'fluent_spec_atf.md'), 'utf-8');
    const parentInstruct = fs.readFileSync(path.join(RES, 'instruct', 'fluent_instruct_atf.md'), 'utf-8');
    const parentSnippet = fs.readFileSync(path.join(RES, 'snippet', 'fluent_snippet_atf_0001.md'), 'utf-8');

    for (const t of SUB_TYPES) {
      it(`parent spec points at ${t}`, () => {
        assertIncludes(parentSpec, t);
      });
    }

    for (const t of SUB_TYPES) {
      it(`parent instruct points at ${t}`, () => {
        assertIncludes(parentInstruct, t);
      });
    }

    for (const t of SUB_TYPES) {
      it(`parent snippet points at ${t}`, () => {
        assertIncludes(parentSnippet, t);
      });
    }

    it('routes on to `test-suite` for grouping tests into a suite', () => {
      for (const doc of [parentSpec, parentInstruct, parentSnippet]) {
        assertIncludes(doc, 'test-suite');
      }
    });
  });

  describe('the pointers are not dangling', () => {
    for (const t of SUB_TYPES) {
      it(`${t} has both a spec and an instruct file`, () => {
        assert.equal(fs.existsSync(path.join(RES, 'spec', `fluent_spec_${t}.md`)), true);
        assert.equal(fs.existsSync(path.join(RES, 'instruct', `fluent_instruct_${t}.md`)), true);
      });
    }
  });

  describe('the parent is the authority on shared step mechanics', () => {
    const parentSpec = fs.readFileSync(path.join(RES, 'spec', 'fluent_spec_atf.md'), 'utf-8');

    it('documents the snake_case output / camelCase input rule', () => {
      assertIncludes(parentSpec, 'record_id');
      assert.match(parentSpec, /camelCase/);
      assert.match(parentSpec, /snake_case/);
    });

    it('documents the five StandardStepValues shared by every step', () => {
      for (const prop of ['active', 'description', 'notes', 'timeout', 'warning']) {
        assertIncludes(parentSpec, prop);
      }
    });

    it('states that only $id and name are mandatory on Test()', () => {
      assert.match(parentSpec, /Only `\$id` and `name` are mandatory/);
    });
  });
});
