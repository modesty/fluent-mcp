/**
 * H2 regression guard: the tool INPUT schema advertised on `tools/list`
 * (CommandRegistry.toMCPTools) must agree with the schema enforced on
 * `tools/call` (the Zod shape ToolsManager passes to registerTool).
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

describe('Tool input schema — advertised (tools/list) == enforced (tools/call)', () => {
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

      it('required args are non-null typed; optional args are nullable and omitted from required', () => {
        for (const arg of command.arguments) {
          const prop = (inputSchema.properties ?? {})[arg.name];
          expect(prop).toBeDefined();
          if (arg.required) {
            expect(prop.type).toBe(JSON_TYPE[arg.type]);
            expect(inputSchema.required ?? []).toContain(arg.name);
          } else {
            // Optional args render as anyOf[<type>, null] and are not required.
            expect(inputSchema.required ?? []).not.toContain(arg.name);
            const branches = (prop.anyOf ?? []) as Array<{ type?: string }>;
            expect(branches.some((b) => b.type === 'null')).toBe(true);
            expect(branches.some((b) => b.type === JSON_TYPE[arg.type])).toBe(true);
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
