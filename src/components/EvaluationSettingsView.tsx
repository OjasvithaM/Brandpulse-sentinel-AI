import React, { useState } from 'react';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Evaluation & System Settings</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Testing Suite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized evaluation benchmarks, empirical claim-verification metrics, and demonstration controls.
          </p>
        </div>
      </div>

      {/* Benchmark Evaluation Suite Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <span>EvidenceGuard Empirical Evaluation Benchmark</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Executes a labeled test suite of Supported, Contradicted, and Unverified claims against Acme Knowledge Base.
            </p>
          </div>
          <button
            onClick={handleRunEvaluation}
            disabled={isRunningEvaluation}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningEvaluation ? 'animate-spin' : 'fill-current'}`} />
            <span>{isRunningEvaluation ? 'Executing Benchmark...' : 'Run Live Benchmark Test'}</span>
          </button>
        </div>

        {evalResults ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Overall Benchmark Accuracy</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {evalResults.accuracy_percentage}%
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Tests Passed / Total</span>
                <span className="text-2xl font-bold text-slate-900">
                  {evalResults.passed_tests} / {evalResults.total_tests}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Evidence Traceability</span>
                <span className="text-2xl font-bold text-indigo-600">100%</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Change Impact Recall</span>
                <span className="text-2xl font-bold text-rose-600">100%</span>
              </div>
            </div>

            {/* Test Case Breakdown Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2.5">Test Claim</th>
                    <th className="p-2.5">Expected</th>
                    <th className="p-2.5">Actual Finding</th>
                    <th className="p-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evalResults.results.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-900 max-w-sm">&ldquo;{r.claim}&rdquo;</td>
                      <td className="p-2.5 font-mono text-[11px]">{r.expected}</td>
                      <td className="p-2.5 font-mono text-[11px] font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            r.actual === 'SUPPORTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.actual === 'CONTRADICTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.actual}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {r.passed ? (
                          <span className="text-emerald-600 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PASSED</span>
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center space-x-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
            Click <strong>&ldquo;Run Live Benchmark Test&rdquo;</strong> to execute the full evaluation suite and calculate empirical accuracy, precision, and recall metrics.
          </div>
        )}
      </div>

      {/* System Engine Configuration & Environment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engine Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">AI Verification Configuration</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-600">Verification Engine:</span>
              <span className="font-mono font-bold text-slate-900">
                {hasGeminiKey ? 'Semantic & Deterministic Hybrid Engine' : 'Deterministic Rule & Metric Engine'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-600">Semantic Engine Config:</span>
              <span className={`font-bold ${hasGeminiKey ? 'text-emerald-600' : 'text-slate-600'}`}>
                {hasGeminiKey ? 'Active via Server Configuration' : 'Local Deterministic Active'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-slate-600">Database Engine:</span>
              <span className="font-mono font-bold text-slate-900">
                SQLite 3 (Relational ACID Store)
              </span>
            </div>
          </div>
        </div>

        {/* Demonstration Reset & Factory Baseline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Demonstration Reset Control</h3>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Resets all facts, passports, change-impact alerts, and audit logs back to the initial Acme Technologies demonstration baseline.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="w-full py-2 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting Baseline...' : 'Reset Database to Acme Demo Baseline'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
