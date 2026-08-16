import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { assertNoControlCharacters, screenSelectPathArg } from './argValidation.js';

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
      description: 'Dot/bracket path to extract from the output (SDK v4.10.0+), e.g. "records[0].sys_id". Implies machine-readable output; an unresolved path yields null rather than an error.',
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
   * Validate query arguments. Reuses the base type checks and conservative
   * string validation for simple identifier fields, then applies query-specific
   * validation that permits printable encoded-query operators and punctuation.
   *
   * The base check sanitizes every string arg against the shell-metacharacter
   * pattern, which would reject printable operators (`<`, `>`, `&`, and others)
   * that are legitimate query data on the shell-free execution path — and the
   * brackets in a `select` path such as `records[0].sys_id`. We hand the base
   * benign placeholders for both (preserving its required/type checks) and screen
   * each real value by the rule that applies to it (see argValidation).
   */
  protected validateArgs(args: Record<string, unknown>): void {
    const query = args.query;
    if (typeof query !== 'string' || query.trim() === '') {
      throw new Error("Missing required argument 'query'. It must be a non-empty encoded query string.");
    }

    super.validateArgs(screenSelectPathArg({ ...args, query: 'placeholder' }));

    assertNoControlCharacters(query, 'query');

    const displayValue = args.displayValue;
    if (displayValue !== undefined && !['true', 'false', 'all'].includes(String(displayValue))) {
      throw new Error("Argument 'displayValue' must be one of: \"true\", \"false\", \"all\"");
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

    const table = this.sanitizeStringArg(args.table, 'table');

    // The encoded query is a literal argv entry. Do not add shell quotes: with
    // shell=false they would reach now-sdk as data and change query semantics.
    // It lives only in this CLI token list so executeSdkCommand can re-validate
    // the raw value in mappedArgs without emitting a duplicate --query flag.
    const queryToken = String(args.query);

    // `--exclude-reference-link` defaults to true in the CLI; the only meaningful
    // override is to INCLUDE reference links, which yargs expresses as the
    // `--no-` negation. Inject it explicitly (flag order is irrelevant to yargs).
    const prefixFlags: string[] = [table, '--query', queryToken];
    if (args.excludeReferenceLink === false) {
      prefixFlags.push('--no-exclude-reference-link');
    }

    // Default to a machine-readable JSON envelope; inject the resolved auth alias.
    // `query` stays RAW in the args map (for re-validation); the flag is emitted
    // via prefixFlags above, so it is intentionally absent from the flag mapping.
    const mappedArgs = { ...args, auth: resolvedAuth, output: args.output ?? 'json' };

    return this.executeSdkCommand(
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
        output: '--output',
        select: '--select',
        auth: '--auth',
        noCount: { flag: '--no-count', hasValue: false },
        queryNoDomain: { flag: '--query-no-domain', hasValue: false },
      },
      prefixFlags,
      signal
    );
  }
}
