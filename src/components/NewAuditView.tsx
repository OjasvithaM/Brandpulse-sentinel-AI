import React, { useState } from 'react';
import {
  ClipboardCheck,
  UploadCloud,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Download,
  FileBadge,
  Layers,
  Search,
  ExternalLink,
  Info,
  Radio,
  BookOpen,
} from 'lucide-react';
import { Fact, BrandRule, SavedAudit, VerificationFinding } from '../types';
import { NavTab } from './Navbar';

interface NewAuditViewProps {
  approvedFacts: Fact[];
  brandRules: BrandRule[];
  onNavigateTab: (tab: NavTab) => void;
  onAuditCreated: (audit: SavedAudit) => void;
}

const SAMPLE_DRAFTS = [
  {
    title: 'Compliant Q4 Launch Announcement',
    desc: 'Fully aligned with approved ₹999 pricing, 99.99% SLA, and 14 days trial.',
    content:
      'Acme Cloud Pro is priced at ₹999/month for all customers. Enterprise Cloud SLA guarantees 99.99% uptime availability. Enjoy a risk-free 14 days trial before being billed.',
  },
  {
    title: 'Discrepant Partner Pricing Copy',
    desc: 'Contains outdated ₹799 pricing, unauthorized 30-day trial, and absolute claim.',
    content:
      'Sign up for Acme Cloud Pro for just ₹799/month today. Enjoy a 30-day trial with all premium features. Our platform is guaranteed 100% bug-free in all deployments.',
  },
  {
    title: 'Mixed Enterprise Sales Deck Draft',
    desc: 'Mix of verified SLA with unverified founding claims and pricing discrepancies.',
    content:
      'Enterprise Cloud SLA guarantees 99.99% uptime availability. Acme Technologies was founded by former astronauts in Zurich. Get started for ₹850/month with unlimited free tier.',
  },
];

const BRAND_OPTIONS = [
  'Acme Technologies (Core Cloud Services)',
  'Acme Enterprise Solutions',
  'Acme Developer Platform',
  'Acme Infrastructure & Data Fabric',
];

const CHANNEL_OPTIONS = [
  'Website Landing Page',
  'Sales Presentation Deck',
  'Social Media Campaign',
  'Customer Newsletter',
  'Press Release',
  'Product Brochure',
];

