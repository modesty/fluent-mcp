/**
 * Tests for ResourceManager
 *
 * A fake catalog is injected through the constructor; every test shares the
 * same method mocks.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';

// A fake catalog injected into ResourceManager (no module mock needed).
const getAvailableMetadataTypes = mock.fn(async () => [
  'business-rule',
  'script-action',
  'script-include',
  'service-portal',
  'table',
  'ui-action',
  'ui-page',
]);

const getResource = mock.fn(
  async (resourceType: string, metadataType: string, id?: string): Promise<Record<string, unknown>> => ({
    content: `Mock content for ${resourceType} - ${metadataType}${id ? ` - ${id}` : ''}`,
    path: `/mock/path/${resourceType}/${metadataType}${id ? `_${id}` : ''}.md`,
    metadataType,
    resourceType,
    found: true,
  })
);

const listSnippets = mock.fn(async (_metadataType: string) => ['0001', '0002', '0003']);

const fakeCatalog = { getAvailableMetadataTypes, getResource, listSnippets };

// The logger fixture keeps the run quiet.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { ResourceManager } = await import('../../src/res/resourceManager.js');

describe('ResourceManager', () => {
  let resourceManager: InstanceType<typeof ResourceManager>;

  beforeEach(() => {
    for (const fn of [getAvailableMetadataTypes, getResource, listSnippets]) {
      fn.mock.resetCalls();
    }
    resourceManager = new ResourceManager(fakeCatalog as never);
  });

  it('lists one spec per catalog metadata type, in catalog order', async () => {
    const specs = (await resourceManager.listResources()).filter((r) => r.uri.startsWith('sn-spec://'));
    assert.deepStrictEqual(specs.map((r) => r.uri), [
      'sn-spec://business-rule',
      'sn-spec://script-action',
      'sn-spec://script-include',
      'sn-spec://service-portal',
      'sn-spec://table',
      'sn-spec://ui-action',
      'sn-spec://ui-page',
    ]);
  });

  it('should list resources correctly', async () => {
    const resources = await resourceManager.listResources();

    // Should have 7 metadata types * (1 spec + 1 instruct + 1 snippet) = 21 resources
    assert.equal(resources.length, 21);

    // Check for spec resources
    const specResources = resources.filter((r) => r.uri.startsWith('sn-spec://'));
    assert.equal(specResources.length, 7);

    // Check for instruction resources
    const instructResources = resources.filter((r) => r.uri.startsWith('sn-instruct://'));
    assert.equal(instructResources.length, 7);

    // Check for snippet resources
    const snippetResources = resources.filter((r) => r.uri.startsWith('sn-snippet://'));
    assert.equal(snippetResources.length, 7);

    // Check that each resource has the required properties
    resources.forEach((resource) => {
      assert.ok('uri' in resource);
      assert.ok('name' in resource); // Required by MCP protocol
      assert.ok('title' in resource);
      assert.ok('mimeType' in resource);
      assert.equal(resource.mimeType, 'text/markdown');
      // Name shape was previously only asserted against the (never-executed)
      // registerAll path; asserted here so it stays covered on the live path.
      assert.match(resource.name, /^sn-(spec|instruct|snippet)-/);
    });
  });

  it('should classify a missing resource instead of returning success text', async () => {
    // The injected catalog's getResource is the shared mock, so queueing the next result on it controls what readResource sees.
    getResource.mock.mockImplementationOnce(async () => ({
      content: '',
      found: false,
    }));

    await assert.rejects(resourceManager.readResource('sn-spec://missing'), {
      code: -32602,
      name: 'McpResourceNotFoundError',
    });
  });
});
