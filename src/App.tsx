import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navbar, NavTab } from './components/Navbar';
import { DemoGuide } from './components/DemoGuide';
import { DashboardView } from './components/DashboardView';
import { NewAuditView } from './components/NewAuditView';
import { SavedAuditsView } from './components/SavedAuditsView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { EvidenceGuardView } from './components/EvidenceGuardView';
import { BrandTimeMachineView } from './components/BrandTimeMachineView';
import { ImpactGraphView } from './components/ImpactGraphView';
import { TrustPassportsView } from './components/TrustPassportsView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { AuditHistoryView } from './components/AuditHistoryView';
import { EvaluationSettingsView } from './components/EvaluationSettingsView';
import { LiveSourcesView } from './components/LiveSourcesView';
import {
  DashboardStats,
  Fact,
  BrandRule,
  TrustPassport,
  ChangeImpact,
  ReviewQueueItem,
  AuditLog,
  SavedAudit,
  UserRole,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [initialContentForEvidenceGuard, setInitialContentForEvidenceGuard] = useState('');
  const [savedAuditsCount, setSavedAuditsCount] = useState(0);

  // Application data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [passports, setPassports] = useState<TrustPassport[]>([]);
  const [impacts, setImpacts] = useState<ChangeImpact[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Load all primary data
  const loadAllData = async () => {
    try {
      const [statsRes, factsRes, rulesRes, passportsRes, impactsRes, reviewsRes, logsRes, auditsRes] =
        await Promise.all([
          fetch('/api/stats'),
          fetch('/api/facts'),
          fetch('/api/rules'),
          fetch('/api/passports'),
          fetch('/api/impacts'),
          fetch('/api/reviews'),
          fetch('/api/audit-logs'),
          fetch('/api/audits'),
        ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (factsRes.ok) setFacts(await factsRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (passportsRes.ok) setPassports(await passportsRes.json());
      if (impactsRes.ok) setImpacts(await impactsRes.json());
      if (reviewsRes.ok) setReviewItems(await reviewsRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (auditsRes.ok) {
        const auditsData = await auditsRes.json();
        if (Array.isArray(auditsData)) setSavedAuditsCount(auditsData.length);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Demo Reset handler
  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        await loadAllData();
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Simulate updating Acme Cloud Pro price from ₹999 to ₹1,199 (Demo Part B)
  const handleTriggerFactChange = async () => {
    try {
      const targetFact = facts.find((f) => f.key === 'acme_cloud_pro_price') || facts[0];
      if (!targetFact) return;

      const res = await fetch(`/api/facts/${targetFact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: '₹1,199/month',
          source_ref: 'DOC-2026-PRICING-V3',
          source_doc: 'Acme Q4 Executive Pricing Revision Bulletin',
          change_reason: 'Q4 Tier Pricing Adjustment approved by Commercial Steering Committee',
          changed_by: 'Chief Commercial Officer',
        }),
      });

      if (res.ok) {
        await loadAllData();
      }
    } catch (err) {
      console.error('Failed to simulate fact change:', err);
    }
  };

  // Pre-load content into EvidenceGuard
  const handleLoadSampleToEvidenceGuard = (sampleKey: string) => {
    if (sampleKey === 'conflicting_brochure') {
      setInitialContentForEvidenceGuard(
        'Subscribe to Acme Cloud Pro today for only ₹899/month. Our enterprise SLA guarantees 99.9% uptime with 24/7 priority support. Test drive every feature with our 30-day free trial. We guarantee our platform is 100% bug-free for all deployments.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col font-sans text-slate-100">
      {/* Redesigned Universal Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasGeminiKey={stats?.hasGeminiKey ?? false}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        savedAuditsCount={savedAuditsCount}
        userRole={userRole}
        onSelectRole={setUserRole}
      />

      {/* Sub-Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingImpactsCount={stats?.pendingImpactsCount ?? 0}
        pendingReviewsCount={stats?.pendingReviewsCount ?? 0}
        pendingStagedUpdatesCount={stats?.pendingStagedUpdatesCount ?? 0}
        savedAuditsCount={savedAuditsCount}
      />

      {/* Interactive Demonstration Modal */}
      <DemoGuide
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTriggerFactChange={handleTriggerFactChange}
        onLoadSampleToEvidenceGuard={handleLoadSampleToEvidenceGuard}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            onNavigateTab={setActiveTab}
            onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
          />
        )}

        {activeTab === 'impact_graph' && (
          <ImpactGraphView
            userRole={userRole}
            onNavigateToAudit={() => setActiveTab('saved_audits')}
            onNavigateToPassport={() => setActiveTab('trust_passports')}
            onNavigateToKnowledgeBase={() => setActiveTab('knowledge_base')}
          />
        )}

        {activeTab === 'new_audit' && (
          <NewAuditView
            approvedFacts={facts}
            brandRules={rules}
            onNavigateTab={setActiveTab}
            onAuditCreated={() => {
              loadAllData();
            }}
          />
        )}

        {activeTab === 'saved_audits' && (
          <SavedAuditsView
            onNavigateTab={setActiveTab}
            onRefreshStats={loadAllData}
          />
        )}

        {activeTab === 'knowledge_base' && (
          <KnowledgeBaseView
            facts={facts}
            rules={rules}
            onFactUpdated={loadAllData}
            onFactCreated={loadAllData}
            onRuleCreated={loadAllData}
          />
        )}

        {activeTab === 'live_sources' && (
          <LiveSourcesView
            onRefreshStats={loadAllData}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'evidence_guard' && (
          <EvidenceGuardView
            initialContent={initialContentForEvidenceGuard}
            onPassportIssued={loadAllData}
            onNavigateToPassports={() => setActiveTab('trust_passports')}
          />
        )}

        {activeTab === 'time_machine' && (
          <BrandTimeMachineView
            impacts={impacts}
            onRefresh={loadAllData}
            onNavigateTab={setActiveTab}
            onSimulatePriceChange={handleTriggerFactChange}
          />
        )}

        {activeTab === 'trust_passports' && (
          <TrustPassportsView
            passports={passports}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'review_queue' && (
          <ReviewQueueView
            items={reviewItems}
            onRefresh={loadAllData}
            onNavigateToPassports={() => setActiveTab('trust_passports')}
          />
        )}

        {activeTab === 'audit_history' && (
          <AuditHistoryView
            logs={auditLogs}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'settings' && (
          <EvaluationSettingsView
            onResetDemo={handleResetDemo}
            isResetting={isResetting}
            hasGeminiKey={stats?.hasGeminiKey ?? false}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0b1220] border-t border-slate-800 py-5 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-200">BrandPulse Sentinel AI</span>
            <span>•</span>
            <span className="text-cyan-400 font-mono text-[11px]">Evidence-Based Brand Governance Platform</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Verify every claim. Track every change. Preserve every decision.
          </span>
        </div>
      </footer>
    </div>
  );
}
