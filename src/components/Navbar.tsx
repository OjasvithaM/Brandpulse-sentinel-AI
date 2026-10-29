import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Search,
  Database,
  FileCheck2,
  History,
  FileBadge,
  CheckSquare,
  ScrollText,
  Sliders,
  Radio,
  Network,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'new_audit'
  | 'saved_audits'
  | 'knowledge_base'
  | 'live_sources'
  | 'evidence_guard'
  | 'time_machine'
  | 'impact_graph'
  | 'trust_passports'
  | 'review_queue'
  | 'audit_history'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingImpactsCount: number;
  pendingReviewsCount: number;
  pendingStagedUpdatesCount?: number;
  savedAuditsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  pendingImpactsCount,
  pendingReviewsCount,
  pendingStagedUpdatesCount = 0,
  savedAuditsCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard },
    {
      id: 'new_audit' as NavTab,
      label: 'New Audit',
      icon: ClipboardCheck,
      highlight: true,
    },
    {
      id: 'saved_audits' as NavTab,
      label: 'Review Audits',
      icon: Search,
      badge: savedAuditsCount > 0 ? savedAuditsCount : null,
      badgeColor: 'bg-indigo-600 text-white',
    },
    { id: 'knowledge_base' as NavTab, label: 'Knowledge Base', icon: Database },
    {
      id: 'live_sources' as NavTab,
      label: 'Live Connectors',
      icon: Radio,
      badge: pendingStagedUpdatesCount > 0 ? pendingStagedUpdatesCount : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    { id: 'evidence_guard' as NavTab, label: 'EvidenceGuard', icon: FileCheck2 },
    {
      id: 'time_machine' as NavTab,
      label: 'Brand Time Machine',
      icon: History,
      badge: pendingImpactsCount > 0 ? pendingImpactsCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'impact_graph' as NavTab,
      label: 'Impact Graph',
      icon: Network,
      highlight: true,
      badge: pendingImpactsCount > 0 ? 'Radar' : null,
      badgeColor: 'bg-cyan-500 text-slate-950 font-bold',
    },
    { id: 'trust_passports' as NavTab, label: 'Trust Passports', icon: FileBadge },
    {
      id: 'review_queue' as NavTab,
      label: 'Review Queue',
      icon: CheckSquare,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'audit_history' as NavTab, label: 'Audit Trail', icon: ScrollText },
    { id: 'settings' as NavTab, label: 'Benchmark Suite', icon: Sliders },
  ];

  return (
    <nav className="bg-[#0b1220] border-b border-slate-800 shadow-md sticky top-16 z-30" aria-label="Governance Modules Sub-Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-2 scrollbar-none items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-300 shadow-sm border border-cyan-700/80 font-semibold'
                    : tab.highlight
                    ? 'bg-slate-900/90 text-slate-200 hover:bg-slate-800 border border-slate-700/70 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : tab.highlight ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
