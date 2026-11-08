import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CommandArgument, CommandResult, CommandResultFactory, MAX_TIMER_DELAY_MS, isRunnerStoppedExit } from '../../utils/types.js';
import { ENVELOPE_RUN_OPTIONS, shapeEnvelopeResult } from '../../utils/jsonSelect.js';
import { parseCliEnvelope } from '../../utils/cliEnvelope.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { cliOption } from './cliArgv.js';
import { getProjectRootPath } from '../../config.js';
import { SELECT_PATH_DOMAIN, assertPositiveInteger } from './argValidation.js';
import type { ArgumentDomain } from '../../utils/types.js';
import { CONTROL_CHARACTERS_EXCEPT_LINE_FORMATTING } from '../toolSchema.js';
import { DEBUG_ARGUMENT } from './baseCommand.js';
import { CLI_REPORT_HEADROOM_MS } from './responseTimeout.js';
import { isWithinDirectory } from '../../utils/projectDirectory.js';

/** `now-sdk exec --timeout` default, in milliseconds (SDK v4.14.0 `exec/index.js` DEFAULT_TIMEOUT_MS). */
const CLI_DEFAULT_TIMEOUT_MS = 300_000;

/**
 * Upper bound on the script length. The script reaches the CLI as one argv
 * entry, and Windows caps a whole command line at 32,767 characters; anything
 * longer belongs in a Script Include or a Fluent module deployed with the app.
 */
const MAX_SCRIPT_LENGTH = 16_000;

/**
 * Upper bound on a `file` script, in bytes. The file's full content is echoed in
 * the tool result as a record of what ran, so it must stay a reviewable size.
 */
const MAX_FILE_BYTES = 64 * 1024;

/**
 * `--scope` accepts `global`, an application scope name, or an application
 * sys_id. The CLI resolves the value against the instance and fails on an
 * unknown one instead of falling back to global.
 */
const SCOPE_DOMAIN: ArgumentDomain = {
  kind: 'pattern',
  regex: /^(?:[a-z][a-z0-9_]*|[0-9a-f]{32})$/,
  expected: '"global", an application scope name (lowercase letters, digits, and "_", e.g. "x_acme_app"), ' +
    'or a 32-character application sys_id',
};

/** A script file resolved inside the project, as it will be run. */
interface ScriptFile {
  /** Path relative to the project directory, for the provenance record. */
  relativePath: string;
  content: string;
  sha256: string;
}

/**
 * True when `output` is the result envelope of a script that ran and reported
 * errors (`ok: false` with an `errors` array). A run that never started (unknown
 * scope, auth, connection) fails with an `error` envelope instead.
 */
function isScriptErrorEnvelope(output: string): boolean {
  const envelope = parseCliEnvelope(output);
  return envelope?.ok === false && Array.isArray(envelope.errors);
}

/**
 * Command to run a server-side script on the authenticated instance, like the
 * Scripts - Background page (SDK v4.14.0+ `now-sdk exec`).
 *
 * The script runs with the authenticated user's full permissions (the instance
 * requires the admin role), so the tool is annotated destructive and
 * non-idempotent. To keep every run deliberate and traceable:
 * - `scope` is required, so the CLI never falls back to the nearest
 *   `now.config.json` above the cwd (its default when `--scope` is absent);
 * - `reason` is required and recorded with the run;
 * - the script is passed inline, or as a `.js` `file` that must resolve (after
 *   symlinks) inside the Fluent project directory — never an arbitrary local
 *   path, which would upload any readable file to the instance — and never on
 *   stdin. A file is copied to a private temp file that the CLI reads, so the
 *   content and SHA-256 echoed in the result are exactly what ran;
 * - recording for rollback stays on (the CLI default) and cannot be disabled;
 * - output is always the JSON envelope, and `select` is applied by the tool to a
 *   successful run only, so a failure always shows whether the script ran.
 *
 * The CLI's `--timeout` only stops the client from waiting: the script keeps
 * running on the instance, so a timed-out or cancelled run is reported as
 * possibly still running and must never be retried automatically. A script
 * that ran and threw is flagged the same way: it may already have changed records.
 */
