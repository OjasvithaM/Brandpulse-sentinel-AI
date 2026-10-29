import { test } from 'node:test';
import assert from 'node:assert';
import {
  computeSha256,
  signPassportPayload,
  verifyPassportSignature,
  logAuditEventWithChain,
  verifyAuditLogChain,
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
  destroySession,
  initDb,
} from '../../server/db';

test('computeSha256 produces exact 64-character hex digests', () => {
  const hash1 = computeSha256('BrandPulse-Sentinel-2026');
  const hash2 = computeSha256('BrandPulse-Sentinel-2026');
  const hash3 = computeSha256('BrandPulse-Sentinel-2027');

  assert.strictEqual(hash1.length, 64);
  assert.strictEqual(hash1, hash2);
  assert.notStrictEqual(hash1, hash3);
});

test('signPassportPayload generates valid Ed25519 digital signature with Key ID', () => {
  initDb();
  const samplePayload = {
    passport_code: 'BP-PASS-TEST-001',
    asset_id: 'asset-test-1',
    asset_version: 1,
    governance_score: 100,
    overall_status: 'PASSED',
    claims_json: JSON.stringify([{ claim_text: 'Acme Cloud is ₹999/mo', status: 'SUPPORTED' }]),
    created_at: new Date().toISOString(),
  };

  const sigResult = signPassportPayload(samplePayload);
  assert.strictEqual(sigResult.signature_algorithm, 'Ed25519');
  assert.strictEqual(sigResult.key_id, 'bp-key-2026-v1');
  assert.strictEqual(sigResult.payload_digest.length, 64);
  assert.strictEqual(sigResult.signature.length, 128); // 64-byte Ed25519 signature in hex
  assert.ok(sigResult.signed_at);
});

test('verifyPassportSignature verifies authentic passports and detects tampering', () => {
  initDb();
  // Check the initial seeded passport
  const verifyResult = verifyPassportSignature('BP-PASS-2026-1011');
  assert.strictEqual(verifyResult.valid, true);
  assert.strictEqual(verifyResult.status, 'VALID');

  // Check legacy unsigned passport
  const legacyResult = verifyPassportSignature('BP-PASS-2025-LEGACY');
  assert.strictEqual(legacyResult.valid, false);
  assert.strictEqual(legacyResult.status, 'LEGACY_NOT_SIGNED');
  assert.ok(legacyResult.message.includes('LEGACY — NOT SIGNED'));
});

test('verifyAuditLogChain verifies hash chain continuity and detects broken links', () => {
  initDb();
  logAuditEventWithChain(
    'TEST_SECURITY_EVENT',
    'SecOps Lead',
    'Admin',
    'SYSTEM',
    'sys-001',
    'Automated cryptographic unit test event'
  );

  const chainCheck = verifyAuditLogChain();
  assert.strictEqual(chainCheck.valid, true);
  assert.ok(chainCheck.total_blocks > 0);
  assert.strictEqual(chainCheck.genesis_hash, 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000');
  assert.strictEqual(chainCheck.latest_hash.length, 64);
});

test('hashPassword produces salted PBKDF2 hash and verifyPassword validates correctly', () => {
  const password = 'SecurePassword2026!';
  const { hash, salt } = hashPassword(password);

  assert.ok(hash.length > 32);
  assert.ok(salt.length > 16);
  assert.strictEqual(verifyPassword(password, hash, salt), true);
  assert.strictEqual(verifyPassword('WrongPassword123!', hash, salt), false);
});

test('createSession and getSessionUser manage authenticated user state', () => {
  initDb();
  // Using seeded admin
  const session = createSession('usr-admin-01', 24);
  assert.ok(session.id.startsWith('bps_'));

  const user = getSessionUser(session.id);
  assert.ok(user);
  assert.strictEqual(user?.email, 'admin@brandpulse.internal');
  assert.strictEqual(user?.role, 'ADMIN');

  destroySession(session.id);
  const destroyedUser = getSessionUser(session.id);
  assert.strictEqual(destroyedUser, null);
});
