import React, { useState } from 'react';
import {
  Database,
  Plus,
  Search,
  Filter,
  History,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  X,
  Edit3,
} from 'lucide-react';
import { Fact, FactHistory, BrandRule } from '../types';
import { detectFactConflicts } from '../utils/governance';

interface KnowledgeBaseViewProps {
  facts: Fact[];
  rules: BrandRule[];
  onFactUpdated: () => void;
  onFactCreated: () => void;
  onRuleCreated: () => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  facts,
  rules,
  onFactUpdated,
  onFactCreated,
  onRuleCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'facts' | 'rules'>('facts');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [historyFactId, setHistoryFactId] = useState<string | null>(null);
  const [factHistory, setFactHistory] = useState<FactHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAddFactOpen, setIsAddFactOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  // Controlled versioning form fields
  const [newValue, setNewValue] = useState('');
  const [newSourceRef, setNewSourceRef] = useState('');
  const [newSourceDoc, setNewSourceDoc] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [changedBy, setChangedBy] = useState('Chief Compliance Officer (Admin)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add Fact form fields
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactName, setNewFactName] = useState('');
  const [newFactVal, setNewFactVal] = useState('');
  const [newFactDesc, setNewFactDesc] = useState('');
  const [newFactCat, setNewFactCat] = useState<'pricing' | 'sla' | 'compliance' | 'feature' | 'policy' | 'security'>('pricing');
  const [newFactSourceRef, setNewFactSourceRef] = useState('');
  const [newFactSourceDoc, setNewFactSourceDoc] = useState('');

  // Add Rule form fields
  const [newRuleCode, setNewRuleCode] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState('forbidden_term');
  const [newRuleConstraint, setNewRuleConstraint] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'high' | 'medium' | 'low'>('high');

  // Detect potential internal contradictions in Knowledge Base
  const conflicts = detectFactConflicts(facts);

