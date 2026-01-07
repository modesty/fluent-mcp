import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CommandArgument, CommandProcessor, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { BaseCLICommand } from './baseCommand.js';
import { FluentAppValidator } from '../../utils/fluentAppValidator.js';
import { SessionManager } from '../../utils/sessionManager.js';
import logger from '../../utils/logger.js';
import {
  InitElicitator,
  InitValidator,
  ConversionElicitationData,
  CreationElicitationData,
} from './init/index.js';

/**
 * Command to initialize a new ServiceNow application
 * Implements the init command with MCP elicitation for structured data collection
 *
 * Uses composition to delegate responsibilities:
 * - InitElicitator: Handles MCP elicitation for user input
 * - InitValidator: Handles parameter validation
 */
export class InitCommand extends BaseCLICommand {
  name = 'init_fluent_app';
  description = 'Initialize a new ServiceNow custom application or convert a legacy ServiceNow application from an instance or directory within the current directory. Uses MCP elicitation to gather required parameters based on your intent.';

  private elicitator: InitElicitator;

  arguments: CommandArgument[] = [
    {
      name: 'intent',
      type: 'string',
      required: false,
      description: 'Specify your intent: "conversion" to convert an existing scoped app to Fluent, or "creation" to create a new scoped app. If not provided, you will be prompted to choose.',
    },
    {
      name: 'from',
      type: 'string',
      required: false,
      description: 'For conversion: sys_id of the sys_app record or local file path to convert from',
    },
    {
      name: 'appName',
      type: 'string',
      required: false,
      description: 'For creation: The name of the application.',
    },
    {
      name: 'packageName',
      type: 'string',
      required: false,
      description: "For creation: The NPM package name for the application, usually it's the snake-case of appName in lowercase with company prefix.",
    },
    {
      name: 'scopeName',
      type: 'string',
      required: false,
      description: "For creation: The scope name for the application in x_<scope_name> format. Must start with 'x_' prefix. No spaces allowed, no greater than 18 characters.",
    },
    {
      name: 'template',
      type: 'string',
      required: true,
      description: 'For creation: Template to use for the project. Choices: "base", "javascript.react", "typescript.basic", "typescript.react", "javascript.basic".',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'workingDirectory',
      type: 'string',
      required: true,
      description: 'The directory where the Fluent (ServiceNow SDK) application will be created. Must be an empty local directory with no package.json or now.config.json files.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  constructor(commandProcessor: CommandProcessor, mcpServer?: McpServer) {
    super(commandProcessor);
    this.elicitator = new InitElicitator(mcpServer);
  }

  /**
   * Set the MCP server for this command
   */
  setMcpServer(mcpServer: McpServer): void {
    this.elicitator.setMcpServer(mcpServer);
  }

  /**
   * Create a new directory with a timestamp in the user's home directory
   */
  private createDefaultWorkingDirectory(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
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

  /**
   * Prepare and validate the working directory
   */
  private async prepareWorkingDirectory(
    elicitedData: ConversionElicitationData | CreationElicitationData
  ): Promise<CommandResult | string> {
    const sessionManager = SessionManager.getInstance();
    let workingDirectory: string;

    if (elicitedData.workingDirectory) {
      workingDirectory = InitValidator.normalizePath(elicitedData.workingDirectory);

      if (!fs.existsSync(workingDirectory)) {
        try {
          fs.mkdirSync(workingDirectory, { recursive: true });
          logger.info(`Created working directory: ${workingDirectory}`);
        } catch (error) {
          return CommandResultFactory.error(
            `Failed to create working directory ${workingDirectory}: ${CommandResultFactory.normalizeError(error).message}`
          );
        }
      }

      const appCheck = await FluentAppValidator.checkFluentAppExists(workingDirectory);
      if (appCheck.hasApp) {
        sessionManager.setWorkingDirectory(workingDirectory);
        return CommandResultFactory.success(
          `The directory ${workingDirectory} already contains a Fluent (ServiceNow SDK) application.\n` +
          `Package name: ${appCheck.packageName}\nScope name: ${appCheck.scopeName}\n` +
          'This directory has been saved as your working directory for future commands.'
        );
      }

      if (appCheck.errorMessage) {
        return CommandResultFactory.error(appCheck.errorMessage);
      }
    } else {
      try {
        workingDirectory = this.createDefaultWorkingDirectory();
      } catch (error) {
        return CommandResultFactory.fromError(error);
      }
    }

    sessionManager.setWorkingDirectory(workingDirectory);
    return workingDirectory;
  }

  /**
   * Get the auth alias from session or from the provided data
   */
  private getAuthAlias(providedAuth?: string): string | undefined {
    if (providedAuth) {
      return providedAuth;
    }
    const sessionAuth = SessionManager.getInstance().getAuthAlias();
    if (sessionAuth) {
      logger.debug(`Auto-injecting auth alias from session: ${sessionAuth}`);
    }
    return sessionAuth;
  }

  /**
   * Build SDK arguments for conversion
   */
  private buildConversionArgs(data: ConversionElicitationData): string[] {
    const sdkArgs = ['-y', '@servicenow/sdk', 'init'];
    sdkArgs.push('--from', data.from);
    const auth = this.getAuthAlias(data.auth);
    if (auth) sdkArgs.push('--auth', auth);
    if (data.debug) sdkArgs.push('--debug');
    return sdkArgs;
  }

  /**
   * Build SDK arguments for creation
   */
  private buildCreationArgs(data: CreationElicitationData): string[] {
    const sdkArgs = ['-y', '@servicenow/sdk', 'init'];

    const appNameArg = typeof data.appName === 'string' && !/^".*"$/.test(data.appName)
      ? `"${data.appName}"`
      : data.appName;

    sdkArgs.push('--appName', appNameArg);
    sdkArgs.push('--packageName', data.packageName);
    sdkArgs.push('--scopeName', data.scopeName);
    if (data.template) sdkArgs.push('--template', data.template);
    const auth = this.getAuthAlias(data.auth);
    if (auth) sdkArgs.push('--auth', auth);
    if (data.debug) sdkArgs.push('--debug');

    return sdkArgs;
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      // Step 1: Determine user intent
      let intent = this.elicitator.determineIntent(args);

      if (!intent) {
        intent = await this.elicitator.elicitIntent();
      }

      // Step 2: Elicit and validate data based on intent
      let elicitedData: ConversionElicitationData | CreationElicitationData;

      if (intent === 'conversion') {
        elicitedData = await this.elicitator.elicitConversionData(args);

        // Validate 'from' parameter
        const validation = await InitValidator.validateFromParameter(elicitedData.from);
        if (!validation.valid) {
          return CommandResultFactory.error(`Invalid 'from' parameter: ${validation.error}`);
        }
      } else {
        elicitedData = await this.elicitator.elicitCreationData(args);

        // Validate creation parameters
        const validation = await InitValidator.validateCreationParameters(elicitedData as CreationElicitationData);
        if (!validation.valid) {
          return CommandResultFactory.error(`Invalid parameters: ${validation.errors.join(', ')}`);
        }
      }

      // Step 3: Handle working directory
      const workingDirResult = await this.prepareWorkingDirectory(elicitedData);

      // If prepareWorkingDirectory returned a CommandResult, return it (app already exists or error)
      if (typeof workingDirResult !== 'string') {
        return workingDirResult;
      }

      const workingDirectory = workingDirResult;

      // Step 4: Build and execute SDK command
      const sdkArgs = intent === 'conversion'
        ? this.buildConversionArgs(elicitedData as ConversionElicitationData)
        : this.buildCreationArgs(elicitedData as CreationElicitationData);

      const result = await this.commandProcessor.process('npx', sdkArgs, false, workingDirectory);
      logger.info(`Executed init command in directory: ${workingDirectory} - ${JSON.stringify(result)}`);

      if (result.success) {
        result.output += `\n\nThis directory (${workingDirectory}) has been saved as your working directory for future commands.`;
      }

      return result;

    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }
}
