import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  History,
  FileBadge,
  X,
  Play,
  HelpCircle,
} from 'lucide-react';
import { NavTab } from './Navbar';

interface DemoGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onTriggerFactChange: () => void;
  onLoadSampleToEvidenceGuard: (sampleKey: string) => void;
}

export const DemoGuide: React.FC<DemoGuideProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onTriggerFactChange,
  onLoadSampleToEvidenceGuard,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Interactive Brand Governance Walkthrough
              </h3>
              <p className="text-xs text-slate-300">
                Fictional Organization: Acme Technologies Pvt Ltd
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveStep(1)}
            className={`py-3 px-4 text-center border-b-2 transition-colors cursor-pointer ${
              activeStep === 1
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="block font-bold">Part A</span>
            <span className="font-normal text-slate-500">Verify Content</span>
          </button>
          <button
            onClick={() => setActiveStep(2)}
            className={`py-3 px-4 text-center border-b-2 transition-colors cursor-pointer ${
              activeStep === 2
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="block font-bold">Part B</span>
            <span className="font-normal text-slate-500">Change Intelligence</span>
          </button>
          <button
            onClick={() => setActiveStep(3)}
            className={`py-3 px-4 text-center border-b-2 transition-colors cursor-pointer ${
              activeStep === 3
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="block font-bold">Part C</span>
            <span className="font-normal text-slate-500">Trust & Accountability</span>
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 1 to 4: Verify Marketing Claims with EvidenceGuard
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Demonstrate how submitted content claims are compared against approved Knowledge Base facts and Brand Rules. Discrepancies are highlighted with exact source citations and suggested corrections.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-slate-800">
                  Sample Demonstration Asset:
                </p>
                <blockquote className="italic text-slate-600 border-l-2 border-indigo-400 pl-3 py-1">
                  &ldquo;Subscribe to Acme Cloud Pro today for only ₹899/month. Our enterprise SLA guarantees 99.9% uptime and we offer an exclusive 30-day free trial. Platform is 100% bug-free.&rdquo;
                </blockquote>
                <div className="text-[11px] text-slate-500 pt-1">
                  Expected Findings: Flags ₹899 price discrepancy (approved ₹999), 99.9% SLA (approved 99.99%), 30-day trial (approved 14 days), and forbidden absolute claim rule &ldquo;100% bug-free&rdquo;.
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    onLoadSampleToEvidenceGuard('conflicting_brochure');
                    onNavigateTab('evidence_guard');
                    onClose();
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Load Sample & Open EvidenceGuard</span>
                </button>
                <button
                  onClick={() => setActiveStep(2)}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  <span>Next: Part B</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 mt-0.5">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 5: Brand Time Machine (Change-Impact Intelligence)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    What happens when an approved fact changes? The previous fact version is preserved in history, and the system scans all previously verified assets to flag affected marketing materials.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Fact Evolution Scenario:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Controlled Version Bump
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-slate-500 block">Baseline Fact v1:</span>
                    <span className="font-medium text-slate-800">Acme Cloud Pro: ₹999/month</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <span className="text-emerald-700 block">Updated Fact v2:</span>
                    <span className="font-bold text-emerald-800">Acme Cloud Pro: ₹1,199/month</span>
                  </div>
                </div>
                <p className="text-slate-600 pt-1 text-[11px]">
                  Impact: Existing brochure (BP-PASS-2026-1011) was verified against ₹999. The Brand Time Machine instantly flags it into the Revalidation Queue with an explanation.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    onTriggerFactChange();
                    onNavigateTab('time_machine');
                    onClose();
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Update Fact to ₹1,199 & Open Brand Time Machine</span>
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  <span>Next: Part C</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                  <FileBadge className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 6 & 7: Accountable Human Review & Versioned Trust Passports
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    AI classifications never silently publish content. Authorized reviewers inspect evidence, record a decision with rationale, and issue a version-specific Trust Passport v2 while preserving historical v1.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-slate-800">
                  Governance Principle:
                </p>
                <div className="bg-white p-3 rounded border border-slate-200 font-mono text-indigo-900 text-[11px]">
                  Verify every claim. Track every change. Preserve every decision.
                </div>
                <p className="text-slate-600 text-[11px]">
                  Reviewers can open the asset in the Review Queue, update copy to ₹1,199/month, submit their sign-off, and inspect the dual-version Trust Passport in the printable view.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    onNavigateTab('review_queue');
                    onClose();
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Open Human Review Queue</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('trust_passports');
                    onClose();
                  }}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  <span>Inspect Trust Passports</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>All demonstration data is fictional for Acme Technologies Pvt Ltd.</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
