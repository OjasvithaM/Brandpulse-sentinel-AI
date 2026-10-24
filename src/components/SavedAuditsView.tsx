import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileBadge,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
  X,
  FileText,
  Sparkles,
  Download,
  CheckSquare,
  MessageSquare,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';
import { SavedAudit, VerificationFinding } from '../types';
import { NavTab } from './Navbar';

interface SavedAuditsViewProps {
  onNavigateTab: (tab: NavTab) => void;
  onRefreshStats: () => void;
}

export const SavedAuditsView: React.FC<SavedAuditsViewProps> = ({
  onNavigateTab,
  onRefreshStats,
}) => {
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reviewStateFilter, setReviewStateFilter] = useState('ALL');

  // Inspection Modal State
  const [inspectAudit, setInspectAudit] = useState<SavedAudit | null>(null);

  // Decision Form State
  const [decisionState, setDecisionState] = useState<'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'>('APPROVED');
  const [reviewerName, setReviewerName] = useState('Sarah Jenkins (Compliance Lead)');
  const [reviewerRole, setReviewerRole] = useState('Brand Governance Officer');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch saved audits from backend API
  const fetchAudits = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/audits');
      if (!res.ok) {
        throw new Error(`Failed to load audits (HTTP ${res.status})`);
      }
      const data: SavedAudit[] = await res.json();
      setAudits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err.message || 'Unable to retrieve audits from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  // Filtered Audits
  const filteredAudits = audits.filter((audit) => {
    const matchesSearch =
      searchTerm === '' ||
      audit.audit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (audit.passport_code && audit.passport_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBrand = brandFilter === 'ALL' || audit.brand === brandFilter;
    const matchesStatus = statusFilter === 'ALL' || audit.overall_status === statusFilter;
    const matchesReview =
      reviewStateFilter === 'ALL' || audit.review_status === reviewStateFilter;

    return matchesSearch && matchesBrand && matchesStatus && matchesReview;
  });

  // Unique brands list for filter dropdown
  const uniqueBrands = Array.from(new Set(audits.map((a) => a.brand))).filter(Boolean);

  // Handle Review Decision Submission
  const handleSubmitDecision = async () => {
    if (!inspectAudit) return;
    setIsSubmittingDecision(true);
    setActionSuccessMsg(null);

    try {
      const res = await fetch(`/api/audits/${inspectAudit.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionState,
          reviewer_name: reviewerName,
          reviewer_role: reviewerRole,
          reviewer_notes: decisionRationale.trim() || `Decision ${decisionState} certified.`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save decision.');
      }

      setActionSuccessMsg(`Review decision "${decisionState}" recorded successfully.`);

      // Update local inspected audit and list
      const updatedAudit: SavedAudit = {
        ...inspectAudit,
        review_status: decisionState,
        reviewer_name: reviewerName,
        reviewer_role: reviewerRole,
        reviewer_notes: decisionRationale.trim() || `Decision ${decisionState} certified.`,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setInspectAudit(updatedAudit);
      setAudits((prev) => prev.map((a) => (a.id === updatedAudit.id ? updatedAudit : a)));
      onRefreshStats();

      setTimeout(() => {
        setActionSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      alert(err.message || 'Error recording decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleOpenInspection = (audit: SavedAudit) => {
    setInspectAudit(audit);
    setDecisionState(audit.review_status === 'REJECTED' ? 'REJECTED' : audit.review_status === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'APPROVED');
    setDecisionRationale(audit.reviewer_notes || '');
    setActionSuccessMsg(null);
  };

  const handleCloseInspection = () => {
    setInspectAudit(null);
    setActionSuccessMsg(null);
  };

  // Export audit summary to CSV
  const handleExportCSV = () => {
    if (filteredAudits.length === 0) return;
    const headers = [
      'Audit ID',
      'Audit Name',
      'Brand',
      'Channel',
      'Overall Status',
      'Score',
      'Claims Count',
      'Supported',
      'Contradicted',
      'Unverified',
      'Review Status',
      'Reviewer',
      'Passport Code',
      'Created At',
    ];
    const rows = filteredAudits.map((a) => [
      `"${a.id}"`,
      `"${a.audit_name.replace(/"/g, '""')}"`,
      `"${a.brand.replace(/"/g, '""')}"`,
      `"${a.channel}"`,
      `"${a.overall_status}"`,
      `"${a.governance_score}%"`,
      a.claims_count,
      a.supported_count,
      a.contradicted_count,
      a.unverified_count,
      `"${a.review_status}"`,
      `"${(a.reviewer_name || '').replace(/"/g, '""')}"`,
      `"${a.passport_code || ''}"`,
      `"${a.created_at}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brandpulse-audits-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span
              onClick={() => onNavigateTab('dashboard')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              Home
            </span>
            <span>/</span>
            <span className="text-slate-900 font-medium">Review Audits</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Search className="w-6 h-6 text-indigo-600" />
            <span>Audit History & Decision Review Console</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Reopen previous brand audits, inspect claim-level evidence, certify human decisions, and maintain audit trails.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAudits}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh audits from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredAudits.length === 0}
            className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigateTab('new_audit')}
            className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>New Audit</span>
          </button>
        </div>
      </div>

      {/* Real Database Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-medium text-slate-500">Saved Audits</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{audits.length}</div>
          <span className="text-[11px] text-indigo-600 font-medium">Persisted Records</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-white shadow-xs">
          <span className="text-xs font-medium text-emerald-800">Approved Decisions</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {audits.filter((a) => a.review_status === 'APPROVED').length}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Certified Compliant</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-white shadow-xs">
          <span className="text-xs font-medium text-amber-800">Pending Human Review</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {audits.filter((a) => a.review_status === 'PENDING_REVIEW').length}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Awaiting Sign-off</span>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-white shadow-xs">
          <span className="text-xs font-medium text-rose-800">Changes / Rejected</span>
          <div className="text-2xl font-bold text-rose-700 mt-1">
            {audits.filter((a) => a.review_status === 'CHANGES_REQUESTED' || a.review_status === 'REJECTED').length}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Requires Action</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by audit name, brand, claim content, or passport ID..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Brand Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 text-[11px]">Brand:</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
            >
              <option value="ALL">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASSED">Passed (100%)</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Review State Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 text-[11px]">Review:</span>
            <select
              value={reviewStateFilter}
              onChange={(e) => setReviewStateFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
            >
              <option value="ALL">All Decisions</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <div className="text-sm font-bold text-slate-900">Loading saved audits from backend...</div>
          <p className="text-xs text-slate-500 mt-1">Retrieving audit runs, claim records, and review decisions.</p>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Unable to load saved audits</span>
          </div>
          <p className="text-xs text-rose-800">{loadError}</p>
          <button
            onClick={fetchAudits}
            className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !loadError && filteredAudits.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Audits Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || brandFilter !== 'ALL' || statusFilter !== 'ALL' || reviewStateFilter !== 'ALL'
              ? 'No audits matched your current filter criteria. Try clearing search filters or selecting different options.'
              : 'No brand compliance audits have been created yet. Launch your first audit to evaluate marketing claims against approved evidence.'}
          </p>
          <button
            onClick={() => onNavigateTab('new_audit')}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Create New Audit</span>
          </button>
        </div>
      )}

      {/* Audits List Table */}
      {!isLoading && !loadError && filteredAudits.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Audit & Campaign Name</th>
                  <th className="py-3 px-4">Brand / Channel</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4">Claims Breakdown</th>
                  <th className="py-3 px-4">Review State</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => handleOpenInspection(audit)}
                  >
                    {/* Audit Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {audit.audit_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {audit.id} {audit.passport_code && `• ${audit.passport_code}`}
                      </div>
                    </td>

                    {/* Brand & Channel */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{audit.brand}</div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                        {audit.channel}
                      </span>
                    </td>

                    {/* Status & Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                            audit.overall_status === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : audit.overall_status === 'CONDITIONAL'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {audit.overall_status}
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {audit.governance_score}%
                        </span>
                      </div>
                    </td>

                    {/* Claims count */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="text-emerald-700 font-bold" title="Supported Claims">
                          {audit.supported_count} Sup
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`${audit.contradicted_count > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}`}
                          title="Contradicted Claims"
                        >
                          {audit.contradicted_count} Con
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`${audit.unverified_count > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}`}
                          title="Unverified Claims"
                        >
                          {audit.unverified_count} Unv
                        </span>
                      </div>
                    </td>

                    {/* Review State */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold ${
                          audit.review_status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : audit.review_status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : audit.review_status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {audit.review_status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {audit.review_status === 'CHANGES_REQUESTED' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {audit.review_status === 'REJECTED' && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                        {audit.review_status === 'PENDING_REVIEW' && <Clock className="w-3 h-3 text-slate-500" />}
                        <span>{audit.review_status.replace(/_/g, ' ')}</span>
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInspection(audit);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition-colors inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Detail & Review Decision Modal */}
      {inspectAudit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      inspectAudit.overall_status === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
                        : inspectAudit.overall_status === 'CONDITIONAL'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
                    }`}
                  >
                    {inspectAudit.overall_status} • Score: {inspectAudit.governance_score}%
                  </span>
                  <span className="text-xs text-slate-400">{inspectAudit.brand}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {inspectAudit.audit_name}
                </h2>
                <p className="text-xs text-slate-300">
                  Audit ID: <span className="font-mono text-indigo-300">{inspectAudit.id}</span> • Version: v{inspectAudit.asset_version}
                </p>
              </div>

              <button
                onClick={handleCloseInspection}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{actionSuccessMsg}</span>
                </div>
              )}

              {/* Original Content Snippet */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Audited Content / Draft Copy</span>
                </span>
                <p className="text-slate-900 font-sans text-xs leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">
                  {inspectAudit.content || 'No content text recorded.'}
                </p>
              </div>

              {/* Claims & Findings List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Evaluated Claims & Approved Evidence Citations ({inspectAudit.findings.length})</span>
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="text-emerald-700 font-bold">{inspectAudit.supported_count} Supported</span>
                    <span>•</span>
                    <span className="text-rose-700 font-bold">{inspectAudit.contradicted_count} Contradicted</span>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">{inspectAudit.unverified_count} Unverified</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {inspectAudit.findings.map((finding: VerificationFinding, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        finding.status === 'SUPPORTED'
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : finding.status === 'CONTRADICTED'
                          ? 'border-rose-200 bg-rose-50/30'
                          : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                            “{finding.claim_text}”
                          </span>
                          <p className="text-slate-600 mt-1">{finding.explanation}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase shrink-0 ${
                            finding.status === 'SUPPORTED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : finding.status === 'CONTRADICTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {finding.status}
                        </span>
                      </div>

                      {/* Matched Fact Evidence */}
                      {finding.matched_fact && (
                        <div className="p-2.5 rounded bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500">Approved Fact:</span>{' '}
                            <strong className="text-slate-900">{finding.matched_fact.name} (v{finding.matched_fact.version})</strong>
                            <span className="mx-2 text-slate-300">•</span>
                            <span className="text-slate-500">Approved Value:</span>{' '}
                            <code className="font-mono font-bold text-indigo-700 bg-slate-100 px-1 rounded">
                              {finding.matched_fact.approved_value}
                            </code>
                          </div>
                          <div className="text-slate-500 font-mono">
                            Source: <strong>{finding.matched_fact.source_ref}</strong>
                          </div>
                        </div>
                      )}

                      {/* Rule violation notice */}
                      {finding.matched_rule && (
                        <div className="p-2 rounded bg-white border border-rose-200 text-[11px] text-rose-900">
                          <strong>Violated Rule:</strong> {finding.matched_rule.name} ({finding.matched_rule.rule_code})
                        </div>
                      )}

                      {/* Suggested correction */}
                      {finding.suggested_correction && (
                        <div className="p-2.5 rounded bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-950 flex items-start space-x-2">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Suggested Correction:</strong>
                            <p className="font-medium text-indigo-900 mt-0.5">
                              “{finding.suggested_correction}”
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewer Action Form (Section 1.B Requirement) */}
              <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Human Review Certification & Decision
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Recorded in Immutable Audit Trail
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reviewer Name
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reviewer Role / Title
                    </label>
                    <input
                      type="text"
                      value={reviewerRole}
                      onChange={(e) => setReviewerRole(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Compliance Decision
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionState('APPROVED')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        decisionState === 'APPROVED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionState('CHANGES_REQUESTED')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        decisionState === 'CHANGES_REQUESTED'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionState('REJECTED')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        decisionState === 'REJECTED'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Decision Rationale & Compliance Notes
                  </label>
                  <textarea
                    rows={3}
                    value={decisionRationale}
                    onChange={(e) => setDecisionRationale(e.target.value)}
                    placeholder="Enter compliance justification, conditions of release, or requested revisions..."
                    className="w-full text-xs p-2.5 rounded border border-slate-300 text-slate-900 bg-white"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitDecision}
                    disabled={isSubmittingDecision}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingDecision ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Decision...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save & Certify Review Decision</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Decision history is permanently preserved in the append-only audit trail.
              </div>
              <button
                onClick={handleCloseInspection}
                className="px-4 py-1.5 rounded-md border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
