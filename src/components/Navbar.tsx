import React from 'react';
import {
  LayoutDashboard,
  Database,
  FileCheck2,
  History,
  FileBadge,
  CheckSquare,
  ScrollText,
  Sliders,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'knowledge_base'
  | 'evidence_guard'
  | 'time_machine'
  | 'trust_passports'
  | 'review_queue'
  | 'audit_history'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingImpactsCount: number;
  pendingReviewsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  pendingImpactsCount,
  pendingReviewsCount,
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'knowledge_base' as NavTab, label: 'Knowledge Base', icon: Database },
    { id: 'evidence_guard' as NavTab, label: 'EvidenceGuard', icon: FileCheck2 },
    {
      id: 'time_machine' as NavTab,
      label: 'Brand Time Machine',
      icon: History,
      badge: pendingImpactsCount > 0 ? pendingImpactsCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'trust_passports' as NavTab, label: 'Trust Passports', icon: FileBadge },
    {
      id: 'review_queue' as NavTab,
      label: 'Review Queue',
      icon: CheckSquare,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'audit_history' as NavTab, label: 'Audit History', icon: ScrollText },
    { id: 'settings' as NavTab, label: 'Evaluation & Tests', icon: Sliders },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${tab.badgeColor}`}
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
