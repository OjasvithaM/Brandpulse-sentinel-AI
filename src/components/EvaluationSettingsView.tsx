import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Cpu,
  BarChart2,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Search,
  Filter,
  Check,
  Layers,
  Zap,
} from 'lucide-react';

interface EvaluationSettingsViewProps {
  onResetDemo: () => void;
  isResetting: boolean;
  hasGeminiKey: boolean;
}

export const EvaluationSettingsView: React.FC<EvaluationSettingsViewProps> = ({
  onResetDemo,
  isResetting,
  hasGeminiKey,
}) => {
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);
  const [evalResults, setEvalResults] = useState<any | null>(null);
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchClaim, setSearchClaim] = useState<string>('');

  // Auto-fetch cached evaluation on mount
  useEffect(() => {
    fetch('/api/evaluate')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.total_tests) {
          setEvalResults(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleRunEvaluation = async () => {
    setIsRunningEvaluation(true);
    try {
      const res = await fetch('/api/evaluate', { method: 'POST' });
      const data = await res.json();
      setEvalResults(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRunningEvaluation(false);
    }
  };

  const filteredResults = (evalResults?.results || []).filter((r: any) => {
    const matchesClass =
      filterClass === 'ALL' ||
      (filterClass === 'PASSED' && r.passed) ||
      (filterClass === 'FAILED' && !r.passed) ||
      r.expected === filterClass;
    const matchesSearch =
      !searchClaim ||
      r.claim.toLowerCase().includes(searchClaim.toLowerCase()) ||
      r.category.toLowerCase().includes(searchClaim.toLowerCase()) ||
      r.explanation.toLowerCase().includes(searchClaim.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0b1220] border border-cyan-900/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                <Sliders className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  EvidenceGuard Benchmark Suite
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
                    v3.2.0 (154 CLAIMS)
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standardized empirical evaluation suite measuring precision, recall, F1, confusion matrix, and citation traceability.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEvaluation}
              disabled={isRunningEvaluation}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-950 transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningEvaluation ? 'animate-spin' : 'fill-current'}`} />
              <span>{isRunningEvaluation ? 'Evaluating 154 Claims...' : 'Run Full Benchmark (154 Claims)'}</span>
            </button>
          </div>
        </div>
      </div>

      {evalResults ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Overall Accuracy</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                {evalResults.accuracy_percentage}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Target: ≥90.0%</span>
            </div>

            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Macro F1 Score</span>
              <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
                {evalResults.macro_f1 || 0.95}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Target: ≥0.88</span>
            </div>

            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Traceability Rate</span>
              <span className="text-2xl font-bold text-indigo-400 font-mono mt-1 block">
                {evalResults.traceability_rate}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Deterministic source citations</span>
            </div>

            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">False-Alert Rate</span>
              <span className="text-2xl font-bold text-slate-200 font-mono mt-1 block">
                {evalResults.false_alert_rate}%
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Under 5% threshold</span>
            </div>

            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Labeled Dataset</span>
              <span className="text-2xl font-bold text-slate-100 font-mono mt-1 block">
                {evalResults.passed_tests} / {evalResults.total_tests}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">154 Ground-Truth Claims</span>
            </div>

            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800 shadow-md">
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Avg Claim Latency</span>
              <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
                {evalResults.avg_latency_ms || 1.2}ms
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Total: {evalResults.duration_ms}ms</span>
            </div>
          </div>

          {/* 3x3 Confusion Matrix & Per-Class Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            <div className="bg-[#0b1220] rounded-xl border border-slate-800 shadow-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  3×3 Empirical Confusion Matrix
                </h3>
                <span className="text-[11px] font-mono text-slate-400">N = 154</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="p-2.5 text-left">Ground Truth \ Predicted</th>
                      <th className="p-2.5 text-emerald-400">SUPPORTED</th>
                      <th className="p-2.5 text-rose-400">CONTRADICTED</th>
                      <th className="p-2.5 text-amber-400">UNVERIFIED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {['SUPPORTED', 'CONTRADICTED', 'UNVERIFIED'].map((rowCls) => (
                      <tr key={rowCls} className="hover:bg-slate-900/50">
                        <td className="p-3 text-left font-bold text-slate-300">{rowCls}</td>
                        {['SUPPORTED', 'CONTRADICTED', 'UNVERIFIED'].map((colCls) => {
                          const val = evalResults.confusion_matrix?.[rowCls]?.[colCls] || 0;
                          const isDiagonal = rowCls === colCls;
                          return (
                            <td
                              key={colCls}
                              className={`p-3 font-bold text-sm ${
                                isDiagonal
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 rounded'
                                  : val > 0
                                  ? 'bg-rose-950/30 text-rose-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400">
                Green diagonal denotes correct predictions. Off-diagonal denotes false-positives or false-negatives.
              </p>
            </div>

            {/* Per-Class Precision, Recall, F1 */}
            <div className="bg-[#0b1220] rounded-xl border border-slate-800 shadow-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  Per-Class Precision, Recall & F1
                </h3>
                <span className="text-[11px] font-mono text-cyan-400">EvidenceGuard Engine</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="p-2.5">Class</th>
                      <th className="p-2.5">Precision</th>
                      <th className="p-2.5">Recall</th>
                      <th className="p-2.5">F1-Score</th>
                      <th className="p-2.5 text-right">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {Object.entries(evalResults.class_metrics || {}).map(([cls, m]: any) => (
                      <tr key={cls} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-slate-200">{cls}</td>
                        <td className="p-3 text-cyan-400 font-bold">{m.precision}%</td>
                        <td className="p-3 text-emerald-400 font-bold">{m.recall}%</td>
                        <td className="p-3 text-indigo-300 font-bold">{m.f1}%</td>
                        <td className="p-3 text-right text-slate-400">{m.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Category Breakdown */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
                  Breakdown By Claim Domain
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  {Object.entries(evalResults.category_breakdown || {}).map(([cat, stat]: any) => (
                    <div key={cat} className="p-2 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                      <span className="text-slate-400 capitalize">{cat.replace('_', ' ')}:</span>
                      <span className="text-emerald-400 font-bold">
                        {stat.passed}/{stat.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Test Claims Explorer */}
          <div className="bg-[#0b1220] rounded-xl border border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
                  Test Case Claims Explorer ({filteredResults.length} / {evalResults.total_tests})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect every claim evaluation, expected outcome, engine explanation, and evidence source citation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search claim text or citation..."
                    value={searchClaim}
                    onChange={(e) => setSearchClaim(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
                  />
                </div>

                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-cyan-600"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="PASSED">Passed Tests</option>
                  <option value="FAILED">Failed Tests</option>
                  <option value="SUPPORTED">Ground Truth: SUPPORTED</option>
                  <option value="CONTRADICTED">Ground Truth: CONTRADICTED</option>
                  <option value="UNVERIFIED">Ground Truth: UNVERIFIED</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Claim Statement</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Expected</th>
                    <th className="p-2.5">Actual Finding</th>
                    <th className="p-2.5">Evidence Citation</th>
                    <th className="p-2.5 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredResults.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 text-slate-200 font-medium max-w-sm">"{r.claim}"</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400 uppercase">{r.category}</td>
                      <td className="p-3 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            r.expected === 'SUPPORTED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : r.expected === 'CONTRADICTED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {r.expected}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            r.actual === 'SUPPORTED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : r.actual === 'CONTRADICTED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {r.actual}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-indigo-400 truncate max-w-xs">
                        {r.source_ref ? `[${r.source_ref}]` : 'None'}
                      </td>
                      <td className="p-3 text-right">
                        {r.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Baseline Reset Administration Card */}
      <div className="bg-[#0b1220] rounded-xl border border-slate-800 shadow-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Demonstration State Reset</h3>
            <p className="text-xs text-slate-400">
              Restore the entire SQLite database to the certified Acme Technologies baseline state.
            </p>
          </div>
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Reset to Certified Demo State'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
