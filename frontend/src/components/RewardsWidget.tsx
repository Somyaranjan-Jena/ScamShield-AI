"use client";

import React, { useEffect, useState } from "react";
import { getRewards, TIER_COLORS, TIER_ICONS, NEXT_TIER_POINTS } from "@/lib/rewards";
import { Star } from "lucide-react";

export default function RewardsWidget() {
  const [rewards, setRewards] = useState({
    points: 0,
    tier: "bronze" as const,
    totalReports: 0,
    totalAnalyses: 0,
    totalShares: 0,
  });

  useEffect(() => {
    const r = getRewards();
    setRewards(r as any);
  }, []);

  const nextTier = NEXT_TIER_POINTS[rewards.tier];
  const progress = nextTier
    ? Math.min((rewards.points / nextTier) * 100, 100)
    : 100;

  return (
    <div className="glass-card p-3 mx-4 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-white">Rewards</span>
        </div>
        <span className={`text-sm font-bold ${TIER_COLORS[rewards.tier]}`}>
          {TIER_ICONS[rewards.tier]} {rewards.tier.charAt(0).toUpperCase() + rewards.tier.slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-between mb-1.5 text-[10px]">
        <span className="text-brand-cyan font-bold">{rewards.points} pts</span>
        {nextTier && (
          <span className="text-slate-500">{nextTier - rewards.points} to next tier</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-purple-500 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {nextTier === null && (
        <p className="mt-1 text-center text-[10px] text-amber-400">
          💎 Max tier reached!
        </p>
      )}
    </div>
  );
}
