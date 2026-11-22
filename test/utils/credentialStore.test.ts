/**
 * Credential-store failure handling under forced color (FORCE_COLOR=1): the SDK
 * logger wraps an ERROR line in chalk red, so the `^`-anchored store rules and
 * the destructive-advice sanitizer must see the text without ANSI codes.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  credentialStoreRecoveryGuidance,
  isCredentialStoreFailure,
  normalizeSdkErrorPrefix,
  recoverCredentialStoreFailure,
} from '../../src/utils/credentialStore.js';

const red = (text: string): string => `\x1b[31m${text}\x1b[39m`;
const UNREADABLE =
  "Stored credentials at /home/u/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.";

describe('credential-store failures in colored CLI output', () => {
  it('normalizes a colored ERROR line to the bare SDK message', () => {
    assert.equal(normalizeSdkErrorPrefix(red(`[now-sdk] ERROR: ${UNREADABLE}`)), UNREADABLE);
  });

  it('classifies and gives the matching rule for a colored failure', () => {
    const colored = red('[now-sdk] ERROR: SN_SDK_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');

    assert.equal(isCredentialStoreFailure(colored), true);
    assert.match(credentialStoreRecoveryGuidance(colored) ?? '', /^Set SN_SDK_ENCRYPTION_KEY to the base64-encoded 32-byte key/);
  });

  it('returns plain-text output without the reset imperative when no message was extracted', () => {
    const { output, message } = recoverCredentialStoreFailure(red(`[now-sdk] ERROR: ${UNREADABLE}`), undefined);

    assert.equal(output, '[now-sdk] ERROR: Stored credentials at /home/u/.now-sdk/credentials.enc could not be read.');
    assert.ok(!message?.includes('\x1b'));
    assert.match(message ?? '', /Verify SN_SDK_CREDENTIALS_DIR/);
  });
});
