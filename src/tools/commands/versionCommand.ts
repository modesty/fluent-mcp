import { CommandArgument, CommandProcessor, CommandResult } from "../../utils/types";
import { SessionFallbackCommand } from "./sessionFallbackCommand.js";

/**
 * Command to retrieve Fluent (ServiceNow SDK) version information
 */
export class VersionCommand extends SessionFallbackCommand {
  name = 'get_fluent_version';
  description = 'Get Fluent (ServiceNow SDK) version information';
  arguments: CommandArgument[] = [];

  constructor(commandProcessor: CommandProcessor) {
    super(commandProcessor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    return await this.executeWithFallback('npx', ['now-sdk', '--version']);
  }
}
