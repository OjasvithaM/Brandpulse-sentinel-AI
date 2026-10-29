import React, { useState, useEffect } from 'react';
import {
  Radio,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Database,
  Trash2,
  Server,
  Activity,
  Check,
  X,
  Play,
  FileText,
  Zap,
} from 'lucide-react';
import { LiveSource, StagedFactUpdate } from '../types';
import { NavTab } from './Navbar';

interface LiveSourcesViewProps {
  onRefreshStats: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const LiveSourcesView: React.FC<LiveSourcesViewProps> = ({
  onRefreshStats,
  onNavigateTab,
}) => {
  const [sources, setSources] = useState<LiveSource[]>([]);
  const [stagedUpdates, setStagedUpdates] = useState<StagedFactUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isTriggeringScheduler, setIsTriggeringScheduler] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState<any | null>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Review decision modal state
  const [reviewingStaged, setReviewingStaged] = useState<StagedFactUpdate | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // New Connector form state
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'rest_api' | 'pricing_feed' | 'sla_telemetry' | 'policy_document'>('pricing_feed');
  const [newAuthType, setNewAuthType] = useState<'none' | 'bearer_token' | 'api_key_header'>('none');
  const [newAuthHeader, setNewAuthHeader] = useState('X-API-Key');
  const [newAuthEnvVar, setNewAuthEnvVar] = useState('ACME_LIVE_API_KEY');
  const [newInterval, setNewInterval] = useState(30);

  // Upstream Simulation state
  const [isSimulatingUpstream, setIsSimulatingUpstream] = useState(false);

