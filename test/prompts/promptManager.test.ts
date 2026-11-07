/**
 * P0.1: the `coding_in_fluent` prompt renders REAL resource-backed guidance —
 * per-type instruction summaries plus explicit tool/URI pointers — and the full,
 * enum-derived catalog of supported metadata types. It must contain zero generic
 * "Use the appropriate Fluent API methods" stubs, and the catalog must list all
 * 76 types (single source of truth: ServiceNowMetadataType in src/types.ts).
 *
 * Native runner: configuration is NOT mocked. The real getProjectRootPath() and
 * resourcePaths resolve to the staged copy of the shipped res/ tree
 * (.test-build/<stage>/res), so the instruction summaries load from the shipped
 * content, which the suite's assertions read. Only the logger is
 * replaced, to keep the run quiet.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loggerFixture } from '../support/fixtures.js';

const { logger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

const { PromptManager, parsePromptFile, completeMetadataList } = await import('../../src/prompts/promptManager.js');
const { ServiceNowMetadataType } = await import('../../src/types.js');

type PromptResult = { description?: string; messages: { content: { type: string; text: string } }[] };
type StandardSchema = { '~standard': { validate(value: unknown): Promise<{ issues?: unknown[]; value?: unknown }> } };
interface RecordedPrompt {
  name: string;
  config: { title: string; description: string; argsSchema?: StandardSchema & { shape: Record<string, unknown> } };
  callback: (...args: unknown[]) => Promise<PromptResult> | PromptResult;
}

/**
 * Load the shipped prompts and record what `registerOn()` hands to
 * `registerPrompt`. `get()` validates arguments against the recorded schema and
 * then calls the callback, as the SDK's `prompts/get` handler does; the real
 * handler (and its -32602 answers) is covered in wireProtocol.test.ts.
 */
async function loadPrompts() {
  const registered: RecordedPrompt[] = [];
  const manager = new PromptManager();
  await manager.initialize();
  manager.registerOn({
    registerPrompt: (name: string, config: RecordedPrompt['config'], callback: RecordedPrompt['callback']) => {
      registered.push({ name, config, callback });
    },
  } as never);

  return {
    registered,
    async get(name: string, args?: Record<string, unknown>): Promise<PromptResult> {
      const prompt = registered.find((p) => p.name === name);
      if (!prompt) throw new Error(`prompt ${name} not registered`);
      if (!prompt.config.argsSchema) return prompt.callback({});
      const parsed = await prompt.config.argsSchema['~standard'].validate(args ?? {});
      if (parsed.issues) throw new Error(`invalid arguments for ${name}`);
      return prompt.callback(parsed.value, {});
    },
  };
}

async function renderCodingInFluent(metadataList: string): Promise<string> {
  const result = await (await loadPrompts()).get('coding_in_fluent', { metadata_list: metadataList });
  return result.messages[0].content.text;
}

