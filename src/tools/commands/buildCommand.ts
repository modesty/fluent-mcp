import { CommandArgument, CommandResult } from "../../utils/types.js";
import { SessionAwareCLICommand } from "./sessionAwareCommand.js";

/**
 * Command to build a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class BuildCommand extends SessionAwareCLICommand {
  name = "fluent_build";
  description = "Build the Fluent (ServiceNow SDK) application in the current session's working directory";
  arguments: CommandArgument[] = [];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const sdkArgs = ["now-sdk", "build"];

    return this.executeWithSessionWorkingDirectory("npx", sdkArgs);
  }
}
