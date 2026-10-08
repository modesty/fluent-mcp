import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import {
  RESPONSE_TIMEOUT_ARGUMENT,
  runnerTimeoutForResponseTimeout,
  validateResponseTimeout,
} from './responseTimeout.js';

/**
 * Whether an argument will reach argv. Mirrors the flag map in
 * `executeSdkCommand`, which drops `undefined`, `null`, and `''`.
 */
const isSupplied = (value: unknown): boolean => value !== undefined && value !== null && value !== '';

/**
 * Command to transform files in a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 *
 * The CLI (`sdk-cli/dist/command/transform`) runs in one of three modes, and
 * its yargs `.check()`/`.conflicts()` rules decide which arguments combine:
 * - `from`: offline — local XML only, no credential (`--from` conflicts with `--auth`)
 * - `table` + `id`: one instance record fetched with its related records
 * - neither: the full application downloaded from the instance
 * `table` without `id` is a filter, not a fourth source: it narrows a local XML
 * transform to those tables and never downloads (the orchestrator's
 * `resolveTableTransformFiles` reads `from`, else the project directory).
 */
export class TransformCommand extends SessionAwareCLICommand {
  name = 'fluent_transform';
  description = 'Convert XML metadata into Fluent source code, or pull changes made on a ServiceNow instance back into the project\'s .now.ts files. Use from for local XML files/directories (offline; cannot be combined with auth or id). Omit from to pull the whole application from the instance (auth auto-injected from session, or pass auth). Use table with id (SDK v4.7.0+) to pull one record and its related records from the instance. table without id only filters local XML (from, or the project directory) to those tables and their descendants — it does not download, though the CLI still requires credentials when from is omitted. For a large full-application pull, raise timeoutSeconds (SDK v4.13.0+). Overwrites local changes to the records it updates.';
  // Writes/overwrites generated Fluent source in the working directory, so it can
  // clobber local edits — flag as destructive so clients confirm before running.
  annotations = { openWorldHint: true, destructiveHint: true };
  // A full-application instance transform downloads the whole app first. SDK
  // v4.13.0 moved that download onto a long-running dispatcher (3600 s idle
  // budget), so the old 180 s cap killed the child long before the CLI would
  // give up; timeoutSeconds extends it further.
  timeoutMs = 600_000;
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'from',
      type: 'string',
      required: false,
      description: 'Path to local XML file(s) or a directory to transform. Offline: no instance connection, so it cannot be combined with auth or id.',
    },
    {
      name: 'directory',
      type: 'string',
      required: false,
      description: 'Path to the directory that contains the project\'s package.json (defaults to the working directory)',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided). Not allowed with from.',
    },
    {
      name: 'table',
      type: 'string',
      required: false,
      description: 'Comma-separated table names (SDK v4.7.0+). With id: pull that record and its related records from the instance. Without id: transform only these tables and their descendants from local XML (from, or the project directory) — no download.',
    },
    {
      name: 'id',
      type: 'string',
      required: false,
      description: 'sys_id of one instance record to pull with its related records (SDK v4.7.0+). Requires table; not allowed with from.',
    },
    {
      name: 'force',
      type: 'boolean',
      required: false,
      description: 'Allow transforming a descendant table without its root table (table-based transform). Requires table; has no effect with id. CLI default false.',
    },
    {
      name: 'format',
      type: 'boolean',
      required: false,
      description: 'Format new and updated source code after transforming. CLI default true; pass false to skip formatting.',
    },
    {
      ...RESPONSE_TIMEOUT_ARGUMENT,
      description: `${RESPONSE_TIMEOUT_ARGUMENT.description} Only affects a full-application transform from the instance (no from, table, or id).`,
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  /**
   * Enforce the CLI's own combination rules up front, so the caller gets a
   * message naming the conflict instead of a yargs failure after spawn. Only
   * the rules that involve exposed arguments are mirrored: `from` conflicts
   * with `auth` and `id`; `id` and `force` each require `table`.
   */
  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(args);
    validateResponseTimeout(args);

    const hasFrom = isSupplied(args.from);
    if (hasFrom && isSupplied(args.auth)) {
      throw new Error(
        "Arguments 'from' and 'auth' cannot be combined: a from transform reads local XML and never connects to an instance. Omit auth, or omit from to pull from the instance."
      );
    }
    if (isSupplied(args.id) && !isSupplied(args.table)) {
      throw new Error("Argument 'id' requires 'table' — pass the record's table name with its sys_id.");
    }
    if (hasFrom && isSupplied(args.id)) {
      throw new Error(
        "Arguments 'from' and 'id' cannot be combined: id pulls a record from the instance. To narrow a local transform, use table without id."
      );
    }
    if (args.force === true && !isSupplied(args.table)) {
      throw new Error("Argument 'force' requires 'table' — it only relaxes the table-based transform's root-table check.");
    }
  }

  protected resolveTimeoutMs(args: Record<string, unknown>): number {
    return runnerTimeoutForResponseTimeout(this.timeoutMs, args.timeoutSeconds);
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    // A from transform is offline, so auth is left unmapped: that keeps lazy
    // auth discovery from running, and validateArgs has already rejected an
    // explicit alias the CLI would refuse. Every other mode needs a credential —
    // including table without id, which reads local XML but still goes through
    // the CLI's credential provider because only --from marks a run offline.
    const offline = isSupplied(args.from);

    return this.executeSdkCommand('transform', args, {
      from: '--from',
      directory: '--directory',
      ...(!offline && { auth: '--auth' }),
      table: '--table',
      id: '--id',
      force: { flag: '--force', hasValue: false },
      format: { flag: '--format', hasValue: false, negatable: true },
      timeoutSeconds: '--timeout',
    }, [], signal);
  }
}
