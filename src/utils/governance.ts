/**
 * Pure business logic for BrandPulse Sentinel AI:
 * - Claim extraction
 * - Deterministic fact and rule verification
 * - Change-impact intelligence calculation
 * - Trust score and status determination
 */

export interface Fact {
  id: string;
  key: string;
  name: string;
  value: string;
  description: string;
  category: 'pricing' | 'sla' | 'compliance' | 'feature' | 'policy' | 'security';
  source_ref: string;
  source_doc?: string;
  status: 'approved' | 'disputed' | 'expired';
  version: number;
  effective_date: string;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandRule {
  id: string;
  rule_code: string;
  name: string;
  rule_type: 'forbidden_term' | 'mandatory_disclaimer' | 'metric_threshold' | 'legal_phrase';
  constraint_value: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'inactive';
}

export interface VerificationFinding {
  claim_id?: string;
  claim_text: string;
  status: 'SUPPORTED' | 'CONTRADICTED' | 'UNVERIFIED';
  matched_fact?: {
    id: string;
    name: string;
    version: number;
    approved_value: string;
    source_ref: string;
  } | null;
  matched_rule?: {
    id: string;
    rule_code: string;
    name: string;
    severity: string;
  } | null;
  explanation: string;
  suggested_correction: string | null;
  confidence: number; // 0.0 - 1.0
  uncertainty_notes?: string;
  verification_method: 'deterministic' | 'semantic_ai' | 'hybrid';
}

export interface ReviewedAssetSnapshot {
  asset_id: string;
  asset_name: string;
  version: number;
  content: string;
  passport_id?: string;
  verified_claims: {
    claim_text: string;
    matched_fact_id?: string | null;
    matched_fact_version?: number | null;
    approved_value_used?: string | null;
  }[];
}

export interface ChangeImpactAlert {
  fact_id: string;
  fact_name: string;
  old_version: number;
  new_version: number;
  old_value: string;
  new_value: string;
  asset_id: string;
  asset_name: string;
  asset_version: number;
  impacted_claim_text: string;
  impact_reason: string;
  impact_risk: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  detection_method: 'exact_fact_link' | 'semantic_claim_overlap';
}

/**
 * Normalizes text for robust comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[₹$€£,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts numbers / percentages / currency values from text
 */
export function extractMetrics(text: string): { raw: string; value: number; type: 'currency' | 'percent' | 'duration' | 'number' }[] {
  const metrics: { raw: string; value: number; type: 'currency' | 'percent' | 'duration' | 'number' }[] = [];

  // Match currency (₹999, $999, 999 INR, etc.)
  const currencyRegex = /(?:₹|\$|€|£|INR|USD)\s?(\d+(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = currencyRegex.exec(text)) !== null) {
    metrics.push({ raw: match[0], value: parseFloat(match[1]), type: 'currency' });
  }

  // Match percentage (99.9%, 99.99%)
  const percentRegex = /(\d+(?:\.\d+)?)\s?%/g;
  while ((match = percentRegex.exec(text)) !== null) {
    metrics.push({ raw: match[0], value: parseFloat(match[1]), type: 'percent' });
  }

  // Match duration days/months (e.g. 14-day, 30 days)
  const durationRegex = /(\d+)\s*(-|\s)?(day|month|year|hr|hour)s?/gi;
  while ((match = durationRegex.exec(text)) !== null) {
    metrics.push({ raw: match[0], value: parseFloat(match[1]), type: 'duration' });
  }

  return metrics;
}

/**
 * Splits text into candidate sentences / claims
 */
export function extractClaims(text: string): string[] {
  if (!text || !text.trim()) return [];
  // Split on sentence boundaries, list bullets, or newlines while preserving punctuation
  const rawParts = text
    .split(/(?<=[.!?])\s+|\n+|(?:^|\s)[•\-\*]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10); // filter out tiny fragments

  return rawParts.length > 0 ? rawParts : [text.trim()];
}

/**
 * Pure verification logic: checks a single claim against approved facts and rules
 */
export function verifyClaimDeterministic(
  claimText: string,
  facts: Fact[],
  rules: BrandRule[] = []
): VerificationFinding {
  const normClaim = normalizeText(claimText);
  const claimMetrics = extractMetrics(claimText);

  // 1. Rule checks (forbidden terms, mandatory disclaimers, etc.)
  for (const rule of rules) {
    if (rule.status !== 'active') continue;
    if (rule.rule_type === 'forbidden_term') {
      const forbidden = normalizeText(rule.constraint_value);
      if (normClaim.includes(forbidden)) {
        return {
          claim_text: claimText,
          status: 'CONTRADICTED',
          matched_rule: {
            id: rule.id,
            rule_code: rule.rule_code,
            name: rule.name,
            severity: rule.severity,
          },
          explanation: `Violation of brand rule [${rule.rule_code}]: "${rule.constraint_value}" is a prohibited or misleading term (${rule.description}).`,
          suggested_correction: `Remove or replace phrase "${rule.constraint_value}".`,
          confidence: 0.98,
          verification_method: 'deterministic',
        };
      }
    }
  }

  // 2. Fact matching
  let bestFactMatch: { fact: Fact; overlapScore: number; reason: string } | null = null;
  const genericStopWords = new Set(['acme', 'technologies', 'company', 'standard', 'monthly', 'starts', 'starts at', 'today', 'with', 'this', 'that', 'our', 'tier', 'user', 'users', 'tier']);

  for (const fact of facts) {
    if (fact.status !== 'approved') continue;

    const factKeywords = fact.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !genericStopWords.has(w));
    const factDescKeywords = fact.description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !genericStopWords.has(w));
    const keyParts = fact.key.toLowerCase().split('_').filter((k) => k.length >= 3 && !genericStopWords.has(k));
    const allKeywords = Array.from(new Set([...factKeywords, ...factDescKeywords, ...keyParts]));

