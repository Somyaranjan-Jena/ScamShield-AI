"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Network,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Download,
} from "lucide-react";
import { apiGet, cn, formatCurrency } from "@/lib/utils";

interface GraphNodeData {
  id: string;
  label: string;
  node_type: string;
  risk_level: string;
  metadata: Record<string, unknown>;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  edge_type: string;
  amount: number | null;
  description: string | null;
  flagged: boolean;
}

interface SimNode extends GraphNodeData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface SimEdge extends GraphEdgeData {
  sourceNode?: SimNode;
  targetNode?: SimNode;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  suspect: { fill: "#ef4444", stroke: "#fca5a5", glow: "rgba(239,68,68,0.4)" },
  victim: { fill: "#3b82f6", stroke: "#93c5fd", glow: "rgba(59,130,246,0.3)" },
  money_mule: { fill: "#f97316", stroke: "#fdba74", glow: "rgba(249,115,22,0.4)" },
  phone_number: { fill: "#a855f7", stroke: "#d8b4fe", glow: "rgba(168,85,247,0.3)" },
  bank_account: { fill: "#14b8a6", stroke: "#5eead4", glow: "rgba(20,184,166,0.3)" },
};

const EDGE_COLORS: Record<string, string> = {
  transaction: "#f97316",
  call: "#a855f7",
  sms: "#3b82f6",
  linked_account: "#64748b",
  reported_by: "#22d3ee",
};

const NODE_ICONS: Record<string, string> = {
  suspect: "⚠",
  victim: "👤",
  money_mule: "💰",
  phone_number: "📞",
  bank_account: "🏦",
};

const NODE_RADIUS: Record<string, number> = {
  suspect: 24,
  victim: 18,
  money_mule: 20,
  phone_number: 16,
  bank_account: 18,
};

// Demo fallback data
const DEMO_NODES: GraphNodeData[] = [
  { id: "S001", label: "Rajesh Kumar (Fake CBI)", node_type: "suspect", risk_level: "critical", metadata: { cases_linked: 14 } },
  { id: "S002", label: "Unknown VoIP Caller", node_type: "suspect", risk_level: "high", metadata: { cases_linked: 7 } },
  { id: "S003", label: "Syndicate HQ", node_type: "suspect", risk_level: "critical", metadata: { estimated_members: 25 } },
  { id: "M001", label: "HDFC ****4521", node_type: "money_mule", risk_level: "high", metadata: { total_received: 2850000 } },
  { id: "M002", label: "SBI ****8837", node_type: "money_mule", risk_level: "high", metadata: { total_received: 1200000 } },
  { id: "M003", label: "Crypto 0xA3f...", node_type: "money_mule", risk_level: "critical", metadata: { total_received: 8900000 } },
  { id: "V001", label: "Anita Sharma", node_type: "victim", risk_level: "low", metadata: { amount_lost: 450000, city: "Delhi" } },
  { id: "V002", label: "Pradeep Gupta", node_type: "victim", risk_level: "low", metadata: { amount_lost: 780000, city: "Mumbai" } },
  { id: "V003", label: "Sunita Patel", node_type: "victim", risk_level: "low", metadata: { amount_lost: 320000, city: "Bangalore" } },
  { id: "V004", label: "Ramesh Iyer", node_type: "victim", risk_level: "low", metadata: { amount_lost: 1200000, city: "Chennai" } },
  { id: "P001", label: "CBI Spoof Number", node_type: "phone_number", risk_level: "critical", metadata: { times_used: 47 } },
  { id: "P002", label: "Burner Phone", node_type: "phone_number", risk_level: "high", metadata: { active_days: 3 } },
  { id: "P003", label: "UK VoIP", node_type: "phone_number", risk_level: "high", metadata: { country: "UK" } },
];

