"use client";

import React, { useState } from "react";
import { MessageSquareWarning, Shield, Globe, Share2, ExternalLink } from "lucide-react";
import FraudShieldChat from "@/components/FraudShieldChat";
import { useTranslation, type Lang } from "@/lib/i18n";
import { addPoints } from "@/lib/rewards";
import { cn } from "@/lib/utils";

export default function CitizenShieldPage() {
  const [lang, setLang] = useState<Lang>("en");
  const { t } = useTranslation(lang);

  const handleShare = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "ScamShield AI — Fraud Alert",
          text,
          url: window.location.href,
        });
        addPoints("share");
      } else {
        await navigator.clipboard.writeText(text);
        alert("Result copied to clipboard!");
      }
    } catch {}
  };

  const waLink = (analysisText: string) => {
    const msg = encodeURIComponent(
      `⚠️ ScamShield AI Alert:\n\n${analysisText}\n\nCheck any suspicious message at: ${typeof window !== "undefined" ? window.location.origin : "https://scamshield.in"}/citizen-shield`
    );
    return `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 glow-amber">
            <MessageSquareWarning className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              {t("citizenShieldTitle")}
            </h1>
            <p className="text-sm text-slate-500">{t("citizenShieldSubtitle")}</p>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              id="lang-en"
              onClick={() => setLang("en")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                lang === "en"
                  ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              EN
            </button>
            <button
              id="lang-hi"
              onClick={() => setLang("hi")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                lang === "hi"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Globe className="h-3 w-3" />
              हिंदी
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 glass-card border border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">
              {t("tipTitle")}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t("tip")}</p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href="https://cybercrime.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          id="btn-cybercrime"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("reportButton")}
        </a>
        <a
          href={waLink("Please check this suspicious message on ScamShield AI")}
          target="_blank"
          rel="noopener noreferrer"
          id="btn-whatsapp"
          className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-all"
          onClick={() => addPoints("share")}
        >
          <Share2 className="h-3.5 w-3.5" />
          {t("whatsappButton")}
        </a>
        <a
          href="tel:1930"
          id="btn-helpline"
          className="flex items-center gap-2 rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-xs font-medium text-brand-cyan hover:bg-brand-cyan/20 transition-all"
        >
          📞 Helpline: 1930
        </a>
      </div>

      {/* Privacy Note */}
      <p className="mb-4 text-center text-[10px] text-slate-600">
        🔒 {t("privacyNote")}
      </p>

      {/* Chat Interface */}
      <FraudShieldChat lang={lang} onShare={handleShare} />
    </div>
  );
}