    const matchedWords = allKeywords.filter((w) => normClaim.includes(w));
    const overlapRatio = allKeywords.length > 0 ? matchedWords.length / allKeywords.length : 0;
    const keyMatched = keyParts.filter((k) => normClaim.includes(k)).length;
    const currentFactMetrics = extractMetrics(fact.value);
    const hasMetricOverlap = currentFactMetrics.length > 0 && claimMetrics.length > 0 && claimMetrics.some(cm => cm.type === currentFactMetrics[0].type);

    // If claim and fact share a metric type (currency, percentage, duration), 1 topic anchor is sufficient
    // Otherwise require at least 2 substantive keyword matches
    const isTopicMatch = hasMetricOverlap
      ? (keyMatched >= 1 || matchedWords.length >= 1)
      : (keyMatched >= 2 || (overlapRatio >= 0.35 && matchedWords.length >= 2));

    if (isTopicMatch) {
      const score = overlapRatio + keyMatched * 0.35 + (hasMetricOverlap ? 0.3 : 0);
      if (!bestFactMatch || score > bestFactMatch.overlapScore) {
        bestFactMatch = { fact, overlapScore: score, reason: `Matched topic: ${fact.name}` };
      }
    }
  }

  if (bestFactMatch && bestFactMatch.overlapScore >= 0.35) {
    const matchedFact = bestFactMatch.fact;
    const normFactVal = normalizeText(matchedFact.value);
    const factMetrics = extractMetrics(matchedFact.value);

    // Numeric/Currency/Metric comparison
    if (factMetrics.length > 0 && claimMetrics.length > 0) {
      const matchedMetricType = factMetrics[0].type;
      const matchingClaimMetric = claimMetrics.find((m) => m.type === matchedMetricType);

      if (matchingClaimMetric) {
        if (matchingClaimMetric.value === factMetrics[0].value) {
          return {
            claim_text: claimText,
            status: 'SUPPORTED',
            matched_fact: {
              id: matchedFact.id,
              name: matchedFact.name,
              version: matchedFact.version,
              approved_value: matchedFact.value,
              source_ref: matchedFact.source_ref,
            },
            explanation: `Supported by approved fact "${matchedFact.name}" (v${matchedFact.version}). Value ${matchingClaimMetric.raw} matches approved ${factMetrics[0].raw}.`,
            suggested_correction: null,
            confidence: 0.95,
            verification_method: 'deterministic',
          };
        } else {
          return {
            claim_text: claimText,
            status: 'CONTRADICTED',
            matched_fact: {
              id: matchedFact.id,
              name: matchedFact.name,
              version: matchedFact.version,
              approved_value: matchedFact.value,
              source_ref: matchedFact.source_ref,
            },
            explanation: `Discrepancy detected with approved fact "${matchedFact.name}" (v${matchedFact.version}). Claim states ${matchingClaimMetric.raw}, but approved fact is ${matchedFact.value} per source ${matchedFact.source_ref}.`,
            suggested_correction: claimText
              .replace(matchingClaimMetric.raw, matchedFact.value)
              .replace(/\/month\/month/gi, '/month')
              .replace(/\/mo\/mo/gi, '/mo'),
            confidence: 0.96,
            verification_method: 'deterministic',
          };
        }
      }
    }

    // Direct text / phrasing match
    if (normClaim.includes(normFactVal)) {
      return {
        claim_text: claimText,
        status: 'SUPPORTED',
        matched_fact: {
          id: matchedFact.id,
          name: matchedFact.name,
          version: matchedFact.version,
          approved_value: matchedFact.value,
          source_ref: matchedFact.source_ref,
        },
        explanation: `Claim directly aligns with approved statement "${matchedFact.value}" from source [${matchedFact.source_ref}].`,
        suggested_correction: null,
        confidence: 0.92,
        verification_method: 'deterministic',
      };
    }

    // If topic is matched strongly but value conflicts
    return {
      claim_text: claimText,
      status: 'CONTRADICTED',
      matched_fact: {
        id: matchedFact.id,
        name: matchedFact.name,
        version: matchedFact.version,
        approved_value: matchedFact.value,
        source_ref: matchedFact.source_ref,
      },
      explanation: `Topic relates to "${matchedFact.name}", but the stated claim does not reflect the approved value "${matchedFact.value}".`,
      suggested_correction: `Update statement to reflect approved value: "${matchedFact.value}" (Source: ${matchedFact.source_ref}).`,
      confidence: 0.75,
      uncertainty_notes: 'Claim wording varies from approved phrasing; flagged for human verification.',
      verification_method: 'deterministic',
    };
  }

  // 3. Fallback: No relevant approved fact found
  return {
    claim_text: claimText,
    status: 'UNVERIFIED',
    matched_fact: null,
    explanation: 'No approved fact or brand rule in the Knowledge Base directly verifies this claim.',
    suggested_correction: null,
    confidence: 0.5,
    uncertainty_notes: 'Unverified claims require manual human sign-off or submission of a new approved source reference.',
    verification_method: 'deterministic',
  };
}

