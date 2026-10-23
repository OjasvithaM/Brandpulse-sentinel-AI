import React, { useState } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Sparkles,
  History,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ReviewQueueItem } from '../types';

interface ReviewQueueViewProps {
  items: ReviewQueueItem[];
  onRefresh: () => void;
  onNavigateToPassports: () => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  items,
  onRefresh,
  onNavigateToPassports,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<ReviewQueueItem | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'CONDITIONAL' | 'CHANGES_REQUESTED' | 'REJECTED'>('APPROVED');
  const [rationale, setRationale] = useState('');
  const [reviewerName, setReviewerName] = useState('David Miller');
  const [reviewerRole, setReviewerRole] = useState('Senior Brand Compliance Officer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleOpenReview = (item: ReviewQueueItem) => {
    setSelectedAsset(item);
    setEditedContent(item.content || '');
    setRationale('');
    setSuccessMsg(null);
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !rationale) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${selectedAsset.asset_id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          rationale,
          reviewer_name: reviewerName,
          reviewer_role: reviewerRole,
          updated_content: editedContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(
        `Decision "${decision}" recorded for "${selectedAsset.asset_name}"! New versioned Trust Passport issued.`
      );
      setSelectedAsset(null);
      onRefresh();
    } catch (err: any) {
      setSuccessMsg(`Error submitting decision: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseClaims = (jsonStr?: string) => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Human Review & Audit Queue</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 5
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Empowering authorized compliance leads to inspect evidence, adjust marketing copy, and record accountable human decisions.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={onNavigateToPassports}
            className="font-bold underline text-emerald-900 cursor-pointer"
          >
            View Updated Trust Passport
          </button>
        </div>
      )}

      {/* Workspace: List of assets requiring human action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: List of pending items */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Assets Requiring Governance Sign-Off:
          </h2>

          <div className="space-y-2">
            {items.map((item) => {
              const isSelected = selectedAsset?.asset_id === item.asset_id;
              const hasAlert = item.pending_impact_count > 0;
              return (
                <div
                  key={item.asset_id}
                  onClick={() => handleOpenReview(item)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : hasAlert
                      ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 line-clamp-1">{item.asset_name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                      v{item.current_version}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Channel: {item.channel}</span>
                    {hasAlert ? (
                      <span className="text-rose-600 font-bold flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        Outdated Fact
                      </span>
                    ) : (
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                    )}
                  </div>

                  {item.passport_code && (
                    <div className="mt-2 text-[10px] font-mono text-indigo-700 bg-white p-1 rounded border border-slate-100 flex items-center justify-between">
                      <span>Passport: {item.passport_code}</span>
                      <span className="font-bold">{item.governance_score}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Active Review & Decision Workspace */}
        <div className="lg:col-span-2">
          {selectedAsset ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedAsset.asset_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      Version {selectedAsset.current_version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Channel: {selectedAsset.channel} • Status: {selectedAsset.status}
                  </p>
                </div>
              </div>

              {/* Alert if triggered by Brand Time Machine */}
              {selectedAsset.pending_impact_count > 0 && (
                <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-200 text-xs text-rose-900 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Retroactive Fact Change Detected: </span>
                    <span>
                      An approved Knowledge Base fact linked to this asset was updated. Please inspect claims and adjust content below to reflect the new approved truth.
                    </span>
                  </div>
                </div>
              )}

              {/* Claims Breakdown in Asset */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Associated Claim Audit Findings:
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {parseClaims(selectedAsset.claims_json).map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium text-slate-900">&ldquo;{c.claim_text}&rdquo;</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.explanation}</div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          c.status === 'SUPPORTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'CONTRADICTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Content Copy */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700">
                    Content Copy for New Version (v{selectedAsset.current_version + 1}):
                  </label>
                  <span className="text-[11px] text-indigo-600">
                    Reviewer can edit copy to resolve discrepancies
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-3 text-xs font-sans rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Formal Decision Form */}
              <form onSubmit={handleSubmitDecision} className="space-y-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Formal Governance Decision:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'APPROVED', label: 'Approve & Certify', color: 'bg-emerald-600 text-white' },
                      { id: 'CONDITIONAL', label: 'Conditional Pass', color: 'bg-amber-600 text-white' },
                      { id: 'CHANGES_REQUESTED', label: 'Request Changes', color: 'bg-indigo-600 text-white' },
                      { id: 'REJECTED', label: 'Reject Asset', color: 'bg-rose-600 text-white' },
                    ].map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => setDecision(d.id as any)}
                        className={`py-2 px-2 rounded-md font-bold text-center border transition-all cursor-pointer ${
                          decision === d.id
                            ? `${d.color} shadow-xs border-transparent`
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Decision Rationale & Auditor Comments <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Provide evidence-based rationale for this decision (e.g. Copy updated to reflect ₹1,199 pricing revision per DOC-2026-PRICING-V3)..."
                    className="w-full px-3 py-2 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Reviewer Name:</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Reviewer Role:</label>
                    <input
                      type="text"
                      value={reviewerRole}
                      onChange={(e) => setReviewerRole(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !rationale}
                    className="px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording Decision...' : 'Save Decision & Issue Versioned Passport'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              Select an asset from the queue to inspect claims, review change impact, and record your formal human governance decision.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
