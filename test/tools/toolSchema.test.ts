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
import type { CLICommand, CommandProcessor } from '../../src/utils/types.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { CommandFactory } = await import('../../src/tools/registry/commandFactory.js');
const { CommandRegistry } = await import('../../src/tools/registry/commandRegistry.js');
const { CheckAuthStatusCommand } = await import('../../src/tools/resources/resourceTools.js');
const { buildInputZodShape, buildInputZodSchema, buildInputJsonSchema } = await import(
  '../../src/tools/toolSchema.js'
);

const mockProcessor = { process: mock.fn() } as unknown as CommandProcessor;

/** A valid sample value for each declared arg type, for behavioral parse checks. */
function sampleValue(type: string): unknown {
  switch (type) {
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
          input[arg.name] = arg.required ? sampleValue(arg.type) : null;
        }
        assert.equal(buildInputZodSchema(command.arguments).safeParse(input).success, true);
      });

      it('accepts null for optional arguments as omitted input', () => {
        const optional = command.arguments.find((arg) => !arg.required);
        if (!optional) return;

        const input: Record<string, unknown> = {};
        for (const arg of command.arguments) {
          if (arg.required) input[arg.name] = sampleValue(arg.type);
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
          if (arg.required) input[arg.name] = sampleValue(arg.type);
        }
        assert.equal(buildInputZodSchema(command.arguments).safeParse(input).success, false);
      });

      it('enforced Zod schema rejects undeclared arguments', () => {
        const input: Record<string, unknown> = { undeclared: true };
        for (const arg of command.arguments) {
          if (arg.required) input[arg.name] = sampleValue(arg.type);
        }
        assert.equal(buildInputZodSchema(command.arguments).safeParse(input).success, false);
      });
    });
  }
});
