import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractClaims,
  extractMetrics,
  verifyClaimDeterministic,
  detectChangeImpact,
  calculateGovernanceScore,
  detectFactConflicts,
  Fact,
  BrandRule,
  ReviewedAssetSnapshot,
} from './governance';

const mockFacts: Fact[] = [
  {
    id: 'fact-1',
    key: 'acme_cloud_pro_price',
    name: 'Acme Cloud Pro Monthly Subscription',
    value: '₹999/month',
    description: 'Standard monthly pricing for Acme Cloud Pro tier',
    category: 'pricing',
    source_ref: 'DOC-2026-PRICING-V2',
    status: 'approved',
    version: 1,
    effective_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fact-2',
    key: 'acme_uptime_sla',
    name: 'Enterprise Cloud SLA Guarantee',
    value: '99.99%',
    description: 'Guaranteed system uptime for enterprise customers',
    category: 'sla',
    source_ref: 'DOC-2026-SLA-V1',
    status: 'approved',
    version: 1,
    effective_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fact-3',
    key: 'free_trial_duration',
    name: 'Free Trial Length',
    value: '14 days',
    description: 'Free trial duration before payment method is charged',
    category: 'policy',
    source_ref: 'DOC-TERMS-2026',
    status: 'approved',
    version: 1,
    effective_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockRules: BrandRule[] = [
  {
    id: 'rule-1',
    rule_code: 'BR-NO-ABSOLUTE-CLAIMS',
    name: 'No Unqualified Absolute Claims',
    rule_type: 'forbidden_term',
    constraint_value: '100% bug-free',
    description: 'Prohibits marketing from claiming software is 100% bug-free or unhackable.',
    severity: 'high',
    status: 'active',
  },
];

test('extractClaims parses sentences correctly', () => {
  const text = 'Acme Cloud Pro starts at ₹999/month. Our enterprise SLA guarantees 99.99% uptime. Enjoy our 14-day trial.';
  const claims = extractClaims(text);
  assert.equal(claims.length, 3);
  assert.match(claims[0], /₹999/);
});

test('extractMetrics correctly identifies currency, percent, and duration', () => {
  const metrics = extractMetrics('Plan starts at ₹999 with 99.99% SLA and 14 days trial');
  assert.equal(metrics.length, 3);
  assert.equal(metrics[0].value, 999);
  assert.equal(metrics[0].type, 'currency');
  assert.equal(metrics[1].value, 99.99);
  assert.equal(metrics[1].type, 'percent');
  assert.equal(metrics[2].value, 14);
  assert.equal(metrics[2].type, 'duration');
});

test('verifyClaimDeterministic supports accurate claim', () => {
  const result = verifyClaimDeterministic('Acme Cloud Pro is priced at ₹999/month for all new signups.', mockFacts, mockRules);
  assert.equal(result.status, 'SUPPORTED');
  assert.equal(result.matched_fact?.id, 'fact-1');
  assert.equal(result.suggested_correction, null);
});

test('verifyClaimDeterministic detects price contradiction and provides correction', () => {
  const result = verifyClaimDeterministic('Get Acme Cloud Pro for just ₹899/month this Q4!', mockFacts, mockRules);
  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.matched_fact?.id, 'fact-1');
  assert.ok(result.suggested_correction?.includes('₹999/month'));
});

test('verifyClaimDeterministic enforces forbidden brand rule', () => {
  const result = verifyClaimDeterministic('We guarantee our platform is 100% bug-free for all users.', mockFacts, mockRules);
  assert.equal(result.status, 'CONTRADICTED');
  assert.equal(result.matched_rule?.rule_code, 'BR-NO-ABSOLUTE-CLAIMS');
});

test('verifyClaimDeterministic marks unknown claim as unverified', () => {
  const result = verifyClaimDeterministic('Acme was voted top cloud vendor in Antarctica 2026.', mockFacts, mockRules);
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.matched_fact, null);
});

test('Brand Time Machine detectChangeImpact identifies impacted assets when fact changes', () => {
  const pastAssets: ReviewedAssetSnapshot[] = [
    {
      asset_id: 'asset-101',
      asset_name: 'Q4 Product Brochure',
      version: 1,
      content: 'Subscribe to Acme Cloud Pro today at ₹999/month.',
      passport_id: 'PASS-101',
      verified_claims: [
        {
          claim_text: 'Subscribe to Acme Cloud Pro today at ₹999/month.',
          matched_fact_id: 'fact-1',
          matched_fact_version: 1,
          approved_value_used: '₹999/month',
        },
      ],
    },
    {
      asset_id: 'asset-102',
      asset_name: 'Enterprise Security Whitepaper',
      version: 1,
      content: 'We adhere to SOC 2 Type II controls.',
      passport_id: 'PASS-102',
      verified_claims: [],
    },
  ];

  const alerts = detectChangeImpact(
    'fact-1',
    'Acme Cloud Pro Monthly Subscription',
    1,
    2,
    '₹999/month',
    '₹1,199/month',
    pastAssets
  );

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].asset_id, 'asset-101');
  assert.equal(alerts[0].impact_risk, 'CRITICAL');
  assert.ok(alerts[0].impact_reason.includes('₹1,199/month'));
});

