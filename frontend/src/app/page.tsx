"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Radio,
  Network,
  MessageSquareWarning,
  ArrowRight,
  Zap,
  Eye,
  Lock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Radio,
    title: "Live Call Scam Shield",
    description:
      "Real-time AI analysis of ongoing calls. Detects coercion, urgency tactics, and impersonation patterns with a rolling risk score.",
    color: "text-brand-cyan",
    bgColor: "bg-brand-cyan/10",
    borderColor: "border-brand-cyan/20",
    glowClass: "glow-cyan",
    href: "/dashboard",
    tag: "REAL-TIME",
  },
  {
    icon: Network,
    title: "Fraud Network Analytics",
    description:
      "Interactive graph visualization mapping suspects, money mules, and victims. Trace the complete fraud chain in seconds.",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    glowClass: "",
    href: "/dashboard",
    tag: "INTELLIGENCE",
  },
  {
    icon: MessageSquareWarning,
    title: "Citizen Fraud Shield",
    description:
      "Paste any suspicious message and get an instant AI-powered verdict. One-click reporting to cyber crime authorities.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    glowClass: "",
    href: "/citizen-shield",
    tag: "ACCESSIBLE",
  },
];

const stats = [
  { value: "50K+", label: "Scams Detected", icon: AlertTriangle },
  { value: "₹32Cr", label: "Money Saved", icon: TrendingUp },
  { value: "99.2%", label: "Accuracy Rate", icon: CheckCircle2 },
  { value: "<2s", label: "Response Time", icon: Zap },
];

function AnimatedCounter({
  target,
  label,
}: {
  target: string;
  label: string;
}) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const numericPart = target.replace(/[^0-9.]/g, "");
    const suffix = target.replace(/[0-9.]/g, "");
    const targetNum = parseFloat(numericPart);

    if (isNaN(targetNum)) {
      setDisplay(target);
      return;
    }

    let startTime: number;
    const duration = 2000;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * eased;

      if (targetNum >= 100) {
        setDisplay(Math.floor(current) + suffix);
      } else {
        setDisplay(current.toFixed(1) + suffix);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(target);
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 500);

    return () => clearTimeout(timer);
  }, [target]);

  return (
    <div className="text-center">
      <div className="text-3xl font-bold gradient-text">{display}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/3 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* Hero Section */}
        <div
          className={`mb-16 text-center transition-all duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Status Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/5 px-4 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-brand-cyan">
              AI Protection Active — All Systems Operational
            </span>
          </div>

          {/* Animated Shield */}
          <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-brand-cyan/20" />
            <div className="absolute inset-2 animate-pulse-glow rounded-full border border-brand-cyan/30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-cyan/10">
              <Shield className="h-10 w-10 text-brand-cyan" />
            </div>
          </div>

          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Scam
            <span className="gradient-text">Shield</span> AI
          </h1>

          <p className="mx-auto mb-4 max-w-2xl text-lg text-slate-400 sm:text-xl">
            Digital Public Safety Intelligence Platform
          </p>

          <p className="mx-auto mb-10 max-w-xl text-sm text-slate-500">
            AI-powered real-time detection of digital arrest scams, communication
            fraud, and financial scams. Protecting citizens with cutting-edge
            NLP analysis.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-base" id="cta-dashboard">
              <Radio className="h-4 w-4" />
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/citizen-shield"
              id="cta-citizen-shield"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition-all duration-300 hover:border-white/20 hover:bg-white/10"
            >
              <MessageSquareWarning className="h-4 w-4" />
              Check Suspicious Message
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div
          className={`mb-16 transition-all delay-300 duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="glass-card mx-auto max-w-3xl p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((stat, i) => (
                <AnimatedCounter
                  key={i}
                  target={stat.value}
                  label={stat.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div
          className={`mb-16 transition-all delay-500 duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-brand-cyan/70">
            Core Capabilities
          </h2>
          <p className="mb-10 text-center text-2xl font-bold text-white">
            Three Layers of Protection
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Link key={i} href={feature.href} className="group">
                  <div className="glass-card-hover h-full p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor} ${feature.borderColor} border ${feature.glowClass}`}
                      >
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <span
                        className={`rounded-full ${feature.bgColor} ${feature.borderColor} border px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${feature.color}`}
                      >
                        {feature.tag}
                      </span>
                    </div>

                    <h3 className="mb-2 text-lg font-bold text-white">
                      {feature.title}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-400">
                      {feature.description}
                    </p>

                    <div
                      className={`inline-flex items-center gap-1 text-sm font-medium ${feature.color} opacity-0 transition-all duration-300 group-hover:opacity-100`}
                    >
                      Explore
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trust Indicators */}
        <div
          className={`mb-12 transition-all delay-700 duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="glass-card mx-auto max-w-2xl p-6 text-center">
            <div className="mb-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Eye className="h-4 w-4 text-brand-cyan" />
                <span>Open Source</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Lock className="h-4 w-4 text-emerald-400" />
                <span>Privacy First</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Real-time AI</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Built with Hugging Face open-source AI models. No data stored. No paid APIs.
              100% transparent fraud detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
