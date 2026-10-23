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
  is_current: number;
}

export interface FactHistory {
  id: string;
  fact_id: string;
  version: number;
  value: string;
  description: string;
  source_ref: string;
  status: string;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

export interface BrandRule {
  id: string;
  rule_code: string;
  name: string;
  rule_type: string;
  constraint_value: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface VerificationFinding {
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
  confidence: number;
  uncertainty_notes?: string;
  verification_method: 'deterministic' | 'semantic_ai' | 'hybrid';
}

export interface TrustPassport {
  id: string;
  passport_code: string;
  asset_id: string;
  asset_name: string;
  asset_version: number;
  audit_run_id: string;
  overall_status: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  governance_score: number;
  claims_json: string;
  evidence_sources_json: string;
  reviewer_name?: string;
  reviewer_role?: string;
  human_decision?: string;
  decision_rationale?: string;
  decision_timestamp?: string;
  previous_passport_id?: string | null;
  is_latest: number;
  created_at: string;
  content?: string;
  previous_passport?: TrustPassport | null;
}

export interface ChangeImpact {
  id: string;
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
  alert_status: 'PENDING' | 'REVALIDATED' | 'DISMISSED';
  created_at: string;
}

export interface ReviewQueueItem {
  asset_id: string;
  asset_name: string;
  channel: string;
  current_version: number;
  status: string;
  updated_at: string;
  passport_id?: string;
  passport_code?: string;
  governance_score?: number;
  overall_status?: string;
  claims_json?: string;
  content?: string;
  pending_impact_count: number;
}

export interface AuditLog {
  id: string;
  event_type: string;
  actor: string;
  actor_role: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

export interface DashboardStats {
  factsCount: number;
  rulesCount: number;
  assetsCount: number;
  passportsCount: number;
  pendingImpactsCount: number;
  pendingReviewsCount: number;
  recentAudits: any[];
  recentFactChanges: any[];
  hasGeminiKey: boolean;
}
