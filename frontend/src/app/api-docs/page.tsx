"use client";

import React, { useState } from "react";
import { BookOpen, Copy, CheckCheck, Terminal, Zap, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Endpoint {
  method: "GET" | "POST" | "WS";
  path: string;
  description: string;
  rateLimit: string;
  requestBody?: string;
  response: string;
  examples: {
    curl: string;
    python: string;
    js: string;
  };
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/health",
    description: "Health check and API capabilities. Returns current AI engine mode, features, and version.",
    rateLimit: "Unlimited",
    response: `{
  "name": "ScamShield AI",
  "version": "2.0.0",
  "status": "operational",
  "ai_engine": "gemini | huggingface | heuristic_fallback",
  "features": {
    "multilingual": true,
    "url_threat_intel": false,
    "redis_cache": true
  }
}`,
    examples: {
      curl: `curl https://your-deployment/health`,
      python: `import httpx
resp = httpx.get("https://your-deployment/health")
print(resp.json())`,
      js: `const res = await fetch('https://your-deployment/health');
const data = await res.json();
console.log(data);`,
    },
  },
  {
    method: "POST",
    path: "/api/analyze",
    description: "Analyze any text for scam indicators. Supports English, Hindi, and Hinglish. Returns risk scores, threat labels, URL threat intel, and AI-generated verdict.",
    rateLimit: "30/minute per IP",
    requestBody: `{
  "text": "Your Aadhaar has been suspended...",
  "context": "Phone call transcript (optional)"
}`,
    response: `{
  "risk_score": {
    "overall_score": 87.5,
    "coercion_score": 90.0,
    "urgency_score": 75.0,
    "phishing_score": 30.0,
    "risk_level": "critical",
    "threat_labels": ["coercion", "urgency"]
  },
  "verdict": "🚨 CRITICAL ALERT...",
  "recommendations": ["Do not respond..."],
  "is_scam": true,
  "confidence": 0.875,
  "detected_language": "en",
  "url_threat_score": 0.0,
  "flagged_urls": []
}`,
    examples: {
      curl: `curl -X POST https://your-deployment/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your Aadhaar is suspended. Transfer ₹5000 now."}'`,
      python: `import httpx

resp = httpx.post(
    "https://your-deployment/api/analyze",
    json={"text": "Your Aadhaar is suspended..."}
)
result = resp.json()
print(f"Scam: {result['is_scam']}, Score: {result['risk_score']['overall_score']}")`,
      js: `const res = await fetch('https://your-deployment/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Your Aadhaar is suspended...' })
});
const { is_scam, risk_score } = await res.json();
console.log(\`Scam: \${is_scam}, Score: \${risk_score.overall_score}\`);`,
    },
  },
  {
    method: "POST",
    path: "/api/report",
    description: "Submit a fraud report. Reports are AI-analyzed and contribute to the collective fraud intelligence network.",
    rateLimit: "10/minute per IP",
    requestBody: `{
  "report_type": "digital_arrest | phishing | financial_fraud | impersonation | other",
  "description": "Full description of the scam...",
  "suspect_contact": "+91XXXXXXXXXX (optional)",
  "amount_lost": 5000 // optional, in INR
}`,
    response: `{
  "id": "uuid",
  "status": "pending",
  "message": "Report submitted successfully",
  "analysis": { ... }
}`,
    examples: {
      curl: `curl -X POST https://your-deployment/api/report \\
  -H "Content-Type: application/json" \\
  -d '{"report_type":"digital_arrest","description":"..."}'`,
      python: `import httpx

resp = httpx.post(
    "https://your-deployment/api/report",
    json={
        "report_type": "digital_arrest",
        "description": "Received a call claiming to be CBI...",
        "suspect_contact": "+91XXXXXXXXXX",
    }
)
print(resp.json())`,
      js: `await fetch('https://your-deployment/api/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    report_type: 'digital_arrest',
    description: 'Received a call claiming to be CBI...'
  })
});`,
    },
  },
  {
    method: "POST",
    path: "/api/auth/ws-token",
    description: "Get a short-lived WebSocket authentication token (valid for 5 minutes). Required before opening a live call analysis WebSocket connection.",
    rateLimit: "30/minute per IP",
    response: `{
  "token": "1234567890:abcdef...",
  "expires_in": 300,
  "mode": "secure | dev"
}`,
    examples: {
      curl: `curl -X POST https://your-deployment/api/auth/ws-token`,
      python: `import httpx, websockets, asyncio, json

async def main():
    token_resp = httpx.post("https://your-deployment/api/auth/ws-token")
    token = token_resp.json()["token"]
    async with websockets.connect(f"wss://your-deployment/api/ws/live-call?token={token}") as ws:
        await ws.send(json.dumps({"session_id": "s1", "chunk_text": "...", "chunk_index": 0, "speaker": "caller"}))
        print(await ws.recv())

asyncio.run(main())`,
      js: `const { token } = await (await fetch('/api/auth/ws-token', { method: 'POST' })).json();
const ws = new WebSocket(\`ws://your-deployment/api/ws/live-call?token=\${token}\`);
ws.onopen = () => ws.send(JSON.stringify({
  session_id: crypto.randomUUID(),
  chunk_text: "Your Aadhaar is suspended...",
  chunk_index: 0,
  speaker: "caller"
}));
ws.onmessage = (e) => console.log(JSON.parse(e.data));`,
    },
  },
  {
    method: "GET",
    path: "/api/analytics/trends",
    description: "Get time-series scam trend data by type. Supports 7d, 30d, and 90d periods.",
    rateLimit: "30/minute per IP",
    response: `{
  "period": "7d",
  "data": [
    { "label": "Mon", "digital_arrest": 20, "phishing": 14, ... },
    ...
  ]
}`,
    examples: {
      curl: `curl "https://your-deployment/api/analytics/trends?period=7d"`,
      python: `import httpx
resp = httpx.get("https://your-deployment/api/analytics/trends", params={"period": "7d"})
print(resp.json())`,
      js: `const res = await fetch('/api/analytics/trends?period=7d');
const { data } = await res.json();
console.log(data);`,
    },
  },
  {
    method: "GET",
    path: "/api/analytics/graph/export",
    description: "Download the fraud network graph as JSON or CSV. Includes all nodes and edges.",
    rateLimit: "10/minute per IP",
    response: `// JSON format
{
  "nodes": [{"id": "...", "label": "...", "node_type": "...", "risk_level": "..."}],
  "edges": [{"id": "...", "source": "...", "target": "...", "flagged": true}]
}`,
    examples: {
      curl: `# Download as CSV
curl "https://your-deployment/api/analytics/graph/export?format=csv" -o graph.csv
# Download as JSON
curl "https://your-deployment/api/analytics/graph/export?format=json" -o graph.json`,
      python: `import httpx
resp = httpx.get("https://your-deployment/api/analytics/graph/export", params={"format": "json"})
with open("graph.json", "w") as f:
    f.write(resp.text)`,
      js: `const res = await fetch('/api/analytics/graph/export?format=csv');
const blob = await res.blob();
const url = URL.createObjectURL(blob);
// trigger download
const a = document.createElement('a');
a.href = url; a.download = 'graph.csv'; a.click();`,
    },
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  POST: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  WS: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

type LangTab = "curl" | "python" | "js";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<LangTab>("curl");

  return (
    <div className="glass-card overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wider", METHOD_COLORS[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="flex-1 text-sm font-mono text-white">{endpoint.path}</code>
        <span className="text-[10px] text-slate-500 border border-white/10 rounded px-1.5 py-0.5">
          {endpoint.rateLimit}
        </span>
        <span className={cn("text-slate-400 transition-transform duration-200", open && "rotate-180")}>▼</span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] p-5 space-y-4">
          <p className="text-sm text-slate-400">{endpoint.description}</p>

          {endpoint.requestBody && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Request Body</p>
              <div className="relative">
                <pre className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-emerald-300 overflow-x-auto">
                  {endpoint.requestBody}
                </pre>
                <CopyButton text={endpoint.requestBody} />
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Response</p>
            <div className="relative">
              <pre className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-blue-300 overflow-x-auto">
                {endpoint.response}
              </pre>
              <CopyButton text={endpoint.response} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Example</p>
              <div className="flex gap-1">
                {(["curl", "python", "js"] as LangTab[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium transition-all",
                      lang === l
                        ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                        : "bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300"
                    )}
                  >
                    {l === "js" ? "JavaScript" : l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <pre className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-amber-300 overflow-x-auto">
                {endpoint.examples[lang]}
              </pre>
              <CopyButton text={endpoint.examples[lang]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">API Documentation</h1>
              <p className="text-sm text-slate-500">ScamShield AI v2.0 — REST + WebSocket API</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-card p-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-cyan" />
              <div>
                <p className="text-xs font-semibold text-white">Base URL</p>
                <p className="text-[10px] text-slate-500">http://localhost:8000</p>
              </div>
            </div>
            <div className="glass-card p-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-white">Auth</p>
                <p className="text-[10px] text-slate-500">HMAC WS tokens (REST: none)</p>
              </div>
            </div>
            <div className="glass-card p-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-xs font-semibold text-white">Rate Limits</p>
                <p className="text-[10px] text-slate-500">Per-endpoint, per-IP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Endpoints</h2>
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={ep.path} endpoint={ep} />
          ))}
        </div>

        {/* Notes */}
        <div className="mt-8 glass-card border border-amber-500/20 p-5">
          <div className="flex items-start gap-3">
            <Terminal className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2">Integration Notes</h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>• All responses are JSON with UTF-8 encoding</li>
                <li>• Rate limit headers: <code className="text-brand-cyan">X-RateLimit-Remaining</code> and <code className="text-brand-cyan">Retry-After</code></li>
                <li>• WebSocket connections require a fresh token from <code className="text-brand-cyan">POST /api/auth/ws-token</code></li>
                <li>• The API runs in demo mode without a database — full persistence requires Supabase/PostgreSQL</li>
                <li>• For production, set <code className="text-brand-cyan">GEMINI_API_KEY</code> for best accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
