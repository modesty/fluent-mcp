import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CommandArgument, CommandProcessor, CommandResult } from "../../utils/types.js";

import { BaseCLICommand } from "./baseCommand.js";
import { FluentAppValidator } from "../../utils/fluentAppValidator.js";
import { SessionManager } from "../../utils/sessionManager.js";
import logger from "../../utils/logger.js";

/**
 * Command to initialize a new ServiceNow application
 * Implements the init command with validation of prerequisites
 */
export class InitCommand extends BaseCLICommand {
  name = "prepare_fluent_init";
  description = "Generate the Shell command to initialize a Fluent (ServiceNow SDK) application: If specified working directory has no Fluent (ServiceNow SDK) application, it will create a new one. If it has a Fluent (ServiceNow SDK) application, it will save the directory as the working directory for future commands, including build, install, transform and dependencies.\nWhen converting an existing ServiceNow application, use the 'from' argument to specify the system ID or path to initialize from. \nNote, if the specified directory has no package-lock.json file, run `npm install` first.\nNote, This command will not execute the initialization but prepare the shell command to be run later.";
  arguments: CommandArgument[] = [
    {
      name: "from",
      type: "string",
      required: false,
      description: "convert existing scoped app to Fluent by sys_id or path to initialize from",
    },
    {
      name: "appName",
      type: "string",
      required: true,
      description: "The name of the application, this is the user friendly name that will be displayed in ServiceNow UI.",
    },
    {
      name: "packageName",
      type: "string",
      required: true,
      description: "The NPM package name for the application, usually it's the snake-case of appName in lowercase.",
    },
    {
      name: "scopeName",
      type: "string",
      required: true,
      description: "The scope name for the application in <prefix>_<scope_name> format. For localhost development, it should be in the format of 'sn_<scope_name>'. This is required to create a new Fluent (ServiceNow SDK) application, no spaces allowed.",
    },
    {
      name: "auth",
      type: "string",
      required: false,
      description: "The authentication alias to use. If not provided, the default authentication alias will be used. You can set up authentication using the 'auth' command.",
    },
    {
      name: "workingDirectory",
      type: "string",
      required: false,
      description: "The directory where the Fluent (ServiceNow SDK) application will be created. If not provided, a new directory will be created in the user's home directory.",
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

  // Using FluentAppValidator.checkFluentAppExists() instead

  /**
   * Create a new directory with a timestamp in the user's home directory
   * @returns Path to the newly created directory
   */
  private createDefaultWorkingDirectory(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dirName = `fluent-app-${timestamp}`;
    const dirPath = path.join(os.homedir(), dirName);
    
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created new working directory: ${dirPath}`);
      return dirPath;
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}: ${error}`);
      throw new Error(`Failed to create default working directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    // No need to validate required args since workingDirectory is now optional
    
    const sessionManager = SessionManager.getInstance();
    let workingDirectory: string;
    let shouldExecuteCommand = true;

    // Handle working directory logic
    if (args.workingDirectory) {
      // If working directory is provided
      let inputDir = args.workingDirectory as string;
      // Normalize ~ to home directory on Mac/Linux
      if (inputDir.startsWith("~/")) {
        inputDir = path.join(os.homedir(), inputDir.slice(2));
      }
      workingDirectory = path.resolve(inputDir);
      
      // Check if the directory exists, create it if not
      if (!fs.existsSync(workingDirectory)) {
        try {
          fs.mkdirSync(workingDirectory, { recursive: true });
          logger.info(`Created working directory: ${workingDirectory}`);
        } catch (error) {
          return {
            exitCode: 1,
            success: false,
            output: "",
            error: new Error(`Failed to create working directory ${workingDirectory}: ${error instanceof Error ? error.message : String(error)}`),
          };
        }
      }
      
      // Check prerequisites - working directory must not already contain a ServiceNow app
      const appCheck = await FluentAppValidator.checkFluentAppExists(workingDirectory);
      if (appCheck.hasApp) {
        // Directory contains a Fluent app, save it and exit
        sessionManager.setWorkingDirectory(workingDirectory);
        return {
          exitCode: 0,  // Success, but don't execute command
          success: true,
          output: `The directory ${workingDirectory} already contains a Fluent (ServiceNow SDK) application.\n` +
                 `Package name: ${appCheck.packageName}\nScope name: ${appCheck.scopeName}\n` +
                 `This directory has been saved as your working directory for future commands.`,
          error: undefined,
        };
      }
      
      if (appCheck.errorMessage) {
        return {
          exitCode: 1,
          success: false,
          output: "",
          error: new Error(appCheck.errorMessage),
        };
      }
    } else {
      // If working directory is not provided, create a new one in the user's home directory
      try {
        workingDirectory = this.createDefaultWorkingDirectory();
      } catch (error) {
        return {
          exitCode: 1,
          success: false,
          output: "",
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }
    
    // Save the working directory for the session
    sessionManager.setWorkingDirectory(workingDirectory);

    // Prepare the init command
    const sdkArgs = ["-y", "@servicenow/sdk", "init"];
    
    // Add optional arguments if provided
    if (args.from) {
      sdkArgs.push("--from", args.from as string);
    }
    
    if (args.appName) {
      const appNameArg = typeof args.appName === "string" && !/^".*"$/.test(args.appName)
        ? `"${args.appName}"`
        : args.appName as string;
      sdkArgs.push("--appName", appNameArg);
    }
    
    if (args.packageName) {
      sdkArgs.push("--packageName", args.packageName as string);
    }
    
    if (args.scopeName) {
      sdkArgs.push("--scopeName", args.scopeName as string);
    }
    
    if (args.auth) {
      sdkArgs.push("--auth", args.auth as string);
    }

    // Add debug flag if specified
    if (args.debug) {
      sdkArgs.push("--debug");
    }

    // Execute the command in the specified working directory
    try {
      const result = await this.commandProcessor.process("npx", sdkArgs, false, workingDirectory);
      logger.info(`Executed init command in directory: ${workingDirectory} - ${JSON.stringify(result)}`);
      // Add confirmation that the working directory has been saved
      if (result.success) {
        result.output += `\n\nThis directory (${workingDirectory}) has been saved as your working directory for future commands.`;
      }
      
      return result;
    } catch (error) {
      return {
        exitCode: 1,
        success: false,
        output: "",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
