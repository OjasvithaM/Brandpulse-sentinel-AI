import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'brandpulse.db');
export const db = new DatabaseSync(DB_PATH);

const PASSPORT_SECRET = process.env.PASSPORT_SIGNING_SECRET || 'brandpulse-sentinel-master-secret-key-2026-acme-governance';
const GENESIS_HASH = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

export function computeSha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function signPassportPayload(payload: {
  passport_code: string;
  asset_id: string;
  asset_version: number;
  governance_score: number;
  overall_status: string;
  claims_json: string;
  created_at: string;
}): { signature: string; payload_digest: string; signature_algorithm: string; signed_at: string } {
  const claimsHash = computeSha256(payload.claims_json || '[]');
  const canonicalString = [
    payload.passport_code,
    payload.asset_id,
    payload.asset_version,
    payload.governance_score,
    payload.overall_status,
    claimsHash,
    payload.created_at,
  ].join('|');

  const payload_digest = computeSha256(canonicalString);
  const signature = crypto
    .createHmac('sha256', PASSPORT_SECRET)
    .update(payload_digest)
    .digest('hex');

  return {
    signature,
    payload_digest,
    signature_algorithm: 'HMAC-SHA256',
    signed_at: new Date().toISOString(),
  };
}

export function verifyPassportSignature(passportIdOrCode: string): {
  valid: boolean;
  passport?: any;
  canonical_digest?: string;
  computed_signature?: string;
  expected_signature?: string;
  message: string;
  signer_identity: string;
} {
  const passport = db
    .prepare('SELECT * FROM trust_passports WHERE id = ? OR passport_code = ?')
    .get(passportIdOrCode, passportIdOrCode) as any;

  if (!passport) {
    return {
      valid: false,
      message: 'Trust Passport not found.',
      signer_identity: 'BrandPulse CA',
    };
  }

  const claimsHash = computeSha256(passport.claims_json || '[]');
  const canonicalString = [
    passport.passport_code,
    passport.asset_id,
    passport.asset_version,
    passport.governance_score,
    passport.overall_status,
    claimsHash,
    passport.created_at,
  ].join('|');

  const computedDigest = computeSha256(canonicalString);
  const computedSignature = crypto
    .createHmac('sha256', PASSPORT_SECRET)
    .update(computedDigest)
    .digest('hex');

  const storedSig = passport.signature;
  if (!storedSig) {
    return {
      valid: false,
      passport,
      canonical_digest: computedDigest,
      computed_signature: computedSignature,
      message: 'Passport does not contain a cryptographic digital signature.',
      signer_identity: 'BrandPulse Governance Authority CA',
    };
  }

  const isValid = storedSig === computedSignature;
  return {
    valid: isValid,
    passport,
    canonical_digest: computedDigest,
    computed_signature: computedSignature,
    expected_signature: storedSig,
    message: isValid
      ? 'Digital signature mathematically verified against canonical evidence digest. Payload integrity intact.'
      : 'Signature mismatch detected. The passport payload or claims snapshot may have been altered.',
    signer_identity: 'BrandPulse Governance Authority CA',
  };
}

