"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Radio,
  Activity,
  Users,
  Rss,
  Map,
} from "lucide-react";
import LiveCallTracker from "@/components/LiveCallTracker";
import NetworkGraph from "@/components/NetworkGraph";
import LiveScamFeed from "@/components/LiveScamFeed";
import TrendChart from "@/components/TrendChart";
import ScamTypeChart from "@/components/ScamTypeChart";
import { apiGet, formatCurrency, formatNumber, cn } from "@/lib/utils";

interface PlatformStats {
  total_reports: number;
  confirmed_frauds: number;
  reports_today: number;
  flagged_calls: number;
  avg_risk_score: number;
  high_risk_nodes: number;
  scams_prevented: number;
  total_amount_saved: number;
}

const defaultStats: PlatformStats = {
  total_reports: 5,
  confirmed_frauds: 3,
  reports_today: 2,
  flagged_calls: 7,
  avg_risk_score: 89.7,
  high_risk_nodes: 5,
  scams_prevented: 3,
  total_amount_saved: 3200000,
};

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    cyan: { bg: "bg-brand-cyan/10", border: "border-brand-cyan/20", text: "text-brand-cyan", glow: "glow-cyan" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", glow: "glow-red" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", glow: "glow-amber" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", glow: "glow-emerald" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", glow: "" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", glow: "" },
  };

  const c = colorMap[color] || colorMap.cyan;

  return (
    <div
      className={cn(
        "glass-card p-5 transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className={cn("mt-2 text-2xl font-bold", c.text)}>{value}</p>
          {subValue && (
            <p className="mt-1 text-[11px] text-slate-500">{subValue}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", c.bg, c.border, "border", c.glow)}>
          <Icon className={cn("h-5 w-5", c.text)} />
        </div>
      </div>
    </div>
  );
}

type Tab = "live" | "graph" | "feed";

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats>(defaultStats);
  const [activeTab, setActiveTab] = useState<Tab>("live");

  useEffect(() => {
    apiGet<PlatformStats>("/api/analytics/stats")
      .then(setStats)
      .catch(() => setStats(defaultStats));
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/10 glow-cyan">
            <Activity className="h-5 w-5 text-brand-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Intelligence Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Real-time threat monitoring and fraud network analysis
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Shield} label="Total Reports" value={formatNumber(stats.total_reports)} color="cyan" delay={0} />
        <StatCard icon={AlertTriangle} label="Confirmed Fraud" value={formatNumber(stats.confirmed_frauds)} subValue={`${stats.reports_today ?? 0} today`} color="red" delay={100} />
        <StatCard icon={Radio} label="Flagged Calls" value={formatNumber(stats.flagged_calls)} color="amber" delay={200} />
        <StatCard icon={TrendingUp} label="Avg Risk Score" value={(stats.avg_risk_score ?? 0).toFixed(1)} color="purple" delay={300} />
        <StatCard icon={Users} label="High Risk Nodes" value={formatNumber(stats.high_risk_nodes)} color="blue" delay={400} />
        <StatCard icon={Shield} label="Amount Saved" value={formatCurrency(stats.total_amount_saved)} color="emerald" delay={500} />
      </div>

      {/* Analytics Row: Trend + Breakdown */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <TrendChart />
        <ScamTypeChart />
      </div>

      {/* Tab Switcher */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          id="tab-live-analysis"
          onClick={() => setActiveTab("live")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300",
            activeTab === "live"
              ? "border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan glow-cyan"
              : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
          )}
        >
          <Radio className="h-4 w-4" />
          Live Call Analysis
          <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
        </button>

        <button
          id="tab-network-graph"
          onClick={() => setActiveTab("graph")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300",
            activeTab === "graph"
              ? "border border-purple-500/30 bg-purple-500/10 text-purple-400"
              : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
          )}
        >
          <Activity className="h-4 w-4" />
          Fraud Network Graph
        </button>

        <button
          id="tab-live-feed"
          onClick={() => setActiveTab("feed")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300",
            activeTab === "feed"
              ? "border border-red-500/30 bg-red-500/10 text-red-400"
              : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
          )}
        >
          <Rss className="h-4 w-4" />
          Live Scam Feed
          <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-red-400" />
        </button>
      </div>

      {/* Main Content */}
      <div className="animate-fade-in">
        {activeTab === "live" && <LiveCallTracker />}
        {activeTab === "graph" && <NetworkGraph />}
        {activeTab === "feed" && <LiveScamFeed />}
      </div>
    </div>
  );
}
