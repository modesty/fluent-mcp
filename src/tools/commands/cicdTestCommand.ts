import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { ENVELOPE_RUN_OPTIONS, shapeEnvelopeResult } from '../../utils/jsonSelect.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { cliOption } from './cliArgv.js';
import { getProjectRootPath } from '../../config.js';
import { CLI_OUTPUT_FORMATS, POSITIVE_INTEGER_DOMAIN, SELECT_PATH_DOMAIN, SYS_ID_DOMAIN } from './argValidation.js';
import { DEBUG_ARGUMENT } from './baseCommand.js';

/** The `target`/`action` choices — a caller-supplied token never reaches argv unvalidated. */
const TEST_TARGETS = ['testsuite', 'test'] as const;
const TEST_ACTIONS = ['run', 'watch', 'result', 'logs'] as const;
type TestTarget = (typeof TEST_TARGETS)[number];
type TestAction = (typeof TEST_ACTIONS)[number];

/** Browser choices accepted by `now-sdk cicd testsuite run --browser-name`. */
const BROWSER_NAMES = ['any', 'chrome', 'firefox', 'edge', 'ie', 'safari'] as const;

/** Actions that start or follow a polled operation and so accept `wait`/`pollTimeout`. */
const POLLED_ACTIONS: readonly TestAction[] = ['run', 'watch'];

type TestLeafKey = `${TestTarget}:${TestAction}`;

interface TestLeafRule {
  /** Arguments that must be present on this leaf, with their missing-argument message. */
  required?: ReadonlyArray<readonly [name: string, message: string]>;
  /** Exactly one of `[a, b]` must be present to identify `subject`. */
  xor?: readonly [a: string, b: string, subject: string];
  /** Leaf-specific arguments accepted on this leaf (beyond shared auth/output/select/debug). */
  allowed: ReadonlySet<string>;
}

const SUITE_RUN_ARGS = ['testSuiteSysId', 'testSuiteName', 'browserName', 'browserVersion', 'osName', 'osVersion', 'isPerformanceRun'] as const;
const TEST_RUN_ARGS = ['testSysId', 'testName', 'captureNodeLogs'] as const;
const POLL_ARGS = ['wait', 'pollTimeout'] as const;
const LOG_ARGS = ['pattern', 'limit'] as const;

/**
 * Exhaustive rule table for the seven `now-sdk cicd testsuite|test` leaves.
 * `testsuite:logs` is deliberately absent (the CLI has no test-suite logs leaf).
 */
const TEST_LEAF_RULES: Partial<Record<TestLeafKey, TestLeafRule>> = {
  'testsuite:run': {
    xor: ['testSuiteSysId', 'testSuiteName', 'a test suite'],
    allowed: new Set([...SUITE_RUN_ARGS, 'runInCloud', ...POLL_ARGS]),
  },
  'testsuite:watch': {
    required: [['progressId', "Argument 'progressId' is required when action=\"watch\". Use the progress id returned by a previous run."]],
    allowed: new Set(['progressId', ...POLL_ARGS]),
  },
  'testsuite:result': {
    required: [['resultId', 'Argument \'resultId\' is required when action="result".']],
    allowed: new Set(['resultId']),
  },
  'test:run': {
    xor: ['testSysId', 'testName', 'a test'],
    allowed: new Set([...TEST_RUN_ARGS, 'runInCloud', ...POLL_ARGS]),
  },
  'test:watch': {
    required: [['progressId', "Argument 'progressId' is required when action=\"watch\". Use the progress id returned by a previous run."]],
    allowed: new Set(['progressId', ...POLL_ARGS]),
  },
  'test:result': {
    required: [['resultId', 'Argument \'resultId\' is required when action="result".']],
    allowed: new Set(['resultId']),
  },
  'test:logs': {
    required: [['resultId', 'Argument \'resultId\' is required when action="logs".']],
    allowed: new Set(['resultId', ...LOG_ARGS]),
  },
};

