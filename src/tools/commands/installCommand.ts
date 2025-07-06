import { CommandArgument, CommandResult } from "../../utils/types.js";
import { SessionAwareCLICommand } from "./sessionAwareCommand.js";

/**
 * Command to install a Fluent (ServiceNow SDK) application to a ServiceNow instance
 * Uses the session's working directory
 */
export class InstallCommand extends SessionAwareCLICommand {
  name = "fluent_install";
  description = "Install the Fluent (ServiceNow SDK) application in the current session's working directory to a ServiceNow instance";
  arguments: CommandArgument[] = [
    {
      name: "auth",
      type: "string",
      required: false,
      description: "The authentication alias to use",
    },
    {
      name: "debug",
      type: "boolean",
      required: false,
      description: "Print debug output",
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const sdkArgs = ["now-sdk", "install"];

    // Add optional arguments if provided
    if (args.auth) {
      sdkArgs.push("--auth", args.auth as string);
    }

    // Add debug flag if specified
    if (args.debug) {
      sdkArgs.push("--debug");
    }

    return this.executeWithSessionWorkingDirectory("npx", sdkArgs);
  }
}
