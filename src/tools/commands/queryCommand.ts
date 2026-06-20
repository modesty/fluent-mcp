import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Characters that would let an encoded-query value break out of the single-quote
 * wrapping applied before the value reaches the shell, or inject control flow.
 * Inside POSIX single quotes every other character (including the relational
 * operators `<` `>` and `^` that encoded queries rely on) is literal, so we only
 * need to reject the single quote, backslash, and control characters.
 */
// eslint-disable-next-line no-control-regex -- control characters are intentionally rejected
const UNSAFE_QUERY_PATTERN = /['\\\x00-\x1f]/;

/**
 * Command to run a read-only Table REST API query against a ServiceNow instance
 * (SDK v4.8.0+ `now-sdk query`). Returns matching records as a JSON envelope.
 *
 * Auth is auto-injected from the session. The encoded query commonly contains
 * shell-relational operators (`<`, `>`, `^`), so the query value is validated to
 * exclude quote/backslash/control characters and then single-quote-wrapped so the
 * shell treats it as one literal token.
 */
export class QueryCommand extends SessionAwareCLICommand {
  name = 'query_fluent_records';
  description = 'Run a read-only query against a ServiceNow table via the Table REST API (SDK v4.8.0+). Returns matching records as a JSON envelope. Requires instance authentication (auto-injected from session, or pass auth explicitly). Provide table and an encoded query (e.g. "active=true^priority<=2").';
  annotations = { readOnlyHint: true, openWorldHint: true };
  timeoutMs = 60_000;
  arguments: CommandArgument[] = [
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
   * Validate query arguments. Reuses the base type/injection checks for the
   * simple identifier fields, then applies query-specific validation that
   * permits encoded-query operators while still rejecting shell-injection risks.
   *
   * The base check sanitizes every string arg against the shell-metacharacter
   * pattern, which would reject the relational operators (`<`, `>`) common in
   * encoded queries. We therefore hand the base a benign placeholder for `query`
   * (preserving its required/type checks) and validate the real value here.
   */
  protected validateArgs(args: Record<string, unknown>): void {
    const query = args.query;
    if (typeof query !== 'string') {
      throw new Error("Missing required argument 'query'. It must be a non-empty encoded query string.");
    }

    super.validateArgs({ ...args, query: 'placeholder' });

    if (UNSAFE_QUERY_PATTERN.test(query)) {
      throw new Error(
        "Invalid characters in argument 'query': single quotes, backslashes, and control characters are not allowed."
      );
    }

    const displayValue = args.displayValue;
    if (displayValue !== undefined && !['true', 'false', 'all'].includes(String(displayValue))) {
      throw new Error("Argument 'displayValue' must be one of: \"true\", \"false\", \"all\"");
    }
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    const table = this.sanitizeStringArg(args.table, 'table');
    // Single-quote-wrap the validated encoded query so the shell treats relational
    // operators (`<`, `>`, `^`) as literal text rather than redirections.
    const quotedQuery = `'${String(args.query)}'`;

    // Default to a machine-readable JSON envelope.
    const mappedArgs = { ...args, query: quotedQuery, output: args.output ?? 'json' };

    // `--exclude-reference-link` defaults to true in the CLI; the only meaningful
    // override is to INCLUDE reference links, which yargs expresses as the
    // `--no-` negation. Inject it explicitly (flag order is irrelevant to yargs).
    const prefixFlags: string[] = [table];
    if (args.excludeReferenceLink === false) {
      prefixFlags.push('--no-exclude-reference-link');
    }

    return this.executeSdkCommand(
      'query',
      mappedArgs,
      {
        query: '--query',
        fields: '--fields',
        limit: '--limit',
        offset: '--offset',
        displayValue: '--display-value',
        view: '--view',
        queryCategory: '--query-category',
        timeout: '--timeout',
        output: '--output',
        auth: '--auth',
        noCount: { flag: '--no-count', hasValue: false },
        queryNoDomain: { flag: '--query-no-domain', hasValue: false },
      },
      prefixFlags
    );
  }
}
