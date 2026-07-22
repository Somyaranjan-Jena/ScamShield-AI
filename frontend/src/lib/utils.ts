// ── ScamShield AI — Frontend Utility Functions ─────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// ── className merge helper ─────────────────────────────────────
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── API helpers ────────────────────────────────────────────────
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Formatting helpers ─────────────────────────────────────────
export function formatCurrency(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

// ── Risk helpers ───────────────────────────────────────────────
export function getRiskLevel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getRiskColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-amber-400";
  return "text-emerald-400";
}

export function getRiskBgColor(score: number): string {
  if (score >= 80) return "bg-red-500/15";
  if (score >= 60) return "bg-orange-500/15";
  if (score >= 40) return "bg-amber-500/15";
  return "bg-emerald-500/15";
}

export function getRiskBorderColor(score: number): string {
  if (score >= 80) return "border-red-500/40";
  if (score >= 60) return "border-orange-500/40";
  if (score >= 40) return "border-amber-500/40";
  return "border-emerald-500/40";
}

export function getRiskLabel(score: number): string {
  if (score >= 80) return "CRITICAL RISK";
  if (score >= 60) return "HIGH RISK";
  if (score >= 40) return "MEDIUM RISK";
  return "LOW RISK";
}

// ── Demo scam script (for live call simulation) ────────────────
export const DEMO_SCAM_SCRIPT = [
  {
    speaker: "Scammer",
    text: "Hello, this is Officer Rajesh Sharma calling from the Cyber Crime Division of Mumbai Police.",
    delay: 2000,
  },
  {
    speaker: "Scammer",
    text: "We have detected suspicious activity on your Aadhaar number linked to multiple bank accounts used for money laundering.",
    delay: 3500,
  },
  {
    speaker: "Victim",
    text: "What? That's impossible, I haven't done anything wrong!",
    delay: 2000,
  },
  {
    speaker: "Scammer",
    text: "Sir, this is a very serious matter. A case has been registered under Section 420 of the IPC. You are under digital arrest.",
    delay: 3000,
  },
  {
    speaker: "Scammer",
    text: "You must NOT disconnect this call or inform anyone. If you do, we will issue an immediate arrest warrant.",
    delay: 3000,
  },
  {
    speaker: "Victim",
    text: "Oh my god, please don't arrest me. What should I do?",
    delay: 2000,
  },
  {
    speaker: "Scammer",
    text: "To verify your innocence, you need to transfer ₹2,50,000 to the Supreme Court's secure account for investigation purposes.",
    delay: 3500,
  },
  {
    speaker: "Scammer",
    text: "This amount will be refunded within 24 hours once your name is cleared. I'll share the UPI details now.",
    delay: 3000,
  },
  {
    speaker: "Victim",
    text: "₹2.5 lakhs? I don't have that much money...",
    delay: 2000,
  },
  {
    speaker: "Scammer",
    text: "Then transfer whatever you can immediately. Every minute of delay increases your sentence. The CBI director is monitoring this case personally.",
    delay: 3500,
  },
];
