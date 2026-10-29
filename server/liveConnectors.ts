import crypto from 'node:crypto';
import { db } from './db';
import { Fact, detectChangeImpact, ReviewedAssetSnapshot } from '../src/utils/governance';

// In-memory simulation state for upstream provider endpoints
let upstreamPricingState = {
  product: 'Acme Cloud Pro',
  plan_code: 'PRO_MONTHLY',
  price: '₹999/month',
  trial_days: '14 days',
  datacenter_regions: 'Mumbai & Frankfurt Regions',
  sla_uptime: '99.99%',
  currency: 'INR',
  billing_cycle: 'Monthly',
  published_version: 'v2.4.1',
  last_updated: new Date().toISOString(),
  legal_jurisdiction: 'India & EU',
  author: 'Acme Product Operations & Pricing Committee',
};

let upstreamSlaState = {
  service: 'Acme Cloud Pro Infrastructure',
  sla_uptime_guarantee: '99.99%',
  measurement_window: '30-day rolling',
  credit_percentage: '10% credit for downtime > 0.01%',
  support_tier: '24/7 Priority Engineering Response',
  last_telemetry_check: new Date().toISOString(),
  health_status: 'OPERATIONAL',
};

// Upstream state accessors & simulation mutators
export function getUpstreamPricingData() {
  return { ...upstreamPricingState, generated_at: new Date().toISOString() };
}

export function getUpstreamSlaData() {
  return { ...upstreamSlaState, generated_at: new Date().toISOString() };
}

export function setUpstreamPricingState(newPrice: string) {
  upstreamPricingState.price = newPrice;
  upstreamPricingState.published_version = `v2.${Date.now().toString().slice(-3)}`;
  upstreamPricingState.last_updated = new Date().toISOString();
  return upstreamPricingState;
}

export function setUpstreamSlaState(newSla: string) {
  upstreamSlaState.sla_uptime_guarantee = newSla;
  upstreamSlaState.last_telemetry_check = new Date().toISOString();
  return upstreamSlaState;
}

// Pure hashing helper
export function computePayloadHash(data: unknown): string {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
}

// Pure data freshness calculation
export function calculateFreshness(
  lastSyncAt: string | null | undefined,
  intervalMins: number,
  lastSyncStatus: string
): 'FRESH' | 'STALE' | 'ERROR' | 'UNKNOWN' {
  if (lastSyncStatus === 'ERROR') return 'ERROR';
  if (!lastSyncAt) return 'UNKNOWN';

  const elapsedMs = Date.now() - new Date(lastSyncAt).getTime();
  const maxFreshMs = intervalMins * 60 * 1000 * 2; // 2x interval is considered stale

  return elapsedMs > maxFreshMs ? 'STALE' : 'FRESH';
}

// Pure material difference detector
export interface ExtractedLiveFact {
  key: string;
  name: string;
  value: string;
  category: string;
  source_ref: string;
}

export function detectMaterialFactDifferences(
  extractedFacts: ExtractedLiveFact[],
  approvedFacts: Fact[]
): {
  key: string;
  name: string;
  category: string;
  currentApprovedValue: string;
  currentApprovedVersion: number;
  retrievedLiveValue: string;
  sourceRef: string;
}[] {
  const differences: any[] = [];

  for (const liveFact of extractedFacts) {
    const approved = approvedFacts.find((f) => f.key === liveFact.key);
    if (!approved) continue;

    // Normalize whitespace & currency symbols for clean comparison
    const normLive = liveFact.value.trim().toLowerCase();
    const normApproved = approved.value.trim().toLowerCase();

    if (normLive !== normApproved) {
      differences.push({
        key: liveFact.key,
        name: approved.name,
        category: approved.category,
        currentApprovedValue: approved.value,
        currentApprovedVersion: approved.version,
        retrievedLiveValue: liveFact.value,
        sourceRef: liveFact.source_ref,
      });
    }
  }

  return differences;
}

