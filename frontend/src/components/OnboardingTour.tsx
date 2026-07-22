"use client";

import React, { useEffect, useState } from "react";
import { Shield, Radio, Activity, MessageSquareWarning, FileText, X, ChevronRight } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  targetId?: string;
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to ScamShield AI 🛡️",
    description:
      "India's AI-powered digital fraud protection platform. Let's take a quick 30-second tour to show you what you can do here.",
    icon: Shield,
    color: "text-brand-cyan",
  },
  {
    id: "dashboard",
    title: "Intelligence Dashboard",
    description:
      "Monitor real-time scam reports, fraud network graphs, and live call analysis. See emerging threats as they happen.",
    icon: Activity,
    color: "text-purple-400",
    targetId: "nav-dashboard",
  },
  {
    id: "live-call",
    title: "Live Call Scam Shield",
    description:
      "Type or paste call transcripts in real-time. Our AI scores each chunk instantly and alerts you when scam patterns emerge.",
    icon: Radio,
    color: "text-brand-cyan",
    targetId: "tab-live-analysis",
  },
  {
    id: "citizen-shield",
    title: "Citizen Fraud Shield",
    description:
      "Paste any suspicious message — SMS, email, WhatsApp — and get an instant AI verdict with safety recommendations.",
    icon: MessageSquareWarning,
    color: "text-amber-400",
    targetId: "nav-citizen-shield",
  },
  {
    id: "report",
    title: "Report Scams Officially",
    description:
      "Submit fraud reports directly. Each submission is AI-analyzed and contributes to India's collective cyber intelligence.",
    icon: FileText,
    color: "text-emerald-400",
  },
];

const STORAGE_KEY = "scamshield_tour_done";

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        const t = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "1");
      }
    }, 300);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className={`fixed bottom-8 right-8 z-[60] w-80 glass-card border border-brand-cyan/20 p-5 shadow-2xl transition-all duration-300 ${
          closing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{ boxShadow: "0 0 40px rgba(34,211,238,0.15)" }}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-500 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicators */}
        <div className="mb-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-brand-cyan" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10`}
        >
          <Icon className={`h-6 w-6 ${current.color}`} />
        </div>

        {/* Content */}
        <h3 className="mb-2 text-base font-bold text-white">{current.title}</h3>
        <p className="text-xs leading-relaxed text-slate-400">
          {current.description}
        </p>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-2 text-xs font-semibold text-brand-cyan transition-all hover:bg-brand-cyan/20"
          >
            {step < STEPS.length - 1 ? (
              <>
                Next <ChevronRight className="h-3 w-3" />
              </>
            ) : (
              "Get Started 🚀"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
