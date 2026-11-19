import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand, DEBUG_ARGUMENT } from './baseCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { assertNotOption, cliOption } from './cliArgv.js';
import { getProjectRootPath } from '../../config.js';

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
 * over doc names, tags and bodies (5 results by default), and `--list <topic>`
 * ranks its weaker matches the same way (up to 25). `range` selects which
 * ranked results are shown; it has no effect on an exact match.
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
      description: 'Ranked results to show when the topic has no exact match, or among the closer matches of list=true with a topic (SDK v4.14.2+): "7" for the first 7, "3-7" for results 3 through 7. Defaults to the first 5 (25 with list=true). Requires topic; ignored on an exact match.',
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

    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs = [...baseArgs, 'explain'];
    if (args.topic) {
      sdkArgs.push(assertNotOption(String(args.topic), 'topic'));
    }

    if (args.format) sdkArgs.push(cliOption('--format', args.format));
    if (args.list) sdkArgs.push('--list');
    if (args.peek) sdkArgs.push('--peek');
    if (typeof args.range === 'string') sdkArgs.push(cliOption('--range', args.range));
    this.appendCommonFlags(sdkArgs, args);

    // `now-sdk explain` self-resolves its documentation. Use the installed
    // package directory as a neutral cwd so this tool never requires a project.
    return this.commandProcessor.process(
      command,
      sdkArgs,
      getProjectRootPath(),
      this.timeoutMs,
      signal
    );
  }
}
