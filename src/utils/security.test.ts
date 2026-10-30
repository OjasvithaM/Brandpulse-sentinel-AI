import { test } from 'node:test';
import assert from 'node:assert';
import {
  db,
  initDb,
  computeSha256,
  signPassportPayload,
  verifyPassportSignature,
  logAuditEventWithChain,
  verifyAuditLogChain,
  serializeAuditBlockPayload,
  CURRENT_KEY_ID,
  TRUSTED_PUBLIC_KEYS,
  createSession,
  getSessionUser,
  destroySession,
} from '../../server/db';
import { detectChangeImpact, ReviewedAssetSnapshot } from './governance';

// Initialize and ensure clean state
initDb();

test('serializeAuditBlockPayload produces deterministic canonical JSON payload', () => {
  const p1 = serializeAuditBlockPayload({
    eventType: 'FACT_UPDATED',
    actor: 'Sarah Jenkins',
    actorRole: 'ADMIN',
    targetType: 'FACT',
    targetId: 'fact-001',
    details: 'Price updated from 999 to 1199',
    timestamp: '2026-10-30T10:00:00.000Z',
  });

  const p2 = serializeAuditBlockPayload({
    eventType: 'FACT_UPDATED',
    actor: 'Sarah Jenkins',
    actorRole: 'ADMIN',
    targetType: 'FACT',
    targetId: 'fact-001',
    details: 'Price updated from 999 to 1199',
    timestamp: '2026-10-30T10:00:00.000Z',
  });

  assert.strictEqual(p1, p2);
  assert.ok(p1.includes('"details":"Price updated from 999 to 1199"'));
});

test('Audit log chain: verified and unbroken under legitimate writes', () => {
  const log = logAuditEventWithChain(
    'GOVERNANCE_CHECK',
    'Security Lead',
    'ADMIN',
    'SYSTEM',
    'sys-integrity-01',
    'Cryptographic integrity verification check'
  );

  assert.ok(log);
  assert.strictEqual(log.payloadHash.length, 64);
  assert.strictEqual(log.chainHash.length, 64);

  const check = verifyAuditLogChain();
  assert.strictEqual(check.valid, true);
  assert.ok(check.total_blocks > 0);
});

test('Audit log chain: verifyAuditLogChain is read-only and does NOT mutate the database', () => {
  const beforeCount = (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any).c;
  const beforeFirstHash = (db.prepare('SELECT chain_hash FROM audit_logs ORDER BY created_at ASC LIMIT 1').get() as any)?.chain_hash;

  const result = verifyAuditLogChain();
  assert.strictEqual(result.valid, true);

  const afterCount = (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any).c;
  const afterFirstHash = (db.prepare('SELECT chain_hash FROM audit_logs ORDER BY created_at ASC LIMIT 1').get() as any)?.chain_hash;

  assert.strictEqual(beforeCount, afterCount);
  assert.strictEqual(beforeFirstHash, afterFirstHash);
});

test('Audit log chain: detects payload tampering when stored column data is modified', () => {
  db.exec('SAVEPOINT tamper_payload_test;');
  try {
    const testId = `tamper-test-${Date.now()}`;
    const now = new Date().toISOString();
    const latestLog = db.prepare('SELECT chain_hash FROM audit_logs WHERE chain_hash IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1').get() as any;
    const prevHash = latestLog?.chain_hash || 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

    const legitimatePayload = serializeAuditBlockPayload({
      eventType: 'RECORD_AUTHORIZED',
      actor: 'Legitimate Admin',
      actorRole: 'ADMIN',
      targetType: 'RECORD',
      targetId: 'rec-001',
      details: 'Original pristine event record',
      timestamp: now,
    });
    const payloadHash = computeSha256(legitimatePayload);
    const chainHash = computeSha256(`${prevHash}:${payloadHash}:${now}`);

    db.prepare(`
      INSERT INTO audit_logs (id, event_type, actor, actor_role, target_type, target_id, details, created_at, prev_hash, payload_hash, chain_hash)
      VALUES (?, 'RECORD_AUTHORIZED', 'Legitimate Admin', 'ADMIN', 'RECORD', 'rec-001', 'Original pristine event record', ?, ?, ?, ?)
    `).run(testId, now, prevHash, payloadHash, chainHash);

    // Verify it passes initially
    assert.strictEqual(verifyAuditLogChain().valid, true);

    // Attacker tampers with the details in SQLite without recomputing hash
    db.prepare('UPDATE audit_logs SET details = ? WHERE id = ?').run('MALICIOUSLY TAMPERED DETAILS', testId);

    // Verification MUST fail and identify the broken block
    const tamperCheck = verifyAuditLogChain();
    assert.strictEqual(tamperCheck.valid, false);
    assert.strictEqual(tamperCheck.broken_block_id, testId);
    assert.ok(tamperCheck.message.includes('Payload tamper detected'));
  } finally {
    db.exec('ROLLBACK TO tamper_payload_test;');
  }
  assert.strictEqual(verifyAuditLogChain().valid, true);
});

test('Audit log chain: detects broken chain when prev_hash is forged or reordered', () => {
  db.exec('SAVEPOINT forge_prevhash_test;');
  try {
    const forgedId = `forge-test-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_logs (id, event_type, actor, actor_role, target_type, target_id, details, created_at, prev_hash, payload_hash, chain_hash)
      VALUES (?, 'SECURITY_PROBE', 'Tester', 'ADMIN', 'PROBE', 'p-1', 'Forged block test', ?, 'FORGED_PREVIOUS_HASH', 'fakehash', 'fakechain')
    `).run(forgedId, now);

    const check = verifyAuditLogChain();
    assert.strictEqual(check.valid, false);
    assert.strictEqual(check.broken_block_id, forgedId);
  } finally {
    db.exec('ROLLBACK TO forge_prevhash_test;');
  }
  assert.strictEqual(verifyAuditLogChain().valid, true);
});

