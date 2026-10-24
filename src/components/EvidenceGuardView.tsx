import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileBadge,
  Layers,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Info,
  Upload,
  FileUp,
} from 'lucide-react';
import { VerificationFinding } from '../types';

interface EvidenceGuardViewProps {
  initialContent?: string;
  onPassportIssued: () => void;
  onNavigateToPassports: () => void;
}

export const EvidenceGuardView: React.FC<EvidenceGuardViewProps> = ({
  initialContent = '',
  onPassportIssued,
  onNavigateToPassports,
}) => {
  const [content, setContent] = useState(initialContent);
  const [assetName, setAssetName] = useState('Acme Q4 Promotional Brochure');
  const [channel, setChannel] = useState('Brochure');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<{
    findings: VerificationFinding[];
    summary: { total: number; supported: number; contradicted: number; unverified: number };
    governance_score: number;
    overall_status: 'PASSED' | 'CONDITIONAL' | 'FAILED';
    engine_used: string;
    processing_time_ms: number;
  } | null>(null);

  const [copiedClaimIdx, setCopiedClaimIdx] = useState<number | null>(null);
  const [isIssuingPassport, setIsIssuingPassport] = useState(false);
  const [passportSuccess, setPassportSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds 5MB limit. Please upload a smaller text-based document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setContent(text);
        setUploadedFileName(file.name);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setAssetName(nameWithoutExt);
        setResults(null);
        setPassportSuccess(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read document file.');
    };
    reader.readAsText(file);
  };

  // Sync initialContent prop if changed by demo guide
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // Preset demonstration samples
  const loadPreset = (type: 'conflicting_brochure' | 'compliant_pitch' | 'unverified_draft') => {
    if (type === 'conflicting_brochure') {
      setAssetName('Acme Q4 Promotional Brochure (Conflict Test)');
      setChannel('Brochure');
      setContent(
        'Subscribe to Acme Cloud Pro today for only ₹899/month. Our enterprise SLA guarantees 99.9% uptime with 24/7 priority support. Test drive every feature with our 30-day free trial. We guarantee our platform is 100% bug-free for all deployments.'
      );
    } else if (type === 'compliant_pitch') {
      setAssetName('Acme Cloud Pro Official Sales Sheet');
      setChannel('Website');
      setContent(
        'Acme Cloud Pro is priced at ₹999/month for all new enterprise subscriptions. Our high-availability cloud architecture guarantees 99.99% uptime. Explore our complete toolset risk-free with our standard 14 days trial. All customer databases are secured in Mumbai & Frankfurt Regions.'
      );
    } else {
      setAssetName('Acme International Press Release');
      setChannel('Press Release');
      setContent(
        'Acme Technologies was voted the most eco-friendly software vendor in Zurich 2026. Cloud Pro starts at ₹999/month. We also plant 50 trees for every active enterprise subscription.'
      );
    }
    setResults(null);
    setPassportSuccess(null);
  };

  const handleVerify = async () => {
    if (!content.trim()) return;
    setIsVerifying(true);
    setPassportSuccess(null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          asset_name: assetName,
          channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
    } catch (err: any) {
      setErrorMsg(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Issue Trust Passport
  const handleIssuePassport = async () => {
    if (!results) return;
    setIsIssuingPassport(true);
    try {
      const res = await fetch('/api/passports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_name: assetName,
          channel,
          content,
          findings: results.findings,
          governance_score: results.governance_score,
          overall_status: results.overall_status,
          reviewer_name: 'Sarah Jenkins',
          reviewer_role: 'Brand Compliance Lead',
          decision: results.overall_status === 'PASSED' ? 'APPROVED' : 'PENDING',
          decision_rationale:
            results.overall_status === 'PASSED'
              ? 'All claims verified against Approved Knowledge Base. Passport issued.'
              : 'Discrepancies identified during EvidenceGuard verification; conditional record generated.',
          engine_used: results.engine_used,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPassportSuccess(data);
      onPassportIssued();
    } catch (err: any) {
      setErrorMsg(`Failed to issue passport: ${err.message}`);
    } finally {
      setIsIssuingPassport(false);
    }
  };

  // Apply suggested correction to content
  const handleApplyCorrection = (originalClaim: string, suggested: string) => {
    setContent((prev) => prev.replace(originalClaim, suggested));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">EvidenceGuard</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Claim-level content verification against Approved Knowledge Base evidence. Distinguishes supported facts, discrepancies, and policy violations.
          </p>
        </div>

        {/* Preset demonstration loaders & Upload Document */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.md,.json,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium cursor-pointer transition-colors"
            title="Upload a text, markdown, or JSON document"
          >
            <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Upload Document
          </button>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-500 hidden md:inline">Presets:</span>
          <button
            onClick={() => loadPreset('conflicting_brochure')}
            className="px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium cursor-pointer"
            title="Load brochure with intentional ₹899 price, 99.9% SLA, and rule violation"
          >
            Conflicting Copy (Demo)
          </button>
          <button
            onClick={() => loadPreset('compliant_pitch')}
            className="px-2.5 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium cursor-pointer"
            title="Load fully compliant marketing copy"
          >
            Compliant Copy
          </button>
        </div>
      </div>

      {/* Error notification banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-700 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Content Input Workspace */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Asset Title / Campaign Name:
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g. Acme Q4 Product Launch Brochure"
              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Distribution Channel:
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 text-slate-900 bg-white"
            >
              <option value="Brochure">Print / PDF Brochure</option>
              <option value="Website">Public Website</option>
              <option value="Social Media">Social Media</option>
              <option value="Email Campaign">Email Campaign</option>
              <option value="Sales Pitch Deck">Sales Pitch Deck</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">
                Marketing Copy / Text Document to Verify:
              </label>
              {uploadedFileName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <FileUp className="w-3 h-3 mr-1" />
                  {uploadedFileName}
                  <button
                    onClick={() => {
                      setUploadedFileName(null);
                      setContent('');
                    }}
                    className="ml-1.5 text-indigo-400 hover:text-indigo-800 font-bold"
                    title="Remove uploaded document"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {content.length} characters • {content.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste advertising copy, landing page paragraphs, or product claims here..."
            className="w-full p-3 text-xs font-sans rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => {
              setContent('');
              setResults(null);
            }}
            className="px-3 py-1.5 rounded text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear Text
          </button>

          <button
            onClick={handleVerify}
            disabled={isVerifying || !content.trim()}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying Claims...' : 'Run EvidenceGuard Verification'}</span>
          </button>
        </div>
      </div>

      {/* VERIFICATION FINDINGS PANEL */}
      {results && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Summary Scorecard Bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div
                className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold shadow-xs shrink-0 ${
                  results.overall_status === 'PASSED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : results.overall_status === 'CONDITIONAL'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <span className="text-xl leading-none">{results.governance_score}%</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">Trust</span>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                      results.overall_status === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : results.overall_status === 'CONDITIONAL'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Verification Result: {results.overall_status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {results.findings.length} Claims Extracted
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center space-x-3">
                  <span className="text-emerald-700 font-semibold">
                    ✓ {results.summary.supported} Supported
                  </span>
                  <span className="text-rose-700 font-semibold">
                    ✗ {results.summary.contradicted} Contradicted
                  </span>
                  <span className="text-amber-700 font-semibold">
                    ? {results.summary.unverified} Unverified
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                Engine: {results.engine_used} ({results.processing_time_ms}ms)
              </span>

              {/* Issue Passport Action */}
              <button
                onClick={handleIssuePassport}
                disabled={isIssuingPassport}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileBadge className="w-4 h-4" />
                <span>{isIssuingPassport ? 'Issuing...' : 'Issue Trust Passport'}</span>
              </button>
            </div>
          </div>

          {/* Success Banner if Passport Issued */}
          {passportSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Trust Passport Generated! </span>
                  <span>
                    Code: <strong className="font-mono">{passportSuccess.passport_code}</strong> for &ldquo;{passportSuccess.asset_name}&rdquo; v{passportSuccess.asset_version}.
                  </span>
                </div>
              </div>
              <button
                onClick={onNavigateToPassports}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>View Trust Passport</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Granular Claim Verification Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Claim-Level Verification Breakdown:
            </h3>

            {results.findings.map((finding, idx) => {
              const isSupported = finding.status === 'SUPPORTED';
              const isContradicted = finding.status === 'CONTRADICTED';
              const isUnverified = finding.status === 'UNVERIFIED';

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-all space-y-3 ${
                    isSupported
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : isContradicted
                      ? 'border-rose-200 bg-rose-50/15 hover:border-rose-300'
                      : 'border-amber-200 bg-amber-50/15 hover:border-amber-300'
                  }`}
                >
                  {/* Claim Header & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          Claim #{idx + 1}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isSupported
                              ? 'bg-emerald-100 text-emerald-800'
                              : isContradicted
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {finding.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Confidence: {Math.round(finding.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900">&ldquo;{finding.claim_text}&rdquo;</p>
                    </div>

                    <div className="shrink-0 text-slate-400">
                      {isSupported && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {isContradicted && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                      {isUnverified && <HelpCircle className="w-5 h-5 text-amber-500" />}
                    </div>
                  </div>

                  {/* Evidence & Explanation Box */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
                    <div className="text-slate-700 text-xs">{finding.explanation}</div>

                    {/* Matched Fact Reference */}
                    {finding.matched_fact && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-500">Approved Evidence:</span>
                        <span className="font-semibold text-slate-800">{finding.matched_fact.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[10px]">
                          v{finding.matched_fact.version}
                        </span>
                        <span className="text-slate-500">Approved Value:</span>
                        <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {finding.matched_fact.approved_value}
                        </span>
                        <span className="text-slate-500">Source:</span>
                        <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          [{finding.matched_fact.source_ref}]
                        </span>
                      </div>
                    )}

                    {/* Matched Brand Rule Violation */}
                    {finding.matched_rule && (
                      <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span className="text-rose-700 font-semibold">
                          Violates Brand Rule [{finding.matched_rule.rule_code}]:
                        </span>
                        <span className="text-slate-800">{finding.matched_rule.name}</span>
                      </div>
                    )}

                    {/* Suggested Correction with 1-click replacement */}
                    {finding.suggested_correction && (
                      <div className="mt-2 p-2.5 bg-emerald-50/70 rounded border border-emerald-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                            Suggested Evidence-Backed Correction:
                          </span>
                          <span className="text-emerald-900 font-medium font-sans">
                            {finding.suggested_correction}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleApplyCorrection(finding.claim_text, finding.suggested_correction!)
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0 ml-3 cursor-pointer"
                        >
                          Apply Fix
                        </button>
                      </div>
                    )}

                    {/* Uncertainty Notice */}
                    {finding.uncertainty_notes && (
                      <div className="text-[11px] text-amber-800 flex items-center space-x-1 pt-1">
                        <Info className="w-3 h-3 text-amber-600" />
                        <span>{finding.uncertainty_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
