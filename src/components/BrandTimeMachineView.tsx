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

        {/* Quick Demo Trigger Button */}
        <div className="shrink-0 flex items-center space-x-2">
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
    </div>
  );
};