test('Trust Passport: Ed25519 signing and verification with key rotation registry', () => {
  const payload = {
    passport_code: 'BP-PASS-SEC-TEST',
    asset_id: 'asset-sec-01',
    asset_version: 1,
    governance_score: 95,
    overall_status: 'PASSED',
    claims_json: JSON.stringify([{ claim_text: 'Acme Cloud is 99.99% available', status: 'SUPPORTED' }]),
    created_at: new Date().toISOString(),
  };

  const signed = signPassportPayload(payload);
  assert.strictEqual(signed.signature_algorithm, 'Ed25519');
  assert.strictEqual(signed.key_id, CURRENT_KEY_ID);
  assert.ok(TRUSTED_PUBLIC_KEYS[CURRENT_KEY_ID]);
  assert.strictEqual(TRUSTED_PUBLIC_KEYS[CURRENT_KEY_ID].active, true);

  // Insert passport into database
  const passportId = `pass-sec-${Date.now()}`;
  db.prepare(`
    INSERT INTO trust_passports (
      id, passport_code, asset_id, asset_name, asset_version, audit_run_id,
      overall_status, governance_score, claims_json, evidence_sources_json,
      reviewer_name, reviewer_role, human_decision, decision_rationale,
      decision_timestamp, is_latest, created_at,
      signature, signature_algorithm, payload_digest, signed_at
    ) VALUES (?, ?, ?, 'Secured Asset', 1, 'audit-sec-1', ?, ?, ?, '[]', 'Reviewer', 'ADMIN', 'APPROVED', 'Clean', ?, 1, ?, ?, ?, ?, ?)
  `).run(
    passportId,
    payload.passport_code,
    payload.asset_id,
    payload.overall_status,
    payload.governance_score,
    payload.claims_json,
    payload.created_at,
    payload.created_at,
    signed.signature,
    signed.signature_algorithm,
    signed.payload_digest,
    signed.signed_at
  );

  // Verification succeeds
  const verifyValid = verifyPassportSignature(passportId);
  assert.strictEqual(verifyValid.valid, true);
  assert.strictEqual(verifyValid.status, 'VALID');

  // Tamper with governance score in database (e.g. from 95 to 100)
  db.prepare('UPDATE trust_passports SET governance_score = 100 WHERE id = ?').run(passportId);

  // Verification MUST fail with TAMPER_DETECTED
  const verifyTampered = verifyPassportSignature(passportId);
  assert.strictEqual(verifyTampered.valid, false);
  assert.strictEqual(verifyTampered.status, 'INVALID_TAMPER_DETECTED');

  // Clean up
  db.prepare('DELETE FROM trust_passports WHERE id = ?').run(passportId);
});

test('Trust Passport: Legacy unsigned passport returns LEGACY_NOT_SIGNED', () => {
  const legacyResult = verifyPassportSignature('BP-PASS-2025-LEGACY');
  assert.strictEqual(legacyResult.valid, false);
  assert.strictEqual(legacyResult.status, 'LEGACY_NOT_SIGNED');
  assert.ok(legacyResult.message.includes('LEGACY — NOT SIGNED'));
});

test('Session Lifecycle: secure session token generation, lookup, and revocation', () => {
  const session = createSession('usr-admin-01', 12);
  assert.ok(session.id.startsWith('bps_'));
  assert.strictEqual(session.id.length, 68); // 'bps_' + 64 hex chars

  const user = getSessionUser(session.id);
  assert.ok(user);
  assert.strictEqual(user.id, 'usr-admin-01');
  assert.strictEqual(user.role, 'ADMIN');

  destroySession(session.id);
  const revokedUser = getSessionUser(session.id);
  assert.strictEqual(revokedUser, null);
});

test('Change Impact Intelligence: detectChangeImpact identifies drifted assets accurately', () => {
  const pastAssets: ReviewedAssetSnapshot[] = [
    {
      asset_id: 'asset-pricing-collateral',
      asset_name: 'Acme Cloud Pro Q3 Brochure',
      version: 1,
      content: 'Acme Cloud Pro provides high availability at just ₹999/month billed annually.',
      verified_claims: [
        {
          claim_text: 'Acme Cloud Pro is ₹999/month',
          matched_fact_id: 'acme_cloud_pro_price',
          matched_fact_version: 1,
          approved_value_used: '₹999/month',
        },
      ],
    },
    {
      asset_id: 'asset-unrelated-collateral',
      asset_name: 'Acme Security Policy Whitepaper',
      version: 1,
      content: 'Acme datacenters comply with ISO 27001 standards in all regions.',
      verified_claims: [
        {
          claim_text: 'Acme complies with ISO 27001',
          matched_fact_id: 'acme_security_cert',
          matched_fact_version: 1,
          approved_value_used: 'ISO 27001 & SOC 2',
        },
      ],
    },
  ];

  const alerts = detectChangeImpact(
    'acme_cloud_pro_price',
    'Acme Cloud Pro Monthly Subscription',
    1,
    2,
    '₹999/month',
    '₹1,299/month',
    pastAssets
  );

  // Exactly the pricing asset should be flagged, not the security asset
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].asset_id, 'asset-pricing-collateral');
  assert.strictEqual(alerts[0].impact_risk, 'CRITICAL');
  assert.ok(alerts[0].impact_reason.includes('updated to v2'));
});
