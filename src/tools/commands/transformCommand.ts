import { CommandArgument, CommandResult } from "../../utils/types.js";
import { SessionAwareCLICommand } from "./sessionAwareCommand.js";

/**
 * Command to transform files in a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class TransformCommand extends SessionAwareCLICommand {
  name = "fluent_transform";
  description = "Transform files in the Fluent (ServiceNow SDK) application in the current session's working directory";
  arguments: CommandArgument[] = [
    {
      name: "source",
      type: "string",
      required: false,
      description: "Source file or directory to transform",
    },
    {
      name: "destination",
      type: "string",
      required: false,
      description: "Destination file or directory for transformed output",
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const sdkArgs = ["now-sdk", "transform"];

    // Add optional arguments if provided
    if (args.source) {
      sdkArgs.push("--source", args.source as string);
    }
    
    if (args.destination) {
      sdkArgs.push("--destination", args.destination as string);
    }

    return this.executeWithSessionWorkingDirectory("npx", sdkArgs);
  }
}
