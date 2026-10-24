import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { db, initDb, resetDbToDemo } from './server/db';
import { runEvidenceGuardVerification } from './server/verification';
import {
  Fact,
  BrandRule,
  detectChangeImpact,
  calculateGovernanceScore,
  ReviewedAssetSnapshot,
} from './src/utils/governance';
import {
  getUpstreamPricingData,
  getUpstreamSlaData,
  setUpstreamPricingState,
  setUpstreamSlaState,
  syncLiveSource,
  calculateFreshness,
} from './server/liveConnectors';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
initDb();

// Helper to log audit events
function logAuditEvent(
  eventType: string,
  actor: string,
  actorRole: string,
  targetType: string,
  targetId: string,
  details: string
) {
  try {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, event_type, actor, actor_role, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, eventType, actor, actorRole, targetType, targetId, details, now);
  } catch (e) {
    console.error('Failed to log audit event:', e);
  }
}

// -------------------------------------------------------------
// 1. DASHBOARD & STATS API
// -------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  try {
    const factsCount = (db.prepare('SELECT COUNT(*) as c FROM facts WHERE is_current = 1').get() as any).c;
    const rulesCount = (db.prepare("SELECT COUNT(*) as c FROM brand_rules WHERE status = 'active'").get() as any).c;
    const assetsCount = (db.prepare('SELECT COUNT(*) as c FROM assets').get() as any).c;
    const passportsCount = (db.prepare('SELECT COUNT(*) as c FROM trust_passports').get() as any).c;
    const pendingImpactsCount = (db.prepare("SELECT COUNT(*) as c FROM change_impacts WHERE alert_status = 'PENDING'").get() as any).c;
    const pendingReviewsCount = (db.prepare("SELECT COUNT(*) as c FROM assets WHERE status = 'pending_review' OR status = 'revalidation_required'").get() as any).c;
    const liveSourcesCount = (db.prepare('SELECT COUNT(*) as c FROM live_sources WHERE is_active = 1').get() as any).c;
    const liveStaleCount = (db.prepare("SELECT COUNT(*) as c FROM live_sources WHERE data_freshness = 'STALE' OR data_freshness = 'ERROR'").get() as any).c;
    const pendingStagedUpdatesCount = (db.prepare("SELECT COUNT(*) as c FROM staged_fact_updates WHERE status = 'PENDING_APPROVAL'").get() as any).c;

    const recentAudits = db.prepare(`
      SELECT a.id, a.asset_id, a.asset_version, a.overall_status, a.governance_score, a.created_at, ass.name as asset_name
      FROM audit_runs a
      LEFT JOIN assets ass ON a.asset_id = ass.id
      ORDER BY a.created_at DESC LIMIT 5
    `).all();

    const recentFactChanges = db.prepare(`
      SELECT f.id, f.fact_id, f.version, f.value, f.change_reason, f.changed_by, f.created_at, fc.name as fact_name
      FROM fact_history f
      LEFT JOIN facts fc ON f.fact_id = fc.id
      ORDER BY f.created_at DESC LIMIT 5
    `).all();

    res.json({
      factsCount,
      rulesCount,
      assetsCount,
      passportsCount,
      pendingImpactsCount,
      pendingReviewsCount,
      liveSourcesCount,
      liveStaleCount,
      pendingStagedUpdatesCount,
      recentAudits,
      recentFactChanges,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. APPROVED KNOWLEDGE BASE API (Facts, Controlled Versioning, Rules)
// -------------------------------------------------------------
app.get('/api/facts', (req, res) => {
  try {
    const { category, search, status } = req.query;
    let query = 'SELECT * FROM facts WHERE is_current = 1';
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR value LIKE ? OR key LIKE ? OR description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY category ASC, updated_at DESC';
    const facts = db.prepare(query).all(...params);
    res.json(facts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/facts', (req, res) => {
  try {
    const { key, name, value, description, category, source_ref, source_doc, effective_date, expiry_date, changed_by } = req.body;
    if (!key || !name || !value || !source_ref) {
      return res.status(400).json({ error: 'Key, Name, Value, and Source Reference are required.' });
    }

    const id = `fact-${Date.now()}`;
    const now = new Date().toISOString();
    const effDate = effective_date || now.split('T')[0];

    db.prepare(`
      INSERT INTO facts (id, key, name, value, description, category, source_ref, source_doc, status, version, effective_date, expiry_date, created_at, updated_at, is_current)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, ?, ?, ?, ?, 1)
    `).run(id, key, name, value, description || '', category || 'pricing', source_ref, source_doc || '', effDate, expiry_date || null, now, now);

    db.prepare(`
      INSERT INTO fact_history (id, fact_id, version, value, description, source_ref, status, changed_by, change_reason, created_at)
      VALUES (?, ?, 1, ?, ?, ?, 'approved', ?, 'Initial fact creation', ?)
    `).run(`hist-${id}-v1`, id, value, description || '', source_ref, changed_by || 'Knowledge Base Curator', now);

    logAuditEvent(
      'FACT_CREATED',
      changed_by || 'Curator',
      'Knowledge Curator',
      'FACT',
      id,
      `Created approved fact "${name}" (v1): "${value}" [Source: ${source_ref}]`
    );

    const fact = db.prepare('SELECT * FROM facts WHERE id = ?').get(id);
    res.status(201).json(fact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update approved fact with controlled versioning & trigger Change-Impact Intelligence!
app.put('/api/facts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { value, description, source_ref, source_doc, change_reason, changed_by } = req.body;

    const existingFact = db.prepare('SELECT * FROM facts WHERE id = ?').get(id) as Fact | undefined;
    if (!existingFact) {
      return res.status(404).json({ error: 'Fact not found.' });
    }

    if (!value || !change_reason) {
      return res.status(400).json({ error: 'New value and change reason are mandatory for controlled fact updates.' });
    }

    const oldVersion = existingFact.version;
    const newVersion = oldVersion + 1;
    const oldValue = existingFact.value;
    const now = new Date().toISOString();

    // 1. Update current fact record
    db.prepare(`
      UPDATE facts
      SET value = ?, description = ?, source_ref = ?, source_doc = ?, version = ?, updated_at = ?
      WHERE id = ?
    `).run(value, description || existingFact.description, source_ref || existingFact.source_ref, source_doc || existingFact.source_doc, newVersion, now, id);

    // 2. Insert new entry in fact_history
    const histId = `hist-${id}-v${newVersion}`;
    db.prepare(`
      INSERT INTO fact_history (id, fact_id, version, value, description, source_ref, status, changed_by, change_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)
    `).run(histId, id, newVersion, value, description || existingFact.description, source_ref || existingFact.source_ref, changed_by || 'Administrator', change_reason, now);

    logAuditEvent(
      'FACT_UPDATED',
      changed_by || 'Administrator',
      'Admin',
      'FACT',
      id,
      `Updated fact "${existingFact.name}" from v${oldVersion} ("${oldValue}") to v${newVersion} ("${value}"). Reason: ${change_reason}`
    );

    // 3. BRAND TIME MACHINE: Scan all reviewed assets and passports for impact!
    const allPassports = db.prepare(`
      SELECT p.id as passport_id, p.asset_id, p.asset_name, p.asset_version, p.claims_json, av.content
      FROM trust_passports p
      JOIN asset_versions av ON p.asset_id = av.asset_id AND p.asset_version = av.version
      WHERE p.is_latest = 1
    `).all() as any[];

    const pastAssets: ReviewedAssetSnapshot[] = allPassports.map((p) => {
      let claims: any[] = [];
      try {
        claims = JSON.parse(p.claims_json);
      } catch (e) {
        claims = [];
      }
      return {
        asset_id: p.asset_id,
        asset_name: p.asset_name,
        version: p.asset_version,
        content: p.content,
        passport_id: p.passport_id,
        verified_claims: claims.map((c) => ({
          claim_text: c.claim_text,
          matched_fact_id: c.matched_fact?.id || null,
          matched_fact_version: c.matched_fact?.version || null,
          approved_value_used: c.matched_fact?.approved_value || null,
        })),
      };
    });

    const impacts = detectChangeImpact(
      id,
      existingFact.name,
      oldVersion,
      newVersion,
      oldValue,
      value,
      pastAssets
    );

    // Save detected impacts into change_impacts table
    const insertImpact = db.prepare(`
      INSERT INTO change_impacts (id, fact_id, fact_name, old_version, new_version, old_value, new_value, asset_id, asset_name, asset_version, impacted_claim_text, impact_reason, impact_risk, alert_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);

    for (const impact of impacts) {
      // Check if duplicate pending alert exists
      const existingAlert = db.prepare(`
        SELECT id FROM change_impacts
        WHERE fact_id = ? AND asset_id = ? AND new_version = ? AND alert_status = 'PENDING'
      `).get(id, impact.asset_id, newVersion);

      if (!existingAlert) {
        const impactId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        insertImpact.run(
          impactId,
          impact.fact_id,
          impact.fact_name,
          impact.old_version,
          impact.new_version,
          impact.old_value,
          impact.new_value,
          impact.asset_id,
          impact.asset_name,
          impact.asset_version,
          impact.impacted_claim_text,
          impact.impact_reason,
          impact.impact_risk,
          now
        );

        // Mark asset as needing revalidation
        db.prepare(`
          UPDATE assets SET status = 'revalidation_required', updated_at = ? WHERE id = ?
        `).run(now, impact.asset_id);

        logAuditEvent(
          'CHANGE_IMPACT_DETECTED',
          'Brand Time Machine',
          'System AI',
          'ASSET',
          impact.asset_id,
          `Asset "${impact.asset_name}" flagged for revalidation due to updated fact "${existingFact.name}" (${impact.old_value} -> ${impact.new_value})`
        );
      }
    }

    const updatedFact = db.prepare('SELECT * FROM facts WHERE id = ?').get(id);
    res.json({
      fact: updatedFact,
      impactsCount: impacts.length,
      impacts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fact status change (mark disputed or expired)
app.post('/api/facts/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, actor } = req.body;
    if (!['approved', 'disputed', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE facts SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    logAuditEvent(
      'FACT_STATUS_CHANGED',
      actor || 'Governance Officer',
      'Compliance Officer',
      'FACT',
      id,
      `Status changed to "${status}". Reason: ${reason || 'Governance review'}`
    );

    const fact = db.prepare('SELECT * FROM facts WHERE id = ?').get(id);
    res.json(fact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fact version history
app.get('/api/facts/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const history = db.prepare('SELECT * FROM fact_history WHERE fact_id = ? ORDER BY version DESC').all(id);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Brand Rules
app.get('/api/rules', (req, res) => {
  try {
    const rules = db.prepare('SELECT * FROM brand_rules ORDER BY severity ASC, created_at DESC').all();
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rules', (req, res) => {
  try {
    const { rule_code, name, rule_type, constraint_value, description, severity } = req.body;
    if (!rule_code || !name || !constraint_value) {
      return res.status(400).json({ error: 'Rule code, name, and constraint value are required.' });
    }
    const id = `rule-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO brand_rules (id, rule_code, name, rule_type, constraint_value, description, severity, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(id, rule_code, name, rule_type || 'forbidden_term', constraint_value, description || '', severity || 'medium', now);

    logAuditEvent('RULE_CREATED', 'Policy Admin', 'Compliance Officer', 'RULE', id, `Created brand rule [${rule_code}]: "${name}"`);
    const rule = db.prepare('SELECT * FROM brand_rules WHERE id = ?').get(id);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. EVIDENCEGUARD VERIFICATION API (Claim-Level Verification)
// -------------------------------------------------------------
app.post('/api/verify', async (req, res) => {
  try {
    const { content, asset_name, channel } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required for verification.' });
    }

    const approvedFacts = db.prepare('SELECT * FROM facts WHERE is_current = 1').all() as unknown as Fact[];
    const brandRules = db.prepare("SELECT * FROM brand_rules WHERE status = 'active'").all() as unknown as BrandRule[];

    const { findings, engineUsed, processingTimeMs } = await runEvidenceGuardVerification(
      content,
      approvedFacts,
      brandRules
    );

    const governanceResult = calculateGovernanceScore(findings);

    res.json({
      asset_name: asset_name || 'Marketing Draft',
      channel: channel || 'Website',
      content,
      findings,
      summary: governanceResult.summary,
      governance_score: governanceResult.score,
      overall_status: governanceResult.status,
      engine_used: engineUsed,
      processing_time_ms: processingTimeMs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. TRUST PASSPORT & ASSET ISSUE API (Step 4 & 7)
// -------------------------------------------------------------
app.post('/api/passports', (req, res) => {
  try {
    const {
      asset_id,
      asset_name,
      channel,
      content,
      findings,
      governance_score,
      overall_status,
      reviewer_name,
      reviewer_role,
      decision,
      decision_rationale,
      engine_used,
    } = req.body;

    if (!content || !findings || !asset_name) {
      return res.status(400).json({ error: 'Asset name, content, and findings are required.' });
    }

    const now = new Date().toISOString();
    let targetAssetId = asset_id;
    let nextVersion = 1;

    // Check if asset already exists
    if (targetAssetId) {
      const existingAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(targetAssetId) as any;
      if (existingAsset) {
        nextVersion = existingAsset.current_version + 1;
        db.prepare('UPDATE assets SET current_version = ?, status = ?, updated_at = ? WHERE id = ?').run(
          nextVersion,
          overall_status === 'PASSED' ? 'verified' : 'pending_review',
          now,
          targetAssetId
        );
      }
    } else {
      targetAssetId = `asset-${Date.now()}`;
      db.prepare(`
        INSERT INTO assets (id, name, channel, current_version, status, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?)
      `).run(targetAssetId, asset_name, channel || 'Website', overall_status === 'PASSED' ? 'verified' : 'pending_review', now, now);
    }

    // Save asset version
    const versionId = `ver-${targetAssetId}-v${nextVersion}`;
    db.prepare(`
      INSERT INTO asset_versions (id, asset_id, version, content, author, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(versionId, targetAssetId, nextVersion, content, reviewer_name || 'Content Author', now);

    // Save audit run
    const auditRunId = `audit-${Date.now()}`;
    const findingsList = Array.isArray(findings) ? findings : [];
    const supported = findingsList.filter((f: any) => f.status === 'SUPPORTED').length;
    const contradicted = findingsList.filter((f: any) => f.status === 'CONTRADICTED').length;
    const unverified = findingsList.filter((f: any) => f.status === 'UNVERIFIED').length;

    db.prepare(`
      INSERT INTO audit_runs (id, asset_id, asset_version, overall_status, governance_score, claims_count, supported_count, contradicted_count, unverified_count, findings_json, engine_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditRunId,
      targetAssetId,
      nextVersion,
      overall_status || 'PASSED',
      governance_score || 100,
      findingsList.length,
      supported,
      contradicted,
      unverified,
      JSON.stringify(findingsList),
      engine_used || 'EvidenceGuard Engine',
      now
    );

    // Gather unique evidence references
    const evidenceMap = new Map<string, any>();
    for (const f of findingsList) {
      if (f.matched_fact) {
        evidenceMap.set(f.matched_fact.source_ref, {
          source_ref: f.matched_fact.source_ref,
          fact_name: f.matched_fact.name,
          version: f.matched_fact.version,
          approved_value: f.matched_fact.approved_value,
        });
      }
    }
    const evidenceSources = Array.from(evidenceMap.values());

    // Mark previous passport as non-latest
    const previousPassport = db.prepare('SELECT id FROM trust_passports WHERE asset_id = ? AND is_latest = 1').get(targetAssetId) as any;
    if (previousPassport) {
      db.prepare('UPDATE trust_passports SET is_latest = 0 WHERE asset_id = ?').run(targetAssetId);
    }

    const passportId = `pass-${Date.now()}`;
    const passportCode = `BP-PASS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    db.prepare(`
      INSERT INTO trust_passports (id, passport_code, asset_id, asset_name, asset_version, audit_run_id, overall_status, governance_score, claims_json, evidence_sources_json, reviewer_name, reviewer_role, human_decision, decision_rationale, decision_timestamp, previous_passport_id, is_latest, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      passportId,
      passportCode,
      targetAssetId,
      asset_name,
      nextVersion,
      auditRunId,
      overall_status || 'PASSED',
      governance_score || 100,
      JSON.stringify(findingsList),
      JSON.stringify(evidenceSources),
      reviewer_name || 'Compliance Reviewer',
      reviewer_role || 'Brand Officer',
      decision || (overall_status === 'PASSED' ? 'APPROVED' : 'PENDING'),
      decision_rationale || 'Verified against Acme Approved Knowledge Base.',
      now,
      previousPassport?.id || null,
      now
    );

    logAuditEvent(
      'TRUST_PASSPORT_ISSUED',
      reviewer_name || 'Compliance Reviewer',
      reviewer_role || 'Brand Officer',
      'TRUST_PASSPORT',
      passportCode,
      `Trust Passport ${passportCode} issued for "${asset_name}" v${nextVersion}. Status: ${overall_status}`
    );

    const savedPassport = db.prepare('SELECT * FROM trust_passports WHERE id = ?').get(passportId);
    res.status(201).json(savedPassport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/passports', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM trust_passports WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND overall_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (passport_code LIKE ? OR asset_name LIKE ? OR reviewer_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY created_at DESC';
    const passports = db.prepare(query).all(...params);
    res.json(passports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/passports/:id', (req, res) => {
  try {
    const { id } = req.params;
    const passport = db.prepare('SELECT * FROM trust_passports WHERE id = ? OR passport_code = ?').get(id, id) as any;
    if (!passport) {
      return res.status(404).json({ error: 'Trust Passport not found.' });
    }

    // Get asset version content
    const assetVersion = db.prepare(`
      SELECT * FROM asset_versions WHERE asset_id = ? AND version = ?
    `).get(passport.asset_id, passport.asset_version) as any;

    // Get previous passport if exists
    let previousPassport = null;
    if (passport.previous_passport_id) {
      previousPassport = db.prepare('SELECT * FROM trust_passports WHERE id = ?').get(passport.previous_passport_id);
    }

    res.json({
      ...passport,
      content: assetVersion?.content || '',
      previous_passport: previousPassport,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4B. DEDICATED AUDIT LIFECYCLE & REVIEW API (New Audit & Review Audit)
// -------------------------------------------------------------
app.get('/api/audits', (req, res) => {
  try {
    const { search, brand, status, review_state } = req.query;
    let query = `
      SELECT
        ar.id,
        COALESCE(ar.brand, a.brand, 'Acme Technologies') as brand,
        COALESCE(a.name, 'Untitled Audit') as audit_name,
        COALESCE(a.channel, 'Website') as channel,
        ar.asset_id,
        ar.asset_version,
        ar.overall_status,
        ar.governance_score,
        ar.claims_count,
        ar.supported_count,
        ar.contradicted_count,
        ar.unverified_count,
        ar.findings_json,
        ar.engine_used,
        COALESCE(ar.review_status, tp.human_decision, 'PENDING_REVIEW') as review_status,
        COALESCE(ar.reviewer_name, tp.reviewer_name) as reviewer_name,
        COALESCE(ar.reviewer_role, tp.reviewer_role) as reviewer_role,
        COALESCE(ar.reviewer_notes, tp.decision_rationale) as reviewer_notes,
        COALESCE(ar.reviewed_at, tp.decision_timestamp) as reviewed_at,
        tp.passport_code,
        av.content,
        ar.created_at,
        COALESCE(ar.reviewed_at, ar.created_at) as updated_at
      FROM audit_runs ar
      LEFT JOIN assets a ON ar.asset_id = a.id
      LEFT JOIN asset_versions av ON ar.asset_id = av.asset_id AND ar.asset_version = av.version
      LEFT JOIN trust_passports tp ON ar.id = tp.audit_run_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all' && status !== 'ALL') {
      query += ' AND ar.overall_status = ?';
      params.push(status);
    }
    if (brand && brand !== 'all' && brand !== 'ALL') {
      query += ' AND (ar.brand = ? OR a.brand = ?)';
      params.push(brand, brand);
    }
    if (review_state && review_state !== 'all' && review_state !== 'ALL') {
      query += ' AND (ar.review_status = ? OR tp.human_decision = ?)';
      params.push(review_state, review_state);
    }
    if (search) {
      query += ' AND (a.name LIKE ? OR ar.id LIKE ? OR av.content LIKE ? OR ar.brand LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY ar.created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    const audits = rows.map((r) => {
      let findings: any[] = [];
      try {
        findings = JSON.parse(r.findings_json || '[]');
      } catch {}

      const evidenceSources = Array.from(
        new Set(findings.map((f: any) => f.matched_fact?.source_ref).filter(Boolean))
      );

      return {
        id: r.id,
        audit_name: r.audit_name,
        brand: r.brand,
        channel: r.channel,
        content: r.content || '',
        asset_id: r.asset_id,
        asset_version: r.asset_version,
        overall_status: r.overall_status,
        governance_score: r.governance_score,
        claims_count: r.claims_count,
        supported_count: r.supported_count,
        contradicted_count: r.contradicted_count,
        unverified_count: r.unverified_count,
        findings,
        evidence_sources: evidenceSources,
        engine_used: r.engine_used,
        review_status: r.review_status || 'PENDING_REVIEW',
        reviewer_name: r.reviewer_name || null,
        reviewer_role: r.reviewer_role || null,
        reviewer_notes: r.reviewer_notes || null,
        reviewed_at: r.reviewed_at || null,
        passport_code: r.passport_code || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    res.json(audits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audits/:id', (req, res) => {
  try {
    const { id } = req.params;
    const audit = db.prepare(`
      SELECT
        ar.id,
        COALESCE(ar.brand, a.brand, 'Acme Technologies') as brand,
        COALESCE(a.name, 'Untitled Audit') as audit_name,
        COALESCE(a.channel, 'Website') as channel,
        ar.asset_id,
        ar.asset_version,
        ar.overall_status,
        ar.governance_score,
        ar.claims_count,
        ar.supported_count,
        ar.contradicted_count,
        ar.unverified_count,
        ar.findings_json,
        ar.engine_used,
        COALESCE(ar.review_status, tp.human_decision, 'PENDING_REVIEW') as review_status,
        COALESCE(ar.reviewer_name, tp.reviewer_name) as reviewer_name,
        COALESCE(ar.reviewer_role, tp.reviewer_role) as reviewer_role,
        COALESCE(ar.reviewer_notes, tp.decision_rationale) as reviewer_notes,
        COALESCE(ar.reviewed_at, tp.decision_timestamp) as reviewed_at,
        tp.passport_code,
        av.content,
        ar.created_at,
        COALESCE(ar.reviewed_at, ar.created_at) as updated_at
      FROM audit_runs ar
      LEFT JOIN assets a ON ar.asset_id = a.id
      LEFT JOIN asset_versions av ON ar.asset_id = av.asset_id AND ar.asset_version = av.version
      LEFT JOIN trust_passports tp ON ar.id = tp.audit_run_id
      WHERE ar.id = ? OR tp.id = ? OR tp.passport_code = ?
    `).get(id, id, id) as any;

    if (!audit) {
      return res.status(404).json({ error: 'Audit record not found.' });
    }

    let findings: any[] = [];
    try {
      findings = JSON.parse(audit.findings_json || '[]');
    } catch {}

    const evidenceSources = Array.from(
      new Set(findings.map((f: any) => f.matched_fact?.source_ref).filter(Boolean))
    );

    res.json({
      id: audit.id,
      audit_name: audit.audit_name,
      brand: audit.brand,
      channel: audit.channel,
      content: audit.content || '',
      asset_id: audit.asset_id,
      asset_version: audit.asset_version,
      overall_status: audit.overall_status,
      governance_score: audit.governance_score,
      claims_count: audit.claims_count,
      supported_count: audit.supported_count,
      contradicted_count: audit.contradicted_count,
      unverified_count: audit.unverified_count,
      findings,
      evidence_sources: evidenceSources,
      engine_used: audit.engine_used,
      review_status: audit.review_status || 'PENDING_REVIEW',
      reviewer_name: audit.reviewer_name || null,
      reviewer_role: audit.reviewer_role || null,
      reviewer_notes: audit.reviewer_notes || null,
      reviewed_at: audit.reviewed_at || null,
      passport_code: audit.passport_code || null,
      created_at: audit.created_at,
      updated_at: audit.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audits', async (req, res) => {
  try {
    const {
      audit_name,
      brand,
      channel,
      content,
      knowledge_base_category,
      evidence_sources,
      reviewer_name,
      auto_passport,
    } = req.body;

    if (!audit_name || !audit_name.trim()) {
      return res.status(400).json({ error: 'Audit name is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Claim content or marketing draft text is required.' });
    }

    const brandName = brand || 'Acme Technologies';
    const channelName = channel || 'Website';
    const now = new Date().toISOString();

    // Query approved facts and rules
    let factsQuery = 'SELECT * FROM facts WHERE is_current = 1';
    const factsParams: any[] = [];
    if (knowledge_base_category && knowledge_base_category !== 'all') {
      factsQuery += ' AND category = ?';
      factsParams.push(knowledge_base_category);
    }
    const approvedFacts = db.prepare(factsQuery).all(...factsParams) as unknown as Fact[];
    const brandRules = db.prepare("SELECT * FROM brand_rules WHERE status = 'active'").all() as unknown as BrandRule[];

    // Execute verification
    const { findings, engineUsed, processingTimeMs } = await runEvidenceGuardVerification(
      content,
      approvedFacts,
      brandRules
    );

    const governanceResult = calculateGovernanceScore(findings);
    const supported = findings.filter((f) => f.status === 'SUPPORTED').length;
    const contradicted = findings.filter((f) => f.status === 'CONTRADICTED').length;
    const unverified = findings.filter((f) => f.status === 'UNVERIFIED').length;

    // Create asset
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO assets (id, name, channel, current_version, status, brand, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      assetId,
      audit_name.trim(),
      channelName,
      governanceResult.status === 'PASSED' ? 'verified' : 'pending_review',
      brandName,
      now,
      now
    );

    // Save asset version
    const versionId = `ver-${assetId}-v1`;
    db.prepare(`
      INSERT INTO asset_versions (id, asset_id, version, content, author, created_at)
      VALUES (?, ?, 1, ?, ?, ?)
    `).run(versionId, assetId, content, reviewer_name || 'Brand Compliance Auditor', now);

    // Save audit run
    const auditRunId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reviewStatus = governanceResult.status === 'PASSED' ? 'APPROVED' : 'PENDING_REVIEW';
    const evidenceList = Array.isArray(evidence_sources) && evidence_sources.length > 0
      ? evidence_sources
      : Array.from(new Set(findings.map((f) => f.matched_fact?.source_ref).filter(Boolean)));

    db.prepare(`
      INSERT INTO audit_runs (
        id, asset_id, asset_version, overall_status, governance_score,
        claims_count, supported_count, contradicted_count, unverified_count,
        findings_json, engine_used, brand, review_status, reviewer_name,
        reviewer_notes, evidence_sources_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditRunId,
      assetId,
      1,
      governanceResult.status,
      governanceResult.score,
      findings.length,
      supported,
      contradicted,
      unverified,
      JSON.stringify(findings),
      engineUsed,
      brandName,
      reviewStatus,
      reviewer_name || null,
      governanceResult.status === 'PASSED' ? 'Automated pre-verification passed with 100% compliance.' : 'Pending human compliance sign-off.',
      JSON.stringify(evidenceList),
      now
    );

    let passportCode: string | null = null;
    if (auto_passport !== false) {
      const passportId = `pass-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      passportCode = `BP-PASS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare(`
        INSERT INTO trust_passports (
          id, passport_code, asset_id, asset_name, asset_version, audit_run_id,
          overall_status, governance_score, claims_json, evidence_sources_json,
          reviewer_name, reviewer_role, human_decision, decision_rationale,
          decision_timestamp, is_latest, created_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        passportId,
        passportCode,
        assetId,
        audit_name.trim(),
        auditRunId,
        governanceResult.status,
        governanceResult.score,
        JSON.stringify(findings),
        JSON.stringify(evidenceList),
        reviewer_name || 'System Auditor',
        'Compliance Reviewer',
        reviewStatus,
        governanceResult.status === 'PASSED' ? 'Automatic baseline verification passed.' : 'Initial audit completed; awaiting reviewer sign-off.',
        now,
        now
      );
    }

    logAuditEvent(
      'AUDIT_EXECUTED',
      reviewer_name || 'Auditor',
      'Compliance Specialist',
      'AUDIT_RUN',
      auditRunId,
      `Executed brand audit "${audit_name}" for brand "${brandName}": ${supported} supported, ${contradicted} contradicted, ${unverified} unverified. Score: ${governanceResult.score}%`
    );

    const savedAudit = {
      id: auditRunId,
      audit_name: audit_name.trim(),
      brand: brandName,
      channel: channelName,
      content,
      asset_id: assetId,
      asset_version: 1,
      overall_status: governanceResult.status,
      governance_score: governanceResult.score,
      claims_count: findings.length,
      supported_count: supported,
      contradicted_count: contradicted,
      unverified_count: unverified,
      findings,
      evidence_sources: evidenceList,
      engine_used: engineUsed,
      review_status: reviewStatus,
      reviewer_name: reviewer_name || null,
      reviewer_role: 'Compliance Reviewer',
      reviewer_notes: governanceResult.status === 'PASSED' ? 'Automated pre-verification passed.' : 'Pending human compliance sign-off.',
      reviewed_at: governanceResult.status === 'PASSED' ? now : null,
      passport_code: passportCode,
      created_at: now,
      updated_at: now,
    };

    res.status(201).json(savedAudit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audits/:id/decision', (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reviewer_name, reviewer_role, reviewer_notes } = req.body;

    if (!decision || !['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Valid decision (APPROVED, CHANGES_REQUESTED, REJECTED) is required.' });
    }

    const auditRun = db.prepare('SELECT * FROM audit_runs WHERE id = ?').get(id) as any;
    if (!auditRun) {
      return res.status(404).json({ error: 'Audit run not found.' });
    }

    const now = new Date().toISOString();
    const reviewer = reviewer_name || 'Brand Reviewer';
    const role = reviewer_role || 'Governance Lead';
    const notes = reviewer_notes || `Review decision recorded: ${decision}`;

    // Update audit run
    db.prepare(`
      UPDATE audit_runs
      SET review_status = ?, reviewer_name = ?, reviewer_role = ?, reviewer_notes = ?, reviewed_at = ?
      WHERE id = ?
    `).run(decision, reviewer, role, notes, now, id);

    // Update associated trust passport
    db.prepare(`
      UPDATE trust_passports
      SET human_decision = ?, reviewer_name = ?, reviewer_role = ?, decision_rationale = ?, decision_timestamp = ?
      WHERE audit_run_id = ?
    `).run(decision, reviewer, role, notes, now, id);

    // Update asset status
    const assetStatus = decision === 'APPROVED' ? 'verified' : decision === 'REJECTED' ? 'rejected' : 'pending_review';
    db.prepare('UPDATE assets SET status = ?, updated_at = ? WHERE id = ?').run(assetStatus, now, auditRun.asset_id);

    logAuditEvent(
      'AUDIT_DECISION_RECORDED',
      reviewer,
      role,
      'AUDIT_RUN',
      id,
      `Recorded review decision "${decision}" for audit ${id}. Rationale: "${notes}"`
    );

    res.json({ success: true, message: `Decision "${decision}" saved successfully.`, updated_at: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------
// 5. BRAND TIME MACHINE: REVALIDATION QUEUE & CHANGE IMPACTS
// -------------------------------------------------------------
app.get('/api/impacts', (req, res) => {
  try {
    const impacts = db.prepare(`
      SELECT * FROM change_impacts
      ORDER BY alert_status ASC, created_at DESC
    `).all();
    res.json(impacts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/impacts/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by, action } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE change_impacts
      SET alert_status = ?, resolved_by = ?, resolved_at = ?
      WHERE id = ?
    `).run(action === 'dismiss' ? 'DISMISSED' : 'REVALIDATED', resolved_by || 'Reviewer', now, id);

    logAuditEvent(
      'CHANGE_IMPACT_RESOLVED',
      resolved_by || 'Reviewer',
      'Compliance Officer',
      'CHANGE_IMPACT',
      id,
      `Impact alert marked as ${action === 'dismiss' ? 'DISMISSED' : 'REVALIDATED'}`
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. HUMAN REVIEW QUEUE & AUDIT DECISIONS (Module 5)
// -------------------------------------------------------------
app.get('/api/reviews', (req, res) => {
  try {
    // Get assets needing review (revalidation_required or pending_review or with pending impacts)
    const items = db.prepare(`
      SELECT a.id as asset_id, a.name as asset_name, a.channel, a.current_version, a.status, a.updated_at,
             p.id as passport_id, p.passport_code, p.governance_score, p.overall_status, p.claims_json,
             av.content,
             (SELECT COUNT(*) FROM change_impacts ci WHERE ci.asset_id = a.id AND ci.alert_status = 'PENDING') as pending_impact_count
      FROM assets a
      LEFT JOIN trust_passports p ON a.id = p.asset_id AND p.is_latest = 1
      LEFT JOIN asset_versions av ON a.id = av.asset_id AND av.version = a.current_version
      ORDER BY pending_impact_count DESC, a.updated_at DESC
    `).all();

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews/:assetId/decision', (req, res) => {
  try {
    const { assetId } = req.params;
    const { decision, rationale, reviewer_name, reviewer_role, updated_content } = req.body;

    if (!decision || !rationale) {
      return res.status(400).json({ error: 'Review decision and rationale are required.' });
    }

    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as any;
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const now = new Date().toISOString();
    let newAssetStatus = 'verified';
    if (decision === 'CHANGES_REQUESTED') newAssetStatus = 'pending_review';
    if (decision === 'REJECTED') newAssetStatus = 'rejected';

    // If content was updated or revalidated, create new version and passport
    const newVersion = asset.current_version + 1;
    const contentToSave = updated_content || (db.prepare('SELECT content FROM asset_versions WHERE asset_id = ? AND version = ?').get(assetId, asset.current_version) as any)?.content || '';

    // Create new asset version
    db.prepare(`
      INSERT INTO asset_versions (id, asset_id, version, content, author, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`ver-${assetId}-v${newVersion}`, assetId, newVersion, contentToSave, reviewer_name || 'Reviewer', now);

    // Update asset
    db.prepare('UPDATE assets SET current_version = ?, status = ?, updated_at = ? WHERE id = ?').run(
      newVersion,
      newAssetStatus,
      now,
      assetId
    );

    // Resolve any pending change impacts for this asset
    db.prepare(`
      UPDATE change_impacts
      SET alert_status = 'REVALIDATED', resolved_by = ?, resolved_at = ?
      WHERE asset_id = ? AND alert_status = 'PENDING'
    `).run(reviewer_name || 'Reviewer', now, assetId);

    // Retrieve previous latest passport
    const prevPassport = db.prepare('SELECT * FROM trust_passports WHERE asset_id = ? AND is_latest = 1').get(assetId) as any;
    if (prevPassport) {
      db.prepare('UPDATE trust_passports SET is_latest = 0 WHERE asset_id = ?').run(assetId);
    }

    // Issue updated Trust Passport
    const passportId = `pass-${Date.now()}`;
    const passportCode = `BP-PASS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    db.prepare(`
      INSERT INTO trust_passports (id, passport_code, asset_id, asset_name, asset_version, audit_run_id, overall_status, governance_score, claims_json, evidence_sources_json, reviewer_name, reviewer_role, human_decision, decision_rationale, decision_timestamp, previous_passport_id, is_latest, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      passportId,
      passportCode,
      assetId,
      asset.name,
      newVersion,
      prevPassport?.audit_run_id || 'manual-review',
      decision === 'APPROVED' ? 'PASSED' : decision === 'CONDITIONAL' ? 'CONDITIONAL' : 'FAILED',
      decision === 'APPROVED' ? 100 : 70,
      prevPassport?.claims_json || '[]',
      prevPassport?.evidence_sources_json || '[]',
      reviewer_name || 'Senior Compliance Reviewer',
      reviewer_role || 'Brand Governance Lead',
      decision,
      rationale,
      now,
      prevPassport?.id || null,
      now
    );

    logAuditEvent(
      'HUMAN_DECISION_RECORDED',
      reviewer_name || 'Reviewer',
      reviewer_role || 'Brand Governance Lead',
      'ASSET',
      assetId,
      `Decision recorded: "${decision}" for "${asset.name}" v${newVersion}. Rationale: ${rationale}`
    );

    const updatedPassport = db.prepare('SELECT * FROM trust_passports WHERE id = ?').get(passportId);
    res.json({ success: true, passport: updatedPassport });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. AUDIT LOGS (Module 5 & Step 7)
// -------------------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. LIVE DATA CONNECTORS & STAGED FACT GOVERNANCE
// -------------------------------------------------------------
// Upstream Live Feeds (Simulated Provider Endpoints)
app.get('/api/live-demo/pricing', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(getUpstreamPricingData());
});

app.get('/api/live-demo/sla', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json(getUpstreamSlaData());
});

app.post('/api/live-demo/simulate-upstream-change', (req, res) => {
  const { newPrice, newSla } = req.body;
  if (newPrice) setUpstreamPricingState(newPrice);
  if (newSla) setUpstreamSlaState(newSla);
  res.json({
    success: true,
    pricing: getUpstreamPricingData(),
    sla: getUpstreamSlaData(),
  });
});

// List configured live sources
app.get('/api/live-sources', (req, res) => {
  try {
    const sources = db.prepare('SELECT * FROM live_sources ORDER BY created_at ASC').all() as any[];
    const enriched = sources.map((s) => ({
      ...s,
      data_freshness: calculateFreshness(s.last_sync_at, s.sync_interval_mins, s.last_sync_status),
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add custom live connector
app.post('/api/live-sources', (req, res) => {
  try {
    const { name, source_type, endpoint_url, auth_type, auth_header_name, auth_token_env_var, sync_interval_mins } = req.body;
    if (!name || !endpoint_url) {
      return res.status(400).json({ error: 'Name and endpoint URL are required.' });
    }
    const id = `src-custom-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO live_sources (
        id, name, source_type, endpoint_url, auth_type, auth_header_name,
        auth_token_env_var, sync_interval_mins, last_sync_status, data_freshness,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEVER_SYNCED', 'UNKNOWN', 1, ?, ?)
    `).run(
      id,
      name,
      source_type || 'rest_api',
      endpoint_url,
      auth_type || 'none',
      auth_header_name || null,
      auth_token_env_var || null,
      Number(sync_interval_mins) || 60,
      now,
      now
    );

    logAuditEvent(
      'LIVE_CONNECTOR_CONFIGURED',
      'Integration Administrator',
      'Admin',
      'LIVE_SOURCE',
      id,
      `Configured new live data connector: ${name} (${endpoint_url})`
    );

    res.status(201).json({ id, message: 'Live data connector created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete live connector
app.delete('/api/live-sources/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM live_sources WHERE id = ?').run(id);
    logAuditEvent(
      'LIVE_CONNECTOR_REMOVED',
      'Integration Administrator',
      'Admin',
      'LIVE_SOURCE',
      id,
      `Removed live data connector ${id}`
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync single live source
app.post('/api/live-sources/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const appUrl = `${req.protocol}://${req.get('host')}`;
    const result = await syncLiveSource(id, appUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all active live sources
app.post('/api/live-sources/sync-all', async (req, res) => {
  try {
    const sources = db.prepare('SELECT id FROM live_sources WHERE is_active = 1').all() as any[];
    const appUrl = `${req.protocol}://${req.get('host')}`;
    const results = [];
    for (const s of sources) {
      const r = await syncLiveSource(s.id, appUrl);
      results.push({ sourceId: s.id, ...r });
    }
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List staged fact updates awaiting human governance review
app.get('/api/live-sources/staged-updates', (req, res) => {
  try {
    const updates = db.prepare(`
      SELECT * FROM staged_fact_updates
      ORDER BY detected_at DESC
    `).all();
    res.json(updates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Decide (Approve / Reject) staged fact update
app.post('/api/live-sources/staged-updates/:id/decide', (req, res) => {
  try {
    const { id } = req.params;
    const { action, rationale, reviewer_name } = req.body;
    if (!rationale) {
      return res.status(400).json({ error: 'Reviewer rationale is mandatory when deciding on live fact updates.' });
    }

    const staged = db.prepare('SELECT * FROM staged_fact_updates WHERE id = ?').get(id) as any;
    if (!staged) {
      return res.status(404).json({ error: 'Staged fact update record not found.' });
    }

    const now = new Date().toISOString();
    const reviewer = reviewer_name || 'Sarah Jenkins (Brand Compliance Lead)';

    if (action === 'APPROVE') {
      const currentFact = db.prepare('SELECT * FROM facts WHERE key = ? AND is_current = 1').get(staged.fact_key) as unknown as Fact;
      if (!currentFact) {
        return res.status(404).json({ error: `Fact with key ${staged.fact_key} not found in Knowledge Base.` });
      }

      const oldVersion = currentFact.version;
      const newVersion = oldVersion + 1;
      const oldValue = currentFact.value;
      const newValue = staged.retrieved_live_value;

      // 1. Archive in fact_history
      const historyId = `fh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO fact_history (id, fact_id, version, value, description, source_ref, status, changed_by, change_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        historyId,
        currentFact.id,
        oldVersion,
        oldValue,
        currentFact.description,
        currentFact.source_ref,
        'superseded',
        reviewer,
        `Approved live feed update from ${staged.source_name}: ${rationale}`,
        now
      );

      // 2. Update facts table
      db.prepare(`
        UPDATE facts
        SET value = ?, version = ?, source_ref = ?, updated_at = ?
        WHERE id = ?
      `).run(newValue, newVersion, staged.source_ref, now, currentFact.id);

      // 3. Brand Time Machine: detect retroactive change impacts
      const allPassports = db.prepare(`
        SELECT p.id as passport_id, p.asset_id, p.asset_name, p.asset_version, p.claims_json, av.content
        FROM trust_passports p
        JOIN asset_versions av ON p.asset_id = av.asset_id AND p.asset_version = av.version
        WHERE p.is_latest = 1
      `).all() as any[];

      const monitoredAssets: ReviewedAssetSnapshot[] = allPassports.map((p) => {
        let claims = [];
        try {
          claims = JSON.parse(p.claims_json);
        } catch {}
        return {
          asset_id: p.asset_id,
          asset_name: p.asset_name,
          version: p.asset_version,
          content: p.content,
          passport_id: p.passport_id,
          verified_claims: claims.map((c: any) => ({
            claim_text: c.claim_text,
            matched_fact_id: c.matched_fact?.id || null,
            matched_fact_version: c.matched_fact?.version || null,
            approved_value_used: c.matched_fact?.approved_value || null,
          })),
        };
      });

      const impacts = detectChangeImpact(
        currentFact.id,
        currentFact.name,
        oldVersion,
        newVersion,
        oldValue,
        newValue,
        monitoredAssets
      );

      const insertImpact = db.prepare(`
        INSERT INTO change_impacts (
          id, fact_id, fact_name, old_version, new_version, old_value, new_value,
          asset_id, asset_name, asset_version, impacted_claim_text, impact_reason,
          impact_risk, alert_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `);

      for (const imp of impacts) {
        const impactId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        insertImpact.run(
          impactId,
          imp.fact_id,
          imp.fact_name,
          imp.old_version,
          imp.new_version,
          imp.old_value,
          imp.new_value,
          imp.asset_id,
          imp.asset_name,
          imp.asset_version,
          imp.impacted_claim_text,
          imp.impact_reason,
          imp.impact_risk,
          now
        );

        db.prepare(`
          UPDATE assets
          SET status = 'revalidation_required', updated_at = ?
          WHERE id = ?
        `).run(now, imp.asset_id);
      }

      // 4. Mark staged update as APPROVED
      db.prepare(`
        UPDATE staged_fact_updates
        SET status = 'APPROVED', reviewer_name = ?, reviewer_decision_at = ?,
            decision_rationale = ?, impact_alerts_generated = ?
        WHERE id = ?
      `).run(reviewer, now, rationale, impacts.length, id);

      logAuditEvent(
        'LIVE_FACT_APPROVED_BY_HUMAN',
        reviewer,
        'Brand Compliance Lead',
        'FACT',
        currentFact.id,
        `Approved live update for "${currentFact.name}" (${oldValue} -> ${newValue}). Generated ${impacts.length} change-impact alert(s). Rationale: ${rationale}`
      );

      res.json({
        success: true,
        action: 'APPROVED',
        fact_id: currentFact.id,
        old_value: oldValue,
        new_value: newValue,
        impacts_generated: impacts.length,
      });
    } else {
      // REJECT
      db.prepare(`
        UPDATE staged_fact_updates
        SET status = 'REJECTED', reviewer_name = ?, reviewer_decision_at = ?,
            decision_rationale = ?
        WHERE id = ?
      `).run(reviewer, now, rationale, id);

      logAuditEvent(
        'LIVE_FACT_REJECTED_BY_HUMAN',
        reviewer,
        'Brand Compliance Lead',
        'STAGED_FACT',
        id,
        `Rejected live update for "${staged.fact_name}". Rationale: ${rationale}`
      );

      res.json({ success: true, action: 'REJECTED' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. DEMO RESET & EVALUATION TEST SUITE (Section 11 & 12)
// -------------------------------------------------------------
app.post('/api/demo/reset', (req, res) => {
  try {
    resetDbToDemo();
    res.json({ success: true, message: 'Database successfully reset to Acme Technologies baseline demonstration state.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const approvedFacts = db.prepare('SELECT * FROM facts WHERE is_current = 1').all() as unknown as Fact[];
    const brandRules = db.prepare("SELECT * FROM brand_rules WHERE status = 'active'").all() as unknown as BrandRule[];

    // Standardized labeled benchmark test suite
    const testCases = [
      {
        text: 'Acme Cloud Pro is priced at ₹999/month for all customers.',
        expected: 'SUPPORTED',
        category: 'pricing',
      },
      {
        text: 'Sign up for Acme Cloud Pro for just ₹799/month today.',
        expected: 'CONTRADICTED',
        category: 'pricing',
      },
      {
        text: 'Enterprise Cloud SLA guarantees 99.99% uptime availability.',
        expected: 'SUPPORTED',
        category: 'sla',
      },
      {
        text: 'Our cloud uptime SLA is 99.5% for standard accounts.',
        expected: 'CONTRADICTED',
        category: 'sla',
      },
      {
        text: 'Enjoy a risk-free 14 days trial before being billed.',
        expected: 'SUPPORTED',
        category: 'policy',
      },
      {
        text: 'Enjoy a 30-day trial with all premium features.',
        expected: 'CONTRADICTED',
        category: 'policy',
      },
      {
        text: 'Our platform is guaranteed 100% bug-free in all deployments.',
        expected: 'CONTRADICTED',
        category: 'rule_violation',
      },
      {
        text: 'Acme Technologies was founded by former astronauts in Zurich.',
        expected: 'UNVERIFIED',
        category: 'unverified_claim',
      },
    ];

    let correctCount = 0;
    const results = [];

    for (const tc of testCases) {
      const { findings } = await runEvidenceGuardVerification(tc.text, approvedFacts, brandRules);
      const actual = findings[0]?.status || 'UNVERIFIED';
      const isCorrect = actual === tc.expected;
      if (isCorrect) correctCount++;
      results.push({
        claim: tc.text,
        expected: tc.expected,
        actual,
        passed: isCorrect,
        explanation: findings[0]?.explanation || '',
      });
    }

    const accuracy = Math.round((correctCount / testCases.length) * 100);

    res.json({
      total_tests: testCases.length,
      passed_tests: correctCount,
      accuracy_percentage: accuracy,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC ASSET MOUNT
// -------------------------------------------------------------
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.K_SERVICE !== undefined ||
    process.argv[1]?.includes('dist/server.js');

  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrandPulse Sentinel AI server running on port ${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

startServer();

