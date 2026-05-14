/**
 * Integration tests for SDK v4.6.0 metadata coverage.
 * These tests read actual resource files from disk (no mocks) to verify content correctness
 * for the four new metadata types introduced in v4.6.0 and updates to existing resources.
 */
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
      expect(ServiceNowMetadataType.CUSTOM_ACTION).toBe('custom-action');
      expect(ServiceNowMetadataType.INBOUND_EMAIL_ACTION).toBe('inbound-email-action');
      expect(ServiceNowMetadataType.SP_HEADER_FOOTER).toBe('sp-header-footer');
      expect(ServiceNowMetadataType.SP_PAGE_ROUTE_MAP).toBe('sp-page-route-map');
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
        expect(fs.existsSync(specFile)).toBe(true);
        expect(fs.existsSync(instructFile)).toBe(true);

        const snippetCandidates = fs
          .readdirSync(SNIPPET_DIR)
          .filter((file) => file.startsWith(`fluent_snippet_${metadataType}_`) && file.endsWith('.md'));
        expect(snippetCandidates.length).toBeGreaterThan(0);
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
        expect(content).toContain(term);
      }
    });

    it('should have instruct with cross-scope and reuse guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_custom-action.md'), 'utf-8'
      );
      expect(content).toContain('@servicenow/sdk/automation');
      expect(content).toContain('Action');
      expect(content).toContain('wfa.action');
      expect(content).toContain('Cross-scope');
    });

    it('should have snippet 0001 defining a custom action with steps', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_custom-action_0001.md'), 'utf-8'
      );
      expect(content).toContain('Action(');
      expect(content).toContain('wfa.actionStep');
      expect(content).toContain('inputs');
      expect(content).toContain('outputs');
    });

    it('should have snippet 0002 invoking a custom action from a Flow', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_custom-action_0002.md'), 'utf-8'
      );
      expect(content).toContain('Flow(');
      expect(content).toContain('wfa.action(');
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
        expect(content).toContain(term);
      }
    });

    it('should have instruct with action-type and field-action guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_inbound-email-action.md'), 'utf-8'
      );
      expect(content).toContain('InboundEmailAction');
      expect(content).toContain('sys_email_action');
      expect(content).toContain('record_action');
      expect(content).toContain('reply_email');
      expect(content).toContain('fieldAction');
    });

    it('should have snippet 0001 with record_action and fieldAction example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_inbound-email-action_0001.md'), 'utf-8'
      );
      expect(content).toContain('InboundEmailAction(');
      expect(content).toContain("action: 'record_action'");
      expect(content).toContain('fieldAction');
    });

    it('should have snippet 0002 with reply_email example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_inbound-email-action_0002.md'), 'utf-8'
      );
      expect(content).toContain("action: 'reply_email'");
      expect(content).toContain('replyEmail');
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
        expect(content).toContain(term);
      }
    });

    it('should have instruct with static-vs-dynamic guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_sp-header-footer.md'), 'utf-8'
      );
      expect(content).toContain('SPHeaderFooter');
      expect(content).toContain('static');
      expect(content).toContain('Now.include');
    });

    it('should have snippet 0001 with static header example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-header-footer_0001.md'), 'utf-8'
      );
      expect(content).toContain('SPHeaderFooter(');
      expect(content).toContain('static: true');
    });

    it('should have snippet 0002 with dynamic (non-static) footer example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-header-footer_0002.md'), 'utf-8'
      );
      expect(content).toContain('SPHeaderFooter(');
      expect(content).toContain('static: false');
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
        expect(content).toContain(term);
      }
    });

    it('should have instruct with scoping and ordering guidance', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_sp-page-route-map.md'), 'utf-8'
      );
      expect(content).toContain('SPPageRouteMap');
      expect(content).toContain('sp_page_route_map');
      expect(content).toContain('routeFromPage');
      expect(content).toContain('routeToPage');
    });

    it('should have snippet 0001 with basic redirect example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-page-route-map_0001.md'), 'utf-8'
      );
      expect(content).toContain('SPPageRouteMap(');
      expect(content).toContain('routeFromPage');
      expect(content).toContain('routeToPage');
    });

    it('should have snippet 0002 with portal+role scoping example', () => {
      const content = fs.readFileSync(
        path.join(SNIPPET_DIR, 'fluent_snippet_sp-page-route-map_0002.md'), 'utf-8'
      );
      expect(content).toContain('portals:');
      expect(content).toContain('roles:');
    });
  });

  describe('Updated Form resources (v4.6.0)', () => {
    it('spec should declare Form() publicly supported as of v4.6.0', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_form.md'), 'utf-8'
      );
      expect(content).toContain('publicly exported in SDK v4.6.0');
      expect(content).not.toContain('not yet exported');
    });

    it('instruct should mark Form() as primary, Record-based as fallback', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_form.md'), 'utf-8'
      );
      expect(content).toContain('publicly supported as of SDK v4.6.0');
      expect(content).toContain('Fallback');
    });
  });

  describe('Updated Flow resources (v4.6.0)', () => {
    it('spec should document wfa.subflow and custom-action steps', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_flow.md'), 'utf-8'
      );
      expect(content).toContain('wfa.subflow');
      expect(content).toContain('SDK 4.6.0');
      expect(content).toContain('Custom Action');
    });

    it('instruct should document subflow-of-subflow and custom-action capabilities', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_flow.md'), 'utf-8'
      );
      expect(content).toContain('SDK v4.6.0');
      expect(content).toContain('Subflow');
      expect(content).toContain('Custom Action');
      expect(content).toContain('Cross-scope');
    });
  });

  describe('Updated AI Agent resources (v4.6.0)', () => {
    it('ai-agent instruct should document mandatory securityAcl and auto-ACL generation', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent.md'), 'utf-8'
      );
      expect(content).toContain('securityAcl');
      expect(content).toContain('MANDATORY');
      expect(content).toContain('SDK v4.6.0');
      expect(content).toContain('Auto-generated ACL');
    });

    it('ai-agent-workflow instruct should document auto-ACL generation', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_ai-agent-workflow.md'), 'utf-8'
      );
      expect(content).toContain('SDK v4.6.0');
      expect(content).toContain('Auto-generated ACL');
    });
  });

  describe('Updated NowAssist Skill Config resources (v4.6.0)', () => {
    it('instruct should document auto-generated standard outputs', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md'), 'utf-8'
      );
      expect(content).toContain('SDK v4.6.0');
      expect(content).toContain('auto-generated');
      // Standard outputs that get auto-generated when outputs array is omitted
      expect(content).toContain('response');
      expect(content).toContain('provider');
      expect(content).toContain('errorcode');
      expect(content).toContain('status');
      expect(content).toContain('error');
    });

    it('instruct should document new dataType options and truncate rules', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_now-assist-skill-config.md'), 'utf-8'
      );
      expect(content).toContain('glide_record');
      expect(content).toContain('simple_array');
      expect(content).toContain('json_object');
      expect(content).toContain('json_array');
      expect(content).toContain('truncate');
    });
  });

  describe('Updated Table resources (v4.6.0)', () => {
    it('spec should document OverrideColumn for sys_dictionary_override', () => {
      const content = fs.readFileSync(
        path.join(SPEC_DIR, 'fluent_spec_table.md'), 'utf-8'
      );
      expect(content).toContain('OverrideColumn');
      expect(content).toContain('baseTable');
      expect(content).toContain('SDK v4.6.0');
    });

    it('instruct should document OverrideColumn as the v4.6.0 dict-override mechanism', () => {
      const content = fs.readFileSync(
        path.join(INSTRUCT_DIR, 'fluent_instruct_table.md'), 'utf-8'
      );
      expect(content).toContain('SDK v4.6.0');
      expect(content).toContain('OverrideColumn');
      expect(content).toContain('sys_dictionary_override');
    });
  });

  describe('Updated coding_in_fluent prompt (v4.6.0)', () => {
    it('should list SDK v4.6.0 capabilities for code generation', () => {
      const content = fs.readFileSync(
        path.join(PROMPT_DIR, 'coding_in_fluent.md'), 'utf-8'
      );
      expect(content).toContain('SDK v4.6.0');
      expect(content).toContain('Declarative Form API');
      expect(content).toContain('Subflow-of-subflow');
      expect(content).toContain('Custom Actions');
      expect(content).toContain('AIAF auto-ACL');
      expect(content).toContain('Table dictionary overrides');
    });
  });
});
