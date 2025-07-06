import { CommandArgument, CommandResult } from "../../utils/types.js";
import { SessionAwareCLICommand } from "./sessionAwareCommand.js";

/**
 * Command to manage dependencies in a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class DependenciesCommand extends SessionAwareCLICommand {
  name = "fluent_dependencies";
  description = "Manage dependencies for the Fluent (ServiceNow SDK) application in the current session's working directory";
  arguments: CommandArgument[] = [
    {
      name: "add",
      type: "boolean",
      required: false,
      description: "Add dependencies",
    },
    {
      name: "install",
      type: "boolean",
      required: false,
      description: "Install dependencies",
    },
    {
      name: "list",
      type: "boolean",
      required: false,
      description: "List dependencies",
    },
    {
      name: "packageName",
      type: "string",
      required: false,
      description: "Name of the package to add",
    },
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
    const sdkArgs = ["now-sdk", "dependencies"];

    // Add optional arguments if provided
    if (args.add) {
      sdkArgs.push("--add");
      
      if (args.packageName) {
        sdkArgs.push(args.packageName as string);
      }
    } else if (args.install) {
      sdkArgs.push("--install");
    } else if (args.list) {
      sdkArgs.push("--list");
    }
    
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
