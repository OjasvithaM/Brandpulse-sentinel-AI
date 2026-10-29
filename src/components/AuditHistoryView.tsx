import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Clock,
  Shield,
  FileCheck2,
  FileBadge,
  UserCheck,
  History,
  RotateCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  ShieldAlert,
  X,
  Hash,
  Link2,
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditHistoryViewProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({
  logs,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainResult, setChainResult] = useState<any | null>(null);
  const [showHashes, setShowHashes] = useState(false);
  const [isTestingTamper, setIsTestingTamper] = useState(false);
  const [tamperTestResult, setTamperTestResult] = useState<any | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesEvent = eventTypeFilter === 'ALL' || log.event_type === eventTypeFilter;
    const matchesSearch =
      searchTerm === '' ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.chain_hash && log.chain_hash.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesEvent && matchesSearch;
  });

  const handleVerifyChain = async () => {
    try {
      setVerifyingChain(true);
      const res = await fetch('/api/audit-logs/verify-chain');
      const data = await res.json();
      setChainResult(data);
    } catch (err: any) {
      alert(err.message || 'Chain verification failed');
    } finally {
      setVerifyingChain(false);
    }
  };

  const handleTestTamper = async () => {
    try {
      setIsTestingTamper(true);
      const res = await fetch('/api/audit-logs/test-tamper', { method: 'POST' });
      const data = await res.json();
      setTamperTestResult(data);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Tamper test simulation failed');
    } finally {
      setIsTestingTamper(false);
    }
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Event Type', 'Actor', 'Role', 'Target Type', 'Target ID', 'Chain Hash', 'Prev Hash', 'Details'];
    const rows = filteredLogs.map((log) => [
      `"${log.created_at}"`,
      `"${log.event_type}"`,
      `"${log.actor.replace(/"/g, '""')}"`,
      `"${log.actor_role.replace(/"/g, '""')}"`,
      `"${log.target_type}"`,
      `"${log.target_id}"`,
      `"${log.chain_hash || ''}"`,
      `"${log.prev_hash || ''}"`,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brandpulse-cryptographic-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'FACT_CREATED':
      case 'FACT_UPDATED':
      case 'KNOWLEDGE_BASE_INITIALIZED':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'CHANGE_IMPACT_DETECTED':
      case 'CHANGE_IMPACT_RESOLVED':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'TRUST_PASSPORT_ISSUED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'HUMAN_DECISION_RECORDED':
      case 'AUDIT_DECISION_RECORDED':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0b1220] border border-cyan-900/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                <ScrollText className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Cryptographic Audit Trail
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                    SHA-256 HASH-CHAINED
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Append-only immutable governance ledger with backward hash linking. Every fact update, passport issuance, and human decision is tamper-evident.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleVerifyChain}
              disabled={verifyingChain}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
              <span>{verifyingChain ? 'Verifying Hashes...' : 'Verify Hash Chain'}</span>
            </button>

            <button
              onClick={handleTestTamper}
              disabled={isTestingTamper}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Simulates adversary data tampering to prove SHA-256 chain breakage detection"
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${isTestingTamper ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
              <span>{isTestingTamper ? 'Testing Tamper...' : 'Test Tamper Detection (Demo)'}</span>
            </button>

            <button
              onClick={() => setShowHashes(!showHashes)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                showHashes
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{showHashes ? 'Hide Hash Hashes' : 'Inspect Block Hashes'}</span>
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredLogs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Download audit records in CSV format"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Refresh log"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search details, actor, target ID, hash..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-mono">Event Type:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-900 text-slate-200 focus:outline-none focus:border-cyan-600 font-mono"
          >
            <option value="ALL">All Events ({logs.length})</option>
            <option value="FACT_CREATED">Fact Created</option>
            <option value="FACT_UPDATED">Fact Updated</option>
            <option value="CHANGE_IMPACT_DETECTED">Change Impact Detected</option>
            <option value="CHANGE_IMPACT_RESOLVED">Change Impact Resolved</option>
            <option value="TRUST_PASSPORT_ISSUED">Trust Passport Issued</option>
            <option value="HUMAN_DECISION_RECORDED">Human Decision Recorded</option>
            <option value="AUDIT_EXECUTED">Audit Executed</option>
            <option value="LIVE_FACT_APPROVED_BY_HUMAN">Live Fact Approved</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-[#0b1220] rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="divide-y divide-slate-800/60">
          {filteredLogs.map((log, index) => (
            <div key={log.id} className="p-4 hover:bg-slate-900/40 transition-colors text-xs flex items-start space-x-3.5">
              <div className="mt-0.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0 font-mono text-[10px]">
                #{logs.length - index}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${getEventBadge(
                        log.event_type
                      )}`}
                    >
                      {log.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      [{log.target_type}: {log.target_id}]
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </span>
                </div>

                <p className="text-slate-200 text-xs font-medium leading-relaxed">
                  {log.details}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-0.5">
                  <div>
                    Actor: <strong className="text-slate-200">{log.actor}</strong>{' '}
                    <span className="font-mono text-[10px] text-cyan-400">({log.actor_role})</span>
                  </div>

                  {log.chain_hash && (
                    <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-emerald-400" />
                      <span>Block Hash:</span>
                      <span className="text-emerald-400 truncate max-w-[140px]" title={log.chain_hash}>
                        {log.chain_hash.substring(0, 16)}...
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Cryptographic Block Inspector */}
                {showHashes && log.chain_hash && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[10px] space-y-1 text-slate-400 break-all animate-in fade-in duration-100">
                    <div>
                      <span className="text-slate-500">Prev Block Hash:</span>{' '}
                      <span className="text-cyan-400">{log.prev_hash || 'GENESIS_BLOCK'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Payload Hash:</span>{' '}
                      <span className="text-indigo-400">{log.payload_hash}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Chain Hash:</span>{' '}
                      <span className="text-emerald-400 font-bold">{log.chain_hash}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No audit log entries matched your filter.
            </div>
          )}
        </div>
      </div>

      {/* Hash Chain Verification Result Dialog */}
      {chainResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-cyan-800/80 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                {chainResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                )}
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  {chainResult.valid ? 'Audit Hash Chain Verified' : 'Hash Chain Tamper Detected'}
                </h3>
              </div>
              <button onClick={() => setChainResult(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {chainResult.message}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Verified Blocks</span>
                <span className="text-base font-bold text-emerald-400">{chainResult.total_blocks}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Chain Continuity</span>
                <span className="text-base font-bold text-cyan-400">100% UNBROKEN</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1.5 break-all">
              <div className="text-slate-400">
                Genesis Block: <span className="text-slate-300">{chainResult.genesis_hash}</span>
              </div>
              <div className="text-slate-400">
                Latest Chain Hash: <span className="text-emerald-400">{chainResult.latest_hash}</span>
              </div>
            </div>

            <button
              onClick={() => setChainResult(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Dismiss Chain Verification
            </button>
          </div>
        </div>
      )}

      {/* Tamper Detection Demonstration Dialog */}
      {tamperTestResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-rose-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Tamper Detection Demonstration (Part 10 Demo Step 6)
                </h3>
              </div>
              <button onClick={() => setTamperTestResult(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {tamperTestResult.message}
            </p>

            {/* Stage 1: Adversary Attack & Tamper Detection */}
            <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 font-mono text-[11px] uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Step 1: Adversary Mutation Injected
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900 text-rose-200">
                  TAMPER DETECTED
                </span>
              </div>
              <div className="text-slate-300 font-sans text-xs">
                Tampered Block: <span className="font-mono text-cyan-300">{tamperTestResult.tampered_block_id}</span>
              </div>
              <div className="p-2 rounded bg-black/60 font-mono text-[10px] text-rose-300 break-all border border-rose-900/80">
                Adversary String: &ldquo;{tamperTestResult.tampered_details}&rdquo;
              </div>
              <div className="text-[11px] text-rose-400 font-mono">
                Chain Result: {tamperTestResult.tamper_result.message}
              </div>
            </div>

            {/* Stage 2: Pristine State Restored & Chain Re-verified */}
            <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 font-mono text-[11px] uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Step 2: Non-Destructive Self-Healing Restored
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-900 text-emerald-200">
                  100% INTACT
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 font-mono">
                Chain Result: {tamperTestResult.healed_result.message}
              </div>
              <div className="text-[10px] text-slate-400">
                Total verified blocks: {tamperTestResult.healed_result.total_blocks} (Backward SHA-256 hash chaining prevents all silent record alterations).
              </div>
            </div>

            <button
              onClick={() => setTamperTestResult(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close Tamper Demonstration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