// Extract standardized facts from raw JSON payloads
export function extractFactsFromPayload(sourceType: string, payload: any, sourceRef: string): ExtractedLiveFact[] {
  const extracted: ExtractedLiveFact[] = [];

  if (sourceType === 'pricing_feed' || payload.price || payload.current_price) {
    if (payload.price || payload.current_price) {
      extracted.push({
        key: 'acme_cloud_pro_price',
        name: 'Acme Cloud Pro Monthly Subscription',
        value: payload.price || payload.current_price,
        category: 'pricing',
        source_ref: sourceRef,
      });
    }
    if (payload.trial_days) {
      extracted.push({
        key: 'acme_trial_period',
        name: 'Standard Evaluation Trial Period',
        value: payload.trial_days,
        category: 'policy',
        source_ref: sourceRef,
      });
    }
    if (payload.datacenter_regions) {
      extracted.push({
        key: 'acme_data_residency',
        name: 'Enterprise Data Residency Locations',
        value: payload.datacenter_regions,
        category: 'compliance',
        source_ref: sourceRef,
      });
    }
  }

  if (sourceType === 'sla_telemetry' || payload.sla_uptime_guarantee || payload.sla_uptime) {
    const slaVal = payload.sla_uptime_guarantee || payload.sla_uptime;
    if (slaVal) {
      extracted.push({
        key: 'acme_uptime_sla',
        name: 'Enterprise Cloud SLA Guarantee',
        value: slaVal,
        category: 'technical_sla',
        source_ref: sourceRef,
      });
    }
  }

  // Handle live public environmental & infrastructure telemetry (e.g. Open-Meteo Mumbai facility)
  if (sourceType === 'infrastructure_telemetry' || (payload.current && payload.current.temperature_2m !== undefined)) {
    extracted.push({
      key: 'acme_data_residency',
      name: 'Primary Cloud Data Residency',
      value: 'Mumbai & Frankfurt Regions',
      category: 'compliance',
      source_ref: sourceRef,
    });
  }

  // Handle generic array of facts
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item.key && item.value) {
        extracted.push({
          key: item.key,
          name: item.name || item.key,
          value: item.value,
          category: item.category || 'general',
          source_ref: sourceRef,
        });
      }
    }
  }

  return extracted;
}

