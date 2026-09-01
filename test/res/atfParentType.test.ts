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
import path from 'node:path';
import fs from 'node:fs';
import {
  GetApiSpecCommand,
  GetSnippetCommand,
  GetInstructCommand,
} from '../../src/tools/resources/resourceTools.js';
import { ServiceNowMetadataType } from '../../src/types.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => {
  const nodePath = require('node:path');
  const root = process.cwd();
  return {
    getProjectRootPath: jest.fn(() => root),
    getConfig: jest.fn(() => ({
      resourcePaths: {
        spec: nodePath.join(root, 'res', 'spec'),
        snippet: nodePath.join(root, 'res', 'snippet'),
        instruct: nodePath.join(root, 'res', 'instruct'),
      },
    })),
    findMissingResourcePaths: jest.fn(() => []),
  };
});

const RES = path.join(process.cwd(), 'res');

/** The 18 atf-* step sub-types, derived from the enum rather than hardcoded. */
const SUB_TYPES = (Object.values(ServiceNowMetadataType) as string[])
  .filter((t) => t.startsWith('atf-'))
  .sort();

describe('`atf` parent metadata type', () => {
  it('is a registered metadata type', () => {
    expect(ServiceNowMetadataType.ATF).toBe('atf');
    expect(SUB_TYPES).toHaveLength(18);
  });

  describe('the original bug: all three tools now resolve `atf`', () => {
    it.each([
      ['get-api-spec', () => new GetApiSpecCommand()],
      ['get-snippet', () => new GetSnippetCommand()],
      ['get-instruct', () => new GetInstructCommand()],
    ])('%s resolves metadataType "atf"', async (_name, make) => {
      const result = await make().execute({ metadataType: 'atf' });
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });

    it.each(['ATF', 'Atf', 'aTf'])('get-api-spec normalizes the casing of %s', async (variant) => {
      const result = await new GetApiSpecCommand().execute({ metadataType: variant });
      expect(result.success).toBe(true);
      expect(result.structuredContent?.metadataType).toBe('atf');
    });

    it('lists `atf` among the available types', async () => {
      const result = await new GetApiSpecCommand().execute({});
      expect(result.structuredContent?.availableTypes).toContain('atf');
    });
  });

  describe('every sub-type is exposed from the parent', () => {
    const parentSpec = fs.readFileSync(path.join(RES, 'spec', 'fluent_spec_atf.md'), 'utf-8');
    const parentInstruct = fs.readFileSync(path.join(RES, 'instruct', 'fluent_instruct_atf.md'), 'utf-8');
    const parentSnippet = fs.readFileSync(path.join(RES, 'snippet', 'fluent_snippet_atf_0001.md'), 'utf-8');

    it.each(SUB_TYPES)('parent spec points at %s', (t) => {
      expect(parentSpec).toContain(t);
    });

    it.each(SUB_TYPES)('parent instruct points at %s', (t) => {
      expect(parentInstruct).toContain(t);
    });

    it.each(SUB_TYPES)('parent snippet points at %s', (t) => {
      expect(parentSnippet).toContain(t);
    });

    it('routes on to `test-suite` for grouping tests into a suite', () => {
      for (const doc of [parentSpec, parentInstruct, parentSnippet]) {
        expect(doc).toContain('test-suite');
      }
    });
  });

  describe('the pointers are not dangling', () => {
    it.each(SUB_TYPES)('%s has both a spec and an instruct file', (t) => {
      expect(fs.existsSync(path.join(RES, 'spec', `fluent_spec_${t}.md`))).toBe(true);
      expect(fs.existsSync(path.join(RES, 'instruct', `fluent_instruct_${t}.md`))).toBe(true);
    });
  });

  describe('the parent is the authority on shared step mechanics', () => {
    const parentSpec = fs.readFileSync(path.join(RES, 'spec', 'fluent_spec_atf.md'), 'utf-8');

    it('documents the snake_case output / camelCase input rule', () => {
      expect(parentSpec).toContain('record_id');
      expect(parentSpec).toMatch(/camelCase/);
      expect(parentSpec).toMatch(/snake_case/);
    });

    it('documents the five StandardStepValues shared by every step', () => {
      for (const prop of ['active', 'description', 'notes', 'timeout', 'warning']) {
        expect(parentSpec).toContain(prop);
      }
    });

    it('states that only $id and name are mandatory on Test()', () => {
      expect(parentSpec).toMatch(/Only `\$id` and `name` are mandatory/);
    });
  });
});
