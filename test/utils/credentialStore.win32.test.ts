import assert from 'node:assert/strict';
import path from 'node:path';
import { it, mock } from 'node:test';

// Exercise the same resolution code on POSIX CI with Node's Windows path rules.
mock.module('node:path', { defaultExport: path.win32 });
const { resolveCredentialsDir, resolveEffectiveCredentialsDir, resolveSdkStorePath } = await import('../../src/utils/credentialStore.js');

it('anchors root-relative Windows store paths on the launch drive across project changes', () => {
  const launch = 'C:\\server';
  const dir = resolveCredentialsDir({ SN_SDK_CREDENTIALS_DIR: '\\profiles' }, launch);
  assert.equal(dir, 'C:\\profiles');
  assert.equal(path.win32.resolve('D:\\project', dir), dir);
  assert.equal(resolveSdkStorePath('\\profiles\\credentials.enc', launch), dir + '\\credentials.enc');
  assert.equal(resolveEffectiveCredentialsDir({}, launch, 'C:\\Users\\alice'), 'C:\\Users\\alice\\.now-sdk');
  assert.equal(resolveEffectiveCredentialsDir({ SN_SDK_CREDENTIALS_DIR: '\\profiles' }, launch, 'C:\\Users\\alice'), 'C:\\profiles');
});
