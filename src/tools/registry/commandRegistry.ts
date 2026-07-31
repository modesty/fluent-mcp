import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CLICommand } from '../../utils/types.js';
import { buildInputJsonSchema } from '../toolSchema.js';

/**
 * Stores and retrieves commands, converts to MCP Tool format
 */
export class CommandRegistry {
  private commands: Map<string, CLICommand> = new Map();

  register(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  // Convert to MCP Tool format
  toMCPTools(): Tool[] {
    const commandsByName = this.getAllCommands().sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    );

    return commandsByName.map((command) => {
      const tool: Tool = {
        name: command.name,
        description: command.description,
        ...(command.annotations && { annotations: command.annotations }),
        ...(command._meta && { _meta: command._meta }),
        // Advertise an output schema for tools that declare one (read/info tools that
        // return structuredContent). This custom tools/list handler is the source of
        // truth, so the schema must be emitted here (not only via registerTool).
        ...(command.outputSchema && {
          // Zod v4's native conversion yields the object schema shape MCP requires.
          outputSchema: z.toJSONSchema(z.object(command.outputSchema)) as Tool['outputSchema'],
        }),
        // Advertised input schema is derived from the SAME Zod shape enforced on
        // tools/call (see src/tools/toolSchema.ts), so canonical types and
        // required fields cannot drift.
        inputSchema: buildInputJsonSchema(command.arguments),
      };

      // Add annotations if they exist
      if (command.annotations) {
        // MCP SDK expects annotations to be a direct object with properties
        tool.annotations = {
          title: command.annotations.title,
          readOnlyHint: command.annotations.readOnlyHint,
          destructiveHint: command.annotations.destructiveHint,
          idempotentHint: command.annotations.idempotentHint,
          openWorldHint: command.annotations.openWorldHint
        };
      }

      return tool;
    });
  }
}