  const fetchSyncHistory = async () => {
    try {
      const res = await fetch('/api/live-sources/history');
      if (res.ok) setSyncHistory(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSchedulerSync = async () => {
    setIsTriggeringScheduler(true);
    try {
      const res = await fetch('/api/scheduler/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSchedulerResult(data);
      await fetchSourcesAndStaged();
      await fetchSyncHistory();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Scheduler sync failed');
    } finally {
      setIsTriggeringScheduler(false);
    }
  };

  const fetchSourcesAndStaged = async () => {
    setIsLoading(true);
    try {
      const [srcRes, stagedRes] = await Promise.all([
        fetch('/api/live-sources'),
        fetch('/api/live-sources/staged-updates'),
      ]);
      const srcData = await srcRes.json();
      const stagedData = await stagedRes.json();

      if (Array.isArray(srcData)) setSources(srcData);
      if (Array.isArray(stagedData)) setStagedUpdates(stagedData);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Failed to load live sources: ${err.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSourcesAndStaged();
  }, []);

  const handleSyncSingle = async (sourceId: string) => {
    setSyncingId(sourceId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/live-sources/${sourceId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.stagedUpdatesGenerated > 0) {
        setStatusMessage({
          text: `Sync complete: Detected ${data.stagedUpdatesGenerated} material change(s) requiring human governance review!`,
          type: 'info',
        });
      } else if (data.status === 'SUCCESS') {
        setStatusMessage({
          text: `Sync successful. Payload verified identical (no change alerts generated). Response time: ${data.responseTimeMs}ms.`,
          type: 'success',
        });
      } else {
        setStatusMessage({ text: `Sync error: ${data.errorMessage}`, type: 'error' });
      }
      await fetchSourcesAndStaged();
      onRefreshStats();
    } catch (err: any) {
      setStatusMessage({ text: `Sync failed: ${err.message}`, type: 'error' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/live-sources/sync-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMessage({
        text: `Successfully synced ${data.results?.length || 0} active live data connectors.`,
        type: 'success',
      });
      await fetchSourcesAndStaged();
      onRefreshStats();
    } catch (err: any) {
      setStatusMessage({ text: `Failed to sync connectors: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/live-sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage({ text: 'Live connector deleted successfully.', type: 'info' });
        await fetchSourcesAndStaged();
        onRefreshStats();
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    }
  };

  const handleAddConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;

    try {
      const res = await fetch('/api/live-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          endpoint_url: newUrl,
          source_type: newType,
          auth_type: newAuthType,
          auth_header_name: newAuthType === 'api_key_header' ? newAuthHeader : null,
          auth_token_env_var: newAuthType !== 'none' ? newAuthEnvVar : null,
          sync_interval_mins: newInterval,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddModal(false);
      setNewName('');
      setNewUrl('');
      setStatusMessage({ text: 'New live data connector successfully configured.', type: 'success' });
      await fetchSourcesAndStaged();
      onRefreshStats();
    } catch (err: any) {
      setStatusMessage({ text: `Failed to add connector: ${err.message}`, type: 'error' });
    }
  };

  // Upstream Simulation (Simulates vendor changing price on live endpoint)
  const handleSimulateUpstreamPrice = async (price: string) => {
    setIsSimulatingUpstream(true);
    try {
      const res = await fetch('/api/live-demo/simulate-upstream-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice: price }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          text: `Upstream REST API updated! Live endpoint now serves price: ${price}. Click "Sync Now" to ingest.`,
          type: 'info',
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSimulatingUpstream(false);
    }
  };

  // Submit human decision for staged fact update
  const handleSubmitDecision = async () => {
    if (!reviewingStaged || !decisionRationale.trim()) return;
    setIsSubmittingDecision(true);
    try {
      const res = await fetch(`/api/live-sources/staged-updates/${reviewingStaged.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decisionAction,
          rationale: decisionRationale,
          reviewer_name: 'Sarah Jenkins (Brand Compliance Lead)',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReviewingStaged(null);
      setDecisionRationale('');
      if (decisionAction === 'APPROVE') {
        setStatusMessage({
          text: `Approved! Fact updated to version ${data.new_value}. ${data.impacts_generated} change-impact alert(s) routed to Brand Time Machine!`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: `Live update rejected with recorded rationale. Approved Knowledge Base remains unchanged.`,
          type: 'info',
        });
      }
      await fetchSourcesAndStaged();
      onRefreshStats();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const pendingStaged = stagedUpdates.filter((s) => s.status === 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Intelligence Layer
            </span>
            <span className="text-xs text-slate-400">Continuous Source Verification</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1 text-white flex items-center space-x-2">
            <span>Live Data Connectors & Ingestion Layer</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Connect directly to authorized brand websites, pricing feeds, and REST APIs. Incoming data is cryptographically hashed, validated for material changes, and routed through human governance before updating approved Knowledge Base facts.
          </p>
        </div>

        <div className="shrink-0 flex items-center space-x-2 flex-wrap gap-2">
          <button
            onClick={handleTriggerSchedulerSync}
            disabled={isTriggeringScheduler}
            className="px-3.5 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Trigger Cloud Scheduler cron endpoint (POST /api/scheduler/sync)"
          >
            <Clock className={`w-3.5 h-3.5 ${isTriggeringScheduler ? 'animate-spin' : ''}`} />
            <span>{isTriggeringScheduler ? 'Invoking Cron...' : 'Cloud Scheduler Sync'}</span>
          </button>
          <button
            onClick={() => {
              fetchSyncHistory();
              setShowHistoryModal(true);
            }}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Inspect historical sync execution and latency logs"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sync Telemetry Log</span>
          </button>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            title="Poll all active connectors immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Syncing Feeds...' : 'Sync All Connectors'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Connector</span>
          </button>
        </div>
      </div>

      {/* Status notification banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700 ml-2 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Upstream Simulation Sandbox (Interactive Demonstration) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-xl border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Live Provider Sandbox (Simulate Upstream Changes)
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Test genuine live change detection over HTTP without waiting for real vendor cycles. Modify the live upstream payload below, then click &ldquo;Sync Now&rdquo; on the pricing connector.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSimulateUpstreamPrice('₹1,199/month')}
            disabled={isSimulatingUpstream}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center space-x-1"
            title="Set upstream API price to ₹1,199/month"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Upstream ₹1,199/mo</span>
          </button>
          <button
            onClick={() => handleSimulateUpstreamPrice('₹999/month')}
            disabled={isSimulatingUpstream}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            title="Restore baseline upstream price to ₹999/month"
          >
            Reset to ₹999/mo
          </button>
          <a
            href="/api/live-demo/pricing"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-flex items-center space-x-1 border border-slate-700"
          >
            <span>Inspect Live JSON</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* STAGED FACT UPDATES: Human Governance Approval Workflow */}
      {pendingStaged.length > 0 && (
        <div className="bg-amber-50/60 rounded-xl border border-amber-300 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Staged Live Fact Updates ({pendingStaged.length} Awaiting Human Review)
                </h3>
                <p className="text-xs text-amber-800">
                  Live data connectors detected material changes compared to currently approved facts. Per governance policy, retrieved information does not automatically become an approved fact until signed off.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingStaged.map((staged) => (
              <div
                key={staged.id}
                className="bg-white rounded-lg border border-amber-200 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{staged.fact_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Detected: {new Date(staged.detected_at).toLocaleTimeString()}
                  </span>
                </div>

                {/* Diff Box */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Current Approved (v{staged.current_approved_version}):
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {staged.current_approved_value}
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 block font-mono">
                      Live Feed Retrieved:
                    </span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {staged.retrieved_live_value}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Source: {staged.source_name}</span>
                  <span className="font-mono text-slate-400">{staged.source_ref}</span>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setReviewingStaged(staged);
                      setDecisionAction('REJECT');
                      setDecisionRationale('Live data rejected: Value differs from official legal sign-off.');
                    }}
                    className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                  >
                    Reject Feed Change
                  </button>
                  <button
                    onClick={() => {
                      setReviewingStaged(staged);
                      setDecisionAction('APPROVE');
                      setDecisionRationale('Verified with live vendor API feed. Updating approved Knowledge Base standard.');
                    }}
                    className="px-3.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Update Fact</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configured Connectors List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configured Live Connectors</h2>
            <p className="text-xs text-slate-500">
              Active ingestion pipelines polling authorized external feeds, monitoring latency, and performing SHA-256 payload verification.
            </p>
          </div>
          <button
            onClick={fetchSourcesAndStaged}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const isSyncing = syncingId === src.id;
            let factsList: any[] = [];
            try {
              if (src.extracted_facts_json) factsList = JSON.parse(src.extracted_facts_json);
            } catch {}

            return (
              <div
                key={src.id}
                className="rounded-xl border border-slate-200 p-4.5 bg-white shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{src.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {src.source_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 break-all">
                        {src.endpoint_url}
                      </div>
                    </div>

                    {/* Freshness & Status Badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          src.data_freshness === 'FRESH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : src.data_freshness === 'STALE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {src.data_freshness}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Interval: {src.sync_interval_mins}m
                      </span>
                    </div>
                  </div>

                  {/* Telemetry row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Last Sync:</span>
                      <span className="font-medium">
                        {src.last_sync_at ? new Date(src.last_sync_at).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Latency:</span>
                      <span className="font-medium font-mono">
                        {src.last_latency_ms ? `${src.last_latency_ms}ms` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">HTTP Status:</span>
                      <span
                        className={`font-medium font-mono ${
                          src.last_http_code === 200 ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {src.last_http_code || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Extracted Facts Preview */}
                  {factsList.length > 0 && (
                    <div className="mt-3 bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Currently Monitored Facts from Feed ({factsList.length}):
                      </span>
                      <div className="space-y-1">
                        {factsList.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 truncate max-w-[200px]">{f.name}:</span>
                            <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {f.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {src.last_error && (
                    <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                      <strong>Error:</strong> {src.last_error}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                    <span className="font-mono">Hash: {src.payload_hash || 'none'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {src.id.startsWith('src-custom') && (
                      <button
                        onClick={() => handleDeleteSource(src.id)}
                        className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete custom connector"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleSyncSingle(src.id)}
                      disabled={isSyncing}
                      className="px-3 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 font-semibold cursor-pointer transition-colors flex items-center space-x-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human Decision Review Modal */}
      {reviewingStaged && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`p-1.5 rounded-lg ${
                    decisionAction === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {decisionAction === 'APPROVE' ? 'Approve Live Fact Update' : 'Reject Live Fact Update'}
                </h3>
              </div>
              <button
                onClick={() => setReviewingStaged(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <strong>Fact:</strong> {reviewingStaged.fact_name}
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Current Approved:</span>
                  <span className="font-bold text-slate-800">{reviewingStaged.current_approved_value}</span>
                </div>
                <div>
                  <span className="text-emerald-700 text-[10px] block">Retrieved from Live Feed:</span>
                  <span className="font-bold text-emerald-800">{reviewingStaged.retrieved_live_value}</span>
                </div>
              </div>
              {decisionAction === 'APPROVE' && (
                <div className="p-2.5 bg-indigo-50 rounded border border-indigo-200 text-indigo-900 text-[11px]">
                  <strong>Brand Time Machine Impact:</strong> Approving this live update will bump the approved fact to version v{reviewingStaged.current_approved_version + 1} and automatically inspect all monitored assets for retroactive claim contradictions.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Reviewer Rationale / Approval Log:
              </label>
              <textarea
                rows={3}
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Enter justification, legal verification, or sign-off rationale..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setReviewingStaged(null)}
                className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={isSubmittingDecision || !decisionRationale.trim()}
                className={`px-4 py-1.5 rounded text-white font-semibold cursor-pointer shadow-xs ${
                  decisionAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                } disabled:opacity-50`}
              >
                {isSubmittingDecision ? 'Submitting...' : decisionAction === 'APPROVE' ? 'Confirm & Apply Update' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Connector Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <Plus className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Add Live Data Connector</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddConnector} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Connector Name:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. EU Regional Pricing API"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Endpoint URL (HTTP/HTTPS or relative):</label>
                <input
                  type="text"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://api.acme.com/v1/plans or /api/live-demo/pricing"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Type:</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="pricing_feed">Pricing Feed</option>
                    <option value="sla_telemetry">SLA Telemetry</option>
                    <option value="rest_api">Generic REST API</option>
                    <option value="policy_document">Policy Document</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Poll Interval (minutes):</label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={newInterval}
                    onChange={(e) => setNewInterval(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Authentication Method:</label>
                <select
                  value={newAuthType}
                  onChange={(e: any) => setNewAuthType(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 text-slate-900 bg-white"
                >
                  <option value="none">None (Public Authorized Feed)</option>
                  <option value="bearer_token">Bearer Token (via Server Secret)</option>
                  <option value="api_key_header">Custom API Key Header</option>
                </select>
              </div>

              {newAuthType !== 'none' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
                  {newAuthType === 'api_key_header' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Header Name:</label>
                      <input
                        type="text"
                        value={newAuthHeader}
                        onChange={(e) => setNewAuthHeader(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 text-slate-900"
                      />
                    </div>
                  )}
                  <div className={newAuthType === 'bearer_token' ? 'col-span-2' : ''}>
                    <label className="block font-bold text-slate-700 mb-1">Server Env Secret Name:</label>
                    <input
                      type="text"
                      value={newAuthEnvVar}
                      onChange={(e) => setNewAuthEnvVar(e.target.value)}
                      placeholder="e.g. ACME_API_SECRET"
                      className="w-full px-2 py-1 rounded border border-slate-300 text-slate-900 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Never exposed to browser; read securely server-side.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Save Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cloud Scheduler Result Dialog */}
      {schedulerResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-cyan-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono">
                  Cloud Scheduler Execution Completed
                </h3>
              </div>
              <button onClick={() => setSchedulerResult(null)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {schedulerResult.message}
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Cron Job ID:</span>
                <span className="text-cyan-400 font-bold">{schedulerResult.job_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Run ID:</span>
                <span className="text-slate-300">{schedulerResult.run_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Execution Status:</span>
                <span className="text-emerald-400 font-bold">{schedulerResult.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sources Synced:</span>
                <span className="text-indigo-400 font-bold">{schedulerResult.synced_sources} active feed(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Changes Flagged:</span>
                <span className={schedulerResult.changed_facts > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {schedulerResult.changed_facts} material update(s)
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400">Next Scheduled Cron:</span>
                <span className="text-slate-300">{new Date(schedulerResult.next_scheduled_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSchedulerResult(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Sync Telemetry History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-cyan-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono">
                  Live Sources Ingestion Telemetry & Execution Runs
                </h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="p-2">Source ID</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">HTTP</th>
                    <th className="p-2">Latency</th>
                    <th className="p-2">Payload Hash</th>
                    <th className="p-2">Changed</th>
                    <th className="p-2 text-right">Synced At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {syncHistory.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-900/40">
                      <td className="p-2 font-mono text-[11px] text-cyan-300">{h.source_id}</td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            h.sync_status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {h.sync_status}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-[11px] text-slate-300">{h.http_status_code || 200}</td>
                      <td className="p-2 font-mono text-[11px] text-amber-400">{h.response_time_ms}ms</td>
                      <td className="p-2 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={h.payload_hash}>
                        {h.payload_hash?.substring(0, 10)}...
                      </td>
                      <td className="p-2 font-mono text-[11px]">
                        <span className={h.facts_changed_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {h.facts_changed_count}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-[10px] text-slate-400">
                        {new Date(h.synced_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {syncHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                        No historical sync runs logged yet. Click &ldquo;Cloud Scheduler Sync&rdquo; to initiate an ingestion run.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
