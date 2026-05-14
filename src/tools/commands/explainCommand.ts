import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to display documentation for a Fluent SDK topic.
 * Wraps: now-sdk explain [topic]
 *
 * As of SDK v4.6.0, `now-sdk explain` self-resolves documentation from its
 * own bundle and no longer requires a Fluent project or `--source`. The
 * previous scaffold layer that lived in this file is therefore removed.
 *
 * `topic` is optional — required only when `list` is not true.
 */
export class ExplainCommand extends SessionAwareCLICommand {
  name = 'explain_fluent_api';
  description = 'Look up Fluent SDK documentation for any API or guide. Accepts a topic name (e.g., "BusinessRule", "Acl") or a keyword/tag (e.g., "flow", "atf"). Set list=true to enumerate available topics (optionally combined with topic to filter). Set peek=true for a brief summary. Set format="raw" for plain markdown. Read-only; no authentication or active Fluent project required. Use get-api-spec for metadata-type specifications and get-snippet for code examples.';
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
      description: 'Output format: "pretty" (terminal, default) or "raw" (plain markdown).',
    },
    {
      name: 'source',
      type: 'string',
      required: false,
      description: 'Optional path to a Fluent project directory. Not required in SDK v4.6.0+ — explain self-resolves from its own bundle.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);

    if (!args.list && !args.topic) {
      return CommandResultFactory.error(
        "Provide a topic (e.g., topic: 'BusinessRule'), or set list: true to enumerate available topics."
      );
    }

    if (args.format !== undefined && args.format !== 'pretty' && args.format !== 'raw') {
      return CommandResultFactory.error(
        `Invalid format: "${String(args.format)}". Expected "pretty" or "raw".`
      );
    }

    const positionals: string[] = [];
    if (args.topic) {
      positionals.push(args.topic as string);
    }

    return this.executeSdkCommand(
      'explain',
      args,
      {
        source: '--source',
        format: '--format',
        list: { flag: '--list', hasValue: false },
        peek: { flag: '--peek', hasValue: false },
      },
      positionals
    );
  }
}
