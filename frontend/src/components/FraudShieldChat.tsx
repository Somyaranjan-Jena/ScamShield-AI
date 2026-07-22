"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Send,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Bot,
  User,
  FileWarning,
  Phone,
  Mail,
  MessageCircle,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  apiPost,
  cn,
  getRiskColor,
  getRiskBgColor,
  getRiskBorderColor,
  getRiskLabel,
  getRiskLevel,
} from "@/lib/utils";
import { addPoints } from "@/lib/rewards";
import type { Lang } from "@/lib/i18n";

interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  riskLevel?: string;
  riskScore?: number;
  verdict?: string;
  recommendations?: string[];
  isScam?: boolean;
}

interface AnalysisResponse {
  risk_score: {
    overall_score: number;
    coercion_score: number;
    urgency_score: number;
    phishing_score: number;
    threat_labels: string[];
    risk_level: string;
    explanation: string;
  };
  verdict: string;
  recommendations: string[];
  is_scam: boolean;
  confidence: number;
  url_threat_score?: number;
  flagged_urls?: string[];
  detected_language?: string;
}

interface FraudShieldChatProps {
  lang?: Lang;
  onShare?: (text: string) => void;
}

const QUICK_ACTIONS = [
  {
    icon: Phone,
    label: "Suspicious Call",
    prompt:
      "I received a call from someone claiming to be from CBI. They said my Aadhaar is linked to money laundering and I need to transfer money to a secure RBI account immediately or face arrest.",
  },
  {
    icon: Mail,
    label: "Phishing SMS",
    prompt:
      "Your SBI account has been blocked due to incomplete KYC. Update your details immediately to avoid permanent account closure: http://sbi-kyc-update.xyz/verify",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp Scam",
    prompt:
      "Hi! Your Amazon parcel is held at customs. Pay ₹2,499 customs duty via this UPI link to release it. Tracking: AMZ-8847261. Pay within 2 hours or it will be returned.",
  },
  {
    icon: CreditCard,
    label: "Investment Fraud",
    prompt:
      "Join our exclusive crypto trading group! We guarantee 40% monthly returns. Already 5000+ members earning passive income. Invest minimum ₹10,000 and start earning today! Join: t.me/cryptoprofit2024",
  },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 self-start animate-fade-in">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cyan/10">
        <Bot className="h-4 w-4 text-brand-cyan" />
      </div>
      <div className="chat-bubble-ai">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-bounce rounded-full bg-brand-cyan/60" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-brand-cyan/60" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-brand-cyan/60" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = getRiskColor(score);
  const bgColor = getRiskBgColor(score);
  const borderColor = getRiskBorderColor(score);
  const label = getRiskLabel(score);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: bgColor, color, border: `1px solid ${borderColor}` }}
    >
      {score >= 50 ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {label} ({Math.round(score)})
    </span>
  );
}