const DEMO_EDGES: GraphEdgeData[] = [
  { id: "E001", source: "P001", target: "V001", edge_type: "call", amount: null, description: "Spoofed CBI call", flagged: true },
  { id: "E002", source: "P001", target: "V002", edge_type: "call", amount: null, description: "Threatened arrest", flagged: true },
  { id: "E003", source: "P002", target: "V003", edge_type: "call", amount: null, description: "Bank impersonation", flagged: true },
  { id: "E004", source: "P003", target: "V004", edge_type: "call", amount: null, description: "Fake Interpol", flagged: true },
  { id: "E005", source: "S001", target: "P001", edge_type: "linked_account", amount: null, description: "Operates number", flagged: true },
  { id: "E006", source: "S002", target: "P002", edge_type: "linked_account", amount: null, description: "Burner phone", flagged: true },
  { id: "E007", source: "S002", target: "P003", edge_type: "linked_account", amount: null, description: "VoIP line", flagged: true },
  { id: "E008", source: "V001", target: "M001", edge_type: "transaction", amount: 450000, description: "Under duress", flagged: true },
  { id: "E009", source: "V002", target: "M001", edge_type: "transaction", amount: 780000, description: "Multiple transfers", flagged: true },
  { id: "E010", source: "V003", target: "M002", edge_type: "transaction", amount: 320000, description: "Single transfer", flagged: true },
  { id: "E011", source: "V004", target: "M002", edge_type: "transaction", amount: 500000, description: "First installment", flagged: true },
  { id: "E012", source: "V004", target: "M003", edge_type: "transaction", amount: 700000, description: "Crypto transfer", flagged: true },
  { id: "E013", source: "M001", target: "M003", edge_type: "transaction", amount: 1100000, description: "Forwarded to crypto", flagged: true },
  { id: "E014", source: "M002", target: "M003", edge_type: "transaction", amount: 750000, description: "Consolidated", flagged: true },
  { id: "E015", source: "M003", target: "S003", edge_type: "transaction", amount: 3500000, description: "Final extraction", flagged: true },
  { id: "E016", source: "V001", target: "S001", edge_type: "reported_by", amount: null, description: "Identified voice", flagged: false },
  { id: "E017", source: "V002", target: "S001", edge_type: "reported_by", amount: null, description: "Same MO", flagged: false },
];

