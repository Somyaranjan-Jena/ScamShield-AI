"use client";

import React, { useState } from "react";
import { HelpCircle, CheckCircle2, XCircle, ChevronRight, Trophy, Share2 } from "lucide-react";
import { addPoints } from "@/lib/rewards";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
  type: "digital_arrest" | "phishing" | "financial_fraud" | "impersonation" | "general";
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "You receive a call from someone claiming to be a CBI officer saying your Aadhaar is linked to money laundering. They ask you to stay on video call and transfer money. What should you do?",
    options: [
      "Stay on the call and cooperate to avoid arrest",
      "Immediately hang up — this is a 'digital arrest' scam",
      "Transfer a small amount to show good faith",
      "Give them your Aadhaar number to verify",
    ],
    correct: 1,
    explanation: "This is a classic 'digital arrest' scam. No real law enforcement agency arrests people over phone calls or demands money transfers. Always hang up and call the Cyber Crime Helpline: 1930.",
    type: "digital_arrest",
  },
  {
    id: 2,
    text: "You get an SMS: 'Your SBI account KYC has expired. Click here to update: sbi-kyc-update.xyz or your account will be blocked.' What is this?",
    options: [
      "A legitimate bank notification",
      "A phishing attack using a fake domain",
      "An automated bank security alert",
      "A normal KYC update reminder",
    ],
    correct: 1,
    explanation: "The domain 'sbi-kyc-update.xyz' is not a legitimate SBI domain. Banks never ask for KYC through SMS links to third-party sites. Always visit the official sbi.co.in website.",
    type: "phishing",
  },
  {
    id: 3,
    text: "Someone on WhatsApp promises 30% monthly returns on a crypto investment, claiming it's 'RBI approved' with zero risk. What are the red flags?",
    options: [
      "The returns are too high and 'zero risk' is impossible",
      "Crypto isn't regulated in India",
      "RBI doesn't approve individual investments",
      "All of the above",
    ],
    correct: 3,
    explanation: "All three are red flags! Guaranteed high returns, 'zero risk', and false government approval are classic Ponzi scheme tactics. The RBI never approves individual investment schemes.",
    type: "financial_fraud",
  },
  {
    id: 4,
    text: "A bank employee calls and says your account shows 'suspicious activity'. They ask for your OTP to 'block the unauthorized transaction'. What should you do?",
    options: [
      "Share the OTP quickly to secure your account",
      "Ask for their employee ID first",
      "Never share OTP — bank employees never ask for it",
      "Ask them to send an email first",
    ],
    correct: 2,
    explanation: "Bank employees NEVER ask for OTP, CVV, or passwords over the phone. This is a social engineering attack. Hang up and call your bank's official number from the back of your card.",
    type: "impersonation",
  },
  {
    id: 5,
    text: "Which of these is the official Indian cyber crime helpline number?",
    options: ["100", "1930", "112", "1800-11-4000"],
    correct: 1,
    explanation: "1930 is the National Cyber Crime Helpline. You can also report at cybercrime.gov.in. Save this number — you may need it!",
    type: "general",
  },
  {
    id: 6,
    text: "You get a WhatsApp message: 'Your Amazon parcel is stuck at customs. Pay ₹499 customs duty via this UPI link to release it.' What is this?",
    options: [
      "A real customs duty notice from Amazon",
      "A scam — customs never collects via UPI/WhatsApp",
      "A genuine delivery fee",
      "An Amazon cashback offer",
    ],
    correct: 1,
    explanation: "Legitimate customs/delivery fees are never collected via WhatsApp UPI links. This is a 'parcel scam'. Always verify directly with the courier company using their official tracking page.",
    type: "phishing",
  },
  {
    id: 7,
    text: "Someone calls claiming to be 'Interpol' and says an international parcel in your name contains drugs. They say you'll be arrested unless you pay a 'security deposit'. This is:",
    options: [
      "A real Interpol notification you should take seriously",
      "A digital arrest scam — Interpol never calls individuals",
      "A customs warning you should respond to",
      "A genuine legal case that requires cooperation",
    ],
    correct: 1,
    explanation: "Interpol never calls individuals directly. This is a sophisticated digital arrest scam. Real law enforcement sends official written notices. Hang up and report to 1930.",
    type: "digital_arrest",
  },
  {
    id: 8,
    text: "What makes a URL suspicious? Select the most concerning option:",
    options: [
      "sbi.co.in (India's official SBI website)",
      "sbi-customer-login.xyz (typosquatting with suspicious TLD)",
      "sbi.co.in/login (HTTPS official page)",
      "cybercrime.gov.in (official cyber crime portal)",
    ],
    correct: 1,
    explanation: "'.xyz' is a red-flag TLD commonly used in phishing sites. The hyphenated domain is typosquatting — designed to look like a legitimate site. Always check the domain carefully before entering any credentials.",
    type: "phishing",
  },
  {
    id: 9,
    text: "Your elderly parent receives a call: 'Your son has been arrested. Pay ₹2 lakhs bail immediately and don't tell anyone.' What should you do?",
    options: [
      "Pay immediately to help your son",
      "Hang up and directly call your son to verify",
      "Ask the caller for proof",
      "Transfer half the amount as a show of faith",
    ],
    correct: 1,
    explanation: "This is a 'family emergency scam'. Always verify directly with your family member before any action. Scammers create urgency to prevent verification. Your son is almost certainly fine!",
    type: "impersonation",
  },
  {
    id: 10,
    text: "Which of these is a SAFE action when you suspect fraud?",
    options: [
      "Share your OTP to 'verify' your identity",
      "Transfer money to a 'secure RBI account'",
      "Report to cybercrime.gov.in and call 1930",
      "Stay on the video call to cooperate",
    ],
    correct: 2,
    explanation: "Reporting to cybercrime.gov.in and calling 1930 is always the right action. Never share OTPs, transfer money to unknown accounts, or stay on suspicious calls.",
    type: "general",
  },
];