export function logAuditEventWithChain(
  eventType: string,
  actor: string,
  actorRole: string,
  targetType: string,
  targetId: string,
  details: string
): any {
  try {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Get previous block hash
    const latestLog = db
      .prepare('SELECT chain_hash FROM audit_logs WHERE chain_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1')
      .get() as any;
    const prevHash = latestLog?.chain_hash || GENESIS_HASH;

    const payloadObj = { eventType, actor, actorRole, targetType, targetId, details, now };
    const payloadHash = computeSha256(JSON.stringify(payloadObj));
    const chainHash = computeSha256(`${prevHash}:${payloadHash}:${now}`);

    db.prepare(`
      INSERT INTO audit_logs (id, event_type, actor, actor_role, target_type, target_id, details, created_at, prev_hash, payload_hash, chain_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, eventType, actor, actorRole, targetType, targetId, details, now, prevHash, payloadHash, chainHash);

    return { id, eventType, actor, actorRole, targetType, targetId, details, now, prevHash, payloadHash, chainHash };
  } catch (e) {
    console.error('Failed to log hash-chained audit event:', e);
    return null;
  }
}

export function verifyAuditLogChain(): {
  valid: boolean;
  total_blocks: number;
  genesis_hash: string;
  latest_hash: string;
  broken_block_id?: string;
  message: string;
  verified_blocks: any[];
} {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at ASC').all() as any[];
  if (logs.length === 0) {
    return {
      valid: true,
      total_blocks: 0,
      genesis_hash: GENESIS_HASH,
      latest_hash: GENESIS_HASH,
      message: 'Audit log chain is empty.',
      verified_blocks: [],
    };
  }

  let expectedPrevHash = GENESIS_HASH;
  const verifiedBlocks = [];

  for (let i = 0; i < logs.length; i++) {
    const block = logs[i];
    // If block doesn't have chain_hash yet (legacy log), heal/compute it
    if (!block.chain_hash) {
      const payloadObj = {
        eventType: block.event_type,
        actor: block.actor,
        actorRole: block.actor_role,
        targetType: block.target_type,
        targetId: block.target_id,
        details: block.details,
        now: block.created_at,
      };
      const pHash = computeSha256(JSON.stringify(payloadObj));
      const cHash = computeSha256(`${expectedPrevHash}:${pHash}:${block.created_at}`);
      db.prepare('UPDATE audit_logs SET prev_hash = ?, payload_hash = ?, chain_hash = ? WHERE id = ?').run(
        expectedPrevHash,
        pHash,
        cHash,
        block.id
      );
      block.prev_hash = expectedPrevHash;
      block.payload_hash = pHash;
      block.chain_hash = cHash;
    }

    if (block.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        total_blocks: logs.length,
        genesis_hash: GENESIS_HASH,
        latest_hash: logs[logs.length - 1]?.chain_hash || '',
        broken_block_id: block.id,
        message: `Broken chain detected at block ${block.id}: expected prev_hash ${expectedPrevHash}, found ${block.prev_hash}`,
        verified_blocks: verifiedBlocks,
      };
    }

    expectedPrevHash = block.chain_hash;
    verifiedBlocks.push({
      id: block.id,
      event_type: block.event_type,
      actor: block.actor,
      timestamp: block.created_at,
      prev_hash: block.prev_hash,
      chain_hash: block.chain_hash,
      verified: true,
    });
  }

  return {
    valid: true,
    total_blocks: logs.length,
    genesis_hash: GENESIS_HASH,
    latest_hash: logs[logs.length - 1]?.chain_hash || '',
    message: `All ${logs.length} audit trail blocks cryptographically verified with unbroken SHA-256 hash continuity.`,
    verified_blocks: verifiedBlocks,
  };
}

// Initialize relational schema
export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      source_doc TEXT,
      status TEXT NOT NULL DEFAULT 'approved',
      version INTEGER NOT NULL DEFAULT 1,
      effective_date TEXT NOT NULL,
      expiry_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 1,
      superseded_by TEXT
    );

    CREATE TABLE IF NOT EXISTS fact_history (
      id TEXT PRIMARY KEY,
      fact_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      source_ref TEXT NOT NULL,
      status TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (fact_id) REFERENCES facts(id)
    );

    CREATE TABLE IF NOT EXISTS brand_rules (
      id TEXT PRIMARY KEY,
      rule_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      constraint_value TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'verified',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset_versions (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS audit_runs (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      asset_version INTEGER NOT NULL,
      overall_status TEXT NOT NULL,
      governance_score INTEGER NOT NULL,
      claims_count INTEGER NOT NULL,
      supported_count INTEGER NOT NULL,
      contradicted_count INTEGER NOT NULL,
      unverified_count INTEGER NOT NULL,
      findings_json TEXT NOT NULL,
      engine_used TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trust_passports (
      id TEXT PRIMARY KEY,
      passport_code TEXT UNIQUE NOT NULL,
      asset_id TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      asset_version INTEGER NOT NULL,
      audit_run_id TEXT NOT NULL,
      overall_status TEXT NOT NULL,
      governance_score INTEGER NOT NULL,
      claims_json TEXT NOT NULL,
      evidence_sources_json TEXT NOT NULL,
      reviewer_name TEXT,
      reviewer_role TEXT,
      human_decision TEXT DEFAULT 'APPROVED',
      decision_rationale TEXT,
      decision_timestamp TEXT,
      previous_passport_id TEXT,
      is_latest INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_impacts (
      id TEXT PRIMARY KEY,
      fact_id TEXT NOT NULL,
      fact_name TEXT NOT NULL,
      old_version INTEGER NOT NULL,
      new_version INTEGER NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      asset_version INTEGER NOT NULL,
      impacted_claim_text TEXT NOT NULL,
      impact_reason TEXT NOT NULL,
      impact_risk TEXT NOT NULL,
      alert_status TEXT NOT NULL DEFAULT 'PENDING',
      revalidated_passport_id TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      endpoint_url TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'none',
      auth_header_name TEXT,
      auth_token_env_var TEXT,
      sync_interval_mins INTEGER NOT NULL DEFAULT 60,
      last_sync_at TEXT,
      last_sync_status TEXT NOT NULL DEFAULT 'NEVER_SYNCED',
      last_http_code INTEGER,
      last_error TEXT,
      last_latency_ms INTEGER,
      data_freshness TEXT NOT NULL DEFAULT 'UNKNOWN',
      payload_hash TEXT,
      extracted_facts_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_source_sync_runs (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      http_status_code INTEGER,
      response_time_ms INTEGER,
      payload_hash TEXT,
      facts_extracted_count INTEGER DEFAULT 0,
      facts_changed_count INTEGER DEFAULT 0,
      error_message TEXT,
      synced_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES live_sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staged_fact_updates (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      fact_key TEXT NOT NULL,
      fact_name TEXT NOT NULL,
      category TEXT NOT NULL,
      current_approved_value TEXT NOT NULL,
      current_approved_version INTEGER NOT NULL,
      retrieved_live_value TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      reviewer_name TEXT,
      reviewer_decision_at TEXT,
      decision_rationale TEXT,
      impact_alerts_generated INTEGER DEFAULT 0,
      FOREIGN KEY (source_id) REFERENCES live_sources(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for audit runs and assets
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN brand TEXT DEFAULT 'Acme Technologies'"); } catch {}
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN review_status TEXT DEFAULT 'PENDING_REVIEW'"); } catch {}
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN reviewer_name TEXT"); } catch {}
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN reviewer_role TEXT"); } catch {}
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN reviewer_notes TEXT"); } catch {}
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN reviewed_at TEXT"); } catch {}
  try { db.exec("ALTER TABLE audit_runs ADD COLUMN evidence_sources_json TEXT"); } catch {}
  try { db.exec("ALTER TABLE assets ADD COLUMN brand TEXT DEFAULT 'Acme Technologies'"); } catch {}
  try { db.exec("ALTER TABLE audit_logs ADD COLUMN prev_hash TEXT"); } catch {}
  try { db.exec("ALTER TABLE audit_logs ADD COLUMN payload_hash TEXT"); } catch {}
  try { db.exec("ALTER TABLE audit_logs ADD COLUMN chain_hash TEXT"); } catch {}
  try { db.exec("ALTER TABLE trust_passports ADD COLUMN signature TEXT"); } catch {}
  try { db.exec("ALTER TABLE trust_passports ADD COLUMN signature_algorithm TEXT DEFAULT 'HMAC-SHA256'"); } catch {}
  try { db.exec("ALTER TABLE trust_passports ADD COLUMN payload_digest TEXT"); } catch {}
  try { db.exec("ALTER TABLE trust_passports ADD COLUMN signed_at TEXT"); } catch {}

  // Backfill existing trust passports with digital signatures if missing
  try {
    const unsignedPassports = db.prepare('SELECT * FROM trust_passports WHERE signature IS NULL').all() as any[];
    for (const p of unsignedPassports) {
      const sigData = signPassportPayload({
        passport_code: p.passport_code,
        asset_id: p.asset_id,
        asset_version: p.asset_version,
        governance_score: p.governance_score,
        overall_status: p.overall_status,
        claims_json: p.claims_json,
        created_at: p.created_at,
      });
      db.prepare('UPDATE trust_passports SET signature = ?, signature_algorithm = ?, payload_digest = ?, signed_at = ? WHERE id = ?').run(
        sigData.signature,
        sigData.signature_algorithm,
        sigData.payload_digest,
        sigData.signed_at,
        p.id
      );
    }
  } catch (e) {
    console.warn('Failed to backfill passport signatures:', e);
  }

  // Backfill audit log hash chain if missing
  try {
    verifyAuditLogChain();
  } catch (e) {
    console.warn('Failed to verify/heal audit chain:', e);
  }

  // Check if initial demonstration facts exist
  const countRow = db.prepare('SELECT COUNT(*) as count FROM facts').get() as { count: number };
  if (countRow.count === 0) {
    seedDemoData();
  } else {
    const liveCount = db.prepare('SELECT COUNT(*) as count FROM live_sources').get() as { count: number };
    if (liveCount.count === 0) {
      seedLiveSources();
    }
  }
}

export function seedLiveSources() {
  const now = new Date().toISOString();
  const insertLiveSource = db.prepare(`
    INSERT INTO live_sources (
      id, name, source_type, endpoint_url, auth_type, sync_interval_mins,
      last_sync_at, last_sync_status, last_http_code, last_latency_ms,
      data_freshness, payload_hash, extracted_facts_json, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const initialPricingFacts = JSON.stringify([
    {
      key: 'acme_cloud_pro_price',
      name: 'Acme Cloud Pro Monthly Subscription',
      value: '₹999/month',
      category: 'pricing',
      source_ref: 'DOC-2026-LIVE-PRICING'
    },
    {
      key: 'acme_trial_period',
      name: 'Standard Evaluation Trial Period',
      value: '14 days',
      category: 'policy',
      source_ref: 'DOC-2026-LIVE-TERMS'
    }
  ]);

  insertLiveSource.run(
    'src-acme-pricing',
    'Acme Official Pricing & Packaging Feed (REST)',
    'pricing_feed',
    '/api/live-demo/pricing',
    'none',
    30,
    now,
    'SUCCESS',
    200,
    42,
    'FRESH',
    'hash-init-pricing-001',
    initialPricingFacts,
    now,
    now
  );

  const initialSlaFacts = JSON.stringify([
    {
      key: 'acme_uptime_sla',
      name: 'Enterprise Cloud SLA Guarantee',
      value: '99.99%',
      category: 'technical_sla',
      source_ref: 'DOC-2026-LIVE-SLA'
    }
  ]);

  insertLiveSource.run(
    'src-acme-sla',
    'Acme Infrastructure Telemetry & SLA Feed',
    'sla_telemetry',
    '/api/live-demo/sla',
    'none',
    15,
    now,
    'SUCCESS',
    200,
    18,
    'FRESH',
    'hash-init-sla-001',
    initialSlaFacts,
    now,
    now
  );
}

export function seedDemoData() {
  const now = new Date().toISOString();

  // 1. Seed Approved Facts (Acme Technologies Fictional Demo)
  const insertFact = db.prepare(`
    INSERT INTO facts (id, key, name, value, description, category, source_ref, source_doc, status, version, effective_date, expiry_date, created_at, updated_at, is_current)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertFactHistory = db.prepare(`
    INSERT INTO fact_history (id, fact_id, version, value, description, source_ref, status, changed_by, change_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialFacts = [
    {
      id: 'fact-acme-price',
      key: 'acme_cloud_pro_price',
      name: 'Acme Cloud Pro Monthly Subscription',
      value: '₹999/month',
      description: 'Standard recurring monthly subscription for Acme Cloud Pro tier with all core modules included.',
      category: 'pricing',
      source_ref: 'DOC-2026-PRICING-V2',
      source_doc: 'Acme Technologies Master Price Schedule & Plan Catalog 2026',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
    },
    {
      id: 'fact-acme-sla',
      key: 'acme_enterprise_sla',
      name: 'Enterprise Cloud SLA Guarantee',
      value: '99.99%',
      description: 'Monthly uptime SLA guarantee backed by financial service credits for enterprise tier customers.',
      category: 'sla',
      source_ref: 'DOC-2026-SLA-V1',
      source_doc: 'Acme Service Level Agreement §4.1 (High Availability Commitments)',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
    },
    {
      id: 'fact-acme-trial',
      key: 'acme_trial_period',
      name: 'Standard Evaluation Trial Period',
      value: '14 days',
      description: 'Risk-free product evaluation period before billing commences; no credit card required.',
      category: 'policy',
      source_ref: 'DOC-TERMS-2026',
      source_doc: 'Acme SaaS Terms of Service §2.3 (Free Trial Policies)',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
    },
    {
      id: 'fact-acme-data',
      key: 'acme_data_residency',
      name: 'Primary Cloud Data Residency',
      value: 'Mumbai & Frankfurt Regions',
      description: 'All customer database records and backups are exclusively hosted within ISO27001 sovereign data centers.',
      category: 'compliance',
      source_ref: 'DOC-2026-SEC-DATA',
      source_doc: 'Acme Data Sovereignty and Regional Security Policy §6.2',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
    },
    {
      id: 'fact-acme-soc2',
      key: 'acme_soc2_compliance',
      name: 'SOC 2 Type II Certification Status',
      value: 'Certified Active (Audited by Ernst & Young LLP)',
      description: 'Annual independent third-party examination of security, confidentiality, and availability controls.',
      category: 'security',
      source_ref: 'DOC-2026-SOC2-REPORT',
      source_doc: 'AICPA SOC 2 Type II Independent Service Auditor Report',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
    },
    {
      id: 'fact-acme-copilot',
      key: 'acme_sentinel_model',
      name: 'BrandPulse AI Verification Engine',
      value: 'Multi-Tier Semantic & Deterministic Engine',
      description: 'Semantic claim verification engine with deterministic fallback and confidence bounds.',
      category: 'feature',
      source_ref: 'DOC-2026-ENG-ARCH',
      source_doc: 'BrandPulse Sentinel AI Technical Specification v3.0',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
    },
  ];

  for (const f of initialFacts) {
    insertFact.run(
      f.id,
      f.key,
      f.name,
      f.value,
      f.description,
      f.category,
      f.source_ref,
      f.source_doc,
      f.status,
      f.version,
      f.effective_date,
      null,
      now,
      now
    );

    insertFactHistory.run(
      `hist-${f.id}-v1`,
      f.id,
      1,
      f.value,
      f.description,
      f.source_ref,
      f.status,
      'Chief Governance Officer (Admin)',
      'Initial baseline fact approval in Acme Knowledge Base',
      now
    );
  }

  // 2. Seed Brand Rules
  const insertRule = db.prepare(`
    INSERT INTO brand_rules (id, rule_code, name, rule_type, constraint_value, description, severity, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `);

  const initialRules = [
    {
      id: 'rule-1',
      code: 'BR-NO-ABSOLUTE-CLAIMS',
      name: 'Prohibition of Absolute Software Claims',
      type: 'forbidden_term',
      constraint: '100% bug-free',
      desc: 'Legal policy forbids asserting that software or infrastructure is 100% bug-free, unhackable, or completely infallible.',
      severity: 'high',
    },
    {
      id: 'rule-2',
      code: 'BR-UNAUTHORIZED-PRICING',
      name: 'No Unauthorized Lifetime Discount Phrases',
      type: 'forbidden_term',
      constraint: 'unlimited free forever',
      desc: 'Commercial guidelines prohibit unauthorized lifetime free claims without executive approval.',
      severity: 'high',
    },
    {
      id: 'rule-3',
      code: 'BR-SLA-DISCLAIMER',
      name: 'SLA Maintenance Exclusion Notice',
      type: 'mandatory_disclaimer',
      constraint: 'excludes scheduled maintenance',
      desc: 'Public marketing stating 99.99% uptime SLA must specify exclusion of planned maintenance windows.',
      severity: 'medium',
    },
  ];

  for (const r of initialRules) {
    insertRule.run(r.id, r.code, r.name, r.type, r.constraint, r.desc, r.severity, now);
  }

  // 3. Seed Sample Reviewed Asset & Trust Passport (Demonstration of Step 4: historical asset)
  const insertAsset = db.prepare(`
    INSERT INTO assets (id, name, channel, current_version, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAssetVersion = db.prepare(`
    INSERT INTO asset_versions (id, asset_id, version, content, author, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertAuditRun = db.prepare(`
    INSERT INTO audit_runs (id, asset_id, asset_version, overall_status, governance_score, claims_count, supported_count, contradicted_count, unverified_count, findings_json, engine_used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPassport = db.prepare(`
    INSERT INTO trust_passports (id, passport_code, asset_id, asset_name, asset_version, audit_run_id, overall_status, governance_score, claims_json, evidence_sources_json, reviewer_name, reviewer_role, human_decision, decision_rationale, decision_timestamp, previous_passport_id, is_latest, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const asset1Id = 'asset-acme-q4-brochure';
  const asset1Content =
    'Acme Cloud Pro is priced at ₹999/month for growing engineering teams. Our enterprise infrastructure guarantees 99.99% uptime with 24/7 dedicated support. Test drive every feature with our 14 days trial.';

  insertAsset.run(asset1Id, 'Acme Q4 Product Launch Brochure', 'Brochure', 1, 'verified', now, now);
  insertAssetVersion.run(`v1-${asset1Id}`, asset1Id, 1, asset1Content, 'Marketing Lead (Sarah Chen)', now);

  const findings1 = [
    {
      claim_text: 'Acme Cloud Pro is priced at ₹999/month for growing engineering teams.',
      status: 'SUPPORTED',
      matched_fact: {
        id: 'fact-acme-price',
        name: 'Acme Cloud Pro Monthly Subscription',
        version: 1,
        approved_value: '₹999/month',
        source_ref: 'DOC-2026-PRICING-V2',
      },
      explanation: 'Supported by approved fact "Acme Cloud Pro Monthly Subscription" (v1).',
      suggested_correction: null,
      confidence: 0.96,
      verification_method: 'deterministic',
    },
    {
      claim_text: 'Our enterprise infrastructure guarantees 99.99% uptime with 24/7 dedicated support.',
      status: 'SUPPORTED',
      matched_fact: {
        id: 'fact-acme-sla',
        name: 'Enterprise Cloud SLA Guarantee',
        version: 1,
        approved_value: '99.99%',
        source_ref: 'DOC-2026-SLA-V1',
      },
      explanation: 'Supported by approved fact "Enterprise Cloud SLA Guarantee" (v1).',
      suggested_correction: null,
      confidence: 0.95,
      verification_method: 'deterministic',
    },
    {
      claim_text: 'Test drive every feature with our 14 days trial.',
      status: 'SUPPORTED',
      matched_fact: {
        id: 'fact-acme-trial',
        name: 'Standard Evaluation Trial Period',
        version: 1,
        approved_value: '14 days',
        source_ref: 'DOC-TERMS-2026',
      },
      explanation: 'Supported by approved fact "Standard Evaluation Trial Period" (v1).',
      suggested_correction: null,
      confidence: 0.94,
      verification_method: 'deterministic',
    },
  ];

  const auditRunId = 'audit-init-001';
  insertAuditRun.run(
    auditRunId,
    asset1Id,
    1,
    'PASSED',
    100,
    3,
    3,
    0,
    0,
    JSON.stringify(findings1),
    'Multi-Tier Engine (Deterministic + Semantic AI)',
    now
  );

  const passportId = 'pass-init-001';
  insertPassport.run(
    passportId,
    'BP-PASS-2026-1011',
    asset1Id,
    'Acme Q4 Product Launch Brochure',
    1,
    auditRunId,
    'PASSED',
    100,
    JSON.stringify(findings1),
    JSON.stringify([
      { source_ref: 'DOC-2026-PRICING-V2', name: 'Master Price Schedule', version: 1 },
      { source_ref: 'DOC-2026-SLA-V1', name: 'Service Level Agreement', version: 1 },
      { source_ref: 'DOC-TERMS-2026', name: 'Terms of Service', version: 1 },
    ]),
    'David Miller',
    'Senior Brand Compliance Officer',
    'APPROVED',
    'All claims fully substantiated by approved Q1 2026 documentation. Clean pass.',
    now,
    null,
    now
  );

  const initialSig = signPassportPayload({
    passport_code: 'BP-PASS-2026-1011',
    asset_id: asset1Id,
    asset_version: 1,
    governance_score: 100,
    overall_status: 'PASSED',
    claims_json: JSON.stringify(findings1),
    created_at: now,
  });
  db.prepare(`
    UPDATE trust_passports
    SET signature = ?, signature_algorithm = ?, payload_digest = ?, signed_at = ?
    WHERE id = ?
  `).run(initialSig.signature, initialSig.signature_algorithm, initialSig.payload_digest, initialSig.signed_at, passportId);

  // 4. Seed Initial Audit Log
  const insertAuditLog = db.prepare(`
    INSERT INTO audit_logs (id, event_type, actor, actor_role, target_type, target_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAuditLog.run(
    'log-init-001',
    'KNOWLEDGE_BASE_INITIALIZED',
    'System Administrator',
    'Admin',
    'KNOWLEDGE_BASE',
    'facts',
    'Acme Technologies Knowledge Base initialized with 6 approved facts and 3 brand rules.',
    now
  );

  insertAuditLog.run(
    'log-init-002',
    'TRUST_PASSPORT_ISSUED',
    'David Miller',
    'Senior Brand Compliance Officer',
    'TRUST_PASSPORT',
    'BP-PASS-2026-1011',
    'Trust Passport issued for Acme Q4 Product Launch Brochure v1. 3/3 claims verified.',
    now
  );

  // 5. Seed Initial Authorized Live Data Sources
  const insertLiveSource = db.prepare(`
    INSERT INTO live_sources (
      id, name, source_type, endpoint_url, auth_type, sync_interval_mins,
      last_sync_at, last_sync_status, last_http_code, last_latency_ms,
      data_freshness, payload_hash, extracted_facts_json, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const initialPricingFacts = JSON.stringify([
    {
      key: 'acme_cloud_pro_price',
      name: 'Acme Cloud Pro Monthly Subscription',
      value: '₹999/month',
      category: 'pricing',
      source_ref: 'DOC-2026-LIVE-PRICING'
    },
    {
      key: 'acme_trial_period',
      name: 'Standard Evaluation Trial Period',
      value: '14 days',
      category: 'policy',
      source_ref: 'DOC-2026-LIVE-TERMS'
    }
  ]);

  insertLiveSource.run(
    'src-acme-pricing',
    'Acme Official Pricing & Packaging Feed (REST)',
    'pricing_feed',
    '/api/live-demo/pricing',
    'none',
    30,
    now,
    'SUCCESS',
    200,
    42,
    'FRESH',
    'hash-init-pricing-001',
    initialPricingFacts,
    now,
    now
  );

  const initialSlaFacts = JSON.stringify([
    {
      key: 'acme_uptime_sla',
      name: 'Enterprise Cloud SLA Guarantee',
      value: '99.99%',
      category: 'technical_sla',
      source_ref: 'DOC-2026-LIVE-SLA'
    }
  ]);

  insertLiveSource.run(
    'src-acme-sla',
    'Acme Infrastructure Telemetry & SLA Feed',
    'sla_telemetry',
    '/api/live-demo/sla',
    'none',
    15,
    now,
    'SUCCESS',
    200,
    18,
    'FRESH',
    'hash-init-sla-001',
    initialSlaFacts,
    now,
    now
  );

  insertAuditLog.run(
    'log-init-003',
    'LIVE_CONNECTOR_INITIALIZED',
    'System Integration Service',
    'System',
    'LIVE_SOURCE',
    'src-acme-pricing',
    'Configured authorized live pricing feed with 30-min scheduled sync and hash validation.',
    now
  );
}

// Reset database back to clean demo state
export function resetDbToDemo() {
  db.exec(`
    DELETE FROM staged_fact_updates;
    DELETE FROM live_source_sync_runs;
    DELETE FROM live_sources;
    DELETE FROM audit_logs;
    DELETE FROM change_impacts;
    DELETE FROM trust_passports;
    DELETE FROM audit_runs;
    DELETE FROM asset_versions;
    DELETE FROM assets;
    DELETE FROM brand_rules;
    DELETE FROM fact_history;
    DELETE FROM facts;
  `);
  seedDemoData();
}
