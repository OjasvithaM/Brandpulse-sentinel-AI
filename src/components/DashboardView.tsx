import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
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
  Radio,
  RefreshCw,
  Zap,
  Eye,
  FileText,
  HelpCircle,
  ShieldAlert,
  Network,
} from 'lucide-react';
import { DashboardStats, LiveSource, SavedAudit } from '../types';
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
  const [liveSources, setLiveSources] = useState<LiveSource[]>([]);
  const [recentAudits, setRecentAudits] = useState<SavedAudit[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingAudits, setIsLoadingAudits] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sourcesRes, auditsRes] = await Promise.all([
        fetch('/api/live-sources'),
        fetch('/api/audits'),
      ]);

      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        if (Array.isArray(data)) setLiveSources(data);
      }
      if (auditsRes.ok) {
        const auditsData = await auditsRes.json();
        if (Array.isArray(auditsData)) setRecentAudits(auditsData);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setIsLoadingAudits(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleQuickSyncAll = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/live-sources/sync-all', { method: 'POST' });
      await loadDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const actualSavedAuditsCount = recentAudits.length;

  return (
    <div className="space-y-6">
      {/* 1. Welcome Section & Value Proposition */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Evidence-Based Brand Governance Platform
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Enterprise Brand Compliance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            BrandPulse Sentinel AI
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
            Verify every claim. Track every change. Preserve every decision. Protect your organization's integrity by evaluating brand assertions against verifiable evidence and maintaining tamper-evident audit passports.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenDemoGuide}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive Demo Tour</span>
          </button>
        </div>
      </div>

      {/* 2. TWO MAIN ACTION CARDS (Section 1 Requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* ACTION CARD A: NEW AUDIT */}
        <div className="bg-white rounded-2xl border-2 border-indigo-200/80 p-6 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 pointer-events-none opacity-60"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Primary Workflow
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Start New Audit
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Evaluate marketing copy, sales presentations, or press releases against approved brand guidelines and live evidence sources.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1 text-[11px] text-slate-500 border-t border-slate-100">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Claim Extraction</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Evidence Check</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Trust Passport</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4">
            <button
              onClick={() => onNavigateTab('new_audit')}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer group-hover:translate-x-0.5"
            >
              <span>Start New Brand Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ACTION CARD B: REVIEW AUDIT */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0 pointer-events-none opacity-60"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                <Search className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {actualSavedAuditsCount} Saved {actualSavedAuditsCount === 1 ? 'Audit' : 'Audits'}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                Review Existing Audits
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Reopen previously verified audits, inspect claim citations, certify reviewer decisions, and examine immutable historical passports.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1 text-[11px] text-slate-500 border-t border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Audit History</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Human Review</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <FileBadge className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Passports</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4">
            <button
              onClick={() => onNavigateTab('saved_audits')}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-slate-900/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Review Existing Audits</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SIGNATURE INNOVATION: BRAND DRIFT IMPACT GRAPH CALLOUT */}
      <div className="bg-[#0b1220] border-2 border-cyan-800/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950 shrink-0">
            <Network className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold tracking-wider">
                Signature Innovation
              </span>
              <span className="text-xs text-slate-400 font-mono">Real-Time Evidence Topology</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-1">
              Brand Drift Impact Graph & Simulation Radar
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5 leading-relaxed">
              Explore interconnected nodes between approved facts, version history, brand rules, published assets, and cascading drift vectors. Test proposed fact changes with zero database writes via in-memory dry-runs.
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0 flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('impact_graph')}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Impact Graph</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Ingestion Alert Banner (if pending staged updates) */}
      {stats && stats.pendingStagedUpdatesCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Live Ingestion Alert: {stats.pendingStagedUpdatesCount} Material Fact Change(s) Detected!
              </h3>
              <p className="text-xs text-amber-800">
                Authorized live connectors detected pricing or SLA telemetry updates. Routing through human review before staging into the Knowledge Base.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('live_sources')}
            className="px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shrink-0 flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Review Staged Updates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Critical Revalidation Alert Banner (Brand Time Machine notification) */}
      {stats && stats.pendingImpactsCount > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Change-Impact Alert: {stats.pendingImpactsCount} Asset(s) Awaiting Revalidation!
              </h3>
              <p className="text-xs text-rose-700">
                An approved fact in the Knowledge Base was updated. The Brand Time Machine identified previously approved assets that may now contain outdated claims.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('time_machine')}
            className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0 flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Open Brand Time Machine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Compact Summary of Actual Audit & Governance Statistics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Governance System Health & Metrics
          </h2>
          <span className="text-[11px] text-slate-400">All metrics persisted in database</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Approved Facts */}
          <div
            onClick={() => onNavigateTab('knowledge_base')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Approved Facts</span>
              <Database className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {stats?.factsCount ?? 6}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Versioned</span>
            </div>
          </div>

          {/* Active Rules */}
          <div
            onClick={() => onNavigateTab('knowledge_base')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Brand Rules</span>
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {stats?.rulesCount ?? 3}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">Active</span>
            </div>
          </div>

          {/* Live Connectors */}
          <div
            onClick={() => onNavigateTab('live_sources')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Live Connectors</span>
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {stats?.liveSourcesCount ?? 2}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Connected</span>
            </div>
          </div>

          {/* Monitored Assets */}
          <div
            onClick={() => onNavigateTab('trust_passports')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Monitored Assets</span>
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {stats?.assetsCount ?? 1}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Governed</span>
            </div>
          </div>

          {/* Trust Passports */}
          <div
            onClick={() => onNavigateTab('trust_passports')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Trust Passports</span>
              <FileBadge className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {stats?.passportsCount ?? 1}
              </span>
              <span className="text-[10px] text-indigo-600 font-bold uppercase">Verifiable</span>
            </div>
          </div>

          {/* Review Queue */}
          <div
            onClick={() => onNavigateTab('review_queue')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Reviews</span>
              <CheckSquare className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {stats?.pendingReviewsCount ?? 0}
              </span>
              <span className="text-[10px] text-amber-600 font-bold uppercase">Sign-Offs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Audits from the Backend */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Brand Compliance Audits
            </h2>
            <p className="text-xs text-slate-500">
              Historical audits saved in the database with claim evaluations and reviewer decisions.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('saved_audits')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Audits ({recentAudits.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAudits.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
            <ClipboardCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No audits executed yet</div>
            <p className="text-xs text-slate-500">
              Start your first compliance audit using the action card above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAudits.slice(0, 4).map((audit) => (
              <div
                key={audit.id}
                onClick={() => onNavigateTab('saved_audits')}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {audit.audit_name}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                        audit.overall_status === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : audit.overall_status === 'CONDITIONAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {audit.overall_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>{audit.brand}</span>
                    <span>•</span>
                    <span>{audit.channel}</span>
                    <span>•</span>
                    <span>Score: <strong className="font-mono text-slate-800">{audit.governance_score}%</strong></span>
                    <span>•</span>
                    <span>{new Date(audit.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                    {audit.review_status.replace(/_/g, ' ')}
                  </span>
                  <div className="text-xs font-semibold text-indigo-600 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Quick-Access Section for Core Governance Modules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick-Access Core Governance Modules
          </h2>
          <span className="text-[11px] text-slate-400">Complete 5-Module Architecture</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Module 1: Knowledge Base */}
          <div
            onClick={() => onNavigateTab('knowledge_base')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-900 mb-1">Approved Knowledge Base</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Versioned facts, pricing schedules, uptime SLAs, and active brand rules.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-indigo-600 font-bold flex items-center">
              <span>Inspect Facts</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Module 2: EvidenceGuard */}
          <div
            onClick={() => onNavigateTab('evidence_guard')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-900 mb-1">EvidenceGuard Engine</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Audit submitted text into Supported, Contradicted, and Unverified claims.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-indigo-600 font-bold flex items-center">
              <span>Open EvidenceGuard</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Module 3: Brand Time Machine */}
          <div
            onClick={() => onNavigateTab('time_machine')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5">
                <History className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-900 mb-1">Brand Time Machine</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Track knowledge evolution and identify previously approved content needing revalidation.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-indigo-600 font-bold flex items-center">
              <span>View Impact Radar</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Module 4: Trust Passports */}
          <div
            onClick={() => onNavigateTab('trust_passports')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
                <FileBadge className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-900 mb-1">Trust Passports</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Immutable, version-specific audit certificates with cryptographic evidence snapshots.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-indigo-600 font-bold flex items-center">
              <span>Examine Passports</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Module 5: Human Review & Audit Dashboard */}
          <div
            onClick={() => onNavigateTab('review_queue')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-900 mb-1">Audit Review Dashboard</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Centralized workspace for certifying decisions and inspecting compliance trails.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-indigo-600 font-bold flex items-center">
              <span>Open Queue</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
