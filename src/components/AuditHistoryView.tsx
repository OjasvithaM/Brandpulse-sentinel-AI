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

  const filteredLogs = logs.filter((log) => {
    const matchesEvent = eventTypeFilter === 'ALL' || log.event_type === eventTypeFilter;
    const matchesSearch =
      searchTerm === '' ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Event Type', 'Actor', 'Role', 'Target Type', 'Target ID', 'Details'];
    const rows = filteredLogs.map((log) => [
      `"${log.created_at}"`,
      `"${log.event_type}"`,
      `"${log.actor.replace(/"/g, '""')}"`,
      `"${log.actor_role.replace(/"/g, '""')}"`,
      `"${log.target_type}"`,
      `"${log.target_id}"`,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brandpulse-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'FACT_CREATED':
      case 'FACT_UPDATED':
      case 'KNOWLEDGE_BASE_INITIALIZED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'CHANGE_IMPACT_DETECTED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'TRUST_PASSPORT_ISSUED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'HUMAN_DECISION_RECORDED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Immutable Audit History</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronological, immutable record of all approved fact evolutions, change impact detections, passport issuances, and human reviewer decisions.
          </p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download audit records in CSV format for compliance reporting"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh log"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search details, actors, targets..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Event Type:</span>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Events</option>
            <option value="FACT_CREATED">Fact Created</option>
            <option value="FACT_UPDATED">Fact Updated</option>
            <option value="CHANGE_IMPACT_DETECTED">Change Impact Detected</option>
            <option value="TRUST_PASSPORT_ISSUED">Trust Passport Issued</option>
            <option value="HUMAN_DECISION_RECORDED">Human Decision Recorded</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors text-xs flex items-start space-x-3">
              <div className="mt-0.5 p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                <ScrollText className="w-4 h-4 text-indigo-600" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getEventBadge(
                        log.event_type
                      )}`}
                    >
                      {log.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">[{log.target_type}: {log.target_id}]</span>
                  </div>
                  <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </span>
                </div>

                <p className="text-slate-900 text-xs font-medium leading-relaxed">
                  {log.details}
                </p>

                <div className="text-[11px] text-slate-500">
                  Actor: <strong className="text-slate-700">{log.actor}</strong> ({log.actor_role})
                </div>
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No audit log entries matched your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