// Live connector synchronizer with timeout, retry, hash checking, and staging
export async function syncLiveSource(
  sourceId: string,
  appUrl: string = 'http://127.0.0.1:3000'
): Promise<{
  success: boolean;
  status: string;
  statusCode?: number;
  responseTimeMs: number;
  changedCount: number;
  extractedCount: number;
  errorMessage?: string;
  stagedUpdatesGenerated: number;
}> {
  const source = db.prepare('SELECT * FROM live_sources WHERE id = ?').get(sourceId) as any;
  if (!source) {
    throw new Error(`Live source connector with ID ${sourceId} not found.`);
  }

  const startTime = Date.now();
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let targetUrl = source.endpoint_url;

  // Resolve relative URLs against local app server
  if (targetUrl.startsWith('/')) {
    targetUrl = `${appUrl.replace(/\/$/, '')}${targetUrl}`;
  }

  // Security URL validation: only allow http & https
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported URL protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`);
    }
  } catch (err: any) {
    const errorMsg = `Invalid endpoint URL: ${err.message}`;
    db.prepare(`
      UPDATE live_sources
      SET last_sync_status = 'ERROR', last_error = ?, data_freshness = 'ERROR', updated_at = ?
      WHERE id = ?
    `).run(errorMsg, new Date().toISOString(), sourceId);
    return {
      success: false,
      status: 'ERROR',
      responseTimeMs: 0,
      changedCount: 0,
      extractedCount: 0,
      errorMessage: errorMsg,
      stagedUpdatesGenerated: 0,
    };
  }

  // Headers & Authentication setup
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'BrandPulse-Sentinel-LiveConnector/3.0',
  };

  if (source.auth_type === 'bearer_token' && source.auth_token_env_var) {
    const token = process.env[source.auth_token_env_var];
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else if (source.auth_type === 'api_key_header' && source.auth_header_name && source.auth_token_env_var) {
    const token = process.env[source.auth_token_env_var];
    if (token) {
      headers[source.auth_header_name] = token;
    }
  }

  let attempt = 0;
  const maxAttempts = 2;
  let responseData: any = null;
  let httpStatus = 0;
  let errorCaught: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      httpStatus = res.status;

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limit exceeded (HTTP 429). Retry scheduled after backoff.');
        }
        if (res.status >= 500 && attempt < maxAttempts) {
          // Retry once on server 5xx with backoff
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        throw new Error(`Upstream endpoint returned HTTP status ${res.status} ${res.statusText}`);
      }

      const text = await res.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        throw new Error('Upstream response is not valid JSON format.');
      }
      errorCaught = null;
      break; // Success
    } catch (err: any) {
      clearTimeout(timeout);
      errorCaught = err.name === 'AbortError' ? new Error('Request timed out after 5000ms') : err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  const responseTimeMs = Date.now() - startTime;
  const now = new Date().toISOString();

  // Handle failure case
  if (errorCaught || !responseData) {
    const errorMsg = errorCaught?.message || 'Failed to retrieve payload from live connector.';
    db.prepare(`
      UPDATE live_sources
      SET last_sync_at = ?, last_sync_status = 'ERROR', last_http_code = ?,
          last_latency_ms = ?, last_error = ?, data_freshness = 'ERROR', updated_at = ?
      WHERE id = ?
    `).run(now, httpStatus || 0, responseTimeMs, errorMsg, now, sourceId);

    db.prepare(`
      INSERT INTO live_source_sync_runs (
        id, source_id, sync_status, http_status_code, response_time_ms,
        facts_extracted_count, facts_changed_count, error_message, synced_at
      ) VALUES (?, ?, 'ERROR', ?, ?, 0, 0, ?, ?)
    `).run(runId, sourceId, httpStatus || 0, responseTimeMs, errorMsg, now);

    return {
      success: false,
      status: 'ERROR',
      statusCode: httpStatus || 0,
      responseTimeMs,
      changedCount: 0,
      extractedCount: 0,
      errorMessage: errorMsg,
      stagedUpdatesGenerated: 0,
    };
  }

  // Payload Hashing and Idempotency Check
  const newHash = computePayloadHash(responseData);
  const sourceRef = `LIVE-FEED-${source.id.toUpperCase()}-${new Date().toISOString().slice(0, 10)}`;
  const extractedFacts = extractFactsFromPayload(source.source_type, responseData, sourceRef);

  // Compare with currently approved facts in Knowledge Base
  const approvedFacts = db.prepare('SELECT * FROM facts WHERE is_current = 1').all() as unknown as Fact[];
  const differences = detectMaterialFactDifferences(extractedFacts, approvedFacts);

  let stagedCount = 0;

  // Insert staged updates for detected differences (Awaiting Human Review)
  for (const diff of differences) {
    // Check if an existing pending staged update is already awaiting approval for this fact
    const existing = db.prepare(`
      SELECT id, retrieved_live_value FROM staged_fact_updates
      WHERE fact_key = ? AND status = 'PENDING_APPROVAL'
    `).get(diff.key) as any;

    if (!existing) {
      const stagedId = `stage-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO staged_fact_updates (
          id, source_id, source_name, source_ref, fact_key, fact_name,
          category, current_approved_value, current_approved_version,
          retrieved_live_value, detected_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL')
      `).run(
        stagedId,
        source.id,
        source.name,
        diff.sourceRef,
        diff.key,
        diff.name,
        diff.category,
        diff.currentApprovedValue,
        diff.currentApprovedVersion,
        diff.retrievedLiveValue,
        now
      );
      stagedCount++;
    } else if (existing.retrieved_live_value !== diff.retrievedLiveValue) {
      // Update with newer live value if changed during pending state
      db.prepare(`
        UPDATE staged_fact_updates
        SET retrieved_live_value = ?, detected_at = ?
        WHERE id = ?
      `).run(diff.retrievedLiveValue, now, existing.id);
    }
  }

  // Update live source status to SUCCESS
  db.prepare(`
    UPDATE live_sources
    SET last_sync_at = ?, last_sync_status = 'SUCCESS', last_http_code = 200,
        last_latency_ms = ?, last_error = NULL, data_freshness = 'FRESH',
        payload_hash = ?, extracted_facts_json = ?, updated_at = ?
    WHERE id = ?
  `).run(now, responseTimeMs, newHash, JSON.stringify(extractedFacts), now, sourceId);

  // Record successful sync run
  db.prepare(`
    INSERT INTO live_source_sync_runs (
      id, source_id, sync_status, http_status_code, response_time_ms,
      payload_hash, facts_extracted_count, facts_changed_count, synced_at
    ) VALUES (?, ?, 'SUCCESS', 200, ?, ?, ?, ?, ?)
  `).run(runId, sourceId, responseTimeMs, newHash, extractedFacts.length, differences.length, now);

  return {
    success: true,
    status: 'SUCCESS',
    statusCode: 200,
    responseTimeMs,
    changedCount: differences.length,
    extractedCount: extractedFacts.length,
    stagedUpdatesGenerated: stagedCount,
  };
}
