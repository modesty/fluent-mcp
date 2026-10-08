import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';

/**
 * Command to install a Fluent (ServiceNow SDK) application to a ServiceNow instance
 * Uses the session's working directory
 */
export class InstallCommand extends SessionAwareCLICommand {
  name = 'deploy_fluent_app';
  description = 'Deploy a built Fluent (ServiceNow SDK) application to a ServiceNow instance. Requires a prior build via build_fluent_app and valid instance authentication (auto-injected from session, or pass auth explicitly). Use skipFlowActivation to prevent auto-publishing of flows and subflows during deployment. Since SDK v4.12.0 the install runs asynchronously by default (the CLI polls the instance until it finishes); set async=false to force a synchronous install.';
  // Mutates a live instance: destructive and non-idempotent (repeated deploys can
  // publish flows, bump versions, overwrite records). Clients use destructiveHint
  // to gate/confirm before running.
  annotations = { openWorldHint: true, destructiveHint: true, idempotentHint: false };
  // SDK v4.12.0 made `install --async` the default: the CLI uploads, then polls
  // the instance's progress tracker with NO upper bound, so this runner timeout
  // is the only cap. Killing the child mid-poll leaves the instance install
  // running but skips post-install flow activation and loses the rollback URL,
  // so the budget sits at the same 15 minutes as the cicd tools.
  timeoutMs = 900_000;
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'skipFlowActivation',
      type: 'boolean',
      required: false,
      description: 'Skip automatic flow activation during deployment. By default in SDK v4.5.0, flows and subflows are auto-published on install, after the install itself completes.',
    },
    {
      name: 'async',
      type: 'boolean',
      required: false,
      description: 'Install asynchronously, polling the instance until it finishes (CLI default true since SDK v4.12.0; falls back to a synchronous install when the instance returns no progress tracker). Set false to force a synchronous install, e.g. when progress tracking fails with a connection error.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    return this.executeSdkCommand('install', args, {
      auth: '--auth',
      skipFlowActivation: { flag: '--skip-flow-activation', hasValue: false },
      async: { flag: '--async', hasValue: false, negatable: true },
    }, [], signal);
  }
}
