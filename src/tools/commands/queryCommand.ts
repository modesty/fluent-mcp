import { ArgumentDomain, CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { ENVELOPE_RUN_OPTIONS, shapeEnvelopeResult } from '../../utils/jsonSelect.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { SELECT_PATH_DOMAIN } from './argValidation.js';
import { cliOption } from './cliArgv.js';

/**
 * A table name: letters, digits and "_". The SDK builds the request path as
 * `/api/now/table/${table}` without encoding (`sdk-api` `connector.js`), so a
 * "/", "?", "#" or "." would point the read-only query at another endpoint; a
 * leading "-" would also be read as a CLI option.
 */
const TABLE_NAME_DOMAIN: ArgumentDomain = {
  kind: 'pattern',
  regex: /^[A-Za-z0-9_]+$/,
  expected: 'a table name: letters, digits, and "_" (e.g. "incident", "sys_user")',
};

/** `--display-value` choices declared by `now-sdk query`. */
const DISPLAY_VALUES = ['true', 'false', 'all'] as const;

/**
 * Command to run a read-only Table REST API query against a ServiceNow instance
 * (SDK v4.8.0+ `now-sdk query`). Returns matching records as a JSON envelope.
 *
 * Auth is auto-injected from the session. The encoded query commonly contains
 * shell-relational operators (`<`, `>`, `^`); it is validated and passed as one
 * literal argv entry to the shell-free process runner.
 */
export class QueryCommand extends SessionAwareCLICommand {
  name = 'query_fluent_records';
  description = 'Run a read-only query against a ServiceNow table via the Table REST API (SDK v4.8.0+). Returns matching records as a JSON envelope. Requires instance authentication (auto-injected from session, or pass auth explicitly). Provide table and an encoded query (e.g. "active=true^priority<=2").';
  annotations = { readOnlyHint: true, openWorldHint: true };
  timeoutMs = 60_000;
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'table',
      type: 'string',
      required: true,
      domain: TABLE_NAME_DOMAIN,
      description: 'ServiceNow table name to query (e.g. incident, sys_user)',
    },
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'Encoded query string (sysparm_query), e.g. "active=true^priority<=2"',
    },
    {
      name: 'fields',
      type: 'string',
      required: false,
      description: 'Comma-separated list of fields to return (sysparm_fields), e.g. "number,short_description,priority"',
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      description: 'Maximum records per page (sysparm_limit). Default 100.',
    },
    {
      name: 'offset',
      type: 'number',
      required: false,
      description: 'Starting offset (sysparm_offset). Default 0.',
    },
    {
      name: 'displayValue',
      type: 'string',
      required: false,
      domain: { kind: 'choices', values: DISPLAY_VALUES },
      description: 'Return display values (sysparm_display_value): "true", "false", or "all" for both. Default "false".',
    },
    {
      name: 'view',
      type: 'string',
      required: false,
      description: 'UI view to determine which fields to return (sysparm_view)',
    },
    {
      name: 'queryCategory',
      type: 'string',
      required: false,
      description: 'Query category for extended queries (sysparm_query_category)',
    },
    {
      name: 'excludeReferenceLink',
      type: 'boolean',
      required: false,
      description: 'Exclude reference link metadata (sysparm_exclude_reference_link). Default true.',
    },
    {
      name: 'noCount',
      type: 'boolean',
      required: false,
      description: 'Skip total count calculation for better performance (sysparm_no_count)',
    },
    {
      name: 'queryNoDomain',
      type: 'boolean',
      required: false,
      description: 'Ignore domain separation when querying (sysparm_query_no_domain)',
    },
    {
      name: 'timeout',
      type: 'number',
      required: false,
      description: 'Per-request timeout in milliseconds for each page fetch. Default 30000.',
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      domain: SELECT_PATH_DOMAIN,
      description: 'Dot/bracket path to extract from the output (SDK v4.10.0+), e.g. "records[0].sys_id". An unresolved path yields null rather than an error. Applied by this tool to a successful (ok: true) envelope only; on a failure the full envelope is returned so the error stays visible (the CLI\'s own --select would print only null).',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  /**
   * Validate query arguments. The schema checks types, `displayValue` and
   * `select` against their domains, and every string (the encoded query
   * included) for control characters; printable operators such as `<`, `>`,
   * `^` and `&` are query data, passed as one literal argv entry. The table
   * name's grammar is also a schema domain. What remains is a non-empty query.
   */
  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(args);
    if ((args.query as string).trim() === '') {
      throw new Error("Missing required argument 'query'. It must be a non-empty encoded query string.");
    }
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    this.validateArgs(args);

    // This tool reads from a live ServiceNow instance, so it requires authentication.
    // Resolve the alias from the explicit `auth` arg or the session, and fail fast
    // with an actionable message rather than letting the SDK CLI error opaquely.
    const providedAuth = typeof args.auth === 'string' ? args.auth : undefined;
    const resolvedAuth = await this.resolveAuthAlias(providedAuth);
    if (!resolvedAuth) {
      return CommandResultFactory.error(
        'query_fluent_records requires authentication to a ServiceNow instance, but no credential alias was found. ' +
        "Pass 'auth' with a stored profile alias, or set SN_INSTANCE_URL so lazy validation can load a matching profile into the session. " +
        "Use the ServiceNow SDK 'now-sdk auth --add <instance>' command to create a profile."
      );
    }

    const table = args.table as string;

    // The encoded query is a literal argv entry. Do not add shell quotes: with
    // shell=false they would reach now-sdk as data and change query semantics.
    // It lives only in this CLI token list so executeSdkCommand can re-validate
    // the raw value in mappedArgs without emitting a duplicate --query flag.
    const queryToken = String(args.query);

    // `--exclude-reference-link` defaults to true in the CLI; the only meaningful
    // override is to INCLUDE reference links, which yargs expresses as the
    // `--no-` negation. Inject it explicitly (flag order is irrelevant to yargs).
    // `--output=json` is fixed (the envelope is always parsed), so it is a CLI
    // token, not an argument: executeSdkCommand validates only declared arguments.
    const prefixFlags: string[] = [table, cliOption('--query', queryToken), '--output=json'];
    if (args.excludeReferenceLink === false) {
      prefixFlags.push('--no-exclude-reference-link');
    }

    // Inject the resolved auth alias. `query` stays RAW in the args map (for
    // re-validation); the flag is emitted via prefixFlags above, so it is
    // intentionally absent from the flag mapping.
    const mappedArgs = { ...args, auth: resolvedAuth };

    // `select` is applied here, not forwarded as --select; stdout is captured
    // whole so the envelope parses (see jsonSelect).
    const result = await this.executeSdkCommand(
      'query',
      mappedArgs,
      {
        fields: '--fields',
        limit: '--limit',
        offset: '--offset',
        displayValue: '--display-value',
        view: '--view',
        queryCategory: '--query-category',
        timeout: '--timeout',
        auth: '--auth',
        noCount: { flag: '--no-count', hasValue: false },
        queryNoDomain: { flag: '--query-no-domain', hasValue: false },
      },
      prefixFlags,
      signal,
      ENVELOPE_RUN_OPTIONS
    );
    return shapeEnvelopeResult(result, args.select);
  }
}