export default function FraudShieldChat({ lang = "en", onShare }: FraudShieldChatProps = {}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "system",
      content:
        "Welcome to Citizen Fraud Shield. Paste any suspicious message, SMS, or email below — or describe a suspicious call. I will analyze it instantly and provide a detailed verdict.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const analyzeMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isAnalyzing) return;

      const userMsg: ChatMsg = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsAnalyzing(true);
      scrollToBottom();

      try {
        const result = await apiPost<AnalysisResponse>("/api/analyze", {
          text: text.trim(),
        });

        const aiMsg: ChatMsg = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: result.verdict,
          timestamp: new Date(),
          riskLevel: result.risk_score.risk_level,
          riskScore: result.risk_score.overall_score,
          verdict: result.verdict,
          recommendations: result.recommendations,
          isScam: result.is_scam,
        };

        setMessages((prev) => [...prev, aiMsg]);
        // Award points for analysis
        addPoints("analysis");
      } catch {
        // Fallback: local heuristic analysis
        const fallbackResult = localAnalysis(text.trim());

        const aiMsg: ChatMsg = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: fallbackResult.verdict,
          timestamp: new Date(),
          riskLevel: fallbackResult.riskLevel,
          riskScore: fallbackResult.riskScore,
          verdict: fallbackResult.verdict,
          recommendations: fallbackResult.recommendations,
          isScam: fallbackResult.riskScore >= 50,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setIsAnalyzing(false);
        scrollToBottom();
      }
    },
    [isAnalyzing, scrollToBottom]
  );

  const localAnalysis = (text: string) => {
    const lower = text.toLowerCase();
    const keywords: Record<string, string[]> = {
      coercion: [
        "arrest", "warrant", "cbi", "police", "fir", "legal action",
        "jail", "non-bailable", "do not tell", "stay on the call",
        "cooperate", "court order", "interpol",
      ],
      urgency: [
        "immediately", "right now", "urgent", "last chance", "act now",
        "within", "expiring", "blocked", "suspended", "hurry",
        "before it is too late", "deadline",
      ],
      phishing: [
        "click", "link", "verify", "kyc", "otp", "password",
        "account details", "update", "confirm your", "login",
      ],
      financial: [
        "transfer", "upi", "pay", "investment", "returns", "guarantee",
        "double your money", "send money", "processing fee", "customs duty",
        "crypto", "bitcoin",
      ],
    };

    let score = 0;
    const labels: string[] = [];
    const recommendations: string[] = [];

    for (const [category, words] of Object.entries(keywords)) {
      const hits = words.filter((w) => lower.includes(w));
      if (hits.length > 0) {
        score += hits.length * 15;
        labels.push(category);
      }
    }
    score = Math.min(score, 100);

    const riskLevel = getRiskLevel(score);

    let verdict: string;
    if (score >= 75) {
      verdict = `🚨 CRITICAL ALERT (Score: ${score}/100): This message shows strong indicators of fraud. Detected patterns: ${labels.join(", ")}. Do NOT respond or share any information. Report to cybercrime.gov.in or call 1930 immediately.`;
      recommendations.push("Immediately block this contact.");
      recommendations.push("Report to National Cyber Crime Portal: cybercrime.gov.in");
      recommendations.push("Call Cyber Crime Helpline: 1930");
      recommendations.push("Do not click any links or share personal information.");
    } else if (score >= 50) {
      verdict = `⚠️ HIGH RISK (Score: ${score}/100): Multiple suspicious indicators found: ${labels.join(", ")}. This is likely a scam. Do not engage or share personal details.`;
      recommendations.push("Do not respond to this message.");
      recommendations.push("Verify through official channels only.");
      recommendations.push("Report if you believe this is fraud.");
    } else if (score >= 30) {
      verdict = `⚡ MODERATE RISK (Score: ${score}/100): Some suspicious patterns detected: ${labels.join(", ")}. Exercise caution and verify independently.`;
      recommendations.push("Verify this communication through official channels.");
      recommendations.push("Do not share personal or financial information.");
    } else {
      verdict = `✅ LOW RISK (Score: ${score}/100): No significant scam indicators detected. However, always remain cautious with unsolicited communications.`;
      recommendations.push("This appears relatively safe, but stay vigilant.");
      recommendations.push("Never share OTP or passwords with anyone.");
    }

    return { verdict, riskLevel, riskScore: score, recommendations };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      analyzeMessage(input);
    }
  };

  const generateReportText = (msg: ChatMsg): string => {
    return (
      `[ScamShield AI — Fraud Report]\n` +
      `Date: ${msg.timestamp.toLocaleString()}\n` +
      `Risk Level: ${msg.riskLevel?.toUpperCase()} (${msg.riskScore}/100)\n` +
      `Scam Detected: ${msg.isScam ? "YES" : "NO"}\n\n` +
      `Verdict:\n${msg.verdict}\n\n` +
      `Recommendations:\n${msg.recommendations?.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n` +
      `Report this to:\n` +
      `• National Cyber Crime Portal: https://cybercrime.gov.in\n` +
      `• Helpline: 1930`
    );
  };

  return (
    <div className="glass-card flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((msg) => {
            if (msg.role === "system") {
              return (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 self-start animate-fade-up"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10">
                    <Shield className="h-4 w-4 text-brand-cyan" />
                  </div>
                  <div className="chat-bubble-ai">
                    <p>{msg.content}</p>
                  </div>
                </div>
              );
            }

            if (msg.role === "user") {
              return (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 self-end flex-row-reverse animate-fade-up"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/20">
                    <User className="h-4 w-4 text-brand-cyan" />
                  </div>
                  <div className="chat-bubble-user">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            }

            // Assistant message with rich verdict display
            return (
              <div
                key={msg.id}
                className="flex items-start gap-3 self-start animate-fade-up"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10">
                  <Bot className="h-4 w-4 text-brand-cyan" />
                </div>
                <div className="max-w-[85%] space-y-3">
                  {/* Risk Badge */}
                  {msg.riskScore !== undefined && (
                    <RiskBadge score={msg.riskScore} />
                  )}

                  {/* Verdict */}
                  <div
                    className="rounded-2xl rounded-bl-md border px-4 py-3 text-sm leading-relaxed"
                    style={{
                      backgroundColor:
                        msg.riskScore && msg.riskScore >= 50
                          ? "rgba(239, 68, 68, 0.05)"
                          : "rgba(255, 255, 255, 0.03)",
                      borderColor:
                        msg.riskScore && msg.riskScore >= 50
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <p className="whitespace-pre-wrap text-slate-300">
                      {msg.content}
                    </p>
                  </div>

                  {/* Recommendations */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Recommended Actions
                      </p>
                      <ul className="space-y-1.5">
                        {msg.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-brand-cyan" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      id={`btn-copy-report-${msg.id}`}
                      onClick={() =>
                        handleCopy(generateReportText(msg), msg.id)
                      }
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy Report
                        </>
                      )}
                    </button>
                    {onShare && (
                      <button
                        id={`btn-share-${msg.id}`}
                        onClick={() => onShare(generateReportText(msg))}
                        className="flex items-center gap-1 rounded-lg border border-brand-cyan/20 bg-brand-cyan/10 px-2.5 py-1.5 text-[11px] font-medium text-brand-cyan transition hover:bg-brand-cyan/20"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                      </button>
                    )}
                    {msg.isScam && (
                      <a
                        href="https://cybercrime.gov.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
                      >
                        <FileWarning className="h-3 w-3" />
                        Report to CyberCrime
                      </a>
                    )}
                  </div>

                </div>
              </div>
            );
          })}

          {isAnalyzing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="border-t border-white/[0.06] px-4 py-3 sm:px-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Quick Test — Try these common scam scenarios:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  id={`quick-action-${i}`}
                  onClick={() => analyzeMessage(action.prompt)}
                  className="glass-card-hover flex items-center gap-2 p-3 text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-brand-cyan" />
                  <span className="text-xs font-medium text-slate-400">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-white/[0.06] p-4 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              id="fraud-check-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste suspicious message here or describe the situation..."
              rows={1}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-slate-200 placeholder-slate-600 outline-none transition focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20"
              style={{
                minHeight: 44,
                maxHeight: 120,
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            type="submit"
            id="btn-analyze-submit"
            disabled={!input.trim() || isAnalyzing}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
              input.trim() && !isAnalyzing
                ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 hover:bg-brand-cyan/30 glow-cyan"
                : "bg-white/5 text-slate-600 border border-white/10 cursor-not-allowed"
            )}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