/** Self-describing rejection message for each leaf-specific argument when used on a leaf that does not accept it. */
const DISALLOWED_ARG_MESSAGE: Record<string, (target: TestTarget, action: TestAction) => string> = {
  ...Object.fromEntries(SUITE_RUN_ARGS.map((name) => [
    name,
    (target: TestTarget, action: TestAction) => target !== 'testsuite'
      ? `Argument '${name}' is only valid with target="testsuite", not target="${target}".`
      : `Argument '${name}' is only valid with action="run", not action="${action}".`,
  ])),
  ...Object.fromEntries(TEST_RUN_ARGS.map((name) => [
    name,
    (target: TestTarget, action: TestAction) => target !== 'test'
      ? `Argument '${name}' is only valid with target="test", not target="${target}".`
      : `Argument '${name}' is only valid with action="run", not action="${action}".`,
  ])),
  runInCloud: (_t, action) => `Argument 'runInCloud' is only valid with action="run", not action="${action}".`,
  progressId: (_t, action) => `Argument 'progressId' is only valid with action="watch", not action="${action}".`,
  resultId: (_t, action) => `Argument 'resultId' is only valid with action="result" or action="logs", not action="${action}".`,
  wait: (_t, action) => `Arguments 'wait' and 'pollTimeout' are not accepted when action="${action}" — it is a single read, not a polled operation.`,
  pollTimeout: (_t, action) => `Arguments 'wait' and 'pollTimeout' are not accepted when action="${action}" — it is a single read, not a polled operation.`,
  pattern: (_t, action) => `Argument 'pattern' is only valid with action="logs", not action="${action}".`,
  limit: (_t, action) => `Argument 'limit' is only valid with action="logs", not action="${action}".`,
};

/**
 * Command to drive ATF test execution through the ServiceNow CI/CD API
 * (SDK v4.10.0+ `now-sdk cicd`). Covers the seven ATF leaves of the `cicd` tree:
 * `testsuite run|watch|result` and `test run|watch|result|logs` (`logs` is
 * SDK v4.12.0+ and exists for single tests only).
 *
 * The tool is annotated destructive because `run` executes real ATF steps
 * against the instance, which create, update, and delete records under the
 * runner's impersonation. `watch`, `result`, and `logs` are reads, but annotations are
 * per-tool, so the annotation follows the widest blast radius the tool can reach
 * — a client gating on it may only ever over-prompt, never under-prompt.
 *
 * These operations never read the Fluent project, so no working directory is
 * accepted or resolved: the installed package directory is the cwd for spawning
 * the bundled CLI, and a broken project configuration cannot block a result
 * lookup. Auth is auto-injected from the session.
 */
