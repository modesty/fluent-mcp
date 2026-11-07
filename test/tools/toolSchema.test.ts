/**
 * H2 regression guard: the tool INPUT schema advertised on `tools/list`
 * (CommandRegistry.toMCPTools) must share its canonical contract with the
 * schema enforced on `tools/call` (the Zod shape ToolsManager passes to
 * registerTool).
 *
 * Both are now derived from a single source of truth — src/tools/toolSchema.ts —
 * so this test locks in that they can never drift again: same property set, same
 * required set, matching types, and consistent optional/nullable handling.
 *
 * Native runner: the logger mock is registered before the command modules are
 * imported, so they are loaded with dynamic import() below the registration.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { loggerFixture } from '../support/fixtures.js';
import type { CLICommand, CommandArgument, CommandProcessor } from '../../src/utils/types.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { CommandFactory } = await import('../../src/tools/registry/commandFactory.js');
const { CommandRegistry } = await import('../../src/tools/registry/commandRegistry.js');
const { CheckAuthStatusCommand } = await import('../../src/tools/resources/resourceTools.js');
const { buildInputZodShape, buildInputZodSchema, buildInputJsonSchema } = await import(
  '../../src/tools/toolSchema.js'
);

const mockProcessor = { process: mock.fn() } as unknown as CommandProcessor;

/** A valid sample value for each declared arg type, for behavioral parse checks. */
/** A value that the pattern domains in src accept, tried in order. */
const PATTERN_SAMPLES = ['global', 'build', 'records[0].sys_id'];

function sampleValue(arg: CommandArgument): unknown {
  if (arg.domain?.kind === 'choices') return arg.domain.values[0];
  if (arg.domain?.kind === 'pattern') {
    const { regex } = arg.domain;
    const sample = PATTERN_SAMPLES.find((candidate) => regex.test(candidate));
    assert.ok(sample, `add a sample for ${arg.name}'s pattern ${String(regex)}`);
    return sample;
  }
  switch (arg.type) {
    case 'string': return 'x';
    case 'number': return 1;
    case 'boolean': return true;
    case 'array': return [];
    default: return 'x';
  }
}

const JSON_TYPE: Record<string, string> = {
  string: 'string', number: 'number', boolean: 'boolean', array: 'array',
};

interface AdvertisedProperty {
  type?: string;
  description?: string;
  anyOf?: unknown;
}

describe('Tool input schema — advertised (tools/list) and enforced (tools/call)', () => {
  const commands: CLICommand[] = [
    ...CommandFactory.createCommands(mockProcessor, mockProcessor),
    new CheckAuthStatusCommand(),
  ];

  const registry = new CommandRegistry();
  commands.forEach((c) => registry.register(c));
  const advertised = registry.toMCPTools();
  const byName = new Map(advertised.map((t) => [t.name, t]));

  it('advertises every registered command', () => {
    assert.equal(advertised.length, commands.length);
  });

  it('advertises explicit workingDirectory only on Fluent project commands', () => {
    const projectCommands = new Set([
      'build_fluent_app',
      'cicd_fluent_app',
      'clean_fluent_app',
      'deploy_fluent_app',
      'download_fluent_app',
      'download_fluent_dependencies',
      'fluent_exec_script', // only to locate `file` inside the project
      'fluent_transform',
      'init_fluent_app',
      'pack_fluent_app',
      'query_fluent_records',
    ]);

    for (const command of commands) {
      const workingDirectory = command.arguments.find(
        (argument) => argument.name === 'workingDirectory'
      );
      if (projectCommands.has(command.name)) {
        assert.notEqual(workingDirectory, undefined);
      } else {
        assert.equal(workingDirectory, undefined);
      }
    }
  });

  for (const command of commands) {
    describe(command.name, () => {
      const tool = byName.get(command.name)!;
      const inputSchema = tool.inputSchema as {
        type: string;
        properties?: Record<string, AdvertisedProperty>;
        required?: string[];
      };
      const argNames = command.arguments.map((a) => a.name);
      const requiredNames = command.arguments.filter((a) => a.required).map((a) => a.name);

      it('advertised schema is derived from the shared builder (no hand-built drift)', () => {
        assert.deepStrictEqual(inputSchema, buildInputJsonSchema(command.arguments));
      });

      it('advertises an object schema with exactly the declared properties', () => {
        assert.equal(inputSchema.type, 'object');
        assert.deepStrictEqual(
          new Set(Object.keys(inputSchema.properties ?? {})),
          new Set(argNames)
        );
      });

      it('advertised required set matches the declared required args', () => {
        assert.deepStrictEqual(new Set(inputSchema.required ?? []), new Set(requiredNames));
      });

      it('advertises every argument with a renderer-friendly top-level type', () => {
        for (const arg of command.arguments) {
          const prop = (inputSchema.properties ?? {})[arg.name];
          assert.notEqual(prop, undefined);
          assert.equal(prop.type, JSON_TYPE[arg.type]);
          assert.equal(prop.description, arg.description);
          assert.equal(prop.anyOf, undefined);
          if (arg.required) {
            assert.ok((inputSchema.required ?? []).includes(arg.name));
          } else {
            // Optional args remain optional, but null compatibility is handled
            // by Zod preprocessing rather than being advertised as a union.
            assert.ok(!(inputSchema.required ?? []).includes(arg.name));
          }
        }
      });

      it('enforced Zod shape accepts required-filled input with optionals as null', () => {
        const shape = buildInputZodShape(command.arguments);
        assert.deepStrictEqual(new Set(Object.keys(shape)), new Set(argNames));

        const input: Record<string, unknown> = {};
        for (const arg of command.arguments) {
          input[arg.name] = arg.required ? sampleValue(arg) : null;
        }
        assert.equal(buildInputZodSchema(command.arguments).safeParse(input).success, true);
      });

      it('accepts null for optional arguments as omitted input', () => {
        const optional = command.arguments.find((arg) => !arg.required);
        if (!optional) return;

        const input: Record<string, unknown> = {};
        for (const arg of command.arguments) {
          if (arg.required) input[arg.name] = sampleValue(arg);
        }
        input[optional.name] = null;

        const parsed = buildInputZodSchema(command.arguments).safeParse(input);
        assert.equal(parsed.success, true);
      });

      it('enforced Zod shape rejects input missing a required arg', () => {
        if (requiredNames.length === 0) return; // nothing required to omit
        const input: Record<string, unknown> = {};
        for (const arg of command.arguments) {
          if (arg.required && arg.name === requiredNames[0]) continue; // omit one required
          if (arg.required) input[arg.name] = sampleValue(arg);
        }
        assert.equal(buildInputZodSchema(command.arguments).safeParse(input).success, false);
      });

      it('enforced Zod schema rejects undeclared arguments', () => {
        const input: Record<string, unknown> = { undeclared: true };
        for (const arg of command.arguments) {
          if (arg.required) input[arg.name] = sampleValue(arg);
        }
        assert.equal(buildInputZodSchema(command.arguments).safeParse(input).success, false);
      });
    });
  }
});

