import React, { useState } from 'react';
import {
  History,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileText,
  RotateCw,
  Search,
  Filter,
  Check,
  X,
  Play,
  Eye,
} from 'lucide-react';
import { ChangeImpact } from '../types';
import { NavTab } from './Navbar';

interface BrandTimeMachineViewProps {
  impacts: ChangeImpact[];
  onRefresh: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onSimulatePriceChange: () => void;
}

export const BrandTimeMachineView: React.FC<BrandTimeMachineViewProps> = ({
  impacts,
  onRefresh,
  onNavigateTab,
  onSimulatePriceChange,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'REVALIDATED' | 'DISMISSED'>('PENDING');
  const [search, setSearch] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [inspectingImpact, setInspectingImpact] = useState<ChangeImpact | null>(null);
  const [isBulkRevalidating, setIsBulkRevalidating] = useState(false);
  const [bulkRevalidateResult, setBulkRevalidateResult] = useState<any | null>(null);

  const filteredImpacts = impacts.filter((imp) => {
    const matchesStatus = filterStatus === 'ALL' || imp.alert_status === filterStatus;
    const matchesSearch =
      search === '' ||
      imp.asset_name.toLowerCase().includes(search.toLowerCase()) ||
      imp.fact_name.toLowerCase().includes(search.toLowerCase()) ||
      imp.impact_reason.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = impacts.filter((i) => i.alert_status === 'PENDING').length;

  const handleResolve = async (id: string, action: 'revalidate' | 'dismiss') => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/impacts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          resolved_by: 'Brand Governance Officer',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleBulkRevalidate = async () => {
    setIsBulkRevalidating(true);
    try {
      const res = await fetch('/api/impacts/bulk-revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setBulkRevalidateResult(data);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Bulk revalidation failed');
    } finally {
      setIsBulkRevalidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Module 3: Flagship Innovation
            </span>
            <span className="text-xs text-slate-400">Change-Impact Intelligence</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1 text-white">
            Brand Time Machine
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            When approved facts change, which previously verified assets become outdated? The Brand Time Machine monitors historical asset versions, surfaces retroactive compliance risks, and maintains a clean revalidation queue.
          </p>
        </div>

        {/* Quick Demo Trigger Button & One-Click Bulk Revalidation */}
        <div className="shrink-0 flex items-center space-x-2 flex-wrap gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleBulkRevalidate}
              disabled={isBulkRevalidating}
              className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              title="One-click revalidate all affected assets and issue Ed25519-signed Trust Passports"
            >
              <CheckCircle2 className={`w-4 h-4 ${isBulkRevalidating ? 'animate-spin' : ''}`} />
              <span>{isBulkRevalidating ? 'Revalidating All...' : `Bulk Revalidate (${pendingCount}) with Ed25519`}</span>
            </button>
          )}

          <button
            onClick={onSimulatePriceChange}
            className="px-3.5 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
            title="Demonstrate fact change: updates Acme Cloud Pro from ₹999 to ₹1,199"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate Fact Update (₹999 → ₹1,199)</span>
          </button>
        </div>
      </div>

      {/* Revalidation Queue Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Pending Revalidations</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{pendingCount}</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Resolved / Updated</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {impacts.filter((i) => i.alert_status === 'REVALIDATED').length}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Dismissed Alerts</span>
            <div className="text-2xl font-bold text-slate-700 mt-1">
              {impacts.filter((i) => i.alert_status === 'DISMISSED').length}
            </div>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-500">
            <X className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search affected assets, facts, claims..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Status:</span>
          {(['PENDING', 'REVALIDATED', 'DISMISSED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
            title="Refresh queue"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Revalidation Queue Cards */}
      <div className="space-y-4">
        {filteredImpacts.length > 0 ? (
          filteredImpacts.map((imp) => {
            const isPending = imp.alert_status === 'PENDING';
            return (
              <div
                key={imp.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-4 ${
                  isPending
                    ? 'border-rose-200 bg-rose-50/10 hover:border-rose-300'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Header row: Impact Risk + Asset Name + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        imp.impact_risk === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : imp.impact_risk === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {imp.impact_risk} Risk Impact
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{imp.asset_name}</h3>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                      v{imp.asset_version}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Detected: {new Date(imp.created_at).toLocaleString()}</span>
                    </span>
                    <button
                      onClick={() => setInspectingImpact(imp)}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                      title="Inspect side-by-side claim & fact diff"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Diff</span>
                    </button>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        imp.alert_status === 'PENDING'
                          ? 'bg-rose-100 text-rose-800'
                          : imp.alert_status === 'REVALIDATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {imp.alert_status}
                    </span>
                  </div>
                </div>

                {/* Diff Box: Fact Evolution Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Changed Fact Trigger */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Triggering Knowledge Base Fact Revision:
                    </div>
                    <div className="font-bold text-slate-900">{imp.fact_name}</div>
                    <div className="flex items-center space-x-2 pt-1">
                      <div className="bg-white px-2 py-1 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          v{imp.old_version} (Past Approved)
                        </span>
                        <span className="font-mono font-bold text-slate-700">{imp.old_value}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <span className="text-[10px] text-emerald-700 block font-mono">
                          v{imp.new_version} (Current Approved)
                        </span>
                        <span className="font-mono font-bold text-emerald-800">{imp.new_value}</span>
                      </div>
                    </div>
                  </div>

                  {/* Impacted Claim in Asset */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Impacted Claim in Reviewed Asset v{imp.asset_version}:
                    </div>
                    <p className="italic text-slate-800 bg-white p-2 rounded border border-slate-200 text-xs">
                      &ldquo;{imp.impacted_claim_text}&rdquo;
                    </p>
                    <div className="text-[11px] text-rose-700 font-medium pt-1">
                      {imp.impact_reason}
                    </div>
                  </div>
                </div>

                {/* Reviewer Action Bar */}
                {isPending && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Recommended action: Open asset in Review Queue to adjust copy and re-certify Trust Passport.
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setInspectingImpact(imp)}
                        className="px-2.5 py-1.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inspect Diff</span>
                      </button>
                      <button
                        onClick={() => handleResolve(imp.id, 'dismiss')}
                        disabled={resolvingId === imp.id}
                        className="px-2.5 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolve(imp.id, 'revalidate')}
                        disabled={resolvingId === imp.id}
                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                      >
                        Mark Revalidated
                      </button>
                      <button
                        onClick={() => onNavigateTab('review_queue')}
                        className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Open in Review Queue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Pending Change-Impact Alerts
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All monitored marketing assets are aligned with current approved Knowledge Base facts. When a fact changes, affected assets will be automatically placed into this queue.
            </p>
            <div className="pt-2">
              <button
                onClick={onSimulatePriceChange}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Fact Update (Demo Part B)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Diff Inspector Modal */}
      {inspectingImpact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white">Change-Impact Diff Inspector</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/30 text-rose-200">
                      {inspectingImpact.impact_risk} Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {inspectingImpact.asset_name} • Version v{inspectingImpact.asset_version}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingImpact(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Obsolescence Trigger: </span>
                  Fact &ldquo;{inspectingImpact.fact_name}&rdquo; was superseded from version{' '}
                  <span className="font-mono font-bold">v{inspectingImpact.old_version}</span> to{' '}
                  <span className="font-mono font-bold">v{inspectingImpact.new_version}</span>.
                  The published asset currently contains a claim conflicting with the new baseline.
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Outdated Asset State */}
                <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                    <span className="text-xs font-bold text-rose-800 flex items-center space-x-1">
                      <span>Outdated Asset Claim (v{inspectingImpact.asset_version})</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded font-mono text-[10px] font-bold">
                      CONTRADICTED
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Published Asset Claim:
                    </label>
                    <div className="p-2.5 bg-white rounded-md border border-rose-200 text-xs text-slate-800 italic">
                      &ldquo;{inspectingImpact.impacted_claim_text}&rdquo;
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Past Approved Baseline:
                    </label>
                    <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">v{inspectingImpact.old_version} Approved Value:</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {inspectingImpact.old_value}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-rose-700 bg-rose-100/60 p-2 rounded">
                    <strong>Detection Reason:</strong> {inspectingImpact.impact_reason}
                  </div>
                </div>

                {/* New Approved Standard */}
                <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                      <span>New Approved Standard (v{inspectingImpact.new_version})</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded font-mono text-[10px] font-bold">
                      REQUIRED
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Current Approved Fact Value:
                    </label>
                    <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-medium">{inspectingImpact.fact_name}:</span>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {inspectingImpact.new_value}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Recommended Copy Correction:
                    </label>
                    <div className="p-2.5 bg-white rounded-md border border-emerald-200 text-xs text-slate-800">
                      Update claim to reflect current approved value{' '}
                      <span className="font-mono font-bold text-emerald-700 underline">
                        {inspectingImpact.new_value}
                      </span>
                      .
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-100 p-2 rounded">
                    <strong>Audit Trace:</strong> Fact change was committed through controlled Knowledge Base versioning with change tracking.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={() => setInspectingImpact(null)}
                className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
              >
                Close Diff
              </button>

              <div className="flex items-center space-x-2">
                {inspectingImpact.alert_status === 'PENDING' && (
                  <button
                    onClick={() => {
                      handleResolve(inspectingImpact.id, 'revalidate');
                      setInspectingImpact(null);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                  >
                    Mark Revalidated
                  </button>
                )}
                <button
                  onClick={() => {
                    setInspectingImpact(null);
                    onNavigateTab('review_queue');
                  }}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <span>Resolve in Review Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Revalidation Score Diff Modal */}
      {bulkRevalidateResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-emerald-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono text-slate-100">
                  Bulk Revalidation Completed ({bulkRevalidateResult.revalidated_count} Assets Revalidated)
                </h3>
              </div>
              <button onClick={() => setBulkRevalidateResult(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {bulkRevalidateResult.message} Every revalidated asset has been bumped to a new version with an Ed25519-signed Trust Passport (`bp-key-2026-v1`).
            </p>

            {/* Score Diffs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="p-2">Asset Name</th>
                    <th className="p-2">Score Diff</th>
                    <th className="p-2">Status Diff</th>
                    <th className="p-2">New Passport</th>
                    <th className="p-2 text-right">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {bulkRevalidateResult.results.map((r: any) => (
                    <tr key={r.asset_id} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-medium text-slate-200">
                        {r.asset_name} <span className="font-mono text-slate-400 text-[10px]">v{r.new_version}</span>
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        <span className="text-slate-400">{r.old_score}%</span>
                        <span className="mx-1 text-slate-500">→</span>
                        <span className="text-emerald-400 font-bold">{r.new_score}%</span>
                        <span className="ml-1 text-[10px] text-emerald-300">
                          ({r.score_diff >= 0 ? `+${r.score_diff}` : r.score_diff}%)
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[10px]">
                        <span className="text-rose-400">{r.old_status}</span>
                        <span className="mx-1 text-slate-500">→</span>
                        <span className="text-emerald-400 font-bold">{r.new_status}</span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-cyan-300">
                        {r.new_passport_code}
                      </td>
                      <td className="p-2.5 text-right font-mono text-[10px] text-emerald-400">
                        Ed25519 ({r.key_id})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setBulkRevalidateResult(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setBulkRevalidateResult(null);
                  onNavigateTab('trust_passports');
                }}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer flex items-center space-x-1"
              >
                <span>Inspect Updated Passports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
