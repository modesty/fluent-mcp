import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { CLICommand, CommandArgument, CommandResult, ProcessResult, ProcessRunner } from "../utils/types";

// Infrastructure Layer
export class NodeProcessRunner implements ProcessRunner {
  async run(command: string, args: string[] = []): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// Application Layer
export class CLIExecutor {
  constructor(private processRunner: ProcessRunner) {}

  async execute(command: string, args: string[]): Promise<CommandResult> {
    try {
      const result = await this.processRunner.run(command, args);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr ? new Error(result.stderr) : undefined,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error : new Error(String(error)),
        exitCode: 1,
      };
    }
  }
}

// Domain Layer - Base Command (Open/Closed Principle)
abstract class BaseCLICommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract arguments: CommandArgument[];

  constructor(protected cliExecutor: CLIExecutor) {}

  abstract execute(args: Record<string, unknown>): Promise<CommandResult>;

  // Template method for common validation
  protected validateArgs(args: Record<string, unknown>): void {
    for (const arg of this.arguments) {
      if (arg.required && !(arg.name in args)) {
        throw new Error(`Required argument '${arg.name}' is missing`);
      }
    }
  }
}

// Application Services
export class CommandRegistry {
  private commands: Map<string, CLICommand> = new Map();

  register(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  // Convert to MCP Tool format
  toMCPTools(): Tool[] {
    return this.getAllCommands().map(command => ({
      name: command.name,
      description: command.description,
      inputSchema: {
        type: 'object',
        properties: command.arguments.reduce((props, arg) => {
          props[arg.name] = {
            type: arg.type === 'array' ? 'array' : arg.type,
            description: arg.description,
          };
          return props;
        }, {} as Record<string, any>),
        required: command.arguments
          .filter(arg => arg.required)
          .map(arg => arg.name),
      },
    }));
  }
}

// Concrete Commands
class VersionCommand extends BaseCLICommand {
  name = 'get_fluent_version';
  description = 'Get Fluent (ServiceNow SDK) version information';
  arguments: CommandArgument[] = [];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    return await this.cliExecutor.execute('npx', ['now-sdk', '--version']);
  }
}

// Factory Pattern for Command Creation
export class CommandFactory {
  static createCommands(cliExecutor: CLIExecutor): CLICommand[] {
    return [
      new VersionCommand(cliExecutor)
    ];
  }
}