describe('argument domains compiled into the schema', () => {
  const arg = (overrides: Partial<CommandArgument>): CommandArgument => ({
    name: 'x', type: 'string', required: true, description: 'X', ...overrides,
  });
  const parse = (a: CommandArgument, value: unknown) => {
    const result = buildInputZodSchema([a]).safeParse({ [a.name]: value });
    return result.success ? 'ok' : result.error.issues.map((issue) => issue.message).join(' | ');
  };

  it('plain text rejects every control character and nothing else', () => {
    assert.equal(parse(arg({}), 'a;b|c$(d)`e`<f>&{g}[h]\\i "j" \'k\''), 'ok');
    for (const bad of ['a\nb', 'a\rb', 'a\tb', 'a\u0000b', 'a\u001bb', 'a\u007fb']) {
      assert.equal(parse(arg({}), bad), "Invalid characters in argument 'x': control characters are not allowed.");
    }
  });

  it('multilineText allows newline, carriage return and tab, and rejects other control characters', () => {
    const multiline = arg({ domain: { kind: 'multilineText' } });
    assert.equal(parse(multiline, 'line 1\r\n\tline 2\n'), 'ok');
    assert.match(parse(multiline, 'a\u0000b'), /control characters other than newline, carriage return, and tab/);
  });

  it('choices: enforced, advertised as enum, named in the message', () => {
    const choices = arg({ domain: { kind: 'choices', values: ['a', 'b'] } });
    assert.equal(parse(choices, 'a'), 'ok');
    assert.equal(parse(choices, 'c'), "Argument 'x' must be one of: a, b. Received: \"c\".");
    assert.deepEqual((buildInputJsonSchema([choices]).properties as Record<string, { enum?: string[] }>).x.enum, ['a', 'b']);
  });

  it('pattern: enforced, advertised with the same source, named in the message', () => {
    const pattern = arg({ domain: { kind: 'pattern', regex: /^[a-z]+$/, expected: 'lowercase letters' } });
    assert.equal(parse(pattern, 'abc'), 'ok');
    assert.equal(parse(pattern, 'aBc'), "Argument 'x' must be lowercase letters. Received: \"aBc\".");
    assert.equal((buildInputJsonSchema([pattern]).properties as Record<string, { pattern?: string }>).x.pattern, '^[a-z]+$');
  });

  it('a missing or null required value names the argument, its purpose and type', () => {
    for (const value of [undefined, null]) {
      assert.equal(parse(arg({}), value), "Missing required argument 'x'. X. Expected type: string.");
      assert.equal(parse(arg({ domain: { kind: 'choices', values: ['a'] } }), value), "Missing required argument 'x'. X. Expected type: string.");
    }
  });

  it('keeps the type messages of the former hand checks', () => {
    assert.equal(parse(arg({}), 5), "Argument 'x' must be a string, got number");
    assert.equal(parse(arg({ type: 'number' }), 'five'), "Argument 'x' must be a valid number");
    assert.equal(parse(arg({ type: 'number' }), Number.NaN), "Argument 'x' must be a valid number");
    assert.equal(parse(arg({ type: 'boolean' }), 'yes'), "Argument 'x' must be a boolean");
  });

  it('refuses a pattern that is unanchored or has flags, and a domain on a non-string', () => {
    for (const regex of [/[a-z]+/, /^[a-z]+/, /^[a-z]+$/i]) {
      assert.throws(() => buildInputZodShape([arg({ domain: { kind: 'pattern', regex, expected: 'e' } })]), /must be anchored \(\^…\$\) and flag-free/);
    }
    assert.throws(() => buildInputZodShape([arg({ type: 'number', domain: { kind: 'multilineText' } })]), /a domain applies only to string arguments/);
  });
});
