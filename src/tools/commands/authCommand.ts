import logger from "../../utils/logger.js";
import { CommandArgument, CommandProcessor, CommandResult } from "../../utils/types.js";

import { SessionFallbackCommand } from "./sessionFallbackCommand.js";

/**
 * Command to prepare shell command for ServiceNow SDK authentication
 * Handles adding, listing, deleting, and selecting auth profiles
 */
export class AuthCommand extends SessionFallbackCommand {
  name = "prepare_fluent_auth";
  description = "Generate shell command to manage Fluent (ServiceNow SDK) authentication to <instance_url> with credential profiles, including create new auth alias, list /show existing ones, delete or use an existing one";
  arguments: CommandArgument[] = [
    {
      name: "add",
      type: "boolean",
      required: false,
      description: "Add / Create a new authentication profile",
    },
    {
      name: "instanceUrl",
      type: "string",
      required: false,
      description: "URL of the ServiceNow instance (required when using --add). Required for new auth alias.",
    },
    {
      name: "type",
      type: "string",
      required: false,
      description:
        'Authentication type (e.g., "oauth", "basic"). Default for localhost is "basic", for other hosts is "oauth"',
    },
    {
      name: "alias",
      type: "string",
      required: false,
      description: "Name for the authentication profile (required when using --add, --delete, --use)",
    },
    {
      name: "list",
      type: "boolean",
      required: false,
      description: "List all existing stored authentication profiles",
    },
    {
      name: "delete",
      type: "string",
      required: false,
      description: "Delete the specified authentication profile",
    },
    {
      name: "use",
      type: "string",
      required: false,
      description: "Use the specified authentication profile",
    },
    {
      name: "debug",
      type: "boolean",
      required: false,
      description: "Print debug output",
    },
  ];

  constructor(commandProcessor: CommandProcessor) {
    super(commandProcessor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    // Custom validation for add command - requires instanceUrl
    if (args.add && !args.instanceUrl) {
      return {
        exitCode: 1,
        success: false,
        output: "",
        error: new Error("When using --add, you must provide --instanceUrl"),
      };
    }

    const sdkArgs = ["now-sdk", "auth"];

    // Handle different auth operations
    if (args.add) {
      sdkArgs.push("--add", args.instanceUrl as string);

      if (args.type) {
        sdkArgs.push("--type", args.type as string);
      }

      if (args.alias) {
        sdkArgs.push("--alias", args.alias as string);
      }
    } else if (args.list) {
      sdkArgs.push("--list");
    } else if (args.delete) {
      sdkArgs.push("--delete", args.delete as string);
    } else if (args.use) {
      sdkArgs.push("--use", args.use as string);
    }

    // Add debug flag if specified
    if (args.debug) {
      sdkArgs.push("--debug");
    }

    return await this.executeWithFallback("npx", sdkArgs);
  }
}
