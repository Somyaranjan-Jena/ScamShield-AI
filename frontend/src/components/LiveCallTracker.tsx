"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Radio,
  Play,
  Square,
  AlertTriangle,
  Shield,
  PhoneOff,
  Volume2,
  Zap,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  WS_BASE_URL,
  DEMO_SCAM_SCRIPT,
  getRiskColor,
  getRiskBgColor,
  getRiskBorderColor,
  getRiskLabel,
  cn,
} from "@/lib/utils";

interface TranscriptEntry {
  speaker: string;
  text: string;
  riskScore: number;
  flaggedPhrases: string[];
  timestamp: string;
}

interface RiskUpdate {
  type: string;
  session_id: string;
  chunk_index: number;
  risk_score: {
    overall_score: number;
    coercion_score: number;
    urgency_score: number;
    phishing_score: number;
    threat_labels: string[];
    risk_level: string;
    explanation: string;
  };
  cumulative_risk: number;
  alert_level: string;
  alert_message: string | null;
  flagged_phrases: string[];
  timestamp: string;
}

function RiskMeter({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const radius = size === "lg" ? 80 : 40;
  const strokeWidth = size === "lg" ? 10 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getRiskColor(score);
  const center = radius + strokeWidth;
  const svgSize = (radius + strokeWidth) * 2;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${color}60)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={cn(
            "font-bold tabular-nums",
            size === "lg" ? "text-4xl" : "text-lg"
          )}
          style={{ color }}
        >
          {Math.round(score)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {getRiskLabel(score)}
        </span>
      </div>
    </div>
  );
}

