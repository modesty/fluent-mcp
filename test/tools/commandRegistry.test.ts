import { CommandRegistry } from '../../src/tools/registry/commandRegistry.js';
import { CLICommand, CommandResult } from '../../src/utils/types.js';

function command(name: string): CLICommand {
  return {
    name,
    description: `${name} description`,
    arguments: [],
    execute: async (): Promise<CommandResult> => ({
      exitCode: 0,
      success: true,
      output: '',
    }),
    getCommandProcessor: () => undefined,
  };
}

describe('CommandRegistry', () => {
  it('advertises tools in deterministic name order', () => {
    const registry = new CommandRegistry();
    registry.register(command('z_last'));
    registry.register(command('a_first'));
    registry.register(command('middle'));

    expect(registry.toMCPTools().map((tool) => tool.name)).toEqual([
      'a_first',
      'middle',
      'z_last',
    ]);
  });
});
