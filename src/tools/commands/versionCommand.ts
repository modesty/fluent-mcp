import { CommandArgument, CommandResult } from "../../utils/types";
import { CLIExecutor } from "../cliCommandTools.js";
import { SessionFallbackCommand } from "./sessionFallbackCommand.js";

/**
 * Command to retrieve Fluent (ServiceNow SDK) version information
 */
export class VersionCommand extends SessionFallbackCommand {
  name = 'get_fluent_version';
  description = 'Get Fluent (ServiceNow SDK) version information';
  arguments: CommandArgument[] = [];

  constructor(cliExecutor: CLIExecutor) {
    super(cliExecutor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    return await this.executeWithFallback('npx', ['now-sdk', '--version']);
  }
}
