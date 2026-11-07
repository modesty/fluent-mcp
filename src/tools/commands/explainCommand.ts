import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { assertNotOption, cliOption } from './cliArgv.js';
import { getProjectRootPath } from '../../config.js';

/** `--format` choices declared by `now-sdk explain`. */
const EXPLAIN_FORMATS = ['pretty', 'raw'] as const;

/**
 * Command to display documentation for a Fluent SDK topic.
 * Wraps: now-sdk explain [topic]
 *
 * As of SDK v4.6.0, `now-sdk explain` self-resolves documentation from its
 * own bundle and no longer requires a Fluent project. The CLI declares no
 * `--source` option (verified through SDK v4.14.0; yargs silently ignored the
 * flag this tool used to forward), so the tool accepts no project path.
 *
 * `topic` is optional — required only when `list` is not true.
 */
export class ExplainCommand extends BaseCLICommand {
  name = 'explain_fluent_api';
  description = 'Look up Fluent SDK documentation for any API or guide. Accepts a topic name (e.g., "BusinessRule", "Acl") or a keyword/tag (e.g., "flow", "atf"). Set list=true to enumerate available topics (optionally combined with topic to filter). Set peek=true for a brief summary. Set format="raw" for plain markdown. Read-only; no authentication or active Fluent project required. Use get_fluent_knowledge for metadata-type specifications, authoring guides and code examples.';
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
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    this.validateArgs(args);

    if (!args.list && !args.topic) {
      return CommandResultFactory.error(
        "Provide a topic (e.g., topic: 'BusinessRule'), or set list: true to enumerate available topics."
      );
    }

    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs = [...baseArgs, 'explain'];
    if (args.topic) {
      sdkArgs.push(assertNotOption(String(args.topic), 'topic'));
    }

    if (args.format) sdkArgs.push(cliOption('--format', args.format));
    if (args.list) sdkArgs.push('--list');
    if (args.peek) sdkArgs.push('--peek');
    this.appendCommonFlags(sdkArgs, args);

    // `now-sdk explain` self-resolves its documentation. Use the installed
    // package directory as a neutral cwd so this tool never requires a project.
    return this.commandProcessor.process(
      command,
      sdkArgs,
      getProjectRootPath(),
      undefined,
      this.timeoutMs,
      signal
    );
  }
}