/**
 * Brand Time Machine: Change-Impact Intelligence
 * When an approved fact is modified (new version), scans historical reviewed assets
 * to identify all assets that rely on or mention the old fact value.
 */
export function detectChangeImpact(
  factId: string,
  factName: string,
  oldVersion: number,
  newVersion: number,
  oldValue: string,
  newValue: string,
  pastAssets: ReviewedAssetSnapshot[]
): ChangeImpactAlert[] {
  const alerts: ChangeImpactAlert[] = [];
  const normOldVal = normalizeText(oldValue);
  const oldMetrics = extractMetrics(oldValue);

  for (const asset of pastAssets) {
    let hasImpact = false;
    let impactedClaim = '';
    let reason = '';
    let risk: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'HIGH';

    // 1. Check if asset had a claim explicitly bound to this fact ID
    const explicitClaim = asset.verified_claims.find((c) => c.matched_fact_id === factId);
    if (explicitClaim) {
      hasImpact = true;
      impactedClaim = explicitClaim.claim_text;
      reason = `Asset version v${asset.version} was previously verified against fact "${factName}" v${explicitClaim.matched_fact_version || oldVersion} ("${oldValue}"). Fact has been updated to v${newVersion} ("${newValue}").`;
      risk = 'CRITICAL';
    } else {
      // 2. Check semantic/text overlap in asset content
      const normContent = normalizeText(asset.content);
      if (normContent.includes(normOldVal)) {
        hasImpact = true;
        impactedClaim = oldValue;
        reason = `Asset content contains previous fact value "${oldValue}". Current approved value is "${newValue}".`;
        risk = 'HIGH';
      } else if (oldMetrics.length > 0) {
        for (const m of oldMetrics) {
          if (normContent.includes(normalizeText(m.raw))) {
            hasImpact = true;
            impactedClaim = m.raw;
            reason = `Asset contains metric "${m.raw}" which matches previous fact value "${oldValue}". Updated to "${newValue}".`;
            risk = 'HIGH';
            break;
          }
        }
      }
    }

    if (hasImpact) {
      alerts.push({
        fact_id: factId,
        fact_name: factName,
        old_version: oldVersion,
        new_version: newVersion,
        old_value: oldValue,
        new_value: newValue,
        asset_id: asset.asset_id,
        asset_name: asset.asset_name,
        asset_version: asset.version,
        impacted_claim_text: impactedClaim,
        impact_reason: reason,
        impact_risk: risk,
        detection_method: explicitClaim ? 'exact_fact_link' : 'semantic_claim_overlap',
      });
    }
  }

  return alerts;
}

