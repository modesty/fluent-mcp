import { spawn, SpawnOptionsWithoutStdio } from "node:child_process";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  CLICommand,
  CommandResult,
  ProcessResult,
  ProcessRunner,
} from "../utils/types";
import { getProjectRootPath } from "../config.js";
import {
  VersionCommand,
  HelpCommand,
  DebugCommand,
  UpgradeCommand,
  AuthCommand,
  InitCommand,
  BuildCommand,
  InstallCommand,
  TransformCommand,
  DependenciesCommand,
} from "./commands/index.js";
import logger from "../utils/logger.js";

// Infrastructure Layer
export class NodeProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: string[] = [],
    cwd?: string
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env }; // ensure full environment inheritance
      const options: SpawnOptionsWithoutStdio = {
        stdio: "pipe",
        shell: true,
        cwd,
        env
      };
      logger.info(`Spawning child process: ${command} ${args.join(" ")}`, { cwd });

      const child = spawn(command, args, options);

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code: number | null) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      child.on("error", (error: Error) => {
        reject(error);
      });
    });
  }
}

// Application Layer
export class CLIExecutor {
  private mcpCwd: string | undefined;

  constructor(private processRunner: ProcessRunner) {}

  /**
   * Gets the MCP root directory path (calculated once and cached)
   * @returns The absolute path to the MCP root directory
   */
  private getMcpCwd(): string {
    if (!this.mcpCwd) {
      // Use the utility function that returns the project root path
      this.mcpCwd = getProjectRootPath();
    }

    return this.mcpCwd;
  }

  async execute(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): Promise<CommandResult> {
    try {
      let cwd = customWorkingDir;
      if (!cwd && useMcpCwd) {
        cwd = this.getMcpCwd();
      }
      
      // Better logging with clear working directory information
      logger.info(`Executing command: ${command} ${args.join(" ")}`, process.env);
      
      // Sanity check on working directory - warn if it's the system root
      if (cwd === "/" || cwd === "\\") {
        logger.warn(`WARNING: Command executing with system root (/) as working directory!`);
      }
      
      const result = await this.processRunner.run(command, args, cwd);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr ? new Error(result.stderr) : undefined,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error : new Error(String(error)),
        exitCode: 1,
      };
    }
  }
}

// Domain Layer - Base Command has been moved to ./commands/baseCommand.ts

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
    return this.getAllCommands().map((command) => ({
      name: command.name,
      description: command.description,
      inputSchema: {
        type: "object",
        properties: command.arguments.reduce(
          (props, arg) => {
            props[arg.name] = {
              type: arg.type === "array" ? "array" : arg.type,
              description: arg.description,
            };
            return props;
          },
          {} as Record<string, any>
        ),
        required: command.arguments
          .filter((arg) => arg.required)
          .map((arg) => arg.name),
      },
    }));
  }
}

// Concrete Commands have been moved to individual files in ./commands/ directory

// Factory Pattern for Command Creation
export class CommandFactory {
  /**
   * Creates all CLI command instances
   * @param cliExecutor The CLI executor to use for command execution
   * @returns An array of command instances
   */
  static createCommands(cliExecutor: CLIExecutor): CLICommand[] {
    return [
      new VersionCommand(cliExecutor),
      new HelpCommand(cliExecutor),
      new DebugCommand(cliExecutor),
      new UpgradeCommand(cliExecutor),
      new AuthCommand(cliExecutor),
      new InitCommand(cliExecutor),
      new BuildCommand(cliExecutor),
      new InstallCommand(cliExecutor),
      new TransformCommand(cliExecutor),
      new DependenciesCommand(cliExecutor),
    ];
  }
}
