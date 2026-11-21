/**
 * End-to-end integration tests for credential recovery and store-path consistency
 * against the real bundled `@servicenow/sdk` CLI:
 *  - Runs SDK children with a stub keyring, outbound sockets blocked, telemetry
 *    disabled, and no inherited SDK session or CI credentials.
 *  - Creates a real env-key-encrypted `credentials.enc` in a temporary directory.
 *  - Verifies provider-mismatch recovery, wrong `SN_SDK_ENCRYPTION_KEY`, and
 *    missing `SN_SDK_ENCRYPTION_KEY` (with a `../` relative `SN_SDK_CREDENTIALS_DIR`)
 *    through both `check_auth_status` and direct instance tools (`query_fluent_records`),
 *    keeping the store intact and recoverable.
 *  - Verifies a relative `SN_SDK_CREDENTIALS_DIR` resolves once to the same absolute
 *    store across both `check_auth_status` and project-cwd SDK invocations.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loggerFixture, withEnvironment } from '../support/fixtures.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { ToolsManager } = await import('../../src/tools/toolsManager.js');
const { CheckAuthStatusCommand } = await import('../../src/tools/resources/resourceTools.js');
const { QueryCommand } = await import('../../src/tools/commands/queryCommand.js');
const { TransformCommand } = await import('../../src/tools/commands/transformCommand.js');
const { DownloadCommand } = await import('../../src/tools/commands/downloadCommand.js');
const { DependenciesCommand } = await import('../../src/tools/commands/dependenciesCommand.js');
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');
const { CLICmdWriter } = await import('../../src/tools/processors/cliCmdWriter.js');
const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');
const { resolveSdkCli } = await import('../../src/utils/sdkCli.js');
const { autoValidateAuthIfConfigured } = await import('../../src/server/fluentInstanceAuth.js');
const { SessionManager } = await import('../../src/utils/sessionManager.js');

const require = createRequire(import.meta.url);

/** Loaded before the SDK (including undici) in every child, from store setup through recovery. */
const OFFLINE_PRELOAD = `
'use strict';
require('node:net').Socket.prototype.connect = function () {
  require('node:fs').writeFileSync(require('node:path').join(__dirname, 'network-attempt'), '');
  throw new Error('Outbound connections are disabled in the credential recovery test');
};
const Module = require('node:module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@napi-rs/keyring') {
    return {
      Entry: class StubEntry {
        getPassword() { return null; }
        setPassword() {}
        deletePassword() { return false; }
        getSecret() { return null; }
        setSecret() {}
      },
    };
  }
  return origLoad.apply(this, arguments);
};
`;