  // Filter facts
  const filteredFacts = facts.filter((f) => {
    const matchesSearch =
      searchTerm === '' ||
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.source_ref.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Open controlled edit
  const handleOpenEdit = (fact: Fact) => {
    setEditingFact(fact);
    setNewValue(fact.value);
    setNewSourceRef(fact.source_ref);
    setNewSourceDoc(fact.source_doc || '');
    setChangeReason('');
  };

  // Submit controlled version bump
  const handleSaveFactVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFact || !newValue || !changeReason) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/facts/${editingFact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: newValue,
          source_ref: newSourceRef,
          source_doc: newSourceDoc,
          change_reason: changeReason,
          changed_by: changedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update fact');

      setNotification({
        type: 'success',
        message: `Fact updated to v${data.fact.version}! Brand Time Machine scanned assets and detected ${data.impactsCount} change impact alert(s).`,
      });
      setEditingFact(null);
      onFactUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // View fact history
  const handleViewHistory = async (factId: string) => {
    setHistoryFactId(factId);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/facts/${factId}/history`);
      const data = await res.json();
      setFactHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Change fact status (disputed / expired)
  const handleChangeStatus = async (factId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/facts/${factId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: `Manually marked as ${newStatus} during governance audit`,
        }),
      });
      if (res.ok) {
        onFactUpdated();
        setNotification({ type: 'success', message: `Fact status updated to ${newStatus}.` });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Create new fact
  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactKey || !newFactName || !newFactVal || !newFactSourceRef) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newFactKey,
          name: newFactName,
          value: newFactVal,
          description: newFactDesc,
          category: newFactCat,
          source_ref: newFactSourceRef,
          source_doc: newFactSourceDoc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsAddFactOpen(false);
      setNewFactKey('');
      setNewFactName('');
      setNewFactVal('');
      setNewFactDesc('');
      setNewFactSourceRef('');
      setNewFactSourceDoc('');
      onFactCreated();
      setNotification({ type: 'success', message: `Approved fact "${data.name}" added to Knowledge Base.` });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new brand rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleCode || !newRuleName || !newRuleConstraint) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_code: newRuleCode,
          name: newRuleName,
          rule_type: newRuleType,
          constraint_value: newRuleConstraint,
          description: newRuleDesc,
          severity: newRuleSeverity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsAddRuleOpen(false);
      setNewRuleCode('');
      setNewRuleName('');
      setNewRuleConstraint('');
      setNewRuleDesc('');
      onRuleCreated();
      setNotification({ type: 'success', message: `Brand rule [${data.rule_code}] added.` });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Approved Knowledge Base</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of approved facts, SLAs, pricing schedules, and brand compliance rules with immutable version history.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'facts' ? (
            <button
              onClick={() => setIsAddFactOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Approved Fact</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddRuleOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Brand Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 ml-3 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Knowledge Base Conflict Alert or Integrity Badge */}
      {conflicts.length > 0 ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="text-xs font-bold text-amber-900">
                Knowledge Base Conflict Detected ({conflicts.length} internal contradiction(s) found)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              Integrity Alert
            </span>
          </div>
          <div className="space-y-2">
            {conflicts.map((c, i) => (
              <div
                key={i}
                className="bg-white p-3 rounded border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="text-slate-700 font-medium">{c.reason}</div>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                    <span>
                      Fact A: <strong>{c.factA.name}</strong> ({c.factA.value})
                    </span>
                    <span>vs</span>
                    <span>
                      Fact B: <strong>{c.factB.name}</strong> ({c.factB.value})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleChangeStatus(c.factB.id, 'disputed')}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] self-start sm:self-auto cursor-pointer"
                >
                  Mark Fact B as Disputed
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Knowledge Base Integrity: Verified</span>
            <span className="text-slate-400">
              • No internal contradictions across{' '}
              {facts.filter((f) => f.status === 'approved').length} active approved facts.
            </span>
          </div>
        </div>
      )}

      {/* Sub-Tabs: Facts vs Brand Rules */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('facts')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'facts'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Approved Facts ({facts.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Brand Compliance Rules ({rules.length})
          </button>
        </div>
      </div>

      {/* TAB 1: APPROVED FACTS */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search facts, values, sources..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Category:</span>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                <option value="pricing">Pricing</option>
                <option value="sla">SLA</option>
                <option value="policy">Policy</option>
                <option value="compliance">Compliance</option>
                <option value="security">Security</option>
                <option value="feature">Feature</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="disputed">Disputed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Facts Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Fact / Entity</th>
                    <th className="py-3 px-4">Approved Value</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Version & Date</th>
                    <th className="py-3 px-4">Source Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredFacts.map((fact) => (
                    <tr key={fact.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{fact.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{fact.key}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {fact.value}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {fact.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold font-mono text-[10px]">
                            v{fact.version}
                          </span>
                          <span className="text-[11px] text-slate-500">{fact.effective_date}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-indigo-700">{fact.source_ref}</div>
                        {fact.source_doc && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs" title={fact.source_doc}>
                            {fact.source_doc}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            fact.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : fact.status === 'disputed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {fact.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Controlled Edit / Bump Version */}
                          <button
                            onClick={() => handleOpenEdit(fact)}
                            className="p-1.5 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Controlled Version Bump (triggers Change-Impact Intelligence)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Version History */}
                          <button
                            onClick={() => handleViewHistory(fact.id)}
                            className="p-1.5 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Previous Versions"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Disputed or Expired Menu */}
                          {fact.status === 'approved' ? (
                            <button
                              onClick={() => handleChangeStatus(fact.id, 'disputed')}
                              className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Mark as Disputed"
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeStatus(fact.id, 'approved')}
                              className="p-1.5 rounded text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Re-Approve Fact"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFacts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No approved facts matched your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRAND COMPLIANCE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {rule.rule_code}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      rule.severity === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : rule.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {rule.severity} Severity
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{rule.description}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">
                    Target Constraint / Prohibited Phrase:
                  </span>
                  <span className="font-mono font-bold text-rose-700">
                    &ldquo;{rule.constraint_value}&rdquo;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CONTROLLED FACT VERSIONING (MODULE 3 TRIGGER) */}
      {editingFact && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Controlled Fact Evolution</h3>
                <p className="text-xs text-slate-300">
                  Updating &ldquo;{editingFact.name}&rdquo; (Currently v{editingFact.version})
                </p>
              </div>
              <button
                onClick={() => setEditingFact(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFactVersion} className="p-5 space-y-4 text-xs">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 flex items-start space-x-2">
                <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>Controlled Governance Rule:</strong> Changes never overwrite history. Updating will create <strong>v{editingFact.version + 1}</strong> and trigger the <strong>Brand Time Machine</strong> to scan all previously verified marketing assets.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Previous Approved Value:</label>
                <div className="p-2 bg-slate-100 rounded border border-slate-200 font-mono text-slate-700">
                  {editingFact.value} (v{editingFact.version})
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  New Approved Value <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. ₹1,199/month or 99.999%"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Updated Source Reference <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newSourceRef}
                  onChange={(e) => setNewSourceRef(e.target.value)}
                  placeholder="e.g. DOC-2026-PRICING-V3"
                  className="w-full px-3 py-2 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Mandatory Change Reason & Rationale <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  required
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="State the business justification for this revision (e.g. Executive pricing adjustment for Q4)..."
                  className="w-full px-3 py-2 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reviewer / Sign-off Role:
                </label>
                <input
                  type="text"
                  value={changedBy}
                  onChange={(e) => setChangedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingFact(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Promoting Version...' : `Save v${editingFact.version + 1} & Scan Impacts`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VERSION HISTORY VIEWER */}
      {historyFactId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Fact Evolution & Version History</h3>
              </div>
              <button
                onClick={() => setHistoryFactId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3 text-xs">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-slate-500">Loading version history...</div>
              ) : factHistory.length > 0 ? (
                factHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[11px]">
                        Version {hist.version}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(hist.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Value:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{hist.value}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-500">Source:</span> {hist.source_ref}
                    </div>
                    <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 italic">
                      &ldquo;{hist.change_reason}&rdquo; — {hist.changed_by}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-500">No historical versions recorded.</div>
              )}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setHistoryFactId(null)}
                className="px-3 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW APPROVED FACT */}
      {isAddFactOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add New Approved Fact</h3>
              <button
                onClick={() => setIsAddFactOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFact} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Fact Name <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newFactName}
                  onChange={(e) => {
                    setNewFactName(e.target.value);
                    if (!newFactKey) {
                      setNewFactKey(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '_')
                          .slice(0, 30)
                      );
                    }
                  }}
                  placeholder="e.g. Acme Enterprise Support Response Time"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    System Key <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={newFactKey}
                    onChange={(e) => setNewFactKey(e.target.value)}
                    placeholder="e.g. acme_support_sla"
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category:</label>
                  <select
                    value={newFactCat}
                    onChange={(e: any) => setNewFactCat(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="pricing">Pricing</option>
                    <option value="sla">SLA</option>
                    <option value="policy">Policy</option>
                    <option value="compliance">Compliance</option>
                    <option value="security">Security</option>
                    <option value="feature">Feature</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Approved Value <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newFactVal}
                  onChange={(e) => setNewFactVal(e.target.value)}
                  placeholder="e.g. 15 minutes for P1 tickets"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Source Reference ID <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newFactSourceRef}
                  onChange={(e) => setNewFactSourceRef(e.target.value)}
                  placeholder="e.g. DOC-2026-SUPPORT-SLA"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description:</label>
                <textarea
                  rows={2}
                  value={newFactDesc}
                  onChange={(e) => setNewFactDesc(e.target.value)}
                  placeholder="Detailed context and boundaries for this approved claim..."
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddFactOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Fact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NEW BRAND RULE */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Brand Compliance Rule</h3>
              <button
                onClick={() => setIsAddRuleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Rule Code <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={newRuleCode}
                    onChange={(e) => setNewRuleCode(e.target.value)}
                    placeholder="e.g. BR-NO-HYPERBOLE"
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Severity:</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e: any) => setNewRuleSeverity(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="high">High (Blocks Approval)</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Rule Name <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Prohibition of Absolute Claims"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Forbidden Phrase / Constraint <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newRuleConstraint}
                  onChange={(e) => setNewRuleConstraint(e.target.value)}
                  placeholder="e.g. 100% bug-free"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono text-rose-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description:</label>
                <textarea
                  rows={2}
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Reasoning and regulatory basis for this constraint..."
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
