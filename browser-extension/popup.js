// ScamShield AI — Browser Extension Popup Script

const analyzeBtn = document.getElementById("analyze-btn");
const textInput = document.getElementById("text-input");
const resultContainer = document.getElementById("result-container");
const errorMsg = document.getElementById("error-msg");
const apiUrlInput = document.getElementById("api-url");

const RISK_CONFIG = {
  critical: { label: "🚨 CRITICAL", color: "#ef4444", cls: "critical" },
  high: { label: "⚠️ HIGH RISK", color: "#f97316", cls: "high" },
  medium: { label: "⚡ MODERATE", color: "#eab308", cls: "medium" },
  low: { label: "✅ SAFE", color: "#22c55e", cls: "low" },
};

// Restore saved API URL
chrome.storage.local.get(["api_url", "last_text"], (data) => {
  if (data.api_url) apiUrlInput.value = data.api_url;
  if (data.last_text) textInput.value = data.last_text;
});

// Save API URL on change
apiUrlInput.addEventListener("change", () => {
  chrome.storage.local.set({ api_url: apiUrlInput.value.trim() });
});

// Receive text from content script (right-click)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SELECTED_TEXT" && msg.text) {
    textInput.value = msg.text;
  }
});

analyzeBtn.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) {
    showError("Please enter some text to analyze.");
    return;
  }
  if (text.length > 5000) {
    showError("Text is too long. Please limit to 5000 characters.");
    return;
  }

  const apiBase = (apiUrlInput.value.trim() || "http://localhost:8000").replace(/\/$/, "");
  chrome.storage.local.set({ last_text: text });

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";
  errorMsg.style.display = "none";
  showLoading();

  try {
    const res = await fetch(`${apiBase}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    showResult(data);
  } catch (err) {
    hideResult();
    showError(`Failed to analyze: ${err.message || "Network error. Is the backend running?"}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "🔍 Analyze";
  }
});

function showLoading() {
  resultContainer.innerHTML = `
    <div class="result loading">
      <p style="text-align:center;color:#64748b;font-size:12px;">Analyzing with ScamShield AI...</p>
    </div>
  `;
}

function hideResult() {
  resultContainer.innerHTML = "";
}

function showResult(data) {
  const score = data.risk_score?.overall_score ?? 0;
  const level = data.risk_score?.risk_level ?? "low";
  const config = RISK_CONFIG[level] || RISK_CONFIG.low;
  const labels = data.risk_score?.threat_labels ?? [];
  const verdict = data.verdict ?? "";
  const language = data.detected_language ?? "en";
  const urlScore = data.url_threat_score ?? 0;

  const tagsHtml = [
    ...labels.map((l) => `<span class="tag">${l.replace("_", " ")}</span>`),
    language !== "en" ? `<span class="tag">lang: ${language}</span>` : "",
    urlScore > 30 ? `<span class="tag" style="color:#f87171;">URL threat: ${urlScore.toFixed(0)}</span>` : "",
  ]
    .filter(Boolean)
    .join("");

  resultContainer.innerHTML = `
    <div class="result ${config.cls}">
      <div class="result-header">
        <span class="risk-badge" style="color:${config.color};border-color:${config.color}40;background:${config.color}15;">
          ${config.label}
        </span>
        <span class="score" style="color:${config.color}">${score.toFixed(0)}<span style="font-size:12px;color:#64748b;">/100</span></span>
      </div>
      <p class="verdict">${verdict.substring(0, 220)}${verdict.length > 220 ? "..." : ""}</p>
      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}
      ${urlScore > 30 ? `<p style="margin-top:6px;font-size:10px;color:#f87171;">⚠️ Suspicious URL detected in this message</p>` : ""}
    </div>
  `;
}

function showError(msg) {
  errorMsg.style.display = "block";
  errorMsg.textContent = msg;
}
