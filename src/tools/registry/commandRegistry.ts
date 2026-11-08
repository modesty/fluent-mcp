import { CLICommand } from '../../utils/types.js';

/**
 * Stores the commands that are registered as MCP tools.
 */
export class CommandRegistry {
  private commands: Map<string, CLICommand> = new Map();

  /**
   * Add a command. A second command with the same name is a wiring error and
   * throws, rather than silently replacing the first.
   */
  register(command: CLICommand): void {
    if (this.commands.has(command.name)) {
      throw new Error(`A command named '${command.name}' is already registered`);
    }
    this.commands.set(command.name, command);
  }

  /**
   * Every command, in name order. The SDK lists tools in registration order,
   * so this order is the order of `tools/list`.
   */
  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values()).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    );
  }
}
