/**
 * Integration tests for SDK v4.6.0 metadata coverage.
 * These tests read actual resource files from disk (no mocks) to verify content correctness
 * for the four new metadata types introduced in v4.6.0 and updates to existing resources.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceNowMetadataType } from '../src/types.js';

const PROJECT_ROOT = process.cwd();
const RES_DIR = path.join(PROJECT_ROOT, 'res');
const SPEC_DIR = path.join(RES_DIR, 'spec');
const INSTRUCT_DIR = path.join(RES_DIR, 'instruct');
const SNIPPET_DIR = path.join(RES_DIR, 'snippet');
const PROMPT_DIR = path.join(RES_DIR, 'prompt');

describe('SDK v4.6.0 Types - Integration Tests', () => {

  describe('Enum completeness', () => {
    it('should have new v4.6.0 enum entries', () => {
      assert.equal(ServiceNowMetadataType.CUSTOM_ACTION, 'custom-action');
      assert.equal(ServiceNowMetadataType.INBOUND_EMAIL_ACTION, 'inbound-email-action');
      assert.equal(ServiceNowMetadataType.SP_HEADER_FOOTER, 'sp-header-footer');
      assert.equal(ServiceNowMetadataType.SP_PAGE_ROUTE_MAP, 'sp-page-route-map');
    });
  });

  describe('SDK v4.6.0 resource files', () => {
    const v460Types = [
      'custom-action',
      'inbound-email-action',
      'sp-header-footer',
      'sp-page-route-map',
    ];

    it('should have spec/instruct/snippet coverage for each v4.6.0 type', () => {
      for (const metadataType of v460Types) {
        const specFile = path.join(SPEC_DIR, `fluent_spec_${metadataType}.md`);
        const instructFile = path.join(INSTRUCT_DIR, `fluent_instruct_${metadataType}.md`);
        assert.equal(fs.existsSync(specFile), true);
        assert.equal(fs.existsSync(instructFile), true);

        const snippetCandidates = fs
          .readdirSync(SNIPPET_DIR)
          .filter((file) => file.startsWith(`fluent_snippet_${metadataType}_`) && file.endsWith('.md'));
        assert.ok(snippetCandidates.length > 0);
      }
    });
  });

  describe('Custom Action resource files', () => {
    it('should have spec with Action API signature and wfa primitives', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_custom-action.md'), 'utf-8'
      );
      const expectedTerms = [
        'Action(',
        '@servicenow/sdk/automation',
        'wfa.actionStep',
        'inputs', 'outputs', 'access',
        'sys_hub_action_type_definition',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with cross-scope and reuse guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_custom-action.md'), 'utf-8'
      );
      assert.ok(content.includes('@servicenow/sdk/automation'));
      assert.ok(content.includes('Action'));
      assert.ok(content.includes('wfa.action'));
      assert.ok(content.includes('Cross-scope'));
    });

    it('should have snippet 0001 defining a custom action with steps', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_custom-action_0001.md'), 'utf-8'
      );
      assert.ok(content.includes('Action('));
      assert.ok(content.includes('wfa.actionStep'));
      assert.ok(content.includes('inputs'));
      assert.ok(content.includes('outputs'));
    });

    it('should have snippet 0002 invoking a custom action from a Flow', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_custom-action_0002.md'), 'utf-8'
      );
      assert.ok(content.includes('Flow('));
      assert.ok(content.includes('wfa.action('));
    });
  });

  describe('Inbound Email Action resource files', () => {
    it('should have spec with InboundEmailAction API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_inbound-email-action.md'), 'utf-8'
      );
      const expectedTerms = [
        'InboundEmailAction(',
        '@servicenow/sdk/core',
        'sys_email_action',
        'action', 'table', 'type', 'fieldAction', 'eventName',
        'record_action', 'reply_email',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with action-type and field-action guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_inbound-email-action.md'), 'utf-8'
      );
      assert.ok(content.includes('InboundEmailAction'));
      assert.ok(content.includes('sys_email_action'));
      assert.ok(content.includes('record_action'));
      assert.ok(content.includes('reply_email'));
      assert.ok(content.includes('fieldAction'));
    });

    it('should have snippet 0001 with record_action and fieldAction example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_inbound-email-action_0001.md'), 'utf-8'
      );
      assert.ok(content.includes('InboundEmailAction('));
      assert.ok(content.includes("action: 'record_action'"));
      assert.ok(content.includes('fieldAction'));
    });

    it('should have snippet 0002 with reply_email example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_inbound-email-action_0002.md'), 'utf-8'
      );
      assert.ok(content.includes("action: 'reply_email'"));
      assert.ok(content.includes('replyEmail'));
    });
  });

  describe('SPHeaderFooter resource files', () => {
    it('should have spec with SPHeaderFooter API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_sp-header-footer.md'), 'utf-8'
      );
      const expectedTerms = [
        'SPHeaderFooter(',
        '@servicenow/sdk/core',
        'sp_header_footer',
        'static', 'htmlTemplate', 'serverScript', 'clientScript', 'customCss',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with static-vs-dynamic guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_sp-header-footer.md'), 'utf-8'
      );
      assert.ok(content.includes('SPHeaderFooter'));
      assert.ok(content.includes('static'));
      assert.ok(content.includes('Now.include'));
    });

    it('should have snippet 0001 with static header example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-header-footer_0001.md'), 'utf-8'
      );
      assert.ok(content.includes('SPHeaderFooter('));
      assert.ok(content.includes('static: true'));
    });

    it('should have snippet 0002 with dynamic (non-static) footer example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-header-footer_0002.md'), 'utf-8'
      );
      assert.ok(content.includes('SPHeaderFooter('));
      assert.ok(content.includes('static: false'));
    });
  });

  describe('SPPageRouteMap resource files', () => {
    it('should have spec with SPPageRouteMap API signature', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_sp-page-route-map.md'), 'utf-8'
      );
      const expectedTerms = [
        'SPPageRouteMap(',
        '@servicenow/sdk/core',
        'sp_page_route_map',
        'routeFromPage', 'routeToPage',
        'portals', 'roles', 'order',
      ];
      for (const term of expectedTerms) {
        assert.ok(content.includes(term));
      }
    });

    it('should have instruct with scoping and ordering guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_sp-page-route-map.md'), 'utf-8'
      );
      assert.ok(content.includes('SPPageRouteMap'));
      assert.ok(content.includes('sp_page_route_map'));
      assert.ok(content.includes('routeFromPage'));
      assert.ok(content.includes('routeToPage'));
    });

    it('should have snippet 0001 with basic redirect example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-page-route-map_0001.md'), 'utf-8'
      );
      assert.ok(content.includes('SPPageRouteMap('));
      assert.ok(content.includes('routeFromPage'));
      assert.ok(content.includes('routeToPage'));
    });

    it('should have snippet 0002 with portal+role scoping example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-page-route-map_0002.md'), 'utf-8'
      );
      assert.ok(content.includes('portals:'));
      assert.ok(content.includes('roles:'));
    });
  });

  describe('Updated Form resources (v4.6.0)', () => {
    it('spec should declare Form() publicly supported as of v4.6.0', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_form.md'), 'utf-8'
      );
      assert.ok(content.includes('publicly exported in SDK v4.6.0'));
      assert.ok(!content.includes('not yet exported'));
    });

    it('instruct should mark Form() as primary, Record-based as fallback', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_form.md'), 'utf-8'
      );
      assert.ok(content.includes('publicly supported as of SDK v4.6.0'));
      assert.ok(content.includes('Fallback'));
    });
  });

  describe('Updated Flow resources (v4.6.0)', () => {
    it('spec should document wfa.subflow and custom-action steps', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_flow.md'), 'utf-8'
      );
      assert.ok(content.includes('wfa.subflow'));
      assert.ok(content.includes('SDK 4.6.0'));
      assert.ok(content.includes('Custom Action'));
    });

    it('instruct should document subflow-of-subflow and custom-action capabilities', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_flow.md'), 'utf-8'
      );
      assert.ok(content.includes('SDK v4.6.0'));
      assert.ok(content.includes('Subflow'));
      assert.ok(content.includes('Custom Action'));
      assert.ok(content.includes('Cross-scope'));
    });
  });

  describe('Updated AI Agent resources (v4.6.0)', () => {
    it('ai-agent instruct should document mandatory securityAcl and auto-ACL generation', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent.md'), 'utf-8'
      );
      assert.ok(content.includes('securityAcl'));
      assert.ok(content.includes('MANDATORY'));
      assert.ok(content.includes('SDK v4.6.0'));
      assert.ok(content.includes('Auto-generated ACL'));
    });

    it('ai-agent-workflow instruct should document auto-ACL generation', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent-workflow.md'), 'utf-8'
      );
      assert.ok(content.includes('SDK v4.6.0'));
      assert.ok(content.includes('Auto-generated ACL'));
    });
  });

  describe('Updated NowAssist Skill Config resources (v4.6.0)', () => {
    it('instruct should document auto-generated standard outputs', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md'), 'utf-8'
      );
      assert.ok(content.includes('SDK v4.6.0'));
      assert.ok(content.includes('auto-generated'));
      // Standard outputs that get auto-generated when outputs array is omitted
      assert.ok(content.includes('response'));
      assert.ok(content.includes('provider'));
      assert.ok(content.includes('errorcode'));
      assert.ok(content.includes('status'));
      assert.ok(content.includes('error'));
    });

    it('instruct should document new dataType options and truncate rules', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md'), 'utf-8'
      );
      assert.ok(content.includes('glide_record'));
      assert.ok(content.includes('simple_array'));
      assert.ok(content.includes('json_object'));
      assert.ok(content.includes('json_array'));
      assert.ok(content.includes('truncate'));
    });
  });

  describe('Updated Table resources (v4.6.0)', () => {
    it('spec should document OverrideColumn for sys_dictionary_override', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_table.md'), 'utf-8'
      );
      assert.ok(content.includes('OverrideColumn'));
      assert.ok(content.includes('baseTable'));
      assert.ok(content.includes('SDK v4.6.0'));
    });

    it('instruct should document OverrideColumn as the v4.6.0 dict-override mechanism', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_table.md'), 'utf-8'
      );
      assert.ok(content.includes('SDK v4.6.0'));
      assert.ok(content.includes('OverrideColumn'));
      assert.ok(content.includes('sys_dictionary_override'));
    });
  });

  describe('Updated coding_in_fluent prompt (v4.6.0)', () => {
    it('should list SDK v4.6.0 capabilities for code generation', () => {
      const content = fs.readFileSync(
        path.join(PROMPT_DIR, 'coding_in_fluent.md'), 'utf-8'
      );
      assert.ok(content.includes('SDK v4.6.0'));
      assert.ok(content.includes('Declarative Form API'));
      assert.ok(content.includes('Subflow-of-subflow'));
      assert.ok(content.includes('Custom Actions'));
      assert.ok(content.includes('AIAF auto-ACL'));
      assert.ok(content.includes('Table dictionary overrides'));
    });
  });
});
