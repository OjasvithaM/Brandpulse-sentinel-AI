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
  signature?: string;
  signature_algorithm?: string;
  payload_digest?: string;
  signed_at?: string;
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
  prev_hash?: string;
  payload_hash?: string;
  chain_hash?: string;
}

export type UserRole = 'ADMIN' | 'CURATOR' | 'REVIEWER' | 'AUTHOR';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  email: string;
  avatar_initials: string;
}

export interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  type:
    | 'fact'
    | 'fact_version'
    | 'brand_rule'
    | 'claim'
    | 'asset'
    | 'audit_run'
    | 'evidence_source'
    | 'trust_passport'
    | 'decision'
    | 'change_impact';
  status?: string;
  severity?: string;
  governance_score?: number;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationship:
    | 'SUPPORTS'
    | 'CONTRADICTS'
    | 'APPEARS_IN'
    | 'EVALUATED_BY'
    | 'RECORDED_IN'
    | 'AFFECTS'
    | 'CERTIFIES'
    | 'REFERENCES'
    | 'DERIVED_FROM';
  status?: 'nominal' | 'alert' | 'warning' | 'info';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    impacted_nodes_count: number;
    contradictions_count: number;
  };
}

export interface SimulateImpactResult {
  fact_key: string;
  fact_name: string;
  current_value: string;
  proposed_value: string;
  affected_assets_count: number;
  affected_claims_count: number;
  simulated_findings: Array<{
    asset_id: string;
    asset_name: string;
    asset_version: number;
    claim_text: string;
    current_status: 'SUPPORTED' | 'CONTRADICTED' | 'UNVERIFIED';
    predicted_status: 'SUPPORTED' | 'CONTRADICTED' | 'UNVERIFIED';
    status_changed: boolean;
    explanation: string;
    predicted_correction: string | null;
  }>;
  risk_severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  simulation_timestamp: string;
}

export interface HistoricalReplayResult {
  asset_id: string;
  asset_name: string;
  asset_version: number;
  audit_run_id: string;
  passport_code: string;
  audited_at: string;
  original_score: number;
  original_status: string;
  original_claims: Array<{
    claim_text: string;
    status: string;
    matched_fact_name: string;
    fact_value_at_audit_time: string;
    current_fact_value: string;
    is_drifted: boolean;
    drift_explanation?: string;
  }>;
  facts_used_at_audit: Array<{
    key: string;
    name: string;
    version_then: number;
    value_then: string;
    current_version: number;
    current_value: string;
    has_evolved: boolean;
  }>;
  subsequent_fact_changes_count: number;
  drift_detected: boolean;
}

export interface LiveSource {
  id: string;
  name: string;
  source_type: 'rest_api' | 'pricing_feed' | 'sla_telemetry' | 'policy_document';
  endpoint_url: string;
  auth_type: 'none' | 'bearer_token' | 'api_key_header';
  auth_header_name?: string;
  auth_token_env_var?: string;
  sync_interval_mins: number;
  last_sync_at?: string | null;
  last_sync_status: 'SUCCESS' | 'ERROR' | 'SYNCING' | 'NEVER_SYNCED';
  last_http_code?: number | null;
  last_error?: string | null;
  last_latency_ms?: number | null;
  data_freshness: 'FRESH' | 'STALE' | 'ERROR' | 'UNKNOWN';
  payload_hash?: string | null;
  extracted_facts_json?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface LiveSourceSyncRun {
  id: string;
  source_id: string;
  sync_status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  http_status_code?: number;
  response_time_ms: number;
  payload_hash?: string;
  facts_extracted_count: number;
  facts_changed_count: number;
  error_message?: string | null;
  synced_at: string;
}

export interface StagedFactUpdate {
  id: string;
  source_id: string;
  source_name: string;
  source_ref: string;
  fact_key: string;
  fact_name: string;
  category: string;
  current_approved_value: string;
  current_approved_version: number;
  retrieved_live_value: string;
  detected_at: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reviewer_name?: string | null;
  reviewer_decision_at?: string | null;
  decision_rationale?: string | null;
  impact_alerts_generated: number;
}

export interface DashboardStats {
  factsCount: number;
  rulesCount: number;
  assetsCount: number;
  passportsCount: number;
  pendingImpactsCount: number;
  pendingReviewsCount: number;
  liveSourcesCount: number;
  liveStaleCount: number;
  pendingStagedUpdatesCount: number;
  recentAudits: any[];
  recentFactChanges: any[];
  hasGeminiKey: boolean;
}

export interface SavedAudit {
  id: string;
  audit_name: string;
  brand: string;
  channel: string;
  content: string;
  asset_id: string;
  asset_version: number;
  overall_status: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  governance_score: number;
  claims_count: number;
  supported_count: number;
  contradicted_count: number;
  unverified_count: number;
  findings: VerificationFinding[];
  evidence_sources: string[];
  engine_used: string;
  review_status: 'APPROVED' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'REJECTED';
  reviewer_name?: string | null;
  reviewer_role?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  passport_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewAuditPayload {
  audit_name: string;
  brand: string;
  channel: string;
  content: string;
  knowledge_base_category?: string;
  evidence_sources?: string[];
  reviewer_name?: string;
  auto_passport?: boolean;
}