test('calculateGovernanceScore calculates correct status and score', () => {
  const passScore = calculateGovernanceScore([
    {
      claim_text: 'A',
      status: 'SUPPORTED',
      explanation: '',
      suggested_correction: null,
      confidence: 1,
      verification_method: 'deterministic',
    },
    {
      claim_text: 'B',
      status: 'SUPPORTED',
      explanation: '',
      suggested_correction: null,
      confidence: 1,
      verification_method: 'deterministic',
    },
  ]);
  assert.equal(passScore.status, 'PASSED');
  assert.equal(passScore.score, 100);

  const failScore = calculateGovernanceScore([
    {
      claim_text: 'A',
      status: 'SUPPORTED',
      explanation: '',
      suggested_correction: null,
      confidence: 1,
      verification_method: 'deterministic',
    },
    {
      claim_text: 'B',
      status: 'CONTRADICTED',
      explanation: '',
      suggested_correction: 'fix',
      confidence: 1,
      verification_method: 'deterministic',
    },
  ]);
  assert.equal(failScore.status, 'FAILED');
  assert.equal(failScore.score, 50);
});

test('detectFactConflicts detects internal Knowledge Base contradictions', () => {
  const conflictingFacts: Fact[] = [
    {
      id: 'f1',
      key: 'acme_cloud_pro_price',
      name: 'Acme Cloud Pro Monthly Subscription',
      value: '₹999/month',
      description: 'Pricing',
      category: 'pricing',
      source_ref: 'DOC-1',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'f2',
      key: 'acme_cloud_pro_promo_price',
      name: 'Acme Cloud Pro Promotional Rate',
      value: '₹799/month',
      description: 'Conflicting price claim',
      category: 'pricing',
      source_ref: 'DOC-2',
      status: 'approved',
      version: 1,
      effective_date: '2026-01-01',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const conflicts = detectFactConflicts(conflictingFacts);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].severity, 'HIGH');
  assert.ok(conflicts[0].reason.includes('Direct metric contradiction'));
});

// -------------------------------------------------------------
// LIVE CONNECTOR LOGIC TESTS (Idempotency, Freshness, & Diff Detection)
// -------------------------------------------------------------
import {
  computePayloadHash,
  calculateFreshness,
  detectMaterialFactDifferences,
  extractFactsFromPayload,
} from '../../server/liveConnectors';

test('computePayloadHash produces deterministic SHA-256 hashes', () => {
  const payload1 = { price: '₹999/month', sla: '99.99%' };
  const payload2 = { price: '₹999/month', sla: '99.99%' };
  const payloadDiff = { price: '₹1,199/month', sla: '99.99%' };

  const hash1 = computePayloadHash(payload1);
  const hash2 = computePayloadHash(payload2);
  const hash3 = computePayloadHash(payloadDiff);

  assert.equal(hash1, hash2, 'Identical payloads must produce identical hashes');
  assert.notEqual(hash1, hash3, 'Different payloads must produce different hashes');
});

test('calculateFreshness properly categorizes FRESH, STALE, and ERROR states', () => {
  const now = new Date().toISOString();
  const past3Hours = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  // 30 minute interval with recent sync -> FRESH
  const fresh = calculateFreshness(now, 30, 'SUCCESS');
  assert.equal(fresh, 'FRESH');

  // 30 minute interval synced 3 hours ago -> STALE (exceeds 2x interval)
  const stale = calculateFreshness(past3Hours, 30, 'SUCCESS');
  assert.equal(stale, 'STALE');

  // Failed sync -> ERROR
  const errState = calculateFreshness(now, 30, 'ERROR');
  assert.equal(errState, 'ERROR');

  // Never synced -> UNKNOWN
  const unk = calculateFreshness(null, 30, 'NEVER_SYNCED');
  assert.equal(unk, 'UNKNOWN');
});

test('detectMaterialFactDifferences detects price differences and ignores identical facts', () => {
  const liveFacts = [
    {
      key: 'acme_cloud_pro_price',
      name: 'Acme Cloud Pro Monthly Subscription',
      value: '₹1,199/month',
      category: 'pricing',
      source_ref: 'LIVE-API-001',
    },
    {
      key: 'acme_uptime_sla',
      name: 'Enterprise Cloud SLA Guarantee',
      value: '99.99%',
      category: 'sla',
      source_ref: 'LIVE-API-001',
    },
  ];

  const diffs = detectMaterialFactDifferences(liveFacts, mockFacts);

  // Price changed (₹999 -> ₹1,199), SLA remained 99.99%
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].key, 'acme_cloud_pro_price');
  assert.equal(diffs[0].currentApprovedValue, '₹999/month');
  assert.equal(diffs[0].retrievedLiveValue, '₹1,199/month');
});

test('extractFactsFromPayload correctly extracts pricing and SLA fields', () => {
  const rawPricingPayload = {
    product: 'Acme Cloud Pro',
    price: '₹999/month',
    trial_days: '14 days',
    datacenter_regions: 'Mumbai & Frankfurt Regions',
  };

  const extracted = extractFactsFromPayload('pricing_feed', rawPricingPayload, 'SRC-TEST-01');
  assert.equal(extracted.length, 3);
  assert.equal(extracted.find((f) => f.key === 'acme_cloud_pro_price')?.value, '₹999/month');
  assert.equal(extracted.find((f) => f.key === 'acme_trial_period')?.value, '14 days');
  assert.equal(extracted.find((f) => f.key === 'acme_data_residency')?.value, 'Mumbai & Frankfurt Regions');
});


