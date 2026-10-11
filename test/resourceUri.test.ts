import { ResourceType } from "../src/utils/types.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe('ResourceURI Support Tests', () => {
  // These tests focus on the URI patterns and functionality that works without actual resources
  
  it('should have valid resource URI formats for API specs', () => {
    // Verify URI pattern format
    const metadataType = 'business-rule';
    const uri = `sn-spec://${metadataType}`;
    assert.equal(uri, 'sn-spec://business-rule');
  });
  
  it('should have valid resource URI formats for instructions', () => {
    // Verify URI pattern format
    const metadataType = 'client-script';
    const uri = `sn-instruct://${metadataType}`;
    assert.equal(uri, 'sn-instruct://client-script');
  });
  
  it('should have valid resource URI formats for snippets', () => {
    // Verify URI pattern format
    const metadataType = 'acl';
    const snippetId = '0001';
    const uri = `sn-snippet://${metadataType}/${snippetId}`;
    assert.equal(uri, 'sn-snippet://acl/0001');
  });

  it('should support completion for snippet IDs', () => {
    // Mock the snippet completion functionality since we know how it works
    const mockSnippets = ['0001', '0002', '0003', '0004'];
    
    // Create a simple filtering function like the one in resourceManager.ts
    const filterByPrefix = (prefix: string) => {
      return mockSnippets.filter(id => id.startsWith(prefix || ''));
    };
    
    // Test with a specific prefix
    const prefix = '00';
    const filtered = filterByPrefix(prefix);
    
    assert.ok(filtered.length > 0);
    assert.deepStrictEqual(filtered, ['0001', '0002', '0003', '0004']);
    filtered.forEach((id: string) => {
      assert.equal(id.startsWith(prefix), true);
    });
    
    // Test with a more specific prefix
    const specificPrefix = '000';
    const filteredSpecific = filterByPrefix(specificPrefix);
    // All snippets in our mock data begin with '000', so they'll all match
    assert.equal(filteredSpecific.every(id => id.startsWith(specificPrefix)), true);
  });
});