const TYPE_COLORS: Record<string, string> = {
  digital_arrest: "text-red-400 bg-red-500/10 border-red-500/20",
  phishing: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  financial_fraud: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  impersonation: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  general: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20",
};

const TYPE_LABELS: Record<string, string> = {
  digital_arrest: "Digital Arrest",
  phishing: "Phishing",
  financial_fraud: "Financial Fraud",
  impersonation: "Impersonation",
  general: "General",
};

export default function QuizPage() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([]);

  const q = QUESTIONS[current];
  const percent = Math.round((score / QUESTIONS.length) * 100);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) {
      setScore((s) => s + 1);
    } else {
      setWrongAnswers((w) => [...w, current]);
    }
  };

  const handleNext = () => {
    if (current + 1 >= QUESTIONS.length) {
      setFinished(true);
      addPoints("quiz", score * 2);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setWrongAnswers([]);
  };

  const getGrade = () => {
    if (percent >= 90) return { label: "Expert 🏆", color: "text-yellow-400" };
    if (percent >= 70) return { label: "Proficient 🥈", color: "text-slate-300" };
    if (percent >= 50) return { label: "Learning 🥉", color: "text-amber-600" };
    return { label: "Needs Practice 📚", color: "text-red-400" };
  };

  if (finished) {
    const grade = getGrade();
    return (
      <div className="min-h-screen px-4 py-8 sm:px-8 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="glass-card p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-cyan/10 glow-cyan">
                <Trophy className="h-10 w-10 text-brand-cyan" />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2">Quiz Complete!</h1>
            <p className={`text-xl font-bold mb-6 ${grade.color}`}>{grade.label}</p>

            {/* Score circle */}
            <div className="mx-auto mb-6 relative flex h-32 w-32 items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={percent >= 70 ? "#22d3ee" : percent >= 50 ? "#f97316" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - percent / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div>
                <div className="text-2xl font-extrabold text-white">{score}/{QUESTIONS.length}</div>
                <div className="text-xs text-slate-400">{percent}%</div>
              </div>
            </div>

            <p className="mb-2 text-slate-400 text-sm">
              You earned <span className="font-bold text-brand-cyan">{score * 2} points</span> added to your rewards!
            </p>

            {wrongAnswers.length > 0 && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left">
                <p className="text-xs font-semibold text-red-400 mb-2">Review these topics:</p>
                {wrongAnswers.map((idx) => (
                  <p key={idx} className="text-xs text-slate-400">
                    • Q{idx + 1}: {TYPE_LABELS[QUESTIONS[idx].type]}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={restart}
                className="flex-1 btn-primary text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "ScamShield AI Quiz",
                      text: `I scored ${score}/${QUESTIONS.length} (${percent}%) on the ScamShield AI fraud awareness quiz! Can you beat my score? 🛡️`,
                      url: window.location.href,
                    });
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-all"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <HelpCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Scam Awareness Quiz</h1>
            <p className="text-sm text-slate-500">
              Test your knowledge — protect yourself and your family
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Question {current + 1} of {QUESTIONS.length}</span>
            <span>Score: {score}/{current + (answered ? 1 : 0)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-purple-500 transition-all duration-500"
              style={{ width: `${((current + (answered ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="glass-card p-6 mb-4">
          {/* Type badge */}
          <span className={cn(
            "mb-4 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider",
            TYPE_COLORS[q.type]
          )}>
            {TYPE_LABELS[q.type].toUpperCase()}
          </span>

          <h2 className="text-base font-semibold text-white leading-relaxed mb-6">
            {q.text}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((option, idx) => {
              const isSelected = selected === idx;
              const isCorrect = idx === q.correct;
              const showResult = answered;

              let borderClass = "border-white/10 bg-white/5 text-slate-300";
              let icon = null;

              if (showResult) {
                if (isCorrect) {
                  borderClass = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
                  icon = <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
                } else if (isSelected && !isCorrect) {
                  borderClass = "border-red-500/40 bg-red-500/10 text-red-300";
                  icon = <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
                }
              } else if (isSelected) {
                borderClass = "border-brand-cyan/40 bg-brand-cyan/10 text-white";
              }

              return (
                <button
                  key={idx}
                  id={`option-${idx}`}
                  onClick={() => handleSelect(idx)}
                  disabled={answered}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border p-4 text-sm text-left transition-all duration-200",
                    borderClass,
                    !answered && "hover:border-brand-cyan/30 hover:bg-brand-cyan/5 cursor-pointer"
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <div className={cn(
              "mt-4 rounded-xl border p-4 text-sm leading-relaxed",
              selected === q.correct
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                : "border-red-500/20 bg-red-500/5 text-red-300"
            )}>
              <div className="flex items-center gap-2 mb-1 font-semibold text-xs">
                {selected === q.correct ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Correct!</>
                ) : (
                  <><XCircle className="h-3.5 w-3.5" /> Incorrect</>
                )}
              </div>
              <p className="text-slate-300 text-xs">{q.explanation}</p>
            </div>
          )}
        </div>

        {/* Next button */}
        {answered && (
          <button
            id="next-question"
            onClick={handleNext}
            className="w-full btn-primary py-3 text-sm"
          >
            {current + 1 < QUESTIONS.length ? (
              <>Next Question <ChevronRight className="h-4 w-4" /></>
            ) : (
              <>See Results 🎉</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