export class CicdTestCommand extends SessionAwareCLICommand {
  name = 'cicd_fluent_test';
  description = 'Run or inspect ServiceNow ATF tests through the sn_cicd API (SDK v4.10.0+). Set target to "testsuite" or "test" and action to "run" (start it), "watch" (follow a progressId from a previous run), "result" (fetch a resultId), or "logs" (fetch the captured logs of a single test result, optionally filtered by a regex pattern; target="test" only, SDK v4.12.0+). Identify a suite by testSuiteSysId or testSuiteName, a test by testSysId or testName. action="run" executes real ATF steps on the instance and the records those steps touch change; "watch", "result", and "logs" only read. No Fluent project required. Requires instance authentication (auto-injected from session, or pass auth explicitly).';
  annotations = { destructiveHint: true, idempotentHint: false, openWorldHint: true };
  timeoutMs = 930_000;
  arguments: CommandArgument[] = [
    {
      name: 'target',
      type: 'string',
      required: true,
      domain: { kind: 'choices', values: TEST_TARGETS },
      description: 'What to act on: "testsuite" (an ATF test suite) or "test" (a single ATF test).',
    },
    {
      name: 'action',
      type: 'string',
      required: true,
      domain: { kind: 'choices', values: TEST_ACTIONS },
      description: 'Operation: "run" to start, "watch" to follow a progressId from a previous run, "result" to fetch a resultId, or "logs" to fetch the captured logs of a single test result (target="test" only).',
    },
    {
      name: 'testSuiteSysId',
      type: 'string',
      required: false,
      domain: SYS_ID_DOMAIN,
      description: 'sys_id of the test suite to run. Mutually exclusive with testSuiteName. Use with target="testsuite", action="run".',
    },
    {
      name: 'testSuiteName',
      type: 'string',
      required: false,
      description: 'Name of the test suite to run. Mutually exclusive with testSuiteSysId. Use with target="testsuite", action="run".',
    },
    {
      name: 'testSysId',
      type: 'string',
      required: false,
      domain: SYS_ID_DOMAIN,
      description: 'sys_id of the ATF test (sys_atf_test) to run. Mutually exclusive with testName. Use with target="test", action="run".',
    },
    {
      name: 'testName',
      type: 'string',
      required: false,
      description: 'Name of the ATF test to run; resolved to a sys_id before starting. Fails if the name matches zero or more than one test. Mutually exclusive with testSysId.',
    },
    {
      name: 'progressId',
      type: 'string',
      required: false,
      domain: SYS_ID_DOMAIN,
      description: 'Progress id returned by a previous run. REQUIRED when action="watch".',
    },
    {
      name: 'resultId',
      type: 'string',
      required: false,
      domain: SYS_ID_DOMAIN,
      description: 'Result sys_id to fetch. REQUIRED when action="result" or action="logs". For a suite this is the links.results.id from run; for a test it is the resultId from watch. action="logs" needs a single-test result (sys_atf_test_result), never a suite result.',
    },
    {
      name: 'pattern',
      type: 'string',
      required: false,
      description: 'Regular expression to filter the captured log lines (always matched case-insensitively), e.g. "error|fail". Only with action="logs". Omit to return every line.',
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      domain: POSITIVE_INTEGER_DOMAIN,
      description: 'Maximum number of log lines to return (positive integer, CLI default 100). Only with action="logs".',
    },
    {
      name: 'browserName',
      type: 'string',
      required: false,
      domain: { kind: 'choices', values: BROWSER_NAMES },
      description: `Browser to run UI-based tests in: ${BROWSER_NAMES.join(', ')}. Only with target="testsuite", action="run".`,
    },
    {
      name: 'browserVersion',
      type: 'string',
      required: false,
      description: 'Browser version to run UI-based tests in. Only with target="testsuite", action="run".',
    },
    {
      name: 'osName',
      type: 'string',
      required: false,
      description: 'Operating system to run UI-based tests on. Only with target="testsuite", action="run".',
    },
    {
      name: 'osVersion',
      type: 'string',
      required: false,
      description: 'Operating system version to run UI-based tests on. Only with target="testsuite", action="run".',
    },
    {
      name: 'runInCloud',
      type: 'boolean',
      required: false,
      description: 'Run UI-based steps on the ATF Cloud Runner instead of a manual/scheduled client runner. Only with action="run".',
    },
    {
      name: 'isPerformanceRun',
      type: 'boolean',
      required: false,
      description: 'Run the suite as a Performance Test instead of a standard functional test. Only with target="testsuite", action="run".',
    },
    {
      name: 'captureNodeLogs',
      type: 'boolean',
      required: false,
      description: 'Capture node (browser) logs during the run. Only with target="test", action="run".',
    },
    {
      name: 'wait',
      type: 'boolean',
      required: false,
      description: 'Wait for completion, polling progress (CLI default true). Set false to return immediately with the progress id, then follow up with action="watch". Only with action="run" or action="watch".',
    },
    {
      name: 'pollTimeout',
      type: 'number',
      required: false,
      domain: POSITIVE_INTEGER_DOMAIN,
      description: 'Milliseconds to poll for completion before giving up. CLI default 900000 (15 minutes). Only with action="run" or action="watch". Values above ~15 minutes also require raising FLUENT_MCP_COMMAND_TIMEOUT_MS.',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'output',
      type: 'string',
      required: false,
      domain: { kind: 'choices', values: CLI_OUTPUT_FORMATS },
      description: `Output format: ${CLI_OUTPUT_FORMATS.map((f) => `"${f}"`).join(' or ')}. Defaults to "json" (machine-readable envelope).`,
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      domain: SELECT_PATH_DOMAIN,
      description: 'Dot/bracket path to extract from the JSON envelope `{ ok, result, progress?, interpretedResult? }` (e.g. "interpretedResult.summary.testStatus" or "progress.status"). interpretedResult and progress are top-level keys, not under result; a waiting watch (SDK v4.14.0+) reports its outcome under progress and interpretedResult with an empty result. An unresolved path yields null. Applied by this tool to a successful (ok: true) envelope only; on a failure the full envelope is returned so the error stays visible (the CLI\'s own --select would print only null).',
    },
    DEBUG_ARGUMENT,
  ];

