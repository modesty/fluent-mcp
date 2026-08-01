/**
 * Argument resolver for InitCommand
 *
 * Turns the loose `tools/call` argument bag into a complete, intent-specific
 * request object — or fails with a message naming exactly which arguments are
 * missing.
 *
 * Replaces the former `InitElicitator`, which asked the client for missing
 * values via `server.server.elicitInput(...)`. MCP 2026-07-28 removed
 * server-initiated requests (SEP-2322: "The previous pattern of
 * server-initiated requests is no longer supported. This is a breaking
 * change."), and the SDK v2 `ServerContext.mcpReq.elicitInput` throws outright
 * on a 2026-era request. Since `init_fluent_app` already advertises every one
 * of these arguments in `tools/list`, the caller can supply them directly and
 * the tool needs no round trip.
 *
 * Note the requirement is *conditional*, so it cannot be expressed by marking
 * the arguments `required: true` in the input schema: `from` is required only
 * for conversion, and `appName`/`packageName`/`scopeName`/`template` only for
 * creation. Marking all of them required would make the tool uncallable in
 * either mode. The command is therefore the enforcement point, and these
 * errors are what makes the missing argument actionable.
 */

import {
  ConversionInitData,
  CreationInitData,
  InitIntent,
  VALID_TEMPLATES,
} from './types.js';

/** Creation arguments the caller must supply; `workingDirectory` is already schema-required. */
const REQUIRED_CREATION_ARGS = ['appName', 'packageName', 'scopeName', 'workingDirectory', 'template'] as const;

/**
 * Resolver for InitCommand arguments.
 * Single Responsibility: read and complete the argument bag, or report what is missing.
 */
export class InitArgsResolver {
  /**
   * Determine user intent from the supplied arguments.
   * @param args The raw tool arguments
   * @returns The resolved intent, or null when the arguments imply neither mode
   */
  static determineIntent(args: Record<string, unknown>): InitIntent | null {
    // If intent is explicitly provided
    if (args.intent) {
      const intent = (args.intent as string).toLowerCase();
      if (intent === 'conversion' || intent === 'creation') {
        return intent as InitIntent;
      }
    }

    // If 'from' is provided, assume conversion
    if (args.from) {
      return 'conversion';
    }

    // If creation-specific args are provided, assume creation
    if (args.appName || args.packageName || args.scopeName) {
      return 'creation';
    }

    return null;
  }

  /**
   * Build the error message for an argument bag that implies neither mode.
   * @returns An actionable message naming both modes and their required arguments
   */
  static missingIntentError(): string {
    return "Cannot determine intent for init_fluent_app. Set intent to 'creation' and supply " +
      `${REQUIRED_CREATION_ARGS.join(', ')}; or set intent to 'conversion' and supply 'from' ` +
      '(an instance sys_id or a local path to an existing application).';
  }

  /**
   * Resolve the conversion request from the supplied arguments.
   * @param args The raw tool arguments
   * @returns The complete conversion request
   * @throws Error naming the missing arguments when the request is incomplete
   */
  static resolveConversionData(args: Record<string, unknown>): ConversionInitData {
    const missing: string[] = [];
    if (!InitArgsResolver.isNonEmptyString(args.from)) missing.push('from');
    if (!InitArgsResolver.isNonEmptyString(args.workingDirectory)) missing.push('workingDirectory');

    if (missing.length > 0) {
      throw new Error(
        `Required parameters for conversion are missing: ${missing.join(', ')}. ` +
        "Supply 'from' as an instance sys_id (32-character hex) or a local path to an existing " +
        "application, and 'workingDirectory' as an absolute path to an empty directory."
      );
    }

    return {
      from: args.from as string,
      workingDirectory: args.workingDirectory as string,
      auth: args.auth as string,
      debug: args.debug as boolean,
    };
  }

  /**
   * Resolve the creation request from the supplied arguments.
   * @param args The raw tool arguments
   * @returns The complete creation request
   * @throws Error naming the missing arguments when the request is incomplete
   */
  static resolveCreationData(args: Record<string, unknown>): CreationInitData {
    const missing = REQUIRED_CREATION_ARGS.filter(
      (name) => !InitArgsResolver.isNonEmptyString(args[name])
    );

    if (missing.length > 0) {
      throw new Error(
        `Required parameters for creation are missing: ${missing.join(', ')}. ` +
        `Valid template values are: ${VALID_TEMPLATES.join(', ')}.`
      );
    }

    return {
      appName: args.appName as string,
      packageName: args.packageName as string,
      scopeName: args.scopeName as string,
      workingDirectory: args.workingDirectory as string,
      template: args.template as string,
      auth: args.auth as string,
      debug: args.debug as boolean,
    };
  }

  /**
   * MCP clients commonly serialize an omitted optional value as null, and an
   * empty string carries the same meaning for these arguments. Both count as
   * absent so the missing-argument message stays accurate.
   */
  private static isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim() !== '';
  }
}
