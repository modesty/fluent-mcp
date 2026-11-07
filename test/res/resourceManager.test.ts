/**
 * Tests for ResourceManager: the three resource templates it registers.
 *
 * A fake catalog is injected through the constructor, and the registered
 * ResourceTemplate objects are driven through their public API
 * (test/support/resourceTemplates.ts). Wire behaviour is in wireProtocol.test.ts.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ResourceNotFoundError } from '@modelcontextprotocol/server';
import { loggerFixture } from '../support/fixtures.js';
import { registerTemplates } from '../support/resourceTemplates.js';

const TYPES = ['business-rule', 'script-include', 'table'];
const SNIPPETS: Record<string, string[]> = { 'business-rule': ['0001', '0002'], table: ['0001'] };

const getAvailableMetadataTypes = mock.fn(async () => [...TYPES]);
const listSnippets = mock.fn(async (type: string) => [...(SNIPPETS[type.toLowerCase()] ?? [])]);
const getResource = mock.fn(async (resourceType: string, metadataType: string, id?: string) => {
  const type = metadataType.toLowerCase();
  const found = TYPES.includes(type) && (resourceType !== 'snippet' || (SNIPPETS[type] ?? []).includes(id ?? ''));
  return { content: found ? `${resourceType}:${type}:${id ?? ''}` : '', path: '', metadataType: type, resourceType, found };
});

const fakeCatalog = { getAvailableMetadataTypes, getResource, listSnippets };

const { logger, mockOptions: loggerMock } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerMock);

const { ResourceManager } = await import('../../src/res/resourceManager.js');

describe('ResourceManager templates', () => {
  let templates: ReturnType<typeof registerTemplates>;

  beforeEach(() => {
    for (const fn of [getAvailableMetadataTypes, getResource, listSnippets, logger.error]) fn.mock.resetCalls();
    templates = registerTemplates(new ResourceManager(fakeCatalog as never));
  });

  it('registers one template per scheme, in list order', () => {
    assert.deepEqual(
      templates.registered.map((r) => [r.name, r.template.uriTemplate.toString(), r.config.mimeType]),
      [
        ['sn-spec', 'sn-spec://{metadataType}', 'text/markdown'],
        ['sn-instruct', 'sn-instruct://{metadataType}', 'text/markdown'],
        ['sn-snippet', 'sn-snippet://{metadataType}/{snippetId}', 'text/markdown'],
      ]
    );
  });

  it('lists every spec, instruction, and snippet (not only the first snippet)', async () => {
    const resources = await templates.list();
    assert.deepEqual(resources.map((r) => r.uri), [
      'sn-spec://business-rule', 'sn-spec://script-include', 'sn-spec://table',
      'sn-instruct://business-rule', 'sn-instruct://script-include', 'sn-instruct://table',
      'sn-snippet://business-rule/0001', 'sn-snippet://business-rule/0002', 'sn-snippet://table/0001',
    ]);
    for (const resource of resources) {
      assert.equal(resource.mimeType, 'text/markdown');
      assert.match(resource.name, /^sn-(spec|instruct|snippet)-/);
      assert.ok(resource.title);
    }
    assert.equal(new Set(resources.map((r) => r.name)).size, resources.length, 'resource names are unique');
    assert.equal(resources.find((r) => r.uri === 'sn-spec://table')?.title, 'table API Specification for Fluent (ServiceNow SDK)');
  });

  it('reads by catalog key, case-insensitively, echoing the requested URI', async () => {
    const spec = await templates.read('sn-spec://Business-Rule');
    assert.deepEqual(spec.contents, [{ uri: 'sn-spec://Business-Rule', text: 'spec:business-rule:', mimeType: 'text/markdown' }]);

    const snippet = await templates.read('sn-snippet://business-rule/0002');
    assert.deepEqual(snippet.contents.map((c) => ('text' in c ? c.text : c.blob)), ['snippet:business-rule:0002']);
    assert.deepEqual(getResource.mock.calls.at(-1)?.arguments, ['snippet', 'business-rule', '0002']);
  });

  it('reports a catalog miss as the SDK not-found error (-32602, data.uri)', async () => {
    for (const uri of ['sn-spec://missing', 'sn-instruct://missing', 'sn-snippet://table/9999', 'sn-spec://x%2F..%2FREADME']) {
      await assert.rejects(templates.read(uri), (error: unknown) => {
        if (!(error instanceof ResourceNotFoundError)) throw new Error(`${uri}: expected ResourceNotFoundError`);
        assert.equal(error.code, -32602);
        assert.equal(error.uri, uri);
        return true;
      });
    }
  });

  it('logs a failed read and rethrows it (the SDK answers -32603)', async () => {
    const failure = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    getResource.mock.mockImplementationOnce(async () => { throw failure; });

    await assert.rejects(templates.read('sn-spec://table'), failure);
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(logger.error.mock.calls[0].arguments[0], 'Error reading resource');
  });

  it('registers no completer (W4 adds resource and prompt completion together)', () => {
    for (const { template } of templates.registered) {
      for (const name of template.uriTemplate.variableNames) assert.equal(template.completeCallback(name), undefined, name);
    }
  });
});