export class ExecScriptCommand extends SessionAwareCLICommand {
  name = 'fluent_exec_script';
  description = 'Run a server-side JavaScript script on the authenticated ServiceNow instance, like the Scripts - Background page (SDK v4.14.0+ `now-sdk exec`). The script runs with the authenticated user\'s full permissions and needs the admin role. BEFORE EVERY CALL: show the user the full script, the target instance, the scope, and the reason, and get their explicit approval for that run; approval of one script never covers another. With file, show the file\'s full CONTENT, not just its path, and do not edit the file between approval and the call; the result echoes the content and SHA-256 that actually ran. Prefer query_fluent_records for reads and the app\'s own metadata for anything that should ship with the app. The run is recorded in Script Execution History with a rollback context, but rollback only reverts record changes; emails, REST calls, events and scheduled jobs it triggers cannot be undone. A timeout or cancellation does NOT stop the script on the instance; never retry automatically, or a second copy runs. ok: false with an errors array means the script RAN and threw, possibly after changing records, so a retry runs it again; ok: false with error.message means it never ran (for example an unknown scope). Returns a JSON envelope with ok, output, errors, scope, executionHistoryId, and rollbackContextId (absent when no records changed or the history record is unreadable). Requires instance authentication (auto-injected from session, or pass auth explicitly).';
  annotations = { destructiveHint: true, idempotentHint: false, openWorldHint: true };
  timeoutMs = CLI_DEFAULT_TIMEOUT_MS + CLI_REPORT_HEADROOM_MS;
  arguments: CommandArgument[] = [
    {
      name: 'script',
      type: 'string',
      required: false,
      domain: { kind: 'multilineText' },
      description: `Server-side JavaScript to run inline (Glide APIs such as GlideRecord and gs are available); at most ${MAX_SCRIPT_LENGTH} characters, and it must not begin with "-". Provide exactly one of script or file.`,
    },
    {
      name: 'file',
      type: 'string',
      required: false,
      description: `Path to a .js script file inside the Fluent project, relative to the project directory (or absolute within it); at most ${MAX_FILE_BYTES / 1024} KB. Symlinks are resolved, and a path outside the project is rejected. Provide exactly one of script or file.`,
    },
    {
      ...WORKING_DIRECTORY_ARGUMENT,
      description: 'Absolute path to the Fluent project that contains file. Only used with file; overrides the initialized session and FLUENT_MCP_WORKING_DIR.',
    },
    {
      name: 'scope',
      type: 'string',
      required: true,
      domain: SCOPE_DOMAIN,
      description: 'Scope to run the script in: "global", an application scope name (e.g. "x_acme_app"), or a 32-character application sys_id. Must be installed on the instance; an unknown scope is an error, never a silent fallback to global.',
    },
    {
      name: 'reason',
      type: 'string',
      required: true,
      description: 'Why the script is being run (single line). Recorded with the script on its Script Execution History record.',
    },
    {
      name: 'timeoutMs',
      type: 'number',
      required: false,
      description: `Milliseconds to wait for the script's response (CLI default ${CLI_DEFAULT_TIMEOUT_MS}). Giving up does NOT cancel the script; it keeps running on the instance. Raising it also extends this tool's own process timeout.`,
    },
    {
      name: 'serverLogs',
      type: 'boolean',
      required: false,
      description: 'Include the instance\'s session log for the run (adds a log array to the envelope, including stack traces).',
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      domain: SELECT_PATH_DOMAIN,
      description: 'Dot/bracket path to extract from the envelope (e.g. "output[0]" or "executionHistoryId"). An unresolved path yields null rather than an error. Applied by this tool to a successful (ok: true) run only; a failed run returns the full envelope, so it always shows whether the script ran.',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    DEBUG_ARGUMENT,
  ];

  /**
   * Validate what the schema cannot express: exactly one of script or file, the
   * file extension, the script's length and first character, a non-empty reason,
   * and the timeout bound. The schema has already checked `scope` and `select`
   * against their domains, the script for control characters other than line
   * formatting, and `reason` and `file` for any control character (a newline in
   * `reason` would end the `// now-sdk exec:` comment the CLI writes it into).
   */
  protected validateArgs(args: Record<string, unknown>): void {
    const hasScript = args.script !== undefined && args.script !== null;
    const hasFile = args.file !== undefined && args.file !== null;
    if (hasScript === hasFile) {
      throw new Error("Provide exactly one of 'script' (inline JavaScript) or 'file' (a .js file inside the Fluent project).");
    }
    if (!hasFile && args.workingDirectory !== undefined && args.workingDirectory !== null) {
      throw new Error("Argument 'workingDirectory' is only used with 'file', to locate the project that contains it.");
    }

    super.validateArgs(args);

    if (hasFile) {
      const file = args.file as string;
      if (path.extname(file).toLowerCase() !== '.js') {
        throw new Error(`Argument 'file' must be a .js file. Received: "${file}".`);
      }
    } else {
      this.validateScriptText(args.script as string);
    }

    this.validateReasonTimeout(args);
  }

  /** The inline script: non-empty, bounded, not parseable as a CLI option. */
  private validateScriptText(script: string): void {
    if (script.trim() === '') {
      throw new Error("Argument 'script' must be a non-empty server-side script.");
    }
    if (script.length > MAX_SCRIPT_LENGTH) {
      throw new Error(
        `Argument 'script' is ${script.length} characters; the limit is ${MAX_SCRIPT_LENGTH}. ` +
        'Move longer logic into a Script Include or a Fluent server module deployed with the app, and call it from a short script.'
      );
    }
    if (script.startsWith('-')) {
      // A leading "-" would be parsed as a CLI option rather than the script positional.
      throw new Error("Argument 'script' must not begin with \"-\". Start it with a statement or a comment.");
    }
  }

  private validateReasonTimeout(args: Record<string, unknown>): void {
    if ((args.reason as string).trim() === '') {
      throw new Error("Argument 'reason' must not be empty. State why the script is being run.");
    }

    if (args.timeoutMs !== undefined && args.timeoutMs !== null) {
      const timeoutMs = assertPositiveInteger(args.timeoutMs, 'timeoutMs');
      // The CLI's own maximum (`exec/index.js` MAX_TIMEOUT_MS) is the timer limit.
      if (timeoutMs > MAX_TIMER_DELAY_MS) {
        throw new Error(`Argument 'timeoutMs' must be at most ${MAX_TIMER_DELAY_MS}. Received: ${timeoutMs}.`);
      }
    }
  }

  /**
   * Resolve `file` inside the Fluent project and read it once. The project
   * directory and the file are both resolved through symlinks before the
   * containment check, so neither a `..` path nor a link can reach outside it.
   * @throws Error naming the exact problem (no project, outside it, not a file, too large, empty)
   */
  private readScriptFile(args: Record<string, unknown>): ScriptFile {
    const projectDir = this.getWorkingDirectory(args.workingDirectory);
    if (!projectDir) {
      throw new Error(
        "Argument 'file' needs a Fluent project directory to resolve against. Pass 'workingDirectory', " +
        'initialize a session with init_fluent_app, or set FLUENT_MCP_WORKING_DIR.'
      );
    }
    const realProject = fs.realpathSync(projectDir);
    const requested = path.resolve(realProject, String(args.file));
    let realFile: string;
    try {
      realFile = fs.realpathSync(requested);
    } catch {
      throw new Error(`Script file not found: ${requested}`);
    }
    if (realFile === realProject || !isWithinDirectory(realProject, realFile)) {
      throw new Error(`Script file must be inside the Fluent project ${realProject}; "${String(args.file)}" resolves to ${realFile}.`);
    }
    const stat = fs.statSync(realFile);
    if (!stat.isFile()) {
      throw new Error(`Script file is not a regular file: ${realFile}`);
    }
    if (stat.size > MAX_FILE_BYTES) {
      throw new Error(
        `Script file is ${stat.size} bytes; the limit is ${MAX_FILE_BYTES}. ` +
        'Move longer logic into a Script Include or a Fluent server module deployed with the app, and call it from a short script.'
      );
    }
    const content = fs.readFileSync(realFile, 'utf-8').replace(/^\uFEFF/, '');
    if (content.trim() === '') {
      throw new Error(`Script file is empty: ${realFile}`);
    }
    if (CONTROL_CHARACTERS_EXCEPT_LINE_FORMATTING.test(content)) {
      throw new Error('Script file contains control characters other than newline, carriage return, and tab.');
    }
    return {
      relativePath: path.relative(realProject, realFile),
      content,
      sha256: createHash('sha256').update(content, 'utf-8').digest('hex'),
    };
  }

  /** The runner budget: the static default, extended past a caller-raised CLI wait. */
  protected resolveTimeoutMs(args: Record<string, unknown>): number {
    return typeof args.timeoutMs === 'number'
      ? Math.max(this.timeoutMs, args.timeoutMs + CLI_REPORT_HEADROOM_MS)
      : this.timeoutMs;
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    try {
      this.validateArgs(args);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    // Local checks first: a file outside the project is rejected before any auth
    // lookup (lazy validation can spawn the CLI) or instance contact.
    let scriptFile: ScriptFile | undefined;
    try {
      scriptFile = args.file !== undefined && args.file !== null ? this.readScriptFile(args) : undefined;
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    // The script runs on a live instance, so authentication is required.
    const providedAuth = typeof args.auth === 'string' ? args.auth : undefined;
    const resolvedAuth = await this.resolveAuthAlias(providedAuth);
    if (!resolvedAuth) {
      return this.missingAuthResult();
    }

    if (!scriptFile) {
      // Inline: one literal argv entry on the shell-free runner. Passing a script
      // positionally (or by file) keeps the CLI from waiting on the runner's open stdin.
      return this.runExec(args, resolvedAuth, [String(args.script)], undefined, signal);
    }

    // A file is run from a private copy, so a later edit to the project file cannot
    // change what runs after its content was read, hashed, and reported.
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-exec-'));
    try {
      const scriptSource = [cliOption('--file', this.writePrivateCopy(tempDir, scriptFile.content))];
      return await this.runExec(args, resolvedAuth, scriptSource, scriptFile, signal);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  /** Write the script to an owner-only file in a fresh private directory. */
  private writePrivateCopy(tempDir: string, content: string): string {
    const copy = path.join(tempDir, 'script.js');
    fs.writeFileSync(copy, content, { encoding: 'utf-8', mode: 0o600 });
    return copy;
  }

  private async runExec(
    args: Record<string, unknown>,
    resolvedAuth: string,
    scriptSource: string[],
    scriptFile: ScriptFile | undefined,
    signal?: AbortSignal
  ): Promise<CommandResult> {
    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs: string[] = [
      ...baseArgs,
      'exec',
      ...scriptSource,
      cliOption('--scope', args.scope),
      cliOption('--reason', args.reason),
    ];
    if (args.timeoutMs !== undefined && args.timeoutMs !== null) {
      sdkArgs.push(cliOption('--timeout', args.timeoutMs));
    }
    if (args.serverLogs) sdkArgs.push('--server-logs');
    sdkArgs.push(cliOption('--auth', resolvedAuth));
    // `select` is applied here, not forwarded as --select (see jsonSelect).
    sdkArgs.push(cliOption('--output', 'json'));
    this.appendCommonFlags(sdkArgs, args);

    // With an explicit --scope the CLI reads nothing from the current directory,
    // so the installed package directory is a neutral cwd for the bundled CLI.
    // Stdout is captured whole, so the envelope parses even for a chatty script;
    // the notices read the captured envelope, the result returns it bounded.
    const captured = await this.commandProcessor.process(
      command,
      sdkArgs,
      getProjectRootPath(),
      this.resolveTimeoutMs(args),
      signal,
      ENVELOPE_RUN_OPTIONS
    );
    const result = shapeEnvelopeResult(captured, args.select);

    let output = result.output;
    if (isRunnerStoppedExit(captured.exitCode)) {
      output +=
        '\n\nThe script may still be running on the instance: stopping this tool does not cancel it. ' +
        'Do not retry automatically; check its Script Execution History record (sys_script_execution_history) on the instance first.';
    } else if (!captured.success && isScriptErrorEnvelope(captured.output)) {
      output +=
        '\n\nThe script ran on the instance and reported errors; record changes it made before failing are kept unless rolled back ' +
        'from its Script Execution History record. Do not retry automatically: a retry runs the script again.';
    } else if (!captured.success && captured.outputTruncated) {
      output +=
        '\n\nThe output was too large to read in full, so whether the script ran could not be confirmed; a run that never ' +
        'started prints only a short message, so it most likely ran. Do not retry automatically; check its Script Execution ' +
        'History record (sys_script_execution_history) on the instance first.';
    }
    if (scriptFile) {
      output +=
        `\n\nScript run from file ${scriptFile.relativePath} ` +
        `(sha256 ${scriptFile.sha256}, ${Buffer.byteLength(scriptFile.content, 'utf-8')} bytes):\n` +
        `\`\`\`javascript\n${scriptFile.content}${scriptFile.content.endsWith('\n') ? '' : '\n'}\`\`\``;
    }
    return output === result.output ? result : { ...result, output };
  }
}
