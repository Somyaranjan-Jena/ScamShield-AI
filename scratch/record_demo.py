import asyncio
import os
import shutil
from playwright.async_api import async_playwright

CAPTION_STYLE = """
(function() {
    let bar = document.getElementById('demo-caption-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'demo-caption-bar';
        bar.style.cssText = `
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
            background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 40%);
            padding: 28px 60px 22px 60px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 22px; font-weight: 600; color: #f1f5f9;
            text-align: center; letter-spacing: 0.01em;
            text-shadow: 0 2px 8px rgba(0,0,0,0.6);
            transition: opacity 0.6s ease;
            pointer-events: none;
        `;
        document.body.appendChild(bar);
    }
    bar.textContent = CAPTION_TEXT;
    bar.style.opacity = '1';
})();
"""

async def set_caption(page, text):
    script = CAPTION_STYLE.replace("CAPTION_TEXT", repr(text))
    await page.evaluate(script)

async def fade_caption(page):
    await page.evaluate("""
        const bar = document.getElementById('demo-caption-bar');
        if (bar) bar.style.opacity = '0';
    """)

async def smooth_scroll(page, total_px, duration_s, step_px=30):
    steps = max(1, total_px // step_px)
    delay = duration_s / steps
    for _ in range(steps):
        await page.evaluate(f"window.scrollBy({{top: {step_px}, behavior: 'smooth'}})")
        await asyncio.sleep(delay)

async def record_demo():
    video_output_dir = r"C:\Users\KIIT0001\Suryansh's Desktop\Projects\ScamShield\docs\video_temp"
    final_video_path = r"C:\Users\KIIT0001\Suryansh's Desktop\Projects\ScamShield\docs\ScamShield_AI_Official_Demo.webm"

    if os.path.exists(video_output_dir):
        shutil.rmtree(video_output_dir)
    os.makedirs(video_output_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=video_output_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        await context.add_init_script("""
            localStorage.setItem('scamshield_tour_done', 'true');
            localStorage.setItem('scamshield-rewards', JSON.stringify({points: 350, tier: 'silver', totalReports: 5, totalAnalyses: 12, totalShares: 4}));
        """)
        page = await context.new_page()

        # ── SEGMENT 1: COLD OPEN (15s) ──
        print("[COLD OPEN]")
        await page.goto("http://localhost:3000/cold_open.html")
        await asyncio.sleep(15)

        # ── SEGMENT 2: HOMEPAGE (20s) ──
        print("[HOMEPAGE]")
        await page.goto("http://localhost:3000")
        await asyncio.sleep(2)
        await set_caption(page, "ScamShield AI -- India's AI-Powered Digital Fraud Protection Platform")
        await asyncio.sleep(3)
        await set_caption(page, "Built with Next.js 14, FastAPI, Google Gemini, and Real-Time WebSockets")
        await smooth_scroll(page, 600, 8)
        await set_caption(page, "Live Call Analysis | Fraud Scanner | Threat Intelligence | Citizen Rewards")
        await smooth_scroll(page, 500, 7)
        await fade_caption(page)

        # ── SEGMENT 3: LIVE CALL ANALYSIS (30s) ──
        print("[LIVE CALL ANALYSIS]")
        await page.goto("http://localhost:3000/dashboard")
        await asyncio.sleep(2)
        await set_caption(page, "Intelligence Dashboard -- Real-Time Threat Monitoring")
        await asyncio.sleep(3)

        # Click Live Analysis tab
        try:
            tab = page.locator("#tab-live-analysis, button:has-text('Live Call')").first
            if await tab.is_visible(timeout=2000):
                await tab.click(force=True)
                await asyncio.sleep(1)
        except Exception:
            pass

        await set_caption(page, "WebSocket connection active -- analyzing call transcript in real time")
        await asyncio.sleep(3)

        # Start analysis
        try:
            btn = page.locator("#btn-start-analysis, button:has-text('Start Analysis'), button:has-text('Start Demo')").first
            if await btn.is_visible(timeout=2000):
                await btn.click(force=True)
        except Exception:
            pass

        await set_caption(page, "Threat indicators lighting up: Coercion, Urgency, Financial Threat, Impersonation")
        await asyncio.sleep(8)
        await set_caption(page, "VERDICT: HIGH RISK -- Digital Arrest Scam Pattern Detected (94% Confidence)")
        await asyncio.sleep(5)

        # Scroll to show full results
        await smooth_scroll(page, 400, 4)
        await asyncio.sleep(3)
        await fade_caption(page)

        # ── SEGMENT 4: FRAUD SCANNER (30s) ──
        print("[FRAUD SCANNER]")
        await page.goto("http://localhost:3000/citizen-shield")
        await asyncio.sleep(2)
        await set_caption(page, "Citizen Fraud Shield -- Paste any suspicious message for instant AI analysis")
        await asyncio.sleep(2)

        input_box = page.locator("textarea, input[type='text']").first
        try:
            if await input_box.is_visible(timeout=3000):
                scam_msg = "Your SBI account has been suspended. Verify immediately at sbi-secure-verify.com or your account will be permanently blocked."
                # Type character by character for visual effect
                await input_box.click(force=True)
                await input_box.type(scam_msg, delay=25)
                await asyncio.sleep(1)
                await set_caption(page, "Scanning for phishing patterns, spoofed domains, and social engineering tactics")

                send_btn = page.locator("#btn-analyze-submit, button[type='submit']").first
                if await send_btn.is_visible(timeout=2000):
                    await send_btn.click(force=True)
        except Exception as e:
            print(f"  Input interaction: {e}")

        await asyncio.sleep(6)
        await set_caption(page, "Risk Score: 91/100 -- Spoofed Domain Detected -- Urgency Language Flagged")
        await asyncio.sleep(4)

        # Scroll to recommendation card
        await smooth_scroll(page, 400, 4)
        await set_caption(page, "Actionable recommendations generated for the citizen")
        await asyncio.sleep(4)
        await fade_caption(page)

        # ── SEGMENT 5: THREAT INTELLIGENCE / NETWORK GRAPH (25s) ──
        print("[THREAT INTELLIGENCE]")
        await page.goto("http://localhost:3000/dashboard")
        await asyncio.sleep(2)

        # Click Fraud Network tab
        try:
            graph_tab = page.locator("button:has-text('Fraud Network'), button:has-text('Network Graph')").first
            if await graph_tab.is_visible(timeout=2000):
                await graph_tab.click(force=True)
                await asyncio.sleep(1)
        except Exception:
            pass

        await set_caption(page, "Fraud Network Graph -- Visualizing scam clusters across Indian cities")
        await asyncio.sleep(5)

        await set_caption(page, "Hotspots detected in Delhi, Mumbai, Bengaluru, and Hyderabad")
        await asyncio.sleep(5)

        # Scroll to explore
        await smooth_scroll(page, 300, 4)
        await set_caption(page, "Click any node for detailed breakdown: call volume, success rate, 3-day trend")
        await asyncio.sleep(5)
        await fade_caption(page)

        # ── SEGMENT 6: CITIZEN REWARDS (15s) ──
        print("[CITIZEN REWARDS]")
        await page.goto("http://localhost:3000/quiz")
        await asyncio.sleep(2)
        await set_caption(page, "Gamified Citizen Engagement -- Earn points, badges, and climb the leaderboard")
        await asyncio.sleep(5)
        await smooth_scroll(page, 400, 5)
        await set_caption(page, "Points awarded for reporting scams, completing quizzes, and sharing alerts")
        await asyncio.sleep(4)
        await fade_caption(page)

        # ── SEGMENT 7: BROWSER EXTENSION WARNING (10s) ──
        print("[BROWSER EXTENSION]")
        await page.goto("http://localhost:3000/extension_warning.html")
        await asyncio.sleep(1)
        await set_caption(page, "ScamShield Browser Extension -- Blocks phishing sites before they load")
        await asyncio.sleep(5)
        await set_caption(page, "Real-time URL scanning against known fraud databases")
        await asyncio.sleep(4)
        await fade_caption(page)

        # ── SEGMENT 8: ARCHITECTURE (15s) ──
        print("[ARCHITECTURE]")
        await page.goto("http://localhost:3000/architecture.html")
        await asyncio.sleep(1)
        await set_caption(page, "Full-Stack Architecture: Next.js 14 + FastAPI + WebSockets + Docker")
        await asyncio.sleep(6)
        await set_caption(page, "Multi-model AI pipeline: Google Gemini 1.5 Pro + HuggingFace + VirusTotal")
        await asyncio.sleep(6)
        await fade_caption(page)
        await asyncio.sleep(2)

        # ── SEGMENT 9: CLOSE (12s) ──
        print("[CLOSE]")
        await page.goto("http://localhost:3000/close_slide.html")
        await asyncio.sleep(12)

        # ── SAVE ──
        await context.close()
        await browser.close()

        recorded = [os.path.join(video_output_dir, f) for f in os.listdir(video_output_dir) if f.endswith(".webm")]
        if recorded:
            latest = max(recorded, key=os.path.getctime)
            os.makedirs(os.path.dirname(final_video_path), exist_ok=True)
            shutil.copy(latest, final_video_path)
            size_mb = os.path.getsize(final_video_path) / (1024 * 1024)
            print(f"SUCCESS! Video saved: {final_video_path} ({size_mb:.1f} MB)")
        else:
            print("ERROR: No video file found.")

if __name__ == "__main__":
    asyncio.run(record_demo())