function SubScore({
  label,
  score,
  icon: Icon,
}: {
  label: string;
  score: number;
  icon: React.ElementType;
}) {
  const color = getRiskColor(score);
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">{label}</span>
          <span className="font-mono font-semibold" style={{ color }}>
            {Math.round(score)}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${score}%`,
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}50`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LiveCallTracker() {
  const [isActive, setIsActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentRisk, setCurrentRisk] = useState(0);
  const [cumulativeRisk, setCumulativeRisk] = useState(0);
  const [coercionScore, setCoercionScore] = useState(0);
  const [urgencyScore, setUrgencyScore] = useState(0);
  const [phishingScore, setPhishingScore] = useState(0);
  const [alertLevel, setAlertLevel] = useState("normal");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [threatLabels, setThreatLabels] = useState<string[]>([]);
  const [demoIndex, setDemoIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clockRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcript, scrollToBottom]);

  const handleWsMessage = useCallback((event: MessageEvent) => {
    try {
      const data: RiskUpdate = JSON.parse(event.data);

      if (data.type === "session_start") {
        setSessionId(data.session_id);
        return;
      }

      if (data.type === "analysis_update") {
        setCurrentRisk(data.risk_score.overall_score);
        setCumulativeRisk(data.cumulative_risk);
        setCoercionScore(data.risk_score.coercion_score);
        setUrgencyScore(data.risk_score.urgency_score);
        setPhishingScore(data.risk_score.phishing_score);
        setAlertLevel(data.alert_level);
        setAlertMessage(data.alert_message);
        setThreatLabels(data.risk_score.threat_labels);
      }
    } catch (e) {
      console.error("WS parse error:", e);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/api/ws/live-call`);
      ws.onmessage = handleWsMessage;
      ws.onerror = () => {
        console.warn("WebSocket connection failed, using demo mode.");
        setIsDemoMode(true);
      };
      ws.onclose = () => {
        wsRef.current = null;
      };
      wsRef.current = ws;
      setIsDemoMode(false);
    } catch {
      setIsDemoMode(true);
    }
  }, [handleWsMessage]);

  const sendChunk = useCallback(
    (text: string, speaker: string, index: number) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            session_id: sessionId,
            chunk_text: text,
            chunk_index: index,
            speaker: speaker === "caller" ? "caller" : "receiver",
          })
        );
      }
    },
    [sessionId]
  );

  // Demo mode analysis (local heuristic for when no backend)
  const analyzeLocally = useCallback((text: string): { score: number; phrases: string[] } => {
    const lower = text.toLowerCase();
    const dangerKeywords = [
      "arrest warrant", "cbi", "fir", "money laundering", "non-bailable",
      "do not disconnect", "do not tell anyone", "national security",
      "transfer", "secure account", "passport will be revoked",
      "immediately", "police", "cooperate", "confidential",
      "rbi-approved", "verification account", "act now",
      "too late", "aadhaar",
    ];
    const found = dangerKeywords.filter((kw) => lower.includes(kw));
    const score = Math.min(found.length * 14, 100);
    return { score, phrases: found };
  }, []);

  const startAnalysis = useCallback(() => {
    setIsActive(true);
    setTranscript([]);
    setDemoIndex(0);
    setCurrentRisk(0);
    setCumulativeRisk(0);
    setCoercionScore(0);
    setUrgencyScore(0);
    setPhishingScore(0);
    setAlertLevel("normal");
    setAlertMessage(null);
    setThreatLabels([]);
    setElapsedTime(0);

    // Start clock
    clockRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Try WebSocket
    connectWebSocket();
  }, [connectWebSocket]);

  const stopAnalysis = useCallback(() => {
    setIsActive(false);

    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    if (clockRef.current) {
      clearInterval(clockRef.current);
      clockRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({ action: "end_session", session_id: sessionId })
      );
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [sessionId]);

  // Demo auto-play logic
  useEffect(() => {
    if (!isActive || demoIndex >= DEMO_SCAM_SCRIPT.length) {
      if (demoIndex >= DEMO_SCAM_SCRIPT.length && isActive) {
        // Demo complete
        setAlertLevel("critical");
        setAlertMessage(
          "DEMO COMPLETE: This call exhibited classic digital arrest scam patterns. In a real scenario, the call would be flagged and the user alerted."
        );
      }
      return;
    }

    const chunk = DEMO_SCAM_SCRIPT[demoIndex];
    const delay = 2500 + Math.random() * 1500;

    demoTimerRef.current = setTimeout(() => {
      const { score, phrases } = analyzeLocally(chunk.text);

      // Calculate running averages
      const newTranscript: TranscriptEntry = {
        speaker: chunk.speaker,
        text: chunk.text,
        riskScore: score,
        flaggedPhrases: phrases,
        timestamp: new Date().toISOString(),
      };

      setTranscript((prev) => [...prev, newTranscript]);

      // Update scores with some smoothing
      setCurrentRisk(score);
      setCumulativeRisk((prev) => {
        const weight = 0.4;
        return Math.round(prev * (1 - weight) + score * weight);
      });

      if (phrases.some((p) =>
        ["arrest warrant", "cbi", "fir", "money laundering", "non-bailable", "do not disconnect", "do not tell anyone"].includes(p)
      )) {
        setCoercionScore((prev) => Math.min(prev + 18, 100));
      }
      if (phrases.some((p) =>
        ["immediately", "act now", "too late", "passport will be revoked"].includes(p)
      )) {
        setUrgencyScore((prev) => Math.min(prev + 20, 100));
      }
      if (phrases.some((p) =>
        ["transfer", "secure account", "rbi-approved", "verification account"].includes(p)
      )) {
        setPhishingScore((prev) => Math.min(prev + 22, 100));
      }

      // Update alert level based on cumulative
      const cumRisk = transcript.length > 0
        ? (transcript.reduce((s, t) => s + t.riskScore, 0) + score) / (transcript.length + 1)
        : score;

      if (cumRisk >= 60 || score >= 70) {
        setAlertLevel("critical");
        setAlertMessage("CRITICAL: High probability of active scam. Recommend immediate call termination.");
        setThreatLabels((prev) => Array.from(new Set([...prev, ...phrases.length > 0 ? ["coercion", "scam"] : []])));
      } else if (cumRisk >= 35 || score >= 40) {
        setAlertLevel("warning");
        setAlertMessage("WARNING: Multiple scam indicators detected. Exercise extreme caution.");
        setThreatLabels((prev) => Array.from(new Set([...prev, "suspicious"])));
      } else if (score >= 15) {
        setAlertLevel("elevated");
        setAlertMessage("ELEVATED: Some suspicious patterns detected. Stay vigilant.");
      }

      // Send to backend if WS is open
      sendChunk(chunk.text, chunk.speaker, demoIndex);

      setDemoIndex((prev) => prev + 1);
    }, delay);

    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    };
  }, [isActive, demoIndex, analyzeLocally, sendChunk, transcript]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const alertStyles: Record<string, { bg: string; border: string; text: string }> = {
    critical: { bg: "bg-red-500/10", border: "border-red-500/40", text: "text-red-400" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-400" },
    elevated: { bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-400" },
    normal: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-400" },
  };

  const currentAlertStyle = alertStyles[alertLevel] || alertStyles.normal;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Left: Transcript Panel */}
      <div className="xl:col-span-2">
        <div className="glass-card flex h-[600px] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                isActive ? "bg-red-500/15" : "bg-brand-cyan/10"
              )}>
                {isActive ? (
                  <Radio className="h-4 w-4 animate-pulse text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-brand-cyan" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {isActive ? "Live Call Analysis" : "Call Scam Shield"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isActive
                    ? `Session active • ${formatTime(elapsedTime)}`
                    : "Start a demo to see real-time analysis"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-400">LIVE</span>
                </div>
              )}
              <button
                id="btn-start-analysis"
                onClick={isActive ? stopAnalysis : startAnalysis}
                className={isActive ? "btn-danger text-sm" : "btn-primary text-sm"}
              >
                {isActive ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Start Demo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alert Banner */}
          {alertMessage && isActive && (
            <div
              className={cn(
                "mx-4 mt-3 flex items-center gap-2 rounded-xl border px-4 py-2.5 animate-slide-in",
                currentAlertStyle.bg,
                currentAlertStyle.border
              )}
            >
              <AlertTriangle className={cn("h-4 w-4 shrink-0", currentAlertStyle.text)} />
              <p className={cn("text-xs font-medium", currentAlertStyle.text)}>
                {alertMessage}
              </p>
            </div>
          )}

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {transcript.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Shield className="mb-4 h-16 w-16 text-white/5" />
                <p className="text-sm font-medium text-slate-500">
                  No active call session
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Click &quot;Start Demo&quot; to simulate a digital arrest scam call
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transcript.map((entry, i) => (
                  <div key={i} className="animate-fade-up">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          entry.speaker === "caller"
                            ? "text-red-400"
                            : "text-brand-cyan"
                        )}
                      >
                        {entry.speaker === "caller" ? "⚠ Caller" : "👤 Receiver"}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                        {formatTime(Math.floor((i + 1) * 3.5))}
                      </span>
                      {entry.riskScore > 30 && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: getRiskBgColor(entry.riskScore),
                            color: getRiskColor(entry.riskScore),
                            border: `1px solid ${getRiskBorderColor(entry.riskScore)}`,
                          }}
                        >
                          Risk: {Math.round(entry.riskScore)}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-2.5 text-sm leading-relaxed",
                        entry.speaker === "caller"
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-brand-cyan/10 bg-brand-cyan/[0.03]"
                      )}
                    >
                      {entry.text.split(" ").map((word, wi) => {
                        const isFlag = entry.flaggedPhrases.some((p) =>
                          p.split(" ").some((pw) => pw === word.toLowerCase().replace(/[.,!?]/g, ""))
                        );
                        return (
                          <span
                            key={wi}
                            className={
                              isFlag
                                ? "rounded bg-red-500/20 px-0.5 font-semibold text-red-400"
                                : ""
                            }
                          >
                            {word}{" "}
                          </span>
                        );
                      })}
                    </div>
                    {entry.flaggedPhrases.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.flaggedPhrases.map((p, pi) => (
                          <span
                            key={pi}
                            className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/20"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Risk Panel */}
      <div className="space-y-4">
        {/* Risk Meter */}
        <div className="glass-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Zap className="h-4 w-4 text-brand-cyan" />
            Threat Level
          </h3>
          <div className="flex justify-center">
            <RiskMeter score={isActive ? cumulativeRisk : 0} />
          </div>
        </div>

        {/* Sub-Scores */}
        <div className="glass-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <TrendingUp className="h-4 w-4 text-brand-cyan" />
            Risk Breakdown
          </h3>
          <div className="space-y-4">
            <SubScore label="Coercion & Threats" score={coercionScore} icon={AlertTriangle} />
            <SubScore label="Urgency Pressure" score={urgencyScore} icon={Clock} />
            <SubScore label="Phishing / Data Theft" score={phishingScore} icon={Shield} />
          </div>
        </div>

        {/* Detected Threats */}
        <div className="glass-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Detected Threat Labels
          </h3>
          {threatLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {threatLabels.map((label, i) => (
                <span
                  key={i}
                  className="badge-critical animate-scale-in"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              No threats detected yet
            </p>
          )}
        </div>

        {/* Emergency Action */}
        {alertLevel === "critical" && isActive && (
          <div className="glass-card animate-pulse-glow border-red-500/30 p-5">
            <div className="flex items-center gap-2 text-red-400">
              <PhoneOff className="h-5 w-5" />
              <span className="text-sm font-bold">DISCONNECT NOW</span>
            </div>
            <p className="mt-2 text-xs text-red-300/80">
              This call shows strong indicators of a digital arrest scam.
              Hang up immediately and call 1930 (Cyber Crime Helpline).
            </p>
            <button
              id="btn-emergency-disconnect"
              onClick={stopAnalysis}
              className="mt-3 w-full btn-danger text-sm"
            >
              <PhoneOff className="h-4 w-4" />
              End Call & Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
