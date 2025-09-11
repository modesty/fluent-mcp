import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CommandArgument, CommandProcessor, CommandResult } from '../../utils/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { BaseCLICommand } from './baseCommand.js';
import { FluentAppValidator } from '../../utils/fluentAppValidator.js';
import { SessionManager } from '../../utils/sessionManager.js';
import logger from '../../utils/logger.js';

/**
 * Elicitation data structures for init command
 */
interface ConversionElicitationData {
  from: string;
  workingDirectory: string;
  auth?: string;
  debug?: boolean;
}

interface CreationElicitationData {
  appName: string;
  packageName: string;
  scopeName: string;
  workingDirectory: string;
  template: string;
  auth?: string;
  debug?: boolean;
}

type InitIntent = 'conversion' | 'creation';

/**
 * Command to initialize a new ServiceNow application
 * Implements the init command with MCP elicitation for structured data collection
 */
export class InitCommand extends BaseCLICommand {
  name = 'init_fluent_app';
  description = 'Initialize a new ServiceNow custom application or convert a legacy ServiceNow application from an instance or directory within the current directory. Uses MCP elicitation to gather required parameters based on your intent.';
  private mcpServer?: McpServer;
  
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
      description: "Credential alias to use for authentication with instance. If not provided, the default authentication alias will be used. You can set up authentication using the 'manage_fluent_auth' tool.",
    },
    {
      name: 'workingDirectory',
      type: 'string',
      required: true,
      description: "The directory where the Fluent (ServiceNow SDK) application will be created. Must be an empty local directory with no package.json or now.config.json files.",
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
    this.mcpServer = mcpServer;
  }

  /**
   * Set the MCP server for this command
   * @param mcpServer The MCP server instance
   */
  setMcpServer(mcpServer: McpServer): void {
    this.mcpServer = mcpServer;
  }

  // Using FluentAppValidator.checkFluentAppExists() instead

  /**
   * Create a new directory with a timestamp in the user's home directory
   * @returns Path to the newly created directory
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
   * Determine user intent based on provided arguments
   */
  private determineIntent(args: Record<string, unknown>): InitIntent | null {
    // If intent is explicitly provided
    if (args.intent) {
      const intent = (args.intent as string).toLowerCase();
      if (intent === 'conversion' || intent === 'creation') {
        return intent as InitIntent;
      }
    }
    
    // If 'from' is provided, assume conversion
    if (args.from) {
      return 'conversion';
    }
    
    // If creation-specific args are provided, assume creation
    if (args.appName || args.packageName || args.scopeName) {
      return 'creation';
    }
    
    return null;
  }

  /**
   * Validate working directory - must be empty local directory with no package.json or now.config.json
   */
  private async validateWorkingDirectory(workingDirectory: string): Promise<{ valid: boolean; error?: string }> {
    // Normalize path
    let normalizedPath = workingDirectory;
    if (normalizedPath.startsWith('~/')) {
      normalizedPath = path.join(os.homedir(), normalizedPath.slice(2));
    }
    normalizedPath = path.resolve(normalizedPath);
    
    // Check if directory exists, create if it doesn't
    if (!fs.existsSync(normalizedPath)) {
      try {
        fs.mkdirSync(normalizedPath, { recursive: true });
        logger.info(`Created working directory: ${normalizedPath}`);
      } catch (error) {
        return {
          valid: false,
          error: `Failed to create working directory ${normalizedPath}: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // Check if it's a directory
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: `Working directory path is not a directory: ${normalizedPath}`
      };
    }
    
    // Check if directory is empty or only contains allowed files
    const files = fs.readdirSync(normalizedPath);
    const forbiddenFiles = ['package.json', 'now.config.json'];
    
    for (const file of files) {
      if (forbiddenFiles.includes(file)) {
        return {
          valid: false,
          error: `Working directory must not contain ${file}. Directory must be empty or only contain non-conflicting files.`
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * Validate 'from' parameter for conversion
   */
  private async validateFromParameter(from: string): Promise<{ valid: boolean; error?: string }> {
    // Check if it's a local file path
    if (from.includes('/') || from.includes('\\')) {
      // Normalize path
      let normalizedPath = from;
      if (normalizedPath.startsWith('~/')) {
        normalizedPath = path.join(os.homedir(), normalizedPath.slice(2));
      }
      normalizedPath = path.resolve(normalizedPath);
      
      if (!fs.existsSync(normalizedPath)) {
        return {
          valid: false,
          error: `Local path does not exist: ${normalizedPath}`
        };
      }
      
      // Check if it's a directory containing a ServiceNow app
      try {
        const appCheck = await FluentAppValidator.checkFluentAppExists(normalizedPath);
        if (!appCheck.hasApp && !appCheck.errorMessage) {
          return {
            valid: false,
            error: `Directory ${normalizedPath} does not contain a valid ServiceNow application`
          };
        }
      } catch (error) {
        return {
          valid: false,
          error: `Failed to validate directory: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    } else {
      // Assume it's a sys_id - basic validation (32 character hex string)
      const sysIdPattern = /^[a-f0-9]{32}$/i;
      if (!sysIdPattern.test(from)) {
        return {
          valid: false,
          error: 'sys_id must be a 32-character hexadecimal string'
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * Validate creation parameters
   */
  private async validateCreationParameters(data: CreationElicitationData): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!data.appName || data.appName.trim().length === 0) {
      errors.push('appName is required and cannot be empty');
    }
    
    if (!data.packageName || data.packageName.trim().length === 0) {
      errors.push('packageName is required and cannot be empty');
    }
    
    if (!data.scopeName || data.scopeName.trim().length === 0) {
      errors.push('scopeName is required and cannot be empty');
    } else {
      // Validate scopeName format
      if (!data.scopeName.startsWith('x_')) {
        errors.push('scopeName must start with "x_" prefix');
      }
      if (data.scopeName.length > 18) {
        errors.push('scopeName cannot be longer than 18 characters');
      }
      if (/\s/.test(data.scopeName)) {
        errors.push('scopeName cannot contain spaces');
      }
    }
    
    if (!data.workingDirectory || data.workingDirectory.trim().length === 0) {
      errors.push('workingDirectory is required and cannot be empty');
    } else {
      // Validate working directory
      const workingDirValidation = await this.validateWorkingDirectory(data.workingDirectory);
      if (!workingDirValidation.valid) {
        errors.push(workingDirValidation.error || 'Invalid working directory');
      }
    }
    
    if (!data.template || data.template.trim().length === 0) {
      errors.push('template is required and cannot be empty');
    } else {
      // Validate template value
      const validTemplates = ['base', 'javascript.react', 'typescript.basic', 'typescript.react', 'javascript.basic'];
      if (!validTemplates.includes(data.template)) {
        errors.push(`template must be one of: ${validTemplates.join(', ')}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Elicit data for conversion use case
   */
  private async elicitConversionData(args: Record<string, unknown>): Promise<ConversionElicitationData> {
    // Check if we already have all required parameters
    if (args.from && args.workingDirectory) {
      return {
        from: args.from as string,
        workingDirectory: args.workingDirectory as string,
        auth: args.auth as string,
        debug: args.debug as boolean
      };
    }

    if (!this.mcpServer) {
      throw new Error('Required parameters (from, workingDirectory) are missing but MCP server not available for elicitation');
    }

    const result = await this.mcpServer.server.elicitInput({
      message: 'Please provide the required parameters for converting an existing ServiceNow application to Fluent',
      requestedSchema: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            title: 'From',
            description: 'Source for conversion: either a ServiceNow sys_id (32-character hex string) or a local directory path containing a ServiceNow application'
          },
          workingDirectory: {
            type: 'string',
            title: 'Working Directory',
            description: 'Local directory path where the Fluent application will be created. Must be an empty directory with no package.json or now.config.json files.'
          },
          auth: {
            type: 'string',
            title: 'Authentication Profile',
            description: 'ServiceNow authentication profile name (optional)'
          }
        },
        required: ['from', 'workingDirectory']
      }
    });

    if (result.action !== 'accept' || !result.content?.from || !result.content?.workingDirectory) {
      throw new Error('From and workingDirectory parameters are required for conversion');
    }

    // Build the data object with current args and elicited data
    const data: Partial<ConversionElicitationData> = {
      from: args.from as string || result.content.from as string,
      workingDirectory: args.workingDirectory as string || result.content.workingDirectory as string,
      auth: args.auth as string || result.content.auth as string,
      debug: args.debug as boolean
    };
    
    return data as ConversionElicitationData;
  }

  /**
   * Elicit data for creation use case
   */
  private async elicitCreationData(args: Record<string, unknown>): Promise<CreationElicitationData> {
    const data: Partial<CreationElicitationData> = {};
    
    // Copy existing args
    data.appName = args.appName as string;
    data.packageName = args.packageName as string;
    data.scopeName = args.scopeName as string;
    data.template = args.template as string;
    data.auth = args.auth as string;
    data.workingDirectory = args.workingDirectory as string;
    data.debug = args.debug as boolean;
    
    // Check if we need to elicit any missing required parameters
    const missingParams = [];
    if (!data.appName) missingParams.push('appName');
    if (!data.packageName) missingParams.push('packageName');
    if (!data.scopeName) missingParams.push('scopeName');
    if (!data.workingDirectory) missingParams.push('workingDirectory');
    if (!data.template) missingParams.push('template');
    
    if (missingParams.length > 0) {
      if (!this.mcpServer) {
        throw new Error(`Required parameters for creation are missing: ${missingParams.join(', ')}. MCP server not available for elicitation.`);
      }

      const result = await this.mcpServer.server.elicitInput({
        message: `Please provide the missing required parameters for creating a new ServiceNow application: ${missingParams.join(', ')}`,
        requestedSchema: {
          type: 'object',
          properties: {
            appName: {
              type: 'string',
              title: 'Application Name',
              description: 'The display name of the ServiceNow application'
            },
            packageName: {
              type: 'string',
              title: 'Package Name',
              description: 'The technical package name (used for file naming and references)'
            },
            scopeName: {
              type: 'string',
              title: 'Scope Name',
              description: 'The ServiceNow scope name (must start with "x_" prefix)'
            },
            workingDirectory: {
              type: 'string',
              title: 'Working Directory',
              description: 'Local directory path where the Fluent application will be created. Must be an empty directory with no package.json or now.config.json files.'
            },
            template: {
              type: 'string',
              title: 'Template',
              description: 'The application template to use',
              enum: ['base', 'javascript.react', 'typescript.basic', 'typescript.react', 'javascript.basic']
            }
          },
          required: missingParams
        }
      });

      if (result.action !== 'accept' || !result.content) {
        throw new Error('Required parameters for creation are missing');
      }
      
      // Apply elicited data
      if (result.content.appName) data.appName = result.content.appName as string;
      if (result.content.packageName) data.packageName = result.content.packageName as string;
      if (result.content.scopeName) data.scopeName = result.content.scopeName as string;
      if (result.content.workingDirectory) data.workingDirectory = result.content.workingDirectory as string;
      if (result.content.template) data.template = result.content.template as string;
    }
    
    return data as CreationElicitationData;
  }

  /**
   * Elicit intent from user when it cannot be determined from arguments
   * @param args Current arguments
   * @returns Promise resolving to the selected intent
   */
  private async elicitIntent(args: Record<string, unknown>): Promise<InitIntent> {
    if (!this.mcpServer) {
      throw new Error('Intent selection is required but MCP server not available for elicitation');
    }

    const result = await this.mcpServer.server.elicitInput({
      message: 'Please specify your intent for the init command',
      requestedSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: ['conversion', 'creation'],
            title: 'Intent',
            description: 'Choose your intent: conversion (convert existing app) or creation (create new app)'
          }
        },
        required: ['intent']
      }
    });

    if (result.action !== 'accept' || !result.content?.intent) {
      throw new Error('Intent selection is required');
    }

    return result.content.intent as InitIntent;
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    try {
      // Step 1: Determine user intent
      let intent = this.determineIntent(args);
      
      if (!intent) {
        intent = await this.elicitIntent(args);
      }
      
      // Step 2: Elicit structured data based on intent
      let elicitedData: ConversionElicitationData | CreationElicitationData;
      
      if (intent === 'conversion') {
        elicitedData = await this.elicitConversionData(args);
        
        // Validate 'from' parameter
        const validation = await this.validateFromParameter(elicitedData.from);
        if (!validation.valid) {
          return {
            exitCode: 1,
            success: false,
            output: '',
            error: new Error(`Invalid 'from' parameter: ${validation.error}`)
          };
        }
      } else {
        elicitedData = await this.elicitCreationData(args);
        
        // Validate creation parameters
        const validation = await this.validateCreationParameters(elicitedData as CreationElicitationData);
        if (!validation.valid) {
          return {
            exitCode: 1,
            success: false,
            output: '',
            error: new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
          };
        }
      }
      
      // Step 3: Handle working directory logic
      const sessionManager = SessionManager.getInstance();
      let workingDirectory: string;
      
      if (elicitedData.workingDirectory) {
        let inputDir = elicitedData.workingDirectory;
        if (inputDir.startsWith('~/')) {
          inputDir = path.join(os.homedir(), inputDir.slice(2));
        }
        workingDirectory = path.resolve(inputDir);
        
        if (!fs.existsSync(workingDirectory)) {
          try {
            fs.mkdirSync(workingDirectory, { recursive: true });
            logger.info(`Created working directory: ${workingDirectory}`);
          } catch (error) {
            return {
              exitCode: 1,
              success: false,
              output: '',
              error: new Error(`Failed to create working directory ${workingDirectory}: ${error instanceof Error ? error.message : String(error)}`)
            };
          }
        }
        
        const appCheck = await FluentAppValidator.checkFluentAppExists(workingDirectory);
        if (appCheck.hasApp) {
          sessionManager.setWorkingDirectory(workingDirectory);
          return {
            exitCode: 0,
            success: true,
            output: `The directory ${workingDirectory} already contains a Fluent (ServiceNow SDK) application.\n` +
                   `Package name: ${appCheck.packageName}\nScope name: ${appCheck.scopeName}\n` +
                   'This directory has been saved as your working directory for future commands.',
            error: undefined
          };
        }
        
        if (appCheck.errorMessage) {
          return {
            exitCode: 1,
            success: false,
            output: '',
            error: new Error(appCheck.errorMessage)
          };
        }
      } else {
        try {
          workingDirectory = this.createDefaultWorkingDirectory();
        } catch (error) {
          return {
            exitCode: 1,
            success: false,
            output: '',
            error: error instanceof Error ? error : new Error(String(error))
          };
        }
      }
      
      sessionManager.setWorkingDirectory(workingDirectory);
      
      // Step 4: Build and execute SDK command
      const sdkArgs = ['-y', '@servicenow/sdk', 'init'];
      
      if (intent === 'conversion') {
        const conversionData = elicitedData as ConversionElicitationData;
        sdkArgs.push('--from', conversionData.from);
        if (conversionData.auth) sdkArgs.push('--auth', conversionData.auth);
      } else {
        const creationData = elicitedData as CreationElicitationData;
        const appNameArg = typeof creationData.appName === 'string' && !/^".*"$/.test(creationData.appName)
          ? `"${creationData.appName}"`
          : creationData.appName;
        sdkArgs.push('--appName', appNameArg);
        sdkArgs.push('--packageName', creationData.packageName);
        sdkArgs.push('--scopeName', creationData.scopeName);
        if (creationData.template) sdkArgs.push('--template', creationData.template);
        if (creationData.auth) sdkArgs.push('--auth', creationData.auth);
      }
      
      if (elicitedData.debug) {
        sdkArgs.push('--debug');
      }
      
      // Execute the command
      const result = await this.commandProcessor.process('npx', sdkArgs, false, workingDirectory);
      logger.info(`Executed init command in directory: ${workingDirectory} - ${JSON.stringify(result)}`);
      
      if (result.success) {
        result.output += `\n\nThis directory (${workingDirectory}) has been saved as your working directory for future commands.`;
      }
      
      return result;
      
    } catch (error) {
      return {
        exitCode: 1,
        success: false,
        output: '',
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