  /**
   * Validate per-leaf argument legality from `TEST_LEAF_RULES`, so an unusable
   * combination is named precisely instead of failing opaquely in the CLI.
   *
   * The schema has already checked `target`, `action`, `browserName`, `output`,
   * `select`, `limit`, `pollTimeout`, and every sys_id against their domains.
   */
  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(args);

    const target = args.target as TestTarget;
    const action = args.action as TestAction;
    const rule = TEST_LEAF_RULES[`${target}:${action}`];
    if (!rule) {
      throw new Error('action="logs" is only available with target="test" — the CLI has no test-suite logs operation. Fetch logs per test result instead.');
    }

    for (const [name, message] of rule.required ?? []) {
      if (!args[name]) throw new Error(message);
    }

    if (rule.xor) {
      const [first, second, subject] = rule.xor;
      if (args[first] && args[second]) {
        throw new Error(`Arguments '${first}' and '${second}' are mutually exclusive. Pass only one.`);
      }
      if (!args[first] && !args[second]) {
        throw new Error(`Provide either '${first}' or '${second}' to run ${subject}.`);
      }
    }

    for (const [name, messageFor] of Object.entries(DISALLOWED_ARG_MESSAGE)) {
      if (args[name] !== undefined && !rule.allowed.has(name)) {
        throw new Error(messageFor(target, action));
      }
    }
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    try {
      this.validateArgs(args);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }

    const target = args.target as TestTarget;
    const action = args.action as TestAction;

    // ATF runs execute against a live instance, so authentication is required.
    const providedAuth = typeof args.auth === 'string' ? args.auth : undefined;
    const resolvedAuth = await this.resolveAuthAlias(providedAuth);
    if (!resolvedAuth) {
      return this.missingAuthResult();
    }

    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs: string[] = [...baseArgs, 'cicd', target, action];

    if (args.testSuiteSysId) sdkArgs.push(cliOption('--test-suite-sys-id', args.testSuiteSysId));
    if (args.testSuiteName) sdkArgs.push(cliOption('--test-suite-name', args.testSuiteName));
    if (args.testSysId) sdkArgs.push(cliOption('--test-sys-id', args.testSysId));
    if (args.testName) sdkArgs.push(cliOption('--test-name', args.testName));

    if (args.progressId) sdkArgs.push(cliOption('--progress-id', args.progressId));
    if (args.resultId) sdkArgs.push(cliOption('--result-id', args.resultId));

    if (args.browserName) sdkArgs.push(cliOption('--browser-name', args.browserName));
    if (args.browserVersion) sdkArgs.push(cliOption('--browser-version', args.browserVersion));
    if (args.osName) sdkArgs.push(cliOption('--os-name', args.osName));
    if (args.osVersion) sdkArgs.push(cliOption('--os-version', args.osVersion));
    if (args.runInCloud) sdkArgs.push('--run-in-cloud');
    if (args.isPerformanceRun) sdkArgs.push('--is-performance-run');
    if (args.captureNodeLogs) sdkArgs.push('--capture-node-logs');

    if (args.pattern) sdkArgs.push(cliOption('--pattern', args.pattern));
    if (args.limit !== undefined) sdkArgs.push(cliOption('--limit', args.limit));

    // `--wait` defaults to true in the CLI, so only the negation is meaningful.
    // `result` and `logs` are plain reads and accept neither polling flag.
    if (POLLED_ACTIONS.includes(action)) {
      if (args.wait === false) sdkArgs.push('--no-wait');
      if (args.pollTimeout !== undefined) sdkArgs.push(cliOption('--poll-timeout', args.pollTimeout));
    }

    sdkArgs.push(cliOption('--auth', resolvedAuth));
    sdkArgs.push(cliOption('--output', typeof args.output === 'string' ? args.output : 'json'));
    this.appendCommonFlags(sdkArgs, args);

    // These leaves resolve nothing from the current directory (unlike the app-repo
    // operations, which default the app sys_id/version from the project), so the
    // installed package directory is a neutral cwd for spawning the bundled CLI.
    // `select` is applied here, not forwarded as --select; stdout is captured
    // whole so the envelope parses (see jsonSelect).
    const result = await this.commandProcessor.process(
      command,
      sdkArgs,
      getProjectRootPath(),
      this.timeoutMs,
      signal,
      ENVELOPE_RUN_OPTIONS
    );
    return shapeEnvelopeResult(result, args.select, args.output === 'raw');
  }
}
