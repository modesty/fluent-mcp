/**
 * H2 regression guard: the tool INPUT schema advertised on `tools/list`
 * (CommandRegistry.toMCPTools) must share its canonical contract with the
 * schema enforced on `tools/call` (the Zod shape ToolsManager passes to
 * registerTool).
 *
 * Both are now derived from a single source of truth — src/tools/toolSchema.ts —
 * so this test locks in that they can never drift again: same property set, same
 * required set, matching types, and consistent optional/nullable handling.
 */
import { CommandFactory } from '../../src/tools/registry/commandFactory.js';
import { CommandRegistry } from '../../src/tools/registry/commandRegistry.js';
import { CheckAuthStatusCommand } from '../../src/tools/resources/resourceTools.js';
import {
  buildInputZodShape,
  buildInputZodSchema,
  buildInputJsonSchema,
} from '../../src/tools/toolSchema.js';
import type { CLICommand, CommandProcessor } from '../../src/utils/types.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());

const mockProcessor = { process: jest.fn() } as unknown as CommandProcessor;

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
    expect(advertised.length).toBe(commands.length);
  });

  it('advertises explicit workingDirectory only on Fluent project commands', () => {
    const projectCommands = new Set([
      'build_fluent_app',
      'cicd_fluent_app',
      'clean_fluent_app',
      'deploy_fluent_app',
      'download_fluent_app',
      'download_fluent_dependencies',
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
        expect(workingDirectory).toBeDefined();
      } else {
        expect(workingDirectory).toBeUndefined();
      }
    }
  });

  for (const command of commands) {
    describe(command.name, () => {
      const tool = byName.get(command.name)!;
      const inputSchema = tool.inputSchema as {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
      };
      const argNames = command.arguments.map((a) => a.name);
      const requiredNames = command.arguments.filter((a) => a.required).map((a) => a.name);

      it('advertised schema is derived from the shared builder (no hand-built drift)', () => {
        expect(inputSchema).toEqual(buildInputJsonSchema(command.arguments));
      });

      it('advertises an object schema with exactly the declared properties', () => {
        expect(inputSchema.type).toBe('object');
        expect(new Set(Object.keys(inputSchema.properties ?? {}))).toEqual(new Set(argNames));
      });

      it('advertised required set matches the declared required args', () => {
        expect(new Set(inputSchema.required ?? [])).toEqual(new Set(requiredNames));
      });

      it('advertises every argument with a renderer-friendly top-level type', () => {
        for (const arg of command.arguments) {
          const prop = (inputSchema.properties ?? {})[arg.name];
          expect(prop).toBeDefined();
          expect(prop.type).toBe(JSON_TYPE[arg.type]);
          expect(prop.description).toBe(arg.description);
          expect(prop.anyOf).toBeUndefined();
          if (arg.required) {
            expect(inputSchema.required ?? []).toContain(arg.name);
          } else {
            // Optional args remain optional, but null compatibility is handled
            // by Zod preprocessing rather than being advertised as a union.
            expect(inputSchema.required ?? []).not.toContain(arg.name);
          }
        }
      });

      it('enforced Zod shape accepts required-filled input with optionals as null', () => {
        const shape = buildInputZodShape(command.arguments);
        expect(new Set(Object.keys(shape))).toEqual(new Set(argNames));

        const input: Record<string, unknown> = {};
        for (const arg of command.arguments) {
          input[arg.name] = arg.required ? sampleValue(arg.type) : null;
        }
        expect(buildInputZodSchema(command.arguments).safeParse(input).success).toBe(true);
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
        expect(parsed.success).toBe(true);
      });

      it('enforced Zod shape rejects input missing a required arg', () => {
        if (requiredNames.length === 0) return; // nothing required to omit
        const shape = buildInputZodShape(command.arguments);
        const input: Record<string, unknown> = {};
        for (const arg of command.arguments) {
          if (arg.required && arg.name === requiredNames[0]) continue; // omit one required
          if (arg.required) input[arg.name] = sampleValue(arg.type);
        }
        expect(buildInputZodSchema(command.arguments).safeParse(input).success).toBe(false);
      });

      it('enforced Zod schema rejects undeclared arguments', () => {
        const input: Record<string, unknown> = { undeclared: true };
        for (const arg of command.arguments) {
          if (arg.required) input[arg.name] = sampleValue(arg.type);
        }
        expect(buildInputZodSchema(command.arguments).safeParse(input).success).toBe(false);
      });
    });
  }
});