describe('credential-store recovery and path resolution — real SDK CLI', () => {
  it('sanitizes destructive advice across check_auth_status and direct tools, and keeps relative SN_SDK_CREDENTIALS_DIR consistent', {
    timeout: 45_000,
  }, async (t) => {
    // Include a space in the directory prefix so quoted NODE_OPTIONS `--require` is always exercised.
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent mcp cred-'));
    t.after(() => fs.rmSync(workDir, { recursive: true, force: true }));
    const storeDir = path.join(workDir, 'store');
    const storeFile = path.join(storeDir, 'credentials.enc');
    const projectDir = path.join(workDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    const preloadPath = path.join(workDir, 'offline-sdk.cjs');
    fs.writeFileSync(preloadPath, OFFLINE_PRELOAD);
    // Quote the path so spaces in TMPDIR / workDir are never split by Node's NODE_OPTIONS parser.
    const preloadOption = `--require=${JSON.stringify(preloadPath)}`;

    const envKey = crypto.randomBytes(32).toString('base64');
    const wrongEnvKey = crypto.randomBytes(32).toString('base64');
    const host = 'https://credential-recovery.invalid';

    // Pre-authenticated sessions and CI logins take precedence over --auth.
    // Give every SDK invocation only the SDK settings explicitly supplied here.
    const inheritedSdkSettings = Object.keys(process.env).filter((name) => /^SN_SDK_/i.test(name));
    t.after(withEnvironment({
      ...Object.fromEntries(inheritedSdkSettings.map((name) => [name, undefined])),
      NODE_ENV: undefined,
      NODE_OPTIONS: preloadOption,
      NO_TELEMETRY: '1',
      SN_INSTANCE_URL: host,
      SN_AUTH_TYPE: 'basic',
      SN_SDK_CREDENTIALS_DIR: path.relative(process.cwd(), storeDir),
      SN_SDK_KEY_SOURCE: undefined,
      SN_SDK_ENCRYPTION_KEY: undefined,
    }));

    // Write a real encrypted credential store via the bundled SDK's storeCredentials
    // in a child process (with NODE_ENV unset and host keyring stubbed).
    const authModulePath = require.resolve('@servicenow/sdk-cli/dist/auth/index.js');
    const childEnv: Record<string, string | undefined> = {
      ...process.env,
      SN_SDK_CREDENTIALS_DIR: storeDir,
      SN_SDK_KEY_SOURCE: 'env',
      SN_SDK_ENCRYPTION_KEY: envKey,
    };
    execFileSync(
      process.execPath,
      [
        '-e',
        `const { storeCredentials } = require(${JSON.stringify(authModulePath)}); ` +
        `storeCredentials('dev', { instanceUrl: ${JSON.stringify(host)}, type: 'basic', username: 'admin', password: 'pw' }, true)` +
        `.catch((e) => { console.error(e); process.exit(1); });`,
      ],
      { env: childEnv, stdio: 'pipe' }
    );
    assert.ok(fs.existsSync(storeFile), 'expected encrypted credential store file');

    SessionManager.getInstance().clearSession();

    try {
      const tm = new ToolsManager();
      const executor = new CLIExecutor(new NodeProcessRunner());
      const queryCmd = new QueryCommand(executor);
      const transformCmd = new TransformCommand(executor);
      const downloadCmd = new DownloadCommand(executor);
      const runCheck = async () => {
        SessionManager.getInstance().clearSession();
        const checkCmd = new CheckAuthStatusCommand(async () => {
          await autoValidateAuthIfConfigured(tm);
        });
        const result = await checkCmd.execute();
        assert.equal(result.success, true);
        return JSON.parse(result.output) as {
          status: string;
          alias?: string;
          message: string;
          actionRequired?: string;
        };
      };

      // 1. Default keyring provider (SN_SDK_KEY_SOURCE omitted):
      //    check_auth_status must not suggest `--delete all` in `message`.
      const mismatch = await runCheck();
      assert.equal(mismatch.status, 'validation_error');
      assert.ok(mismatch.message.includes(storeFile), mismatch.message);
      assert.match(mismatch.message, /could not be read/);
      assert.ok(!mismatch.message.includes('--delete all'), `message must not suggest deleting intact store: ${mismatch.message}`);
      const mismatchAction = mismatch.actionRequired ?? '';
      assert.match(mismatchAction, /SN_SDK_CREDENTIALS_DIR/);
      assert.match(mismatchAction, /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/);
      assert.match(mismatchAction, /OS keyring is unlocked and accessible/);
      assert.ok(mismatchAction.includes(storeFile), mismatchAction);
      assert.match(mismatchAction, /shared OS keyring key and legacy keychain entry/);
      assert.ok(mismatchAction.indexOf('SN_SDK_KEY_SOURCE=env') < mismatchAction.indexOf('--delete all'));

      //    Direct instance tools (`query_fluent_records`, `fluent_transform`, and
      //    `download_fluent_app` with `debug: true`) on provider mismatch:
      //    must strip `--delete all` from returned output and attach safe recovery to error.
      const directMismatch = await queryCmd.execute({ table: 'incident', query: 'active=true', auth: 'dev' });
      assert.equal(directMismatch.success, false);
      assert.ok(directMismatch.output.includes(storeFile), directMismatch.output);
      assert.ok(!directMismatch.output.includes('--delete all'), directMismatch.output);
      const directMismatchErr = directMismatch.error?.message ?? '';
      assert.match(directMismatchErr, /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/);
      assert.ok(directMismatchErr.indexOf('SN_SDK_KEY_SOURCE=env') < directMismatchErr.indexOf('--delete all'));

      for (const run of [
        { label: 'fluent_transform', res: await transformCmd.execute({ workingDirectory: projectDir, auth: 'dev' }) },
        { label: 'fluent_transform (debug)', res: await transformCmd.execute({ workingDirectory: projectDir, auth: 'dev', debug: true }) },
        { label: 'download_fluent_app (debug)', res: await downloadCmd.execute({ workingDirectory: projectDir, directory: 'meta', auth: 'dev', debug: true }) },
      ]) {
        assert.equal(run.res.success, false, run.label);
        assert.ok(run.res.output.includes(storeFile), `${run.label}: ${run.res.output}`);
        assert.ok(!run.res.output.includes('--delete all'), `${run.label}: output leaked --delete all: ${run.res.output}`);
        const errMsg = run.res.error?.message ?? '';
        assert.match(errMsg, /Verify SN_SDK_CREDENTIALS_DIR/, `${run.label}: ${errMsg}`);
        assert.match(errMsg, /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/, `${run.label}: ${errMsg}`);
        assert.ok(errMsg.includes(`(${storeFile})`), `${run.label}: missing resolved file path: ${errMsg}`);
        assert.ok(errMsg.indexOf('SN_SDK_KEY_SOURCE=env') < errMsg.indexOf('--delete all'), `${run.label}: ${errMsg}`);
      }

      // 2. Missing SN_SDK_ENCRYPTION_KEY under relative `../` SN_SDK_CREDENTIALS_DIR:
      //    must show the exact resolved absolute path without stopping at the first `.`.
      process.env.SN_SDK_KEY_SOURCE = 'env';
      delete process.env.SN_SDK_ENCRYPTION_KEY;
      const missingKey = await runCheck();
      assert.equal(missingKey.status, 'validation_error');
      assert.ok(missingKey.message.includes(storeFile), missingKey.message);
      assert.ok(!missingKey.message.includes('./'), `relative path fragment leaked: ${missingKey.message}`);
      assert.match(missingKey.actionRequired ?? '', /Set SN_SDK_ENCRYPTION_KEY to the key the stored credentials were encrypted with/);

      // 3. Wrong valid SN_SDK_ENCRYPTION_KEY:
      //    neither check_auth_status nor direct `query_fluent_records` may suggest "delete that file".
      process.env.SN_SDK_ENCRYPTION_KEY = wrongEnvKey;
      const wrongKey = await runCheck();
      assert.equal(wrongKey.status, 'validation_error');
      assert.ok(wrongKey.message.includes(storeFile), wrongKey.message);
      assert.match(wrongKey.message, /Could not decrypt the stored credentials/);
      assert.ok(!wrongKey.message.includes('delete that file'), `message must not suggest deleting intact file: ${wrongKey.message}`);
      assert.ok(!wrongKey.message.includes('--delete all'), wrongKey.message);
      assert.match(wrongKey.actionRequired ?? '', /Set SN_SDK_ENCRYPTION_KEY to the original key/);
      assert.ok(!wrongKey.actionRequired?.includes('--delete all'));

      const lazyWrongKey = await queryCmd.execute({ table: 'incident', query: 'active=true' });
      assert.equal(lazyWrongKey.success, false);
      assert.equal(lazyWrongKey.error?.message, `${wrongKey.message}\n\n${wrongKey.actionRequired}`);

      const directWrongKey = await queryCmd.execute({ table: 'incident', query: 'active=true', auth: 'dev' });
      assert.equal(directWrongKey.success, false);
      assert.ok(directWrongKey.output.includes(storeFile), directWrongKey.output);
      assert.ok(!directWrongKey.output.includes('delete that file'), directWrongKey.output);
      assert.ok(!directWrongKey.output.includes('--delete all'), directWrongKey.output);
      assert.ok(!directWrongKey.error?.message.includes('delete that file'), directWrongKey.error?.message);
      assert.ok(!directWrongKey.error?.message.includes('--delete all'), directWrongKey.error?.message);
      assert.match(directWrongKey.error?.message ?? '', /Set SN_SDK_ENCRYPTION_KEY to the original key/);

      // 4. Original SN_SDK_ENCRYPTION_KEY: authenticates via check_auth_status AND resolves
      //    the exact same store when an SDK command runs in a different project working directory.
      process.env.SN_SDK_ENCRYPTION_KEY = envKey;
      const recovered = await runCheck();
      assert.equal(recovered.status, 'authenticated', recovered.message);
      assert.equal(recovered.alias, 'dev');

      const { command, baseArgs } = resolveSdkCli();
      const projectCwdRun = await executor.process(command, [...baseArgs, 'auth', '--list'], projectDir);
      assert.equal(projectCwdRun.success, true, projectCwdRun.output);
      assert.match(projectCwdRun.output, /\[dev\]/);
      assert.ok(projectCwdRun.output.includes(host), projectCwdRun.output);
      assert.ok(!fs.existsSync(path.join(workDir, 'network-attempt')), 'an SDK child attempted a network connection');
    } finally {
      SessionManager.getInstance().clearSession();
    }
  });

  it('pins the default ~/.now-sdk store in generated terminal commands even when the shell sets a custom SN_SDK_CREDENTIALS_DIR', {
    skip: process.platform === 'win32',
    timeout: 45_000,
  }, async (t) => {
    const workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-default-store-')));
    t.after(() => fs.rmSync(workDir, { recursive: true, force: true }));

    const fakeHome = path.join(workDir, 'home');
    const defaultStoreDir = path.join(fakeHome, '.now-sdk');
    const otherStoreDir = path.join(workDir, 'other-store');
    const projectDir = path.join(workDir, 'project');
    fs.mkdirSync(defaultStoreDir, { recursive: true });
    fs.mkdirSync(otherStoreDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }));
    fs.writeFileSync(path.join(projectDir, 'now.config.json'), JSON.stringify({ scope: 'x_test_app', scopeId: '0123456789abcdef0123456789abcdef' }));

    const preloadPath = path.join(workDir, 'offline-host-probe.cjs');
    const attemptedHostsPath = path.join(workDir, 'attempted-hosts.txt');
    fs.writeFileSync(preloadPath, `
'use strict';
const fs = require('node:fs');
const dns = require('node:dns');
const net = require('node:net');
const record = (host) => fs.appendFileSync(${JSON.stringify(attemptedHostsPath)}, String(host) + '\\n');
dns.lookup = function (hostname, _opts, cb) {
  record(hostname);
  const callback = typeof _opts === 'function' ? _opts : cb;
  const err = new Error('Blocked DNS lookup for ' + hostname);
  if (typeof callback === 'function') process.nextTick(() => callback(err));
  else throw err;
};
net.Socket.prototype.connect = function (opts) {
  record(opts && typeof opts === 'object' ? opts.host : opts);
  throw new Error('Outbound connections are disabled in test');
};
`);
    const preloadOption = `--require=${JSON.stringify(preloadPath)}`;
    const envKey = crypto.randomBytes(32).toString('base64');
    const authModulePath = require.resolve('@servicenow/sdk-cli/dist/auth/index.js');

    const writeStore = (dir: string, url: string) => {
      execFileSync(
        process.execPath,
        [
          '-e',
          `const { storeCredentials } = require(${JSON.stringify(authModulePath)}); ` +
          `storeCredentials('unit', { instanceUrl: ${JSON.stringify(url)}, type: 'basic', username: 'admin', password: 'pw' }, true)` +
          `.catch((e) => { console.error(e); process.exit(1); });`,
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: undefined,
            NODE_OPTIONS: preloadOption,
            NO_TELEMETRY: '1',
            SN_SDK_CREDENTIALS_DIR: dir,
            SN_SDK_KEY_SOURCE: 'env',
            SN_SDK_ENCRYPTION_KEY: envKey,
          },
          stdio: 'pipe',
        }
      );
    };
    writeStore(defaultStoreDir, 'https://review.invalid');
    writeStore(otherStoreDir, 'https://other.invalid');

    const inheritedSdkSettings = Object.keys(process.env).filter((name) => /^SN_SDK_/i.test(name));
    t.after(withEnvironment({
      ...Object.fromEntries(inheritedSdkSettings.map((name) => [name, undefined])),
      HOME: fakeHome,
      NODE_ENV: undefined,
      NODE_OPTIONS: preloadOption,
      NO_TELEMETRY: '1',
      SN_INSTANCE_URL: 'https://review.invalid',
      SN_AUTH_TYPE: 'basic',
      SN_SDK_CREDENTIALS_DIR: undefined,
      SN_SDK_KEY_SOURCE: 'env',
      SN_SDK_ENCRYPTION_KEY: envKey,
    }));

    SessionManager.getInstance().clearSession();
    try {
      const tm = new ToolsManager();
      const validation = await autoValidateAuthIfConfigured(tm);
      assert.equal(validation.status, 'authenticated', validation.message);
      assert.equal(validation.alias, 'unit');

      const depsCmd = new DependenciesCommand(new CLICmdWriter());
      const generated = await depsCmd.execute({ workingDirectory: projectDir });
      assert.equal(generated.success, true, generated.output);
      assert.ok(generated.output.includes(`SN_SDK_CREDENTIALS_DIR=`), generated.output);
      assert.ok(generated.output.includes(defaultStoreDir), generated.output);

      // Run the generated terminal command from a shell whose own environment points
      // SN_SDK_CREDENTIALS_DIR at otherStoreDir (where `unit` resolves to other.invalid).
      const run = spawnSync('/bin/sh', ['-c', generated.output], {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          HOME: fakeHome,
          NODE_OPTIONS: preloadOption,
          NO_TELEMETRY: '1',
          SN_SDK_CREDENTIALS_DIR: otherStoreDir,
          SN_SDK_ENCRYPTION_KEY: envKey,
        },
      });
      const combined = `${run.stdout}\n${run.stderr}`;
      const attempted = fs.existsSync(attemptedHostsPath) ? fs.readFileSync(attemptedHostsPath, 'utf8') : '';
      assert.ok(!attempted.includes('other.invalid') && !combined.includes('other.invalid'), `resolved wrong store:\n${attempted}\n${combined}`);
      assert.ok(attempted.includes('review.invalid') || combined.includes('review.invalid'), `expected validated host review.invalid:\n${attempted}\n${combined}`);
    } finally {
      SessionManager.getInstance().clearSession();
    }
  });
});