/**
 * Calculates overall governance status and score
 */
export function calculateGovernanceScore(findings: VerificationFinding[]): {
  score: number;
  status: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  summary: { total: number; supported: number; contradicted: number; unverified: number };
} {
  const total = findings.length;
  if (total === 0) {
    return {
      score: 100,
      status: 'PASSED',
      summary: { total: 0, supported: 0, contradicted: 0, unverified: 0 },
    };
  }

  const supported = findings.filter((f) => f.status === 'SUPPORTED').length;
  const contradicted = findings.filter((f) => f.status === 'CONTRADICTED').length;
  const unverified = findings.filter((f) => f.status === 'UNVERIFIED').length;

  // Score calculation:
  // Supported = 100%, Unverified = 40%, Contradicted = 0%
  const score = Math.round(((supported * 100 + unverified * 40) / (total * 100)) * 100);

  let status: 'PASSED' | 'CONDITIONAL' | 'FAILED' = 'PASSED';
  if (contradicted > 0) {
    status = 'FAILED';
  } else if (unverified > 0) {
    status = 'CONDITIONAL';
  }

  return {
    score,
    status,
    summary: { total, supported, contradicted, unverified },
  };
}

export interface FactConflict {
  factA: Fact;
  factB: Fact;
  reason: string;
  severity: 'HIGH' | 'MEDIUM';
}

/**
 * Module 1: Knowledge Base Integrity
 * Scans approved facts for internal contradictions (e.g. duplicate pricing or conflicting metrics)
 */
export function detectFactConflicts(facts: Fact[]): FactConflict[] {
  const conflicts: FactConflict[] = [];
  const approvedFacts = facts.filter((f) => f.status === 'approved');

  for (let i = 0; i < approvedFacts.length; i++) {
    for (let j = i + 1; j < approvedFacts.length; j++) {
      const f1 = approvedFacts[i];
      const f2 = approvedFacts[j];

      // Check category and key similarity
      const f1KeyParts = f1.key.toLowerCase().split('_').filter((k) => k.length > 2);
      const f2KeyParts = f2.key.toLowerCase().split('_').filter((k) => k.length > 2);
      const sharedKeys = f1KeyParts.filter((k) => f2KeyParts.includes(k));

      const isTopicDuplicate =
        sharedKeys.length >= 2 || (f1.category === f2.category && sharedKeys.length >= 1);

      if (isTopicDuplicate && f1.value !== f2.value) {
        const m1 = extractMetrics(f1.value);
        const m2 = extractMetrics(f2.value);

        if (
          m1.length > 0 &&
          m2.length > 0 &&
          m1[0].type === m2[0].type &&
          m1[0].value !== m2[0].value
        ) {
          conflicts.push({
            factA: f1,
            factB: f2,
            reason: `Direct metric contradiction on topic [${sharedKeys.join(', ')}]: "${f1.name}" specifies ${f1.value} while "${f2.name}" specifies ${f2.value}.`,
            severity: 'HIGH',
          });
        } else if (f1.category === f2.category) {
          conflicts.push({
            factA: f1,
            factB: f2,
            reason: `Potential conflicting policy in category "${f1.category}": "${f1.name}" vs "${f2.name}".`,
            severity: 'MEDIUM',
          });
        }
      }
    }
  }

  return conflicts;
}

