import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand, DEBUG_ARGUMENT } from './baseCommand.js';
import { assertNotOption } from './cliArgv.js';

/** `--format` choices declared by `now-sdk explain`. */
const EXPLAIN_FORMATS = ['pretty', 'raw'] as const;

/**
 * `--range` grammar (SDK v4.14.2+, sdk-cli `command/explain` `RANGE_PATTERN`):
 * `<n>` for the first n ranked results, or `<from>-<to>`.
 */
const RANGE_PATTERN = /^(\d+)(?:-(\d+))?$/;

/**
 * Mirror the CLI's `.check()` on `--range`: a bare `n` means `1-n`, and the
 * span must satisfy `1 <= from <= to`. The schema pattern admits `0` and
 * `7-3`, which the CLI would reject only after spawning.
 */
function assertValidRange(range: string): void {
  const parsed = RANGE_PATTERN.exec(range);
  const from = parsed?.[2] ? Number(parsed[1]) : 1;
  const to = Number(parsed?.[2] ?? parsed?.[1]);
  if (!parsed || from < 1 || to < from) {
    throw new Error(`Argument 'range' must be "<n>" or "<from>-<to>" with 1 <= from <= to. Received: "${range}"`);
  }
}

/**
 * Command to display documentation for a Fluent SDK topic.
 * Wraps: now-sdk explain [topic]
 *
 * As of SDK v4.6.0, `now-sdk explain` self-resolves documentation from its
 * own bundle and no longer requires a Fluent project. The CLI declares no
 * `--source` option (verified through SDK v4.14.2; yargs silently ignored the
 * flag this tool used to forward), so the tool accepts no project path.
 *
 * `topic` is optional — required only when `list` is not true.
 *
 * SDK v4.14.2: a topic with no exact match falls back to a ranked fuzzy search
 * over doc names, tags and bodies (5 results by default). `range` selects which
 * ranked results are shown; it has no effect on an exact match. `--list <topic>`
 * applies `limit: to` before removing strong matches in SDK v4.14.2 and then
 * slices the remainder, which drops topics across adjacent pages — so `range`
 * is disallowed with `list: true`.
 */
export class ExplainCommand extends BaseCLICommand {
  name = 'explain_fluent_api';
  description = 'Look up Fluent SDK documentation for any API or guide. Accepts a topic name (e.g., "BusinessRule", "Acl") or a keyword/tag (e.g., "flow", "atf"). When a topic has no exact match, the closest topics are returned ranked by relevance; use range to page through them. Set list=true to enumerate available topics (optionally combined with topic to filter). Set peek=true for a brief summary. Set format="raw" for plain markdown. Read-only; no authentication or active Fluent project required. Use get_fluent_knowledge for metadata-type specifications, authoring guides and code examples.';
  annotations = { readOnlyHint: true, idempotentHint: true };
  timeoutMs = 15_000;
  arguments: CommandArgument[] = [
    {
      name: 'topic',
      type: 'string',
      required: false,
      description: 'Topic name or keyword to look up (e.g., "BusinessRule", "Acl", "flow", "atf"). Required unless list=true.',
    },
    {
      name: 'list',
      type: 'boolean',
      required: false,
      description: 'List available topics. Combine with topic to filter the index (e.g., list=true, topic="flow").',
    },
    {
      name: 'peek',
      type: 'boolean',
      required: false,
      description: 'Show a brief summary of the topic instead of the full document.',
    },
    {
      name: 'format',
      type: 'string',
      required: false,
      domain: { kind: 'choices', values: EXPLAIN_FORMATS },
      description: 'Output format: "pretty" (terminal, default) or "raw" (plain markdown).',
    },
    {
      name: 'range',
      type: 'string',
      required: false,
      domain: {
        kind: 'pattern',
        regex: RANGE_PATTERN,
        expected: '"<n>" for the first n ranked results, or "<from>-<to>" (e.g. "7" or "3-7")',
      },
      description: 'Ranked results to show only when a non-list topic lookup has no exact match and returns numbered "closest topics by relevance" results (SDK v4.14.2+): "7" for the first 7, "3-7" for results 3 through 7. Defaults to the first 5. Requires topic, cannot be combined with list=true, and is ignored when the topic matches one or more topics directly.',
    },
    DEBUG_ARGUMENT,
  ];

  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(args);
    if (typeof args.range === 'string') assertValidRange(args.range);
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    this.validateArgs(args);

    if (!args.list && !args.topic) {
      return CommandResultFactory.error(
        "Provide a topic (e.g., topic: 'BusinessRule'), or set list: true to enumerate available topics."
      );
    }
    // Without a topic there is nothing to rank, and the CLI silently ignores --range.
    if (typeof args.range === 'string' && !args.topic) {
      return CommandResultFactory.error("Argument 'range' requires a topic: it pages through the ranked matches for that topic.");
    }
    // SDK v4.14.2 limits fuzzy search hits BEFORE removing strong matches in `--list <topic>`
    // mode and then slices the remainder, so adjacent pages silently drop topics. Disallow
    // combining `range` with `list=true` until the SDK fixes list-mode pagination.
    if (typeof args.range === 'string' && args.list) {
      return CommandResultFactory.error(
        "Argument 'range' cannot be used with list=true: the bundled SDK's list mode does not paginate ranked matches cleanly. " +
        'Omit range to get a filtered topic list (up to 25 closest topics), and use range only without list when a topic lookup returns numbered "closest topics by relevance" results.'
      );
    }

    const positionals = args.topic ? [assertNotOption(String(args.topic), 'topic')] : [];
    // `now-sdk explain` self-resolves its documentation; runBundledSdk uses the
    // installed package directory as a neutral cwd so no project is needed.
    return this.runBundledSdk(args, {
      subcommand: 'explain',
      positionals,
      flags: {
        format: '--format',
        list: { flag: '--list' },
        peek: { flag: '--peek' },
        range: '--range',
      },
      signal,
    });
  }
}