describe('PromptManager registration', () => {
  it('registers both shipped prompts, with front matter metadata', async () => {
    const { registered } = await loadPrompts();
    assert.deepEqual(registered.map((p) => [p.name, p.config.title]), [
      ['coding_in_fluent', 'Coding in Fluent (ServiceNow SDK)'],
      ['create_custom_ui', 'Create a Custom UI with Fluent (ServiceNow SDK)'],
    ]);
    for (const { config } of registered) assert.ok(config.description.length > 20);
  });

  it('declares metadata_list as an optional, completable argument; create_custom_ui takes none', async () => {
    const { registered } = await loadPrompts();
    const [coding, ui] = registered;
    assert.deepEqual(Object.keys(coding.config.argsSchema?.shape ?? {}), ['metadata_list']);
    assert.equal(ui.config.argsSchema, undefined);
    const field = coding.config.argsSchema?.shape.metadata_list as { type: string; unwrap(): unknown };
    assert.equal(field.type, 'optional');
    const { isCompletable } = await import('@modelcontextprotocol/server');
    assert.ok(isCompletable(field.unwrap()));
  });

  it('returns the bare guide when metadata_list is omitted or empty', async () => {
    const prompts = await loadPrompts();
    const bare = (await prompts.get('coding_in_fluent', {})).messages[0].content.text;
    assert.match(bare, /# Coding in ServiceNow Fluent/);
    assert.ok(!bare.includes('## Selected Metadata Types'));
    assert.ok(!bare.includes('supported metadata types (call'));
    assert.equal((await prompts.get('coding_in_fluent')).messages[0].content.text, bare);
    assert.equal((await prompts.get('coding_in_fluent', { metadata_list: '' })).messages[0].content.text, bare);
  });

  it('skips a malformed prompt file, logging it, and still loads the others', async (t) => {
    // The prompt directory is stubbed on the shared node:fs promises object,
    // which is the one src/prompts/promptManager.ts imports.
    const files: Record<string, string> = {
      'a_good.md': '---\ntitle: "Good"\ndescription: "A well-formed prompt"\n---\nGood body',
      'b_no_description.md': '---\ntitle: "Broken"\n---\nBody',
      'c_no_front_matter.md': '# Just a body',
    };
    t.mock.method(fs.promises, 'readdir', (async () => ['README.txt', ...Object.keys(files)]) as never);
    const readFile = t.mock.method(fs.promises, 'readFile', (async (file: string) => files[path.basename(file)]) as never);
    logger.error.mock.resetCalls();

    const { registered } = await loadPrompts();

    assert.deepEqual(registered.map((p) => [p.name, p.config.title]), [['a_good', 'Good']]);
    // Only .md files are read; each malformed one is reported by name.
    assert.equal(readFile.mock.callCount(), 3);
    assert.deepEqual(logger.error.mock.calls.map((call) => String(call.arguments[0])), [
      'Failed to load prompt b_no_description: Prompt b_no_description: front matter needs a title and a description',
      'Failed to load prompt c_no_front_matter: Prompt c_no_front_matter: missing front matter',
    ]);
  });

  it('returns the body unchanged for a prompt without arguments', async () => {
    const result = await (await loadPrompts()).get('create_custom_ui');
    assert.match(result.messages[0].content.text, /^\n?# Create a Custom UI with React/);
    assert.ok(!result.messages[0].content.text.startsWith('---'));
  });
});

describe('parsePromptFile', () => {
  const file = (frontMatter: string, body = '# Body\n') => `---\n${frontMatter}\n---\n${body}`;

  it('reads quoted scalars and the arguments list of maps', () => {
    const prompt = parsePromptFile('p', file([
      'title: "A title"',
      "description: 'A description'",
      'arguments:',
      '  - name: metadata_list',
      '    description: \'Comma-separated "types"\'',
      '    required: true',
    ].join('\n')));
    assert.deepEqual(prompt, {
      name: 'p',
      title: 'A title',
      description: 'A description',
      arguments: [{ name: 'metadata_list', description: 'Comma-separated "types"', required: true }],
      body: '# Body\n',
    });
  });

  it('treats an argument without required: true as optional, and no arguments as none', () => {
    assert.equal(parsePromptFile('p', file('title: t\ndescription: d\narguments:\n  - name: metadata_list')).arguments[0].required, false);
    assert.deepEqual(parsePromptFile('p', file('title: t\ndescription: d')).arguments, []);
  });

  it('reads a CRLF file (a Windows checkout) the same as LF', () => {
    const lf = file('title: t\ndescription: d\narguments:\n  - name: metadata_list\n    required: true', '# Body\nline\n');
    assert.deepEqual(parsePromptFile('p', lf.replace(/\n/g, '\r\n')), parsePromptFile('p', lf));
  });

  it('rejects anything outside that shape', () => {
    assert.throws(() => parsePromptFile('p', '# no front matter'), /missing front matter/);
    assert.throws(() => parsePromptFile('p', file('title: t')), /needs a title and a description/);
    assert.throws(() => parsePromptFile('p', file('title: t\ndescription: d\ntags:\n  - a')), /unsupported front matter line/);
    assert.throws(
      () => parsePromptFile('p', file('title: t\ndescription: d\narguments:\n  - name: other')),
      /unsupported argument "other"/
    );
  });
});

describe('completeMetadataList', () => {
  it('completes the last comma-separated entry and keeps the earlier ones', () => {
    assert.deepEqual(completeMetadataList('table,bus'), ['table,business-rule']);
    assert.deepEqual(completeMetadataList('script-in'), ['script-include']);
  });

  it('offers every type for an empty value, and none already chosen', () => {
    assert.equal(completeMetadataList('').length, Object.values(ServiceNowMetadataType).length);
    assert.ok(!completeMetadataList('table,').includes('table,table'));
    assert.deepEqual(completeMetadataList('nope'), []);
  });
});

describe('coding_in_fluent prompt rendering (P0.1)', () => {
  it('injects real per-type instruction content and explicit tool/URI pointers', async () => {
    const text = await renderCodingInFluent('business-rule,table');

    // Real content pulled from the shipped instruction resources.
    assert.ok(text.includes('### business-rule'));
    assert.ok(text.includes('`when` field')); // first substantive rule in fluent_instruct_business-rule.md
    assert.ok(text.includes('### table'));

    // Explicit tool pointers.
    assert.ok(text.includes('get_fluent_knowledge'));
    assert.ok(!/get-(api-spec|instruct|snippet)/.test(text), 'no pointer to a removed tool');

    // Explicit resource-URI pointers.
    assert.ok(text.includes('sn-spec://business-rule'));
    assert.ok(text.includes('sn-instruct://business-rule'));
    assert.ok(text.includes('sn-snippet://table/0001'));
  });

  it('emits zero generic boilerplate stubs', async () => {
    const text = await renderCodingInFluent('business-rule,client-script,acl');
    assert.ok(!text.includes('Use the appropriate Fluent API methods'));
    assert.ok(!text.includes('Reference the specific instructions for'));
  });

  it('appends the full enum-derived catalog of all 76 metadata types', async () => {
    const text = await renderCodingInFluent('flow');
    const total = Object.values(ServiceNowMetadataType).length;

    assert.equal(total, 76); // guards against the pre-v4.14.0 count of 75 (+ ui-macro)
    assert.ok(text.includes(`All ${total} supported metadata types`));

    // Every supported type appears in the rendered catalog.
    for (const type of Object.values(ServiceNowMetadataType)) {
      assert.ok(text.includes(type));
    }
    // Including the v4.9.0 addition.
    assert.ok(text.includes('atf-ui-test-script'));
  });

  /**
   * MCP prompt arguments are string-valued on the wire, so the comma-separated
   * form documented in res/prompt/coding_in_fluent.md is the only form a
   * conforming client can send. It must be split, not treated as one type name.
   */
  it('splits the documented comma-separated metadata_list string', async () => {
    const text = await renderCodingInFluent('state-model,atf-list');

    assert.ok(text.includes('### state-model'));
    assert.ok(text.includes('### atf-list'));
    assert.ok(!text.includes('not a recognized Fluent metadata type'));
  });

  it('tolerates whitespace and casing around comma-separated entries', async () => {
    const text = await renderCodingInFluent(' Table , business-rule ,, ');

    assert.ok(text.includes('### table'));
    assert.ok(text.includes('### business-rule'));
    assert.ok(!text.includes('not a recognized Fluent metadata type'));
  });

  it('handles an unknown metadata type with an actionable correction, not a stub', async () => {
    const text = await renderCodingInFluent('not-a-real-type');
    assert.ok(text.includes('not a recognized Fluent metadata type'));
    assert.ok(!text.includes('Use the appropriate Fluent API methods'));
  });
});