export default function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<SimEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ w: 900, h: 600 });
  const [isSimulating, setIsSimulating] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);

  // Initialize graph data
  useEffect(() => {
    apiGet<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }>("/api/analytics/graph")
      .then((data) => initializeSimulation(data.nodes, data.edges))
      .catch(() => initializeSimulation(DEMO_NODES, DEMO_EDGES));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          w: entry.contentRect.width,
          h: Math.max(entry.contentRect.height, 500),
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const initializeSimulation = useCallback(
    (rawNodes: GraphNodeData[], rawEdges: GraphEdgeData[]) => {
      const cx = dimensions.w / 2;
      const cy = dimensions.h / 2;

      const simNodes: SimNode[] = rawNodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / rawNodes.length;
        const radius = 150 + Math.random() * 100;
        return {
          ...n,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          fx: null,
          fy: null,
        };
      });

      const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

      const simEdges: SimEdge[] = rawEdges.map((e) => ({
        ...e,
        sourceNode: nodeMap.get(e.source),
        targetNode: nodeMap.get(e.target),
      }));

      nodesRef.current = simNodes;
      edgesRef.current = simEdges;
      setNodes([...simNodes]);
      setEdges([...simEdges]);
      setIsSimulating(true);
    },
    [dimensions]
  );

  // Force simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    let iterations = 0;
    const maxIterations = 300;
    const alpha = 0.3;
    const decay = 0.995;

    function tick() {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const cx = dimensions.w / 2;
      const cy = dimensions.h / 2;
      let currentAlpha = alpha * Math.pow(decay, iterations);

      if (iterations >= maxIterations || currentAlpha < 0.001) {
        setIsSimulating(false);
        return;
      }

      // Center gravity
      for (const node of currentNodes) {
        if (node.fx !== null && node.fy !== null) continue;
        node.vx += (cx - node.x) * 0.001;
        node.vy += (cy - node.y) * 0.001;
      }

      // Repulsion between nodes
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 80;
          if (dist < minDist) dist = minDist;
          const force = (800 / (dist * dist)) * currentAlpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (a.fx === null) { a.vx -= fx; }
          if (a.fy === null) { a.vy -= fy; }
          if (b.fx === null) { b.vx += fx; }
          if (b.fy === null) { b.vy += fy; }
        }
      }

      // Edge spring forces
      for (const edge of currentEdges) {
        const source = edge.sourceNode;
        const target = edge.targetNode;
        if (!source || !target) continue;

        let dx = target.x - source.x;
        let dy = target.y - source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealLength = 140;
        const force = ((dist - idealLength) / dist) * 0.05 * currentAlpha;
        const fx = dx * force;
        const fy = dy * force;

        if (source.fx === null) { source.vx += fx; }
        if (source.fy === null) { source.vy += fy; }
        if (target.fx === null) { target.vx -= fx; }
        if (target.fy === null) { target.vy -= fy; }
      }

      // Update positions
      for (const node of currentNodes) {
        if (node.fx !== null && node.fy !== null) {
          node.x = node.fx;
          node.y = node.fy;
          node.vx = 0;
          node.vy = 0;
          continue;
        }
        node.vx *= 0.6;
        node.vy *= 0.6;
        node.x += node.vx;
        node.y += node.vy;
        // Boundary constraints
        const pad = 40;
        node.x = Math.max(pad, Math.min(dimensions.w - pad, node.x));
        node.y = Math.max(pad, Math.min(dimensions.h - pad, node.y));
      }

      iterations++;
      setNodes([...currentNodes]);
      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSimulating, dimensions]);

  // Drag handlers
  const handleNodeMouseDown = useCallback(
    (node: SimNode, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      node.fx = node.x;
      node.fy = node.y;
      setDraggedNode(node);
    },
    []
  );

  useEffect(() => {
    if (!draggedNode) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current || !draggedNode) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;
      draggedNode.fx = x;
      draggedNode.fy = y;
      draggedNode.x = x;
      draggedNode.y = y;
      setNodes([...nodesRef.current]);
    };

    const handleMouseUp = () => {
      if (draggedNode) {
        draggedNode.fx = null;
        draggedNode.fy = null;
        setDraggedNode(null);
        setIsSimulating(true);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedNode, zoom, offset]);

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) =>
      direction === "in" ? Math.min(prev * 1.2, 3) : Math.max(prev / 1.2, 0.3)
    );
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    initializeSimulation(
      nodes.map(({ x, y, vx, vy, fx, fy, ...rest }) => rest),
      edges.map(({ sourceNode, targetNode, ...rest }) => rest)
    );
  };

  const handleExport = (format: "json" | "csv") => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = `${apiBase}/api/analytics/graph/export?format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `scamshield_graph.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredNodes = selectedFilter
    ? nodes.filter((n) => n.node_type === selectedFilter)
    : nodes;
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = selectedFilter
    ? edges.filter(
        (e) =>
          filteredNodeIds.has(e.source) || filteredNodeIds.has(e.target)
      )
    : edges;

  const nodeTypes = Array.from(new Set(nodes.map((n) => n.node_type)));

  return (
    <div className="glass-card flex flex-col" style={{ minHeight: 650 }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
            <Network className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Fraud Network Graph
            </h3>
            <p className="text-[11px] text-slate-500">
              {nodes.length} nodes · {edges.length} connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-zoom-in"
            onClick={() => handleZoom("in")}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-white"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            id="btn-zoom-out"
            onClick={() => handleZoom("out")}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-white"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            id="btn-graph-reset"
            onClick={handleReset}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:text-white"
            title="Reset view"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              id="btn-graph-export"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <div className="absolute right-0 top-full z-20 mt-1 hidden group-hover:block w-28 rounded-xl border border-white/10 bg-navy-900/95 py-1 shadow-xl backdrop-blur-xl">
              <button
                id="btn-export-json"
                onClick={() => handleExport("json")}
                className="block w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white"
              >
                JSON
              </button>
              <button
                id="btn-export-csv"
                onClick={() => handleExport("csv")}
                className="block w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <button
          id="filter-all"
          onClick={() => setSelectedFilter(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            !selectedFilter
              ? "bg-white/10 text-white"
              : "bg-white/5 text-slate-500 hover:text-slate-300"
          )}
        >
          All
        </button>
        {nodeTypes.map((type) => {
          const colors = NODE_COLORS[type] || NODE_COLORS.suspect;
          const isActive = selectedFilter === type;
          return (
            <button
              key={type}
              id={`filter-${type}`}
              onClick={() => setSelectedFilter(isActive ? null : type)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
                isActive
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
              style={{
                backgroundColor: isActive ? `${colors.fill}20` : "rgba(255,255,255,0.03)",
                borderWidth: 1,
                borderColor: isActive ? `${colors.fill}40` : "rgba(255,255,255,0.06)",
              }}
            >
              <span>{NODE_ICONS[type]}</span>
              {type.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ minHeight: 500 }}>
        <svg
          ref={svgRef}
          width={dimensions.w}
          height={dimensions.h}
          className="w-full"
          style={{ cursor: draggedNode ? "grabbing" : "default" }}
        >
          <defs>
            {/* Arrow markers for each edge type */}
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <marker
                key={type}
                id={`arrow-${type}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity={0.6} />
              </marker>
            ))}

            {/* Glow filters for node types */}
            {Object.entries(NODE_COLORS).map(([type, colors]) => (
              <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={colors.glow} result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
            {/* Edges */}
            {filteredEdges.map((edge) => {
              const source = nodesRef.current.find((n) => n.id === edge.source);
              const target = nodesRef.current.find((n) => n.id === edge.target);
              if (!source || !target) return null;

              const color = EDGE_COLORS[edge.edge_type] || "#64748b";
              const isHighlighted =
                hoveredNode &&
                (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

              // Calculate edge endpoint offset for arrow
              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const targetR = NODE_RADIUS[target.node_type] || 18;
              const endX = target.x - (dx / dist) * (targetR + 4);
              const endY = target.y - (dy / dist) * (targetR + 4);

              return (
                <g key={edge.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={endX}
                    y2={endY}
                    stroke={color}
                    strokeWidth={isHighlighted ? 2.5 : edge.flagged ? 1.5 : 1}
                    strokeOpacity={isHighlighted ? 0.9 : 0.35}
                    markerEnd={`url(#arrow-${edge.edge_type})`}
                    strokeDasharray={edge.edge_type === "reported_by" ? "4 4" : undefined}
                  />
                  {/* Amount label on transaction edges */}
                  {edge.amount && edge.amount > 0 && (
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 - 8}
                      textAnchor="middle"
                      fill={color}
                      fontSize="9"
                      fontWeight="600"
                      opacity={isHighlighted ? 1 : 0.5}
                    >
                      {formatCurrency(edge.amount)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const colors = NODE_COLORS[node.node_type] || NODE_COLORS.suspect;
              const radius = NODE_RADIUS[node.node_type] || 18;
              const isHovered = hoveredNode?.id === node.id;
              const icon = NODE_ICONS[node.node_type] || "●";

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(node, e)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "grab" }}
                >
                  {/* Outer glow ring for critical/high risk */}
                  {(node.risk_level === "critical" || node.risk_level === "high") && (
                    <circle
                      r={radius + 6}
                      fill="none"
                      stroke={colors.fill}
                      strokeWidth={1}
                      strokeOpacity={0.2}
                      className={node.risk_level === "critical" ? "animate-pulse" : ""}
                    />
                  )}

                  {/* Main circle */}
                  <circle
                    r={isHovered ? radius + 3 : radius}
                    fill={`${colors.fill}20`}
                    stroke={colors.fill}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    filter={isHovered ? `url(#glow-${node.node_type})` : undefined}
                    className="transition-all duration-200"
                  />

                  {/* Icon */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={radius * 0.7}
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {icon}
                  </text>

                  {/* Label */}
                  <text
                    y={radius + 14}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="500"
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {node.label.length > 20
                      ? node.label.slice(0, 18) + "…"
                      : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-10 glass-card p-3 animate-fade-in"
            style={{
              left: Math.min(hoveredNode.x * zoom + offset.x + 20, dimensions.w - 260),
              top: Math.min(hoveredNode.y * zoom + offset.y - 20, dimensions.h - 120),
              maxWidth: 240,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{NODE_ICONS[hoveredNode.node_type]}</span>
              <div>
                <p className="text-xs font-semibold text-white">{hoveredNode.label}</p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {hoveredNode.node_type.replace("_", " ")} · {hoveredNode.risk_level}
                </p>
              </div>
            </div>
            {Object.keys(hoveredNode.metadata).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {Object.entries(hoveredNode.metadata).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px]">
                    <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="text-slate-300 font-mono">
                      {typeof v === "number" && v > 10000
                        ? formatCurrency(v)
                        : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] px-5 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Legend:
        </span>
        {Object.entries(NODE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: colors.fill }}
            />
            <span className="text-[10px] capitalize text-slate-500">
              {type.replace("_", " ")}
            </span>
          </div>
        ))}
        <div className="mx-2 h-3 w-px bg-white/10" />
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="h-0.5 w-4" style={{ backgroundColor: color }} />
            <span className="text-[10px] capitalize text-slate-500">
              {type.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
