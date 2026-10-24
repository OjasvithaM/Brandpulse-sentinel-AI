import React, { useState } from 'react';
import {
  Shield,
  ClipboardCheck,
  Search,
  Database,
  LayoutDashboard,
  CheckCircle2,
  RefreshCw,
  Menu,
  X,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { NavTab } from './Navbar';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasGeminiKey: boolean;
  onResetDemo: () => void;
  isResetting: boolean;
  savedAuditsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  hasGeminiKey,
  onResetDemo,
  isResetting,
  savedAuditsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavLinks: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'new_audit', label: 'New Audit', icon: ClipboardCheck },
    { id: 'saved_audits', label: 'Review Audits', icon: Search, badge: savedAuditsCount > 0 ? savedAuditsCount : undefined },
    { id: 'knowledge_base', label: 'Knowledge Base', icon: Database },
    { id: 'review_queue', label: 'Audit Dashboard', icon: FileCheck2 },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center space-x-3 cursor-pointer shrink-0"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleNavClick('dashboard');
            }}
            aria-label="BrandPulse Sentinel AI Home"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white hover:text-indigo-200 transition-colors">
                  BrandPulse Sentinel AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block tracking-normal">
                Verify every claim. Track every change. Preserve every decision.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {mainNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 text-white border border-indigo-500/40 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status Controls & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Multi-tier Engine Status Pill */}
            <div
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
              title="Multi-tier verification engine operational: deterministic terminology, exact metric math, and semantic validation."
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden xl:inline">Verification Engine: Active</span>
              <span className="xl:hidden">Engine Active</span>
            </div>

            {/* Live Data Ingestion Status */}
            <div
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-indigo-950/60 text-indigo-300 border-indigo-800/80"
              title="Configured live data connectors monitoring authorized brand feeds."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden xl:inline">Live Ingestion: Connected</span>
              <span className="xl:hidden">Live Feeds</span>
            </div>

            {/* Reset Demo Data Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Reset knowledge base and audits to initial Acme demo state"
              aria-label="Reset demo data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Baseline</span>
            </button>

            {/* Mobile / Tablet Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 backdrop-blur-md px-4 pt-3 pb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Navigation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {mainNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile System Status Indicators */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verification Engine: Active</span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Ingestion: Connected</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
