import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'brandpulse.db');
export const db = new DatabaseSync(DB_PATH);

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
  `);

  // Check if initial demonstration facts exist
  const countRow = db.prepare('SELECT COUNT(*) as count FROM facts').get() as { count: number };
  if (countRow.count === 0) {
    seedDemoData();
  }
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
      value: 'Gemini 3.8 Flash Hybrid Engine',
      description: 'Semantic claim verification engine with deterministic fallback and confidence bounds.',
      category: 'feature',
      source_ref: 'DOC-2026-ENG-ARCH',
      source_doc: 'BrandPulse Sentinel AI Technical Specification v3.8',
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
    'Hybrid (Deterministic + Gemini 3.8 Flash)',
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
}

// Reset database back to clean demo state
export function resetDbToDemo() {
  db.exec(`
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
