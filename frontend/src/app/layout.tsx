"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Radio,
  MessageSquareWarning,
  Menu,
  X,
  Zap,
  Sun,
  Moon,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import "./globals.css";
import RewardsWidget from "@/components/RewardsWidget";
import OnboardingTour from "@/components/OnboardingTour";
import { ThemeProvider, useTheme } from "@/lib/theme";

// ── Navigation ─────────────────────────────────────────────────
const navigation = [
  { name: "Home", href: "/", icon: Shield },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Citizen Shield", href: "/citizen-shield", icon: MessageSquareWarning },
  { name: "Scam Quiz", href: "/quiz", icon: HelpCircle },
  { name: "API Docs", href: "/api-docs", icon: BookOpen },
];

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Mobile toggle */}
      <button
        id="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-white/10 bg-navy-900/90 p-2.5 backdrop-blur-xl lg:hidden"
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-slate-300" />
        ) : (
          <Menu className="h-5 w-5 text-slate-300" />
        )}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/[0.06] bg-navy-950/95 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-6">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/10 glow-cyan">
            <Shield className="h-5 w-5 text-brand-cyan" />
            <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              ScamShield
            </h1>
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-brand-cyan/70">
              <Zap className="h-2.5 w-2.5" />
              AI-Powered Protection
            </p>
          </div>
          {/* Theme toggle */}
          <button
            id="theme-toggle"
            onClick={toggle}
            className="ml-auto rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setMobileOpen(false)}
                className={isActive ? "nav-link-active" : "nav-link"}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.name}</span>
                {item.name === "Dashboard" && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-cyan/20 text-[10px] font-bold text-brand-cyan">
                    <Radio className="h-3 w-3 animate-pulse" />
                  </span>
                )}
                {item.name === "Scam Quiz" && (
                  <span className="ml-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Rewards widget */}
        <RewardsWidget />

        {/* Status Footer */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                AI Engine Active
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Real-time threat detection operational
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Root Layout ────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>ScamShield AI — Digital Public Safety Intelligence</title>
        <meta
          name="description"
          content="AI-powered platform to detect and prevent digital arrest scams, communication fraud, and financial scams in real-time. Free for all Indian citizens."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#22d3ee" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ScamShield" />
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>"
        />
      </head>
      <body className="bg-navy-950 text-slate-200">
        <ThemeProvider>
          <Sidebar />
          <main className="min-h-screen lg:pl-72">
            <div className="grid-bg min-h-screen">{children}</div>
          </main>
          <OnboardingTour />
        </ThemeProvider>
      </body>
    </html>
  );
}
