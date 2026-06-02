import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CLICommand } from '../../utils/types.js';

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
    return this.getAllCommands().map((command) => {
      const tool: Tool = {
        name: command.name,
        description: command.description,
        ...(command.annotations && { annotations: command.annotations }),
        ...(command._meta && { _meta: command._meta }),
        // Advertise an output schema for tools that declare one (read/info tools that
        // return structuredContent). This custom tools/list handler is the source of
        // truth, so the schema must be emitted here (not only via registerTool).
        ...(command.outputSchema && {
          // zod v4 native JSON-Schema conversion yields `{ type: 'object', ... }`,
          // which MCP's Tool.outputSchema requires (the v3 zod-to-json-schema package
          // mis-converts zod v4 and omits `type`).
          outputSchema: z.toJSONSchema(z.object(command.outputSchema)) as Tool['outputSchema'],
        }),
        inputSchema: {
          type: 'object',
          properties: command.arguments.reduce(
            (props, arg) => {
              props[arg.name] = {
                type: arg.type === 'array' ? 'array' : arg.type,
                description: arg.description,
              };
              return props;
            },
            {} as Record<string, { type: string; description: string }>
          ),
          required: command.arguments
            .filter((arg) => arg.required)
            .map((arg) => arg.name),
        }
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
