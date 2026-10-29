import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Network,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  Radio,
  Sliders,
  History,
  X,
  Layers,
  ArrowRight,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../types';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  animated?: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    active_impacts: number;
    verified_passports: number;
    live_connectors: number;
    monitored_assets: number;
  };
}

interface ImpactGraphViewProps {
  userRole?: UserRole;
  onNavigateToAudit?: (auditId: string) => void;
  onNavigateToPassport?: (passportId: string) => void;
  onNavigateToKnowledgeBase?: () => void;
}

export const ImpactGraphView: React.FC<ImpactGraphViewProps> = ({
  userRole = 'ADMIN',
  onNavigateToAudit,
  onNavigateToPassport,
  onNavigateToKnowledgeBase,
}) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Simulate Impact Modal State
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [selectedFactId, setSelectedFactId] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  // Historical Replay State
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [replayAuditId, setReplayAuditId] = useState('');
  const [replayData, setReplayData] = useState<any | null>(null);
  const [replaying, setReplaying] = useState(false);

  // Bulk Revalidate State
  const [bulkRevalidating, setBulkRevalidating] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/graph');
      if (!res.ok) throw new Error('Failed to load Brand Drift Impact Graph data.');
      const data = await res.json();
      setGraphData(data);
    } catch (err: any) {
      setError(err.message || 'Error loading graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((node) => {
      const matchesType = selectedType === 'ALL' || node.type === selectedType;
      const matchesSearch =
        !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(node.metadata || {}).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [graphData, selectedType, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [graphData, filteredNodeIds]);

  // Compute Layout Positions (Columns based on type)
  const positionedNodes = useMemo(() => {
    const colMap: Record<string, number> = {
      LIVE_SOURCE: 80,
      FACT: 280,
      FACT_VERSION: 480,
      RULE: 480,
      CHANGE_IMPACT: 680,
      ASSET: 880,
      TRUST_PASSPORT: 1080,
    };

    const typeGroups: Record<string, GraphNode[]> = {};
    for (const n of filteredNodes) {
      if (!typeGroups[n.type]) typeGroups[n.type] = [];
      typeGroups[n.type].push(n);
    }

    const layout: Record<string, { x: number; y: number }> = {};
    Object.entries(typeGroups).forEach(([type, nodes]) => {
      const baseX = colMap[type] || 500;
      const totalInCol = nodes.length;
      const spacingY = Math.max(80, Math.min(130, 750 / (totalInCol + 1)));
      const startY = Math.max(80, (800 - totalInCol * spacingY) / 2);

      nodes.forEach((node, idx) => {
        // slight jitter to avoid straight overlap
        const jitter = (idx % 2 === 0 ? -1 : 1) * (type === 'CHANGE_IMPACT' ? 20 : 0);
        layout[node.id] = {
          x: baseX + jitter,
          y: startY + idx * spacingY,
        };
      });
    });

    return filteredNodes.map((node) => ({
      ...node,
      x: layout[node.id]?.x || 400,
      y: layout[node.id]?.y || 300,
    }));
  }, [filteredNodes]);

  const nodePosMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of positionedNodes) {
      map.set(n.id, { x: n.x, y: n.y });
    }
    return map;
  }, [positionedNodes]);

  // Node styles by type
  const getNodeColor = (type: string, status?: string) => {
    switch (type) {
      case 'CHANGE_IMPACT':
        return {
          fill: '#881337',
          stroke: '#f43f5e',
          text: '#fda4af',
          glow: 'rgba(244, 63, 94, 0.4)',
        };
      case 'FACT':
        return {
          fill: '#064e3b',
          stroke: '#10b981',
          text: '#6ee7b7',
          glow: 'rgba(16, 185, 129, 0.3)',
        };
      case 'FACT_VERSION':
        return {
          fill: '#083344',
          stroke: '#06b6d4',
          text: '#67e8f9',
          glow: 'rgba(6, 182, 212, 0.3)',
        };
      case 'RULE':
        return {
          fill: '#451a03',
          stroke: '#f59e0b',
          text: '#fde68a',
          glow: 'rgba(245, 158, 11, 0.3)',
        };
      case 'ASSET':
        return {
          fill: status === 'verified' ? '#0f172a' : '#311042',
          stroke: status === 'verified' ? '#38bdf8' : '#a855f7',
          text: '#e2e8f0',
          glow: 'rgba(56, 189, 248, 0.3)',
        };
      case 'TRUST_PASSPORT':
        return {
          fill: status === 'PASSED' ? '#064e3b' : '#3b0764',
          stroke: status === 'PASSED' ? '#22c55e' : '#c084fc',
          text: '#dcfce7',
          glow: 'rgba(34, 197, 94, 0.3)',
        };
      case 'LIVE_SOURCE':
        return {
          fill: '#1e1b4b',
          stroke: '#6366f1',
          text: '#c7d2fe',
          glow: 'rgba(99, 102, 241, 0.3)',
        };
      default:
        return {
          fill: '#1e293b',
          stroke: '#64748b',
          text: '#94a3b8',
          glow: 'none',
        };
    }
  };

  // Run Impact Simulation
  const handleRunSimulation = async () => {
    if (!selectedFactId || !proposedValue) return;
    try {
      setSimulating(true);
      const res = await fetch('/api/facts/simulate-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact_id: selectedFactId, proposed_value: proposedValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');
      setSimulationResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSimulating(false);
    }
  };

  // Run Historical Replay
  const handleRunReplay = async (auditId: string) => {
    try {
      setReplaying(true);
      setReplayAuditId(auditId);
      setIsReplayOpen(true);
      const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/replay`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Replay failed');
      setReplayData(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplaying(false);
    }
  };

  // Bulk Revalidate
  const handleBulkRevalidate = async () => {
    if (!confirm('Re-evaluate all pending drift impacts and issue cryptographically signed Trust Passports?')) {
      return;
    }
    try {
      setBulkRevalidating(true);
      setBulkMessage(null);
      const res = await fetch('/api/impacts/bulk-revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
        },
        body: JSON.stringify({
          rationale: 'Bulk revalidation executed from Brand Drift Impact Graph topology.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk revalidation failed');
      setBulkMessage(`Successfully revalidated ${data.processed_assets} asset(s) and resolved ${data.resolved_impacts} impact alerts.`);
      fetchGraph();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBulkRevalidating(false);
    }
  };

  // Pan & Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Governance Overview */}
      <div className="bg-[#0b1220] border border-cyan-900/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                <Network className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Brand Drift Impact Graph
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
                    SIGNATURE INNOVATION
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full relational topology connecting approved facts, version history, brand rules, published assets, and cascading drift vectors.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setIsSimulateOpen(true);
                setSimulationResult(null);
                const firstFact = graphData?.nodes.find((n) => n.type === 'FACT');
                if (firstFact) {
                  setSelectedFactId(firstFact.id);
                  setProposedValue(firstFact.metadata?.value || '');
                }
              }}
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-cyan-950 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Simulate Fact Impact
            </button>

            <button
              onClick={handleBulkRevalidate}
              disabled={bulkRevalidating}
              className="px-3.5 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bulkRevalidating ? 'animate-spin' : ''}`} />
              Bulk Revalidate All
            </button>

            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-1">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  viewMode === 'graph' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Graph Topology
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tabular Registry
              </button>
            </div>
          </div>
        </div>

        {/* Live Topology Summary Badges */}
        {graphData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Topology Nodes</span>
              <p className="text-base font-bold text-slate-100 font-mono mt-0.5">{graphData.summary.total_nodes}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Relational Edges</span>
              <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">{graphData.summary.total_edges}</p>
            </div>
            <div className="bg-slate-900/60 border border-rose-950/60 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono text-rose-400 tracking-wider">Active Drift Alerts</span>
              <p className="text-base font-bold text-rose-400 font-mono mt-0.5">{graphData.summary.active_impacts}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Verified Passports</span>
              <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">{graphData.summary.verified_passports}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Published Assets</span>
              <p className="text-base font-bold text-slate-200 font-mono mt-0.5">{graphData.summary.monitored_assets}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Live Connectors</span>
              <p className="text-base font-bold text-indigo-400 font-mono mt-0.5">{graphData.summary.live_connectors}</p>
            </div>
          </div>
        )}

        {bulkMessage && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {bulkMessage}
            </span>
            <button onClick={() => setBulkMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Controls Bar: Search & Node Type Filter */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search nodes, facts, or assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {['ALL', 'FACT', 'RULE', 'ASSET', 'CHANGE_IMPACT', 'TRUST_PASSPORT', 'LIVE_SOURCE'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 text-[11px] rounded font-mono uppercase whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'graph' && (
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Graph Canvas or Tabular View */}
      {viewMode === 'graph' ? (
        <div className="relative bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[650px] flex">
          {/* SVG Canvas Area */}
          <div
            className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Transform Group */}
            <svg
              className="w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
                <marker id="arrow-drift" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
                <marker id="arrow-passport" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>

              {/* Render Edges */}
              <g className="edges">
                {filteredEdges.map((edge) => {
                  const sPos = nodePosMap.get(edge.source);
                  const tPos = nodePosMap.get(edge.target);
                  if (!sPos || !tPos) return null;

                  const isDriftEdge = edge.type === 'TRIGGERS_DRIFT' || edge.type === 'IMPACTS';
                  const isPassportEdge = edge.type === 'CERTIFIES';

                  // Curved bezier path
                  const dx = tPos.x - sPos.x;
                  const dy = tPos.y - sPos.y;
                  const cx1 = sPos.x + dx * 0.5;
                  const cy1 = sPos.y;
                  const cx2 = sPos.x + dx * 0.5;
                  const cy2 = tPos.y;
                  const pathData = `M ${sPos.x} ${sPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tPos.x} ${tPos.y}`;

                  return (
                    <g key={edge.id} className="transition-opacity hover:opacity-100">
                      <path
                        d={pathData}
                        fill="none"
                        stroke={isDriftEdge ? '#f43f5e' : isPassportEdge ? '#10b981' : '#334155'}
                        strokeWidth={isDriftEdge ? 2.5 : 1.5}
                        strokeDasharray={isDriftEdge ? '4 3' : edge.type === 'HISTORICAL' ? '2 2' : 'none'}
                        markerEnd={isDriftEdge ? 'url(#arrow-drift)' : isPassportEdge ? 'url(#arrow-passport)' : 'url(#arrow)'}
                        className={isDriftEdge ? 'animate-pulse' : ''}
                      />
                      {/* Edge Label on midpoint */}
                      <text
                        x={(sPos.x + tPos.x) / 2}
                        y={(sPos.y + tPos.y) / 2 - 6}
                        fill={isDriftEdge ? '#f43f5e' : '#64748b'}
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                        className="pointer-events-none select-none font-medium"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Render Nodes */}
              <g className="nodes">
                {positionedNodes.map((node) => {
                  const colors = getNodeColor(node.type, node.status);
                  const isSelected = selectedNode?.id === node.id;
                  const isAlert = node.type === 'CHANGE_IMPACT';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Ambient Glow */}
                      <circle
                        r={isSelected ? 26 : isAlert ? 22 : 18}
                        fill={colors.glow}
                        className={isAlert ? 'animate-ping' : ''}
                      />

                      {/* Main Node Circle */}
                      <circle
                        r={isSelected ? 20 : isAlert ? 18 : 15}
                        fill={colors.fill}
                        stroke={isSelected ? '#38bdf8' : colors.stroke}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-transform duration-200 group-hover:scale-110"
                      />

                      {/* Icon or Status dot */}
                      {isAlert && (
                        <circle r="4" fill="#f43f5e" className="animate-pulse" />
                      )}

                      {/* Node Label Text */}
                      <text
                        y={isSelected ? 34 : 30}
                        textAnchor="middle"
                        fill={isSelected ? '#38bdf8' : colors.text}
                        fontSize="11"
                        fontWeight="600"
                        className="pointer-events-none select-none"
                      >
                        {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                      </text>

                      {/* Sub-label (type) */}
                      <text
                        y={isSelected ? 46 : 42}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                        className="pointer-events-none select-none"
                      >
                        {node.type}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Bottom Left Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 backdrop-blur-md text-[11px] space-y-1.5 pointer-events-none z-10">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Topology Legend</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Approved Facts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-300">Fact Versions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-300 font-semibold">Brand Drift Impacts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-300">Published Assets</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-slate-300">Live Sources</span>
              </div>
            </div>
          </div>

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="w-80 md:w-96 border-l border-slate-800 bg-[#0a0f1d] p-5 overflow-y-auto flex flex-col justify-between z-20">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {selectedNode.type}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 mt-2">{selectedNode.label}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="mt-4 p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Node Status</span>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                      selectedNode.status === 'approved' || selectedNode.status === 'verified' || selectedNode.status === 'PASSED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedNode.status === 'PENDING'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {selectedNode.status}
                  </span>
                </div>

                {/* Node Metadata Details */}
                <div className="mt-4 space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Metadata Parameters</h4>
                  <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 text-xs space-y-2">
                    {Object.entries(selectedNode.metadata || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-mono text-[11px]">{key}:</span>
                        <span className="text-slate-200 font-medium text-right max-w-[200px] truncate" title={String(val)}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related Graph Connections */}
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Connected Edges</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {graphData?.edges
                      .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e) => {
                        const otherId = e.source === selectedNode.id ? e.target : e.source;
                        const otherNode = graphData.nodes.find((n) => n.id === otherId);
                        const isOutgoing = e.source === selectedNode.id;
                        return (
                          <div
                            key={e.id}
                            onClick={() => otherNode && setSelectedNode(otherNode)}
                            className="p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-[10px] text-cyan-400 font-mono">
                                {isOutgoing ? '->' : '<-'} {e.label}
                              </span>
                              <span className="font-medium truncate max-w-[140px]">{otherNode?.label || otherId}</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Node Contextual Actions */}
              <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
                {selectedNode.type === 'FACT' && (
                  <button
                    onClick={() => {
                      setSelectedFactId(selectedNode.id);
                      setProposedValue(selectedNode.metadata?.value || '');
                      setIsSimulateOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Simulate Impact of Fact Change
                  </button>
                )}

                {selectedNode.type === 'TRUST_PASSPORT' && (
                  <button
                    onClick={() => onNavigateToPassport?.(selectedNode.id)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify Passport Cryptographic Signature
                  </button>
                )}

                {selectedNode.type === 'ASSET' && (
                  <button
                    onClick={() => handleRunReplay(selectedNode.id)}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    Run Historical Decision Replay
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Accessible Tabular View */
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Graph Registry ({filteredNodes.length} Elements)
            </h3>
            <span className="text-xs text-slate-400">WCAG Keyboard Accessible View</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Label / Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Key Details</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 text-[10px]">
                        {node.type}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-200 font-sans">{node.label}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          node.status === 'approved' || node.status === 'verified' || node.status === 'PASSED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : node.status === 'PENDING'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {node.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 max-w-xs truncate">
                      {JSON.stringify(node.metadata || {})}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedNode(node)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SIMULATE IMPACT MODAL */}
      {isSimulateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-cyan-900/60 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Play className="w-5 h-5 fill-current" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Simulate Fact Change Impact</h3>
                  <p className="text-xs text-slate-400">
                    Preview dependent claims and predicted score alterations without mutating the Knowledge Base.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSimulateOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Select Approved Fact</label>
                <select
                  value={selectedFactId}
                  onChange={(e) => {
                    setSelectedFactId(e.target.value);
                    const f = graphData?.nodes.find((n) => n.id === e.target.value);
                    if (f) setProposedValue(f.metadata?.value || '');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-600"
                >
                  {graphData?.nodes
                    .filter((n) => n.type === 'FACT')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} (Current: {f.metadata?.value})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Proposed New Fact Value
                </label>
                <input
                  type="text"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder="e.g. ₹1,299/month"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-600 font-mono"
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simulating || !proposedValue}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {simulating ? 'Evaluating Dependent Assets...' : 'Run EvidenceGuard Dry-Run Simulation'}
              </button>
            </div>

            {/* Simulation Results Display */}
            {simulationResult && (
              <div className="mt-5 space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase text-slate-300 font-bold tracking-wider">
                    Simulation Outcome
                  </h4>
                  <span
                    className={`text-xs font-bold font-mono px-2.5 py-1 rounded ${
                      simulationResult.severity === 'HIGH'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : simulationResult.severity === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    RISK SEVERITY: {simulationResult.severity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Affected Assets</span>
                    <span className="text-lg font-bold text-slate-100 font-mono">
                      {simulationResult.affected_assets_count}
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Altered Claims</span>
                    <span className="text-lg font-bold text-rose-400 font-mono">
                      {simulationResult.affected_claims_count}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  {simulationResult.summary}
                </p>

                {simulationResult.impacts?.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Impacted Assets & Claims</span>
                    {simulationResult.impacts.map((imp: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{imp.asset_name}</span>
                          <span className="font-mono text-[11px] text-slate-400">
                            Score: {imp.current_score}% {'->'}{' '}
                            <span className={imp.score_delta < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {imp.predicted_score}%
                            </span>
                          </span>
                        </div>
                        {imp.impacted_claims?.map((c: any, ci: number) => (
                          <div key={ci} className="bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[11px] space-y-1">
                            <p className="text-slate-300 italic font-mono">"{c.claim_text}"</p>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Current: {c.current_status}</span>
                              <span className="text-rose-400 font-bold">Predicted: {c.predicted_status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORICAL DECISION REPLAY MODAL */}
      {isReplayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-indigo-900/60 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Historical Decision Replay</h3>
                  <p className="text-xs text-slate-400">
                    Re-evaluates published asset claims against current Knowledge Base to detect Brand Drift.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsReplayOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {replaying ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Reconstructing historical audit verification...</p>
              </div>
            ) : replayData ? (
              <div className="space-y-4">
                <div
                  className={`p-3.5 rounded-lg border flex items-center justify-between ${
                    replayData.drift_detected
                      ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                      : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    {replayData.drift_detected ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {replayData.drift_detected ? 'Brand Drift Detected Since Original Sign-Off' : 'Integrity Verified: No Drift'}
                  </span>
                  <span className="text-xs font-mono font-bold">
                    Score: {replayData.historical?.governance_score}% {'->'} {replayData.current?.governance_score}%
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  {replayData.summary}
                </p>

                {replayData.drift_items?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Drifted Claims Details</span>
                    {replayData.drift_items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                        <p className="text-slate-200 font-mono italic">"{item.claim_text}"</p>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-mono">Audit Sign-off</span>
                            <span className="text-emerald-400 font-semibold">{item.historical_status}</span>
                            <span className="text-slate-400 block text-[10px]">Evidence: {item.historical_evidence}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-mono">Current Replay</span>
                            <span className="text-rose-400 font-semibold">{item.current_status}</span>
                            <span className="text-slate-400 block text-[10px] truncate">Current: {item.current_evidence}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
