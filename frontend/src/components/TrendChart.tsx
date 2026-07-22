"use client";

import React, { useEffect, useRef, useState } from "react";
import { TrendingUp, BarChart2 } from "lucide-react";

interface TrendPoint {
  label: string;
  digital_arrest: number;
  phishing: number;
  financial_fraud: number;
  impersonation: number;
  other: number;
}

// Demo trend data — will be replaced by API when available
const DEMO_TREND: TrendPoint[] = [
  { label: "Mon", digital_arrest: 8, phishing: 12, financial_fraud: 5, impersonation: 3, other: 2 },
  { label: "Tue", digital_arrest: 14, phishing: 9, financial_fraud: 8, impersonation: 6, other: 3 },
  { label: "Wed", digital_arrest: 11, phishing: 15, financial_fraud: 7, impersonation: 4, other: 5 },
  { label: "Thu", digital_arrest: 19, phishing: 11, financial_fraud: 12, impersonation: 8, other: 4 },
  { label: "Fri", digital_arrest: 24, phishing: 18, financial_fraud: 9, impersonation: 11, other: 7 },
  { label: "Sat", digital_arrest: 31, phishing: 22, financial_fraud: 15, impersonation: 14, other: 9 },
  { label: "Sun", digital_arrest: 28, phishing: 19, financial_fraud: 13, impersonation: 9, other: 6 },
];

const SERIES = [
  { key: "digital_arrest", label: "Digital Arrest", color: "#ef4444" },
  { key: "phishing", label: "Phishing", color: "#f97316" },
  { key: "financial_fraud", label: "Financial Fraud", color: "#eab308" },
  { key: "impersonation", label: "Impersonation", color: "#a855f7" },
  { key: "other", label: "Other", color: "#64748b" },
] as const;

export default function TrendChart() {
  const [data, setData] = useState<TrendPoint[]>(DEMO_TREND);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    point: TrendPoint;
    series: string;
    value: number;
  } | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    // Try to fetch real trend data
    fetch(`${apiBase}/api/analytics/trends?period=7d`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data && Array.isArray(d.data)) setData(d.data);
      })
      .catch(() => {}); // Fall back to demo data

    const t = setTimeout(() => setDrawn(true), 100);
    return () => clearTimeout(t);
  }, [apiBase]);

  const W = 600;
  const H = 200;
  const PADDING = { top: 15, right: 20, bottom: 30, left: 35 };
  const plotW = W - PADDING.left - PADDING.right;
  const plotH = H - PADDING.top - PADDING.bottom;

  const maxVal = Math.max(
    ...data.flatMap((d) => SERIES.map((s) => d[s.key] as number))
  );

  const xScale = (i: number) => PADDING.left + (i / (data.length - 1)) * plotW;
  const yScale = (v: number) => PADDING.top + plotH - (v / (maxVal || 1)) * plotH;

  const makePath = (key: (typeof SERIES)[number]["key"]) => {
    if (data.length === 0) return "";
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d[key] as number)}`)
      .join(" ");
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <BarChart2 className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Weekly Scam Trends</h3>
            <p className="text-[10px] text-slate-500">Reports by category — last 7 days</p>
          </div>
        </div>
        <TrendingUp className="h-4 w-4 text-red-400" />
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 280 }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING.top + plotH * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={PADDING.left + plotW}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                />
                <text
                  x={PADDING.left - 4}
                  y={y + 4}
                  fill="rgba(148,163,184,0.6)"
                  fontSize={9}
                  textAnchor="end"
                >
                  {Math.round(maxVal * ratio)}
                </text>
              </g>
            );
          })}

          {/* X labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={xScale(i)}
              y={H - 5}
              fill="rgba(148,163,184,0.6)"
              fontSize={9}
              textAnchor="middle"
            >
              {d.label}
            </text>
          ))}

          {/* Series lines */}
          {SERIES.map((series) => {
            const path = makePath(series.key);
            const pathLength = svgRef.current
              ? (() => {
                  try {
                    const el = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "path"
                    );
                    el.setAttribute("d", path);
                    return el.getTotalLength() || 1000;
                  } catch {
                    return 1000;
                  }
                })()
              : 1000;

            return (
              <g key={series.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                  style={
                    drawn
                      ? { strokeDasharray: "none" }
                      : {
                          strokeDasharray: pathLength,
                          strokeDashoffset: pathLength,
                          animation: `draw-line 1.2s ease forwards`,
                        }
                  }
                />
                {/* Dots */}
                {data.map((d, i) => (
                  <circle
                    key={i}
                    cx={xScale(i)}
                    cy={yScale(d[series.key] as number)}
                    r={3}
                    fill={series.color}
                    opacity={0.9}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const svgRect = svgRef.current?.getBoundingClientRect();
                      if (!svgRect) return;
                      setHoveredPoint({
                        x: xScale(i),
                        y: yScale(d[series.key] as number),
                        point: d,
                        series: series.label,
                        value: d[series.key] as number,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredPoint && (
            <g>
              <rect
                x={Math.min(hoveredPoint.x - 40, W - 90)}
                y={Math.max(hoveredPoint.y - 35, PADDING.top)}
                width={80}
                height={28}
                rx={4}
                fill="#1e293b"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
              />
              <text
                x={Math.min(hoveredPoint.x - 40, W - 90) + 40}
                y={Math.max(hoveredPoint.y - 35, PADDING.top) + 12}
                fill="white"
                fontSize={9}
                textAnchor="middle"
                fontWeight="bold"
              >
                {hoveredPoint.series}
              </text>
              <text
                x={Math.min(hoveredPoint.x - 40, W - 90) + 40}
                y={Math.max(hoveredPoint.y - 35, PADDING.top) + 23}
                fill="rgba(148,163,184,1)"
                fontSize={9}
                textAnchor="middle"
              >
                {hoveredPoint.value} reports
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div
              className="h-2 w-4 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[10px] text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
