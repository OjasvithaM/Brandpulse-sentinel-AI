import { test } from 'node:test';
import assert from 'node:assert';
import {
  computeSha256,
  signPassportPayload,
  verifyPassportSignature,
  logAuditEventWithChain,
  verifyAuditLogChain,
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

test('signPassportPayload generates valid HMAC-SHA256 digital signature', () => {
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
  assert.strictEqual(sigResult.signature_algorithm, 'HMAC-SHA256');
  assert.strictEqual(sigResult.payload_digest.length, 64);
  assert.strictEqual(sigResult.signature.length, 64);
  assert.ok(sigResult.signed_at);
});

test('verifyAuditLogChain verifies hash chain continuity', () => {
  initDb();
  // Log chained event
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
