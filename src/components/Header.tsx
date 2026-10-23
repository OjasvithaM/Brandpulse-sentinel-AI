import React from 'react';
import { Shield, Sparkles, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  hasGeminiKey: boolean;
  onResetDemo: () => void;
  isResetting: boolean;
  onOpenDemoGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasGeminiKey,
  onResetDemo,
  isResetting,
  onOpenDemoGuide,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">BrandPulse Sentinel AI</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Hackathon Prototype
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Evidence-Based Brand Governance & Change-Impact Intelligence
              </p>
            </div>
          </div>

          {/* Quick Controls & Status Badges */}
          <div className="flex items-center space-x-3">
            {/* AI Engine Status */}
            <div
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium border ${
                hasGeminiKey
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}
              title={
                hasGeminiKey
                  ? 'Gemini 3.8 Flash active for semantic claim extraction'
                  : 'Deterministic engine active; add GEMINI_API_KEY in Secrets for semantic AI'
              }
            >
              {hasGeminiKey ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gemini 3.8 Flash + Deterministic</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deterministic Engine (Active)</span>
                </>
              )}
            </div>

            {/* Fictional Demo Badge */}
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-300 bg-slate-800 border border-slate-700">
              Org: Acme Technologies (Fictional Demo)
            </span>

            {/* Live Demo Tour Button */}
            <button
              onClick={onOpenDemoGuide}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Demo Script</span>
            </button>

            {/* Reset Demo Data Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Reset knowledge base and passports to initial Acme demo state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
