// ── ScamShield AI — Rewards / Gamification System ──────────────

export type Tier = "bronze" | "silver" | "gold" | "diamond";

export interface Rewards {
  points: number;
  tier: Tier;
  totalReports: number;
  totalAnalyses: number;
  totalShares: number;
}

const STORAGE_KEY = "scamshield-rewards";

export const TIER_COLORS: Record<Tier, string> = {
  bronze: "text-amber-600",
  silver: "text-slate-400",
  gold: "text-amber-400",
  diamond: "text-cyan-400",
};

export const TIER_ICONS: Record<Tier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  diamond: "💎",
};

export const NEXT_TIER_POINTS: Record<Tier, number | null> = {
  bronze: 500,
  silver: 2000,
  gold: 5000,
  diamond: null, // max
};

const TIER_THRESHOLDS: [number, Tier][] = [
  [5000, "diamond"],
  [2000, "gold"],
  [500, "silver"],
  [0, "bronze"],
];

function computeTier(points: number): Tier {
  for (const [threshold, tier] of TIER_THRESHOLDS) {
    if (points >= threshold) return tier;
  }
  return "bronze";
}

const POINT_VALUES: Record<string, number> = {
  analysis: 10,
  report: 25,
  share: 15,
  quiz_correct: 20,
  quiz_complete: 50,
};

export function getRewards(): Rewards {
  if (typeof window === "undefined") {
    return { points: 0, tier: "bronze", totalReports: 0, totalAnalyses: 0, totalShares: 0 };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Rewards;
  } catch {}
  return { points: 0, tier: "bronze", totalReports: 0, totalAnalyses: 0, totalShares: 0 };
}

function saveRewards(r: Rewards) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

export function addPoints(action: string): Rewards {
  const r = getRewards();
  const pts = POINT_VALUES[action] || 5;
  r.points += pts;
  r.tier = computeTier(r.points);

  if (action === "analysis") r.totalAnalyses++;
  if (action === "report") r.totalReports++;
  if (action === "share") r.totalShares++;

  saveRewards(r);
  return r;
}
