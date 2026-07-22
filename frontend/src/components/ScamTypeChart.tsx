"use client";

import React, { useEffect, useRef, useState } from "react";
import { PieChart } from "lucide-react";

interface ScamTypeStat {
  type: string;
  count: number;
  label: string;
  color: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; fill: string }
> = {
  digital_arrest: { label: "Digital Arrest", color: "#ef4444", fill: "rgba(239,68,68,0.8)" },
  phishing: { label: "Phishing", color: "#f97316", fill: "rgba(249,115,22,0.8)" },
  financial_fraud: { label: "Financial Fraud", color: "#eab308", fill: "rgba(234,179,8,0.8)" },
  impersonation: { label: "Impersonation", color: "#a855f7", fill: "rgba(168,85,247,0.8)" },
  other: { label: "Other", color: "#64748b", fill: "rgba(100,116,139,0.8)" },
};

const DEMO_STATS: ScamTypeStat[] = [
  { type: "digital_arrest", count: 48, label: "Digital Arrest", color: "#ef4444" },
  { type: "phishing", count: 32, label: "Phishing", color: "#f97316" },
  { type: "financial_fraud", count: 24, label: "Financial Fraud", color: "#eab308" },
  { type: "impersonation", count: 16, label: "Impersonation", color: "#a855f7" },
  { type: "other", count: 8, label: "Other", color: "#64748b" },
];

export default function ScamTypeChart() {
  const [stats, setStats] = useState<ScamTypeStat[]>(DEMO_STATS);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [animated, setAnimated] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    // Try fetching real data
    fetch(`${apiBase}/api/analytics/reports`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.reports) return;
        const counts: Record<string, number> = {};
        for (const r of data.reports) {
          counts[r.report_type] = (counts[r.report_type] || 0) + 1;
        }
        if (Object.keys(counts).length === 0) return;
        const derived: ScamTypeStat[] = Object.entries(counts).map(
          ([type, count]) => ({
            type,
            count: count as number,
            label: TYPE_CONFIG[type]?.label ?? type,
            color: TYPE_CONFIG[type]?.color ?? "#64748b",
          })
        );
        setStats(derived);
      })
      .catch(() => {});

    setTimeout(() => setAnimated(true), 200);
  }, [apiBase]);

  const total = stats.reduce((s, d) => s + d.count, 0) || 1;
  const CX = 80;
  const CY = 80;
  const R = 65;
  const INNER_R = 40;

  // Build donut segments
  let cumAngle = -Math.PI / 2;
  const segments = stats.map((s) => {
    const fraction = s.count / total;
    const startAngle = cumAngle;
    const endAngle = cumAngle + fraction * 2 * Math.PI;
    cumAngle = endAngle;

    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);

    const ix1 = CX + INNER_R * Math.cos(startAngle);
    const iy1 = CY + INNER_R * Math.sin(startAngle);
    const ix2 = CX + INNER_R * Math.cos(endAngle);
    const iy2 = CY + INNER_R * Math.sin(endAngle);

    const largeArc = fraction > 0.5 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");

    return { ...s, d, fraction };
  });

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
          <PieChart className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Scam Type Breakdown</h3>
          <p className="text-[10px] text-slate-500">Distribution by category</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Donut SVG */}
        <svg
          viewBox="0 0 160 160"
          className="w-36 h-36 shrink-0"
          style={{
            transform: animated ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.8s ease",
          }}
        >
          {segments.map((seg) => (
            <path
              key={seg.type}
              d={seg.d}
              fill={seg.color}
              opacity={hoveredType === null || hoveredType === seg.type ? 0.85 : 0.35}
              className="cursor-pointer transition-opacity duration-200"
              style={{
                filter:
                  hoveredType === seg.type
                    ? `drop-shadow(0 0 6px ${seg.color})`
                    : "none",
                transformOrigin: `${CX}px ${CY}px`,
                transform: hoveredType === seg.type ? "scale(1.05)" : "scale(1)",
                transition: "transform 0.2s ease, opacity 0.2s ease",
              }}
              onMouseEnter={() => setHoveredType(seg.type)}
              onMouseLeave={() => setHoveredType(null)}
            />
          ))}
          {/* Center text */}
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            fill="white"
            fontSize={18}
            fontWeight="bold"
          >
            {hoveredType
              ? stats.find((s) => s.type === hoveredType)?.count ?? total
              : total}
          </text>
          <text
            x={CX}
            y={CY + 10}
            textAnchor="middle"
            fill="rgba(148,163,184,0.7)"
            fontSize={8}
          >
            {hoveredType
              ? TYPE_CONFIG[hoveredType]?.label ?? hoveredType
              : "total reports"}
          </text>
        </svg>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-[120px]">
          {stats.map((s) => (
            <div
              key={s.type}
              className="flex items-center justify-between gap-2 cursor-pointer"
              onMouseEnter={() => setHoveredType(s.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                  {s.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-white">
                  {s.count}
                </span>
                <span className="text-[10px] text-slate-600">
                  ({((s.count / total) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
