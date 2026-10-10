/**
 * Tests for ResourceManager
 *
 * Native runner: the ResourceLoader module is replaced before ResourceManager is
 * imported. The loader constructor mock uses a `function` implementation so it
 * can be called with `new`, and every instance shares the same method mocks.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';

// Mock the ResourceLoader with controlled behavior
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

const ResourceLoader = mock.fn(function () {
  return { getAvailableMetadataTypes, getResource, listSnippets };
});

mock.module('../../src/utils/resourceLoader.js', {
  namedExports: {
    ResourceLoader,
    ResourceType: {
      SPEC: 'spec',
      SNIPPET: 'snippet',
      INSTRUCT: 'instruct',
    },
  },
});

// The Jest setup silenced the logger for every suite; the fixture does the same here.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { ResourceManager } = await import('../../src/res/resourceManager.js');

describe('ResourceManager', () => {
  let resourceManager: InstanceType<typeof ResourceManager>;

  beforeEach(() => {
    for (const fn of [getAvailableMetadataTypes, getResource, listSnippets, ResourceLoader]) {
      fn.mock.resetCalls();
    }
    resourceManager = new ResourceManager();
  });

  it('should initialize and load metadata types', async () => {
    await resourceManager.initialize();
    assert.deepStrictEqual(resourceManager.getMetadataTypes(), [
      'business-rule',
      'script-action',
      'script-include',
      'service-portal',
      'table',
      'ui-action',
      'ui-page',
    ]);
  });

  it('should list resources correctly', async () => {
    await resourceManager.initialize();
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
    // resourceManager.getResourceLoader().getResource is the shared getResource mock,
    // so queueing the next result on it controls what readResource sees.
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