export const NewAuditView: React.FC<NewAuditViewProps> = ({
  approvedFacts,
  brandRules,
  onNavigateTab,
  onAuditCreated,
}) => {
  // Form State
  const [auditName, setAuditName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(BRAND_OPTIONS[0]);
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_OPTIONS[0]);
  const [content, setContent] = useState('');
  const [reviewerName, setReviewerName] = useState('Compliance Specialist (You)');
  const [includeLiveFeeds, setIncludeLiveFeeds] = useState(true);
  const [includeBrandRules, setIncludeBrandRules] = useState(true);
  const [autoIssuePassport, setAutoIssuePassport] = useState(true);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedAudit, setCompletedAudit] = useState<SavedAudit | null>(null);

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setContent(text);
        if (!auditName) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setAuditName(`Audit of ${cleanName}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSelectSample = (sample: (typeof SAMPLE_DRAFTS)[0]) => {
    setContent(sample.content);
    setAuditName(sample.title);
    setErrorMessage(null);
  };

  const validateInputs = (): boolean => {
    if (!auditName.trim()) {
      setErrorMessage('Please enter an audit or project name.');
      return false;
    }
    if (!content.trim()) {
      setErrorMessage('Please enter or upload brand claims and marketing draft text to evaluate.');
      return false;
    }
    if (content.trim().length < 15) {
      setErrorMessage('Content is too brief. Please enter at least one complete factual sentence or claim.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleExecuteAudit = async () => {
    if (!validateInputs()) return;

    setIsRunning(true);
    setCompletedAudit(null);
    setErrorMessage(null);

    try {
      setProgressStep('Extracting verifiable claims and marketing assertions...');
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep('Cross-referencing approved facts and brand rules in Knowledge Base...');
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep('Evaluating evidence integrity, metric math, and source citations...');

      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_name: auditName.trim(),
          brand: selectedBrand,
          channel: selectedChannel,
          content: content.trim(),
          evidence_sources: [
            'Approved Knowledge Base Facts (v1/v2)',
            includeLiveFeeds ? 'Live Connectors Feed (REST Telemetry & Pricing)' : null,
            includeBrandRules ? 'Active Brand Governance Rules' : null,
          ].filter(Boolean),
          reviewer_name: reviewerName,
          auto_passport: autoIssuePassport,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with HTTP ${response.status}`);
      }

      const audit: SavedAudit = await response.json();
      setCompletedAudit(audit);
      onAuditCreated(audit);
    } catch (err: any) {
      setErrorMessage(err.message || 'Audit execution failed. Please check network connection and try again.');
    } finally {
      setIsRunning(false);
      setProgressStep('');
    }
  };

  const handleResetForm = () => {
    setAuditName('');
    setContent('');
    setCompletedAudit(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span
              onClick={() => onNavigateTab('dashboard')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              Home
            </span>
            <span>/</span>
            <span className="text-slate-900 font-medium">New Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            <span>Create & Run Brand Compliance Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Evaluate brand-related claims against versioned approved evidence and active brand rules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateTab('saved_audits')}
            className="px-3.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>View Saved Audits</span>
          </button>
        </div>
      </div>

      {/* Main Audit Form & Workflow */}
      {!completedAudit ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Columns: Configuration & Content Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Project & Brand Configuration */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Project & Brand Parameters
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Audit Name / Campaign Identifier *
                  </label>
                  <input
                    type="text"
                    value={auditName}
                    onChange={(e) => setAuditName(e.target.value)}
                    placeholder="e.g. Q4 Cloud Launch Brochure & Pricing Page"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand Entity / Product Line
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                  >
                    {BRAND_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Distribution Channel
                  </label>
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Content & Claims Input */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Content & Factual Assertions to Audit
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors">
                    <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                    <span>Upload Document</span>
                    <input
                      type="file"
                      accept=".txt,.md,.json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Sample Draft Quick Selector */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Or load a sample marketing draft:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_DRAFTS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 line-clamp-1">
                        {sample.title}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                        {sample.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Draft Content / Claims Text *
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste marketing copy, press releases, product brochures, or claim sentences here..."
                  className="w-full text-xs sm:text-sm p-3 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-sans leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>
                    Sentences will be parsed into discrete verifiable claims by the EvidenceGuard engine.
                  </span>
                  <span>{content.length} characters</span>
                </div>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3.5 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium cursor-pointer transition-colors"
              >
                Clear Form
              </button>

              <button
                type="button"
                onClick={handleExecuteAudit}
                disabled={isRunning}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {isRunning ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Running Verification...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Start Audit & Verify Claims</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Progress Step Indicator while running */}
            {isRunning && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs text-indigo-900 space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Multi-Tier Verification in Progress...</span>
                  <span className="text-[11px] text-indigo-700">Please wait</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full w-3/4 animate-pulse"></div>
                </div>
                <p className="text-[11px] text-indigo-700">{progressStep}</p>
              </div>
            )}
          </div>

          {/* Right Column: Evidence Sources & Configuration Checklist */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Evidence Sources
                  </h2>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live DB
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Approved Facts */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">
                      Approved Knowledge Base ({approvedFacts.length} Facts)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Versioned pricing, uptime SLA guarantees, trial duration, and data residency policies.
                    </p>
                  </div>
                </div>

                {/* Live Connectors */}
                <label className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start space-x-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeLiveFeeds}
                    onChange={(e) => setIncludeLiveFeeds(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>Live Connectors (REST & Telemetry)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Include current live pricing and SLA feeds for cross-source reconciliation.
                    </p>
                  </div>
                </label>

                {/* Brand Rules */}
                <label className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start space-x-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeBrandRules}
                    onChange={(e) => setIncludeBrandRules(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Brand Governance Rules ({brandRules.length} Active Rules)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enforce prohibitions against absolute software claims and unauthorized discount phrases.
                    </p>
                  </div>
                </label>

                {/* Auto Trust Passport */}
                <label className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start space-x-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoIssuePassport}
                    onChange={(e) => setAutoIssuePassport(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Generate Trust Passport
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Creates an immutable versioned audit passport with cryptographic evidence snapshot.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auditor / Reviewer Attribution
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 text-slate-800"
                />
              </div>
            </div>

            {/* Governance Principle Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-2">
              <div className="flex items-center space-x-2 text-indigo-300">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Governance Principle
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                “Verify every claim. Track every change. Preserve every decision.”
              </p>
              <p className="text-[11px] text-slate-400">
                AI and deterministic checks identify potential discrepancies; final certification is preserved in versioned audit trails.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Results View when Audit Finishes */
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 space-y-6">
          {/* Top Results Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 text-white">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                    completedAudit.overall_status === 'PASSED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
                      : completedAudit.overall_status === 'CONDITIONAL'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
                  }`}
                >
                  {completedAudit.overall_status}
                </span>
                <span className="text-xs text-slate-400">
                  {completedAudit.brand} • {completedAudit.channel}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">
                {completedAudit.audit_name}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Audit ID: <strong className="font-mono text-indigo-300">{completedAudit.id}</strong> • Verified at {new Date(completedAudit.created_at).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center space-x-4 shrink-0">
              <div className="text-right">
                <div className="text-3xl font-extrabold text-white">
                  {completedAudit.governance_score}%
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Compliance Score
                </div>
              </div>
              {completedAudit.passport_code && (
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-left">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase">
                    Trust Passport Issued
                  </div>
                  <div className="font-mono font-bold text-white">
                    {completedAudit.passport_code}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stat Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500 font-medium">Total Evaluated Claims</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {completedAudit.claims_count}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="text-xs text-emerald-800 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supported Evidence</span>
              </div>
              <div className="text-xl font-bold text-emerald-900 mt-1">
                {completedAudit.supported_count}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/50">
              <div className="text-xs text-rose-800 font-medium flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Contradicted Discrepancies</span>
              </div>
              <div className="text-xl font-bold text-rose-900 mt-1">
                {completedAudit.contradicted_count}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50">
              <div className="text-xs text-amber-800 font-medium flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Unverified Assertions</span>
              </div>
              <div className="text-xl font-bold text-amber-900 mt-1">
                {completedAudit.unverified_count}
              </div>
            </div>
          </div>

          {/* Claim-by-Claim Findings Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Claim-Level Verification Findings & Evidence Citations</span>
            </h3>

            <div className="space-y-3">
              {completedAudit.findings.map((f, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                    f.status === 'SUPPORTED'
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : f.status === 'CONTRADICTED'
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 text-sm block">
                        “{f.claim_text}”
                      </span>
                      <p className="text-slate-600 leading-relaxed">{f.explanation}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold uppercase shrink-0 ${
                        f.status === 'SUPPORTED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : f.status === 'CONTRADICTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>

                  {/* Supporting or Conflicting Fact Reference */}
                  {f.matched_fact && (
                    <div className="p-2.5 rounded bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-medium">Approved Evidence:</span>{' '}
                        <strong className="text-slate-900">{f.matched_fact.name} (v{f.matched_fact.version})</strong>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="text-slate-500">Approved Value:</span>{' '}
                        <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold text-indigo-700">
                          {f.matched_fact.approved_value}
                        </code>
                      </div>
                      <div className="text-slate-500 font-mono">
                        Source Ref: <strong className="text-slate-700">{f.matched_fact.source_ref}</strong>
                      </div>
                    </div>
                  )}

                  {/* Rule violation indicator if matched rule */}
                  {f.matched_rule && (
                    <div className="p-2.5 rounded bg-white border border-rose-200 text-[11px] text-rose-900">
                      <strong>Brand Rule Violated:</strong> {f.matched_rule.name} ({f.matched_rule.rule_code})
                    </div>
                  )}

                  {/* Suggested Correction for Contradicted Claims */}
                  {f.suggested_correction && (
                    <div className="p-2.5 rounded bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-950 flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Recommended Compliant Phrasing:</strong>
                        <p className="font-medium text-indigo-900 mt-0.5">
                          “{f.suggested_correction}”
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleResetForm}
              className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Another Audit</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateTab('saved_audits')}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Open in Saved Audits</span>
              </button>

              <button
                onClick={() => onNavigateTab('trust_passports')}
                className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <FileBadge className="w-3.5 h-3.5 text-indigo-400" />
                <span>View Trust Passports</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
