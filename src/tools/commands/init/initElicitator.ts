/**
 * Elicitator for InitCommand
 * Handles MCP elicitation for gathering user input
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  ConversionElicitationData,
  CreationElicitationData,
  InitIntent,
  VALID_TEMPLATES,
} from './types.js';

// Zod schemas for validating elicitation responses
const IntentResponseSchema = z.object({
  intent: z.enum(['conversion', 'creation']),
});

const ConversionResponseSchema = z.object({
  from: z.string().min(1, 'from is required'),
  workingDirectory: z.string().min(1, 'workingDirectory is required'),
  auth: z.string().optional(),
});

const CreationResponseSchema = z.object({
  appName: z.string().min(1, 'appName is required').optional(),
  packageName: z.string().min(1, 'packageName is required').optional(),
  scopeName: z.string().min(1, 'scopeName is required').optional(),
  workingDirectory: z.string().min(1, 'workingDirectory is required').optional(),
  template: z.enum(VALID_TEMPLATES).optional(),
});

/**
 * Elicitator class for InitCommand
 * Single Responsibility: Handles MCP elicitation for gathering user input
 */
export class InitElicitator {
  constructor(private mcpServer?: McpServer) {}

  /**
   * Set the MCP server for elicitation
   */
  setMcpServer(mcpServer: McpServer): void {
    this.mcpServer = mcpServer;
  }

  /**
   * Check if MCP server is available for elicitation
   */
  private ensureMcpServer(): McpServer {
    if (!this.mcpServer) {
      throw new Error('MCP server not available for elicitation');
    }
    return this.mcpServer;
  }

  /**
   * Determine user intent based on provided arguments
   */
  determineIntent(args: Record<string, unknown>): InitIntent | null {
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
   * Elicit intent from user when it cannot be determined from arguments
   */
  async elicitIntent(): Promise<InitIntent> {
    const server = this.ensureMcpServer();

    const result = await server.server.elicitInput({
      message: 'Please specify your intent for the init command',
      requestedSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: ['conversion', 'creation'],
            title: 'Intent',
            description: 'Choose your intent: conversion (convert existing app) or creation (create new app)',
          },
        },
        required: ['intent'],
      },
    });

    if (result.action !== 'accept' || !result.content) {
      throw new Error('Intent selection is required');
    }

    // Validate response with zod schema
    const parsed = IntentResponseSchema.safeParse(result.content);
    if (!parsed.success) {
      throw new Error(`Invalid intent response: ${parsed.error.issues.map(e => e.message).join(', ')}`);
    }

    return parsed.data.intent;
  }

  /**
   * Elicit data for conversion use case
   */
  async elicitConversionData(args: Record<string, unknown>): Promise<ConversionElicitationData> {
    // Check if we already have all required parameters
    if (args.from && args.workingDirectory) {
      return {
        from: args.from as string,
        workingDirectory: args.workingDirectory as string,
        auth: args.auth as string,
        debug: args.debug as boolean,
      };
    }

    const server = this.ensureMcpServer();

    const result = await server.server.elicitInput({
      message:
        'Please provide the required parameters for converting an existing ServiceNow application to Fluent',
      requestedSchema: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            title: 'From',
            description:
              'Source for conversion: either a ServiceNow sys_id (32-character hex string) or a local directory path containing a ServiceNow application',
          },
          workingDirectory: {
            type: 'string',
            title: 'Working Directory',
            description:
              'Local directory path where the Fluent application will be created. Must be an empty directory with no package.json or now.config.json files.',
          },
          auth: {
            type: 'string',
            title: 'Authentication Profile',
            description: 'ServiceNow authentication profile name (optional)',
          },
        },
        required: ['from', 'workingDirectory'],
      },
    });

    if (result.action !== 'accept' || !result.content) {
      throw new Error('From and workingDirectory parameters are required for conversion');
    }

    // Validate response with zod schema
    const parsed = ConversionResponseSchema.safeParse(result.content);
    if (!parsed.success) {
      throw new Error(`Invalid conversion response: ${parsed.error.issues.map(e => e.message).join(', ')}`);
    }

    // Build the data object with current args and elicited data
    return {
      from: (args.from as string) || parsed.data.from,
      workingDirectory: (args.workingDirectory as string) || parsed.data.workingDirectory,
      auth: (args.auth as string) || parsed.data.auth,
      debug: args.debug as boolean,
    };
  }

  /**
   * Elicit data for creation use case
   */
  async elicitCreationData(args: Record<string, unknown>): Promise<CreationElicitationData> {
    const data: Partial<CreationElicitationData> = {
      appName: args.appName as string,
      packageName: args.packageName as string,
      scopeName: args.scopeName as string,
      template: args.template as string,
      auth: args.auth as string,
      workingDirectory: args.workingDirectory as string,
      debug: args.debug as boolean,
    };

    // Check if we need to elicit any missing required parameters
    const missingParams = [];
    if (!data.appName) missingParams.push('appName');
    if (!data.packageName) missingParams.push('packageName');
    if (!data.scopeName) missingParams.push('scopeName');
    if (!data.workingDirectory) missingParams.push('workingDirectory');
    if (!data.template) missingParams.push('template');

    if (missingParams.length > 0) {
      if (!this.mcpServer) {
        throw new Error(
          `Required parameters for creation are missing: ${missingParams.join(', ')}. MCP server not available for elicitation.`
        );
      }

      const server = this.mcpServer;

      const result = await server.server.elicitInput({
        message: `Please provide the missing required parameters for creating a new ServiceNow application: ${missingParams.join(', ')}`,
        requestedSchema: {
          type: 'object',
          properties: {
            appName: {
              type: 'string',
              title: 'Application Name',
              description: 'The display name of the ServiceNow application',
            },
            packageName: {
              type: 'string',
              title: 'Package Name',
              description: 'The technical package name (used for file naming and references)',
            },
            scopeName: {
              type: 'string',
              title: 'Scope Name',
              description: 'The ServiceNow scope name (must start with "x_" prefix)',
            },
            workingDirectory: {
              type: 'string',
              title: 'Working Directory',
              description:
                'Local directory path where the Fluent application will be created. Must be an empty directory with no package.json or now.config.json files.',
            },
            template: {
              type: 'string',
              title: 'Template',
              description: 'The application template to use',
              enum: [...VALID_TEMPLATES],
            },
          },
          required: missingParams,
        },
      });

      if (result.action !== 'accept' || !result.content) {
        throw new Error('Required parameters for creation are missing');
      }

      // Validate response with zod schema
      const parsed = CreationResponseSchema.safeParse(result.content);
      if (!parsed.success) {
        throw new Error(`Invalid creation response: ${parsed.error.issues.map(e => e.message).join(', ')}`);
      }

      // Apply elicited data from validated response
      if (parsed.data.appName) data.appName = parsed.data.appName;
      if (parsed.data.packageName) data.packageName = parsed.data.packageName;
      if (parsed.data.scopeName) data.scopeName = parsed.data.scopeName;
      if (parsed.data.workingDirectory) data.workingDirectory = parsed.data.workingDirectory;
      if (parsed.data.template) data.template = parsed.data.template;
    }

    return data as CreationElicitationData;
  }
}
