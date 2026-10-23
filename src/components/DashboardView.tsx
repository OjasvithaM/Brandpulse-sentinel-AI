import React from 'react';
import {
  Database,
  FileCheck2,
  History,
  FileBadge,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DashboardStats } from '../types';
import { NavTab } from './Navbar';

interface DashboardViewProps {
  stats: DashboardStats | null;
  onNavigateTab: (tab: NavTab) => void;
  onOpenDemoGuide: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigateTab,
  onOpenDemoGuide,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Evidence-Based Brand Governance
            </span>
            <span className="text-xs text-slate-400">
              Org: Acme Technologies (Fictional Demo)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-white">
            BrandPulse Sentinel AI
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Verify every claim. Track every change. Preserve every decision. The industry-first brand governance engine equipped with Change-Impact Intelligence and versioned Trust Passports.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenDemoGuide}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Hackathon Demo</span>
          </button>
        </div>
      </div>

      {/* Critical Revalidation Alert Banner (Brand Time Machine notification) */}
      {stats && stats.pendingImpactsCount > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Change-Impact Alert: {stats.pendingImpactsCount} Asset(s) Awaiting Revalidation!
              </h3>
              <p className="text-xs text-rose-700">
                An approved fact in the Knowledge Base was recently updated. The Brand Time Machine identified previously approved assets that may now contain outdated claims.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('time_machine')}
            className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0 flex items-center space-x-1 cursor-pointer"
          >
            <span>Open Brand Time Machine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Key Governance Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Approved Facts */}
        <div
          onClick={() => onNavigateTab('knowledge_base')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Approved Facts</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.factsCount ?? 6}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Versioned</span>
          </div>
        </div>

        {/* Active Rules */}
        <div
          onClick={() => onNavigateTab('knowledge_base')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Brand Rules</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.rulesCount ?? 3}
            </span>
            <span className="text-[11px] text-slate-500">Active</span>
          </div>
        </div>

        {/* Verified Assets */}
        <div
          onClick={() => onNavigateTab('trust_passports')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Monitored Assets</span>
            <FileCheck2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.assetsCount ?? 1}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Under Gov</span>
          </div>
        </div>

        {/* Trust Passports */}
        <div
          onClick={() => onNavigateTab('trust_passports')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Trust Passports</span>
            <FileBadge className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.passportsCount ?? 1}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">Verifiable</span>
          </div>
        </div>

        {/* Pending Impacts */}
        <div
          onClick={() => onNavigateTab('time_machine')}
          className={`bg-white p-4 rounded-lg border shadow-xs transition-colors cursor-pointer ${
            stats && stats.pendingImpactsCount > 0
              ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
              : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Impact Alerts</span>
            <History
              className={`w-4 h-4 ${
                stats && stats.pendingImpactsCount > 0 ? 'text-rose-500' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold ${
                stats && stats.pendingImpactsCount > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {stats?.pendingImpactsCount ?? 0}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">Revalidation</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div
          onClick={() => onNavigateTab('review_queue')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Review Queue</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.pendingReviewsCount ?? 0}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Sign-Offs</span>
          </div>
        </div>
      </div>

      {/* Seven-Step Workflow Map */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              The Seven-Step Brand Governance Architecture
            </h2>
            <p className="text-xs text-slate-500">
              From source facts to evidence-based claims, change impact radar, and versioned Trust Passports.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
            Connected End-to-End
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-xs">
          {/* Step 1 */}
          <div
            onClick={() => onNavigateTab('knowledge_base')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 1
              </div>
              <div className="font-bold text-slate-900 mb-1">Knowledge Base</div>
              <p className="text-[11px] text-slate-500">
                Curate approved facts, SLA metrics, pricing & rules.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>View Facts</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => onNavigateTab('evidence_guard')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 2
              </div>
              <div className="font-bold text-slate-900 mb-1">Submit Content</div>
              <p className="text-[11px] text-slate-500">
                Submit marketing brochures, decks, web copy.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>Submit Copy</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => onNavigateTab('evidence_guard')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 3
              </div>
              <div className="font-bold text-slate-900 mb-1">Verify Claims</div>
              <p className="text-[11px] text-slate-500">
                Extract claims; classify Supported, Contradicted, Unverified.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>EvidenceGuard</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => onNavigateTab('trust_passports')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 4
              </div>
              <div className="font-bold text-slate-900 mb-1">Trust Passport</div>
              <p className="text-[11px] text-slate-500">
                Generate version-specific verifiable audit passport.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>Passports</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 5 */}
          <div
            onClick={() => onNavigateTab('time_machine')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 5
              </div>
              <div className="font-bold text-slate-900 mb-1">Brand Time Machine</div>
              <p className="text-[11px] text-slate-500">
                When a fact changes, detect impacted legacy assets.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>Impact Radar</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 6 */}
          <div
            onClick={() => onNavigateTab('review_queue')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 6
              </div>
              <div className="font-bold text-slate-900 mb-1">Human Review</div>
              <p className="text-[11px] text-slate-500">
                Inspect evidence; record human decision and rationale.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>Review Queue</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 7 */}
          <div
            onClick={() => onNavigateTab('audit_history')}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                Step 7
              </div>
              <div className="font-bold text-slate-900 mb-1">Preserve History</div>
              <p className="text-[11px] text-slate-500">
                Historical passport v1 remains immutable alongside v2.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-indigo-600 font-medium flex items-center">
              <span>Audit Trail</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Audits & Recent Fact Evolutions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Runs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Content Audits</h3>
            </div>
            <button
              onClick={() => onNavigateTab('trust_passports')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              View Passports
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentAudits && stats.recentAudits.length > 0 ? (
              stats.recentAudits.map((audit: any) => (
                <div
                  key={audit.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {audit.asset_name || 'Marketing Content'}
                      <span className="ml-2 text-slate-500 font-normal">v{audit.asset_version}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center space-x-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(audit.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        audit.overall_status === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : audit.overall_status === 'CONDITIONAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {audit.overall_status}
                    </span>
                    <span className="font-bold text-slate-700">{audit.governance_score}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                No recent audits found. Run EvidenceGuard to audit marketing content.
              </div>
            )}
          </div>
        </div>

        {/* Fact Evolution / History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Fact Changes & Versioning</h3>
            </div>
            <button
              onClick={() => onNavigateTab('knowledge_base')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Manage Facts
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentFactChanges && stats.recentFactChanges.length > 0 ? (
              stats.recentFactChanges.map((change: any) => (
                <div
                  key={change.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {change.fact_name || 'Approved Fact'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                      v{change.version}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Value: <span className="font-medium text-slate-800 font-mono">{change.value}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    &ldquo;{change.change_reason}&rdquo; — {change.changed_by}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                Facts are at baseline version 1. Updating a fact will record version evolution here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
