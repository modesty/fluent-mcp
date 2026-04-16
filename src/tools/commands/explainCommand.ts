import fs from 'node:fs/promises';
import path from 'node:path';
import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';
import { getProjectRootPath } from '../../config.js';
import logger from '../../utils/logger.js';

/**
 * Command to display documentation for a Fluent API
 * Wraps: now-sdk explain <api> [source]
 *
 * Extends SessionAwareCLICommand (rather than BaseCLICommand) because it reuses
 * `executeSdkCommand` and `getWorkingDirectory` for the common case where a valid
 * Fluent project is available. When no project exists, the command falls back to a
 * lightweight scaffold directory, so it never surfaces the "no working directory"
 * error from `executeWithSessionWorkingDirectory`.
 *
 * When no valid Fluent project is available, automatically creates a minimal
 * scaffold directory (now.config.json + package.json + symlinked node_modules)
 * so the SDK can locate its API documentation.
 */
export class ExplainCommand extends SessionAwareCLICommand {
  name = 'explain_fluent_api';
  description = 'Display documentation for a Fluent API by name (e.g., "BusinessRule", "Acl", "ScriptInclude"). Returns the API reference for the specified Fluent class. This is a read-only lookup that does NOT require authentication. Use get-api-spec for metadata type specifications, or get-snippet for code examples.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  timeoutMs = 15_000;
  arguments: CommandArgument[] = [
    {
      name: 'api',
      type: 'string',
      required: true,
      description: 'Fluent API name to look up (e.g., BusinessRule, Acl, ScriptInclude, Table)',
    },
    {
      name: 'source',
      type: 'string',
      required: false,
      description: 'Path to a Fluent project directory that contains package.json and now.config.json. If omitted, auto-resolves from session or creates a lightweight scaffold.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  /** Cached path to the scaffold directory, reused across invocations */
  private static cachedScaffoldDir: string | undefined;

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    // If source is explicitly provided, use it directly
    if (args.source) {
      return this.executeSdkCommand(
        'explain',
        args,
        { source: '--source' },
        [args.api as string]
      );
    }

    // Check if the resolved working directory is a valid Fluent project
    const workingDir = this.getWorkingDirectory();
    if (workingDir && await this.isFluentProject(workingDir)) {
      return this.executeSdkCommand(
        'explain',
        args,
        { source: '--source' },
        [args.api as string]
      );
    }

    // No valid project available — use a lightweight scaffold
    const scaffoldDir = await this.ensureScaffoldDir();
    if (!scaffoldDir) {
      return CommandResultFactory.error(
        'Failed to create scaffold directory for explain command. ' +
        'Provide a source path to a Fluent project directory, or run init_fluent_app first.'
      );
    }

    return this.executeSdkCommand(
      'explain',
      { ...args, source: scaffoldDir },
      { source: '--source' },
      [args.api as string]
    );
  }

  /**
   * Check if a directory is a valid Fluent application project.
   * Requires now.config.json — the canonical marker for a Fluent app.
   * Having @servicenow/sdk in package.json alone is NOT sufficient because
   * tools that wrap the SDK (like this MCP server) also have it as a dependency.
   */
  private async isFluentProject(dir: string): Promise<boolean> {
    try {
      await fs.access(path.join(dir, 'now.config.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a minimal scaffold directory exists for running explain.
   * Creates now.config.json + package.json and symlinks node_modules
   * from the MCP server's project root. Cached across invocations.
   */
  private async ensureScaffoldDir(): Promise<string | undefined> {
    // Return cached path if scaffold is still valid (config + node_modules symlink)
    if (ExplainCommand.cachedScaffoldDir) {
      try {
        await fs.access(path.join(ExplainCommand.cachedScaffoldDir, 'now.config.json'));
        await fs.access(path.join(ExplainCommand.cachedScaffoldDir, 'node_modules'));
        return ExplainCommand.cachedScaffoldDir;
      } catch { /* cache stale, recreate */ }
    }

    try {
      const projectRoot = getProjectRootPath();
      const scaffoldDir = path.join(projectRoot, '.explain-scaffold');

      await fs.mkdir(scaffoldDir, { recursive: true });

      // Minimal now.config.json that passes SDK validation
      const nowConfig = path.join(scaffoldDir, 'now.config.json');
      try {
        await fs.access(nowConfig);
      } catch {
        await fs.writeFile(nowConfig, JSON.stringify({
          scope: 'x_explain_scaffold',
          scopeId: 'a0000000000000000000000000000000',
          name: 'explain-scaffold',
        }));
      }

      // Minimal package.json
      const pkgJson = path.join(scaffoldDir, 'package.json');
      try {
        await fs.access(pkgJson);
      } catch {
        await fs.writeFile(pkgJson, JSON.stringify({
          name: 'explain-scaffold',
          private: true,
          dependencies: { '@servicenow/sdk': '*' },
        }));
      }

      // Symlink node_modules from the MCP server project root
      const nodeModulesLink = path.join(scaffoldDir, 'node_modules');
      const sourceNodeModules = path.join(projectRoot, 'node_modules');
      try {
        await fs.access(nodeModulesLink);
      } catch {
        try {
          await fs.access(sourceNodeModules);
          await fs.symlink(sourceNodeModules, nodeModulesLink);
        } catch { /* source node_modules doesn't exist, skip */ }
      }

      ExplainCommand.cachedScaffoldDir = scaffoldDir;
      logger.debug(`Explain scaffold directory ready: ${scaffoldDir}`);
      return scaffoldDir;
    } catch (error) {
      logger.error('Failed to create explain scaffold directory',
        CommandResultFactory.normalizeError(error));
      return undefined;
    }
  }
}
