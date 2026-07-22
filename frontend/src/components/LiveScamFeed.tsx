"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Shield,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedReport {
  id: string;
  report_type: string;
  ai_verdict: string;
  risk_score: number;
  status: string;
  created_at: string;
  suspect_contact?: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  digital_arrest: "Digital Arrest",
  phishing: "Phishing",
  financial_fraud: "Financial Fraud",
  impersonation: "Impersonation",
  other: "Other",
};

const RISK_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  confirmed_fraud: {
    label: "CONFIRMED",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "glow-red",
  },
  investigating: {
    label: "INVESTIGATING",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "glow-amber",
  },
  pending: {
    label: "PENDING",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "",
  },
  dismissed: {
    label: "DISMISSED",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    glow: "",
  },
};

function FeedCard({
  report,
  isNew,
}: {
  report: FeedReport;
  isNew: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const config = RISK_CONFIG[report.status] ?? RISK_CONFIG.pending;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div
      className={cn(
        "glass-card border p-4 transition-all duration-500",
        config.border,
        config.glow,
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-8 opacity-0",
        isNew && "ring-1 ring-brand-cyan/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider border",
                config.bg,
                config.border,
                config.color
              )}
            >
              {config.label}
            </span>
            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
              {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
            </span>
            {isNew && (
              <span className="rounded-full bg-brand-cyan/10 border border-brand-cyan/30 px-2 py-0.5 text-[10px] font-bold text-brand-cyan animate-pulse">
                NEW
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {report.ai_verdict || "No verdict available."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div
            className={cn(
              "text-lg font-bold",
              report.risk_score >= 75
                ? "text-red-400"
                : report.risk_score >= 50
                ? "text-amber-400"
                : report.risk_score >= 30
                ? "text-yellow-400"
                : "text-emerald-400"
            )}
          >
            {report.risk_score.toFixed(0)}
          </div>
          <div className="text-[9px] text-slate-600">risk score</div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-600">
        <Clock className="h-2.5 w-2.5" />
        <span>{timeAgo(report.created_at)}</span>
        {report.suspect_contact && (
          <>
            <span className="mx-1">·</span>
            <span className="truncate max-w-[120px]">
              {report.suspect_contact}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function LiveScamFeed() {
  const [reports, setReports] = useState<FeedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchReports = React.useCallback(async (isRefresh = false) => {
    try {
      const res = await fetch(`${apiBase}/api/analytics/reports`);
      if (!res.ok) return;
      const data = await res.json();
      const fetched: FeedReport[] = (data.reports ?? []).slice(0, 15);

      if (isRefresh) {
        const newSet = new Set(
          fetched
            .filter((r) => !prevIdsRef.current.has(r.id))
            .map((r) => r.id)
        );
        setNewIds(newSet);
        setTimeout(() => setNewIds(new Set()), 5000);
      }

      prevIdsRef.current = new Set(fetched.map((r) => r.id));
      setReports(fetched);
      setLastUpdate(new Date());
    } catch {}
    finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(() => fetchReports(true), 30000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Scam Feed</h3>
            <p className="text-[10px] text-slate-500">
              Updated {formatTime(lastUpdate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          <span className="text-[10px] text-red-400 font-medium">LIVE</span>
          <button
            onClick={() => fetchReports(true)}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-white/10 bg-white/5 shimmer"
            />
          ))
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-sm text-slate-400">No reports yet.</p>
            <p className="text-xs text-slate-600">
              Submit a fraud report to see it here.
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <FeedCard
              key={report.id}
              report={report}
              isNew={newIds.has(report.id)}
            />
          ))
        )}
      </div>

      {/* Stats bar */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-slate-600">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5" />
          {reports.length} reports shown
        </span>
        <span>Auto-refreshes every 30s</span>
      </div>
    </div>
  );
}
