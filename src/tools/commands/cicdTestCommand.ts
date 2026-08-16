import { CommandArgument, CommandResult, CommandResultFactory } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { getProjectRootPath } from '../../config.js';
import {
  CLI_OUTPUT_FORMATS,
  assertOneOf,
  screenFreeTextArgs,
  screenSelectPathArg,
} from './argValidation.js';

/** Strict allowlists — a caller-supplied token never reaches argv unvalidated. */
const TEST_TARGETS = ['testsuite', 'test'] as const;
const TEST_ACTIONS = ['run', 'watch', 'result'] as const;
type TestTarget = (typeof TEST_TARGETS)[number];
type TestAction = (typeof TEST_ACTIONS)[number];

/** Browser choices accepted by `now-sdk cicd testsuite run --browser-name`. */
const BROWSER_NAMES = ['any', 'chrome', 'firefox', 'edge', 'ie', 'safari'] as const;

/**
 * ATF suite and test names are author-chosen labels that routinely contain
 * printable punctuation — e.g. "Incident (Regression) & Cleanup". Those are
 * harmless on the shell-free execution path, so they bypass the base
 * shell-metacharacter check and are screened for control characters instead.
 */
const FREE_TEXT_ARGS = ['testSuiteName', 'testName'] as const;

/**
 * Command to drive ATF test execution through the ServiceNow CI/CD API
 * (SDK v4.10.0+ `now-sdk cicd`). Covers the six ATF leaves of the `cicd` tree:
 * `testsuite run|watch|result` and `test run|watch|result`.
 *
 * The tool is annotated destructive because `run` executes real ATF steps
 * against the instance, which create, update, and delete records under the
 * runner's impersonation. `watch` and `result` are reads, but annotations are
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
  description = 'Run or inspect ServiceNow ATF tests through the sn_cicd API (SDK v4.10.0+). Set target to "testsuite" or "test" and action to "run" (start it), "watch" (follow a progressId from a previous run), or "result" (fetch a resultId). Identify a suite by testSuiteSysId or testSuiteName, a test by testSysId or testName. action="run" executes real ATF steps on the instance and the records those steps touch change; "watch" and "result" only read. No Fluent project required. Requires instance authentication (auto-injected from session, or pass auth explicitly).';
  annotations = { destructiveHint: true, idempotentHint: false, openWorldHint: true };
  timeoutMs = 930_000;
  arguments: CommandArgument[] = [
    {
      name: 'target',
      type: 'string',
      required: true,
      description: 'What to act on: "testsuite" (an ATF test suite) or "test" (a single ATF test).',
    },
    {
      name: 'action',
      type: 'string',
      required: true,
      description: 'Operation: "run" to start, "watch" to follow a progressId from a previous run, or "result" to fetch a resultId.',
    },
    {
      name: 'testSuiteSysId',
      type: 'string',
      required: false,
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
      description: 'Progress id returned by a previous run. REQUIRED when action="watch".',
    },
    {
      name: 'resultId',
      type: 'string',
      required: false,
      description: 'Result sys_id to fetch. REQUIRED when action="result". For a suite this is the links.results.id from run; for a test it is the resultId from watch.',
    },
    {
      name: 'browserName',
      type: 'string',
      required: false,
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
      description: 'Wait for completion, polling progress (CLI default true). Set false to return immediately with the progress id, then follow up with action="watch". Not accepted when action="result".',
    },
    {
      name: 'pollTimeout',
      type: 'number',
      required: false,
      description: 'Milliseconds to poll for completion before giving up. CLI default 900000 (15 minutes). Not accepted when action="result". Values above ~15 minutes also require raising FLUENT_MCP_COMMAND_TIMEOUT_MS.',
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
      description: `Output format: ${CLI_OUTPUT_FORMATS.map((f) => `"${f}"`).join(' or ')}. Defaults to "json" (machine-readable envelope).`,
    },
    {
      name: 'select',
      type: 'string',
      required: false,
      description: 'Dot/bracket path to extract from the output (e.g. "result.interpretedResult.summary.testStatus" or "result.rollup_results[0].status"). Implies machine-readable output.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  /**
   * Validate the target/action tokens and the per-leaf argument legality the CLI
   * enforces, so an unusable combination is named precisely instead of failing
   * opaquely in the CLI.
   *
   * The two name arguments are free text (see FREE_TEXT_ARGS) and `select` is a
   * bracket path: the base is handed benign placeholders so its required/type
   * checks still run, while each real value is screened by the rule that applies
   * to it (see argValidation).
   */
  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(screenSelectPathArg(screenFreeTextArgs(args, FREE_TEXT_ARGS)));

    const target = assertOneOf(args.target, TEST_TARGETS, 'target');
    const action = assertOneOf(args.action, TEST_ACTIONS, 'action');

    if (args.browserName !== undefined) {
      assertOneOf(args.browserName, BROWSER_NAMES, 'browserName');
    }
    if (args.output !== undefined) {
      assertOneOf(args.output, CLI_OUTPUT_FORMATS, 'output');
    }

    if (action === 'watch' && !args.progressId) {
      throw new Error("Argument 'progressId' is required when action=\"watch\". Use the progress id returned by a previous run.");
    }
    if (action === 'result' && !args.resultId) {
      throw new Error("Argument 'resultId' is required when action=\"result\".");
    }
    if (action === 'result' && (args.wait !== undefined || args.pollTimeout !== undefined)) {
      throw new Error("Arguments 'wait' and 'pollTimeout' are not accepted when action=\"result\" — fetching a result is a single read, not a polled operation.");
    }

    if (action === 'run') {
      if (target === 'testsuite') {
        if (args.testSuiteSysId && args.testSuiteName) {
          throw new Error("Arguments 'testSuiteSysId' and 'testSuiteName' are mutually exclusive. Pass only one.");
        }
        if (!args.testSuiteSysId && !args.testSuiteName) {
          throw new Error("Provide either 'testSuiteSysId' or 'testSuiteName' to run a test suite.");
        }
      } else {
        if (args.testSysId && args.testName) {
          throw new Error("Arguments 'testSysId' and 'testName' are mutually exclusive. Pass only one.");
        }
        if (!args.testSysId && !args.testName) {
          throw new Error("Provide either 'testSysId' or 'testName' to run a test.");
        }
      }
    }

    // Identifier and run-tuning arguments only mean something on the matching leaf.
    const suiteOnly = ['testSuiteSysId', 'testSuiteName', 'browserName', 'browserVersion', 'osName', 'osVersion', 'isPerformanceRun'];
    const testOnly = ['testSysId', 'testName', 'captureNodeLogs'];

    if (target !== 'testsuite') {
      for (const name of suiteOnly) {
        if (args[name] !== undefined) {
          throw new Error(`Argument '${name}' is only valid with target="testsuite", not target="${target}".`);
        }
      }
    }
    if (target !== 'test') {
      for (const name of testOnly) {
        if (args[name] !== undefined) {
          throw new Error(`Argument '${name}' is only valid with target="test", not target="${target}".`);
        }
      }
    }
    if (action !== 'run') {
      for (const name of [...suiteOnly, ...testOnly, 'runInCloud']) {
        if (args[name] !== undefined) {
          throw new Error(`Argument '${name}' is only valid with action="run", not action="${action}".`);
        }
      }
    }
    if (action !== 'watch' && args.progressId !== undefined) {
      throw new Error(`Argument 'progressId' is only valid with action="watch", not action="${action}".`);
    }
    if (action !== 'result' && args.resultId !== undefined) {
      throw new Error(`Argument 'resultId' is only valid with action="result", not action="${action}".`);
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
      return CommandResultFactory.error(
        'cicd_fluent_test requires authentication to a ServiceNow instance, but no credential alias was found. ' +
        "Pass 'auth' with a stored profile alias, or set SN_INSTANCE_URL so lazy validation can load a matching profile into the session. " +
        "Use the ServiceNow SDK 'now-sdk auth --add <instance>' command to create a profile."
      );
    }

    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs: string[] = [...baseArgs, 'cicd', target, action];

    if (args.testSuiteSysId) sdkArgs.push('--test-suite-sys-id', String(args.testSuiteSysId));
    if (args.testSuiteName) sdkArgs.push('--test-suite-name', String(args.testSuiteName));
    if (args.testSysId) sdkArgs.push('--test-sys-id', String(args.testSysId));
    if (args.testName) sdkArgs.push('--test-name', String(args.testName));

    if (args.progressId) sdkArgs.push('--progress-id', String(args.progressId));
    if (args.resultId) sdkArgs.push('--result-id', String(args.resultId));

    if (args.browserName) sdkArgs.push('--browser-name', String(args.browserName));
    if (args.browserVersion) sdkArgs.push('--browser-version', String(args.browserVersion));
    if (args.osName) sdkArgs.push('--os-name', String(args.osName));
    if (args.osVersion) sdkArgs.push('--os-version', String(args.osVersion));
    if (args.runInCloud) sdkArgs.push('--run-in-cloud');
    if (args.isPerformanceRun) sdkArgs.push('--is-performance-run');
    if (args.captureNodeLogs) sdkArgs.push('--capture-node-logs');

    // `--wait` defaults to true in the CLI, so only the negation is meaningful.
    // `result` is a plain read and accepts neither polling flag.
    if (action !== 'result') {
      if (args.wait === false) sdkArgs.push('--no-wait');
      if (args.pollTimeout !== undefined) sdkArgs.push('--poll-timeout', String(args.pollTimeout));
    }

    sdkArgs.push('--auth', resolvedAuth);
    sdkArgs.push('--output', typeof args.output === 'string' ? args.output : 'json');
    if (args.select) sdkArgs.push('--select', String(args.select));
    this.appendCommonFlags(sdkArgs, args);

    // These leaves resolve nothing from the current directory (unlike the app-repo
    // operations, which default the app sys_id/version from the project), so the
    // installed package directory is a neutral cwd for spawning the bundled CLI.
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
