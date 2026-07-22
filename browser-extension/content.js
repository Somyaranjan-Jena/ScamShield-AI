// ScamShield AI — Content Script
// Highlights suspicious text patterns detected on the current page

(function () {
  // Only run on text-heavy pages; skip extension pages
  if (document.querySelectorAll("p, div, span").length < 5) return;

  const SUSPICIOUS_PATTERNS = [
    /digital arrest/i,
    /\baadhaar\b.{0,30}(suspend|link|fraud|narcotics)/i,
    /\b(cbi|interpol|cybercrime police)\b.{0,30}(call|warn|notice|arrest)/i,
    /transfer.{0,20}(₹|rs\.?|inr).{0,10}(safe|secure|rbi|account)/i,
    /\bkyc.{0,20}(expire|update|click)/i,
    /non.?bailable warrant/i,
    /stay on (the )?call/i,
  ];

  function walkTextNodes(element, callback) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toUpperCase();
          if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.classList.contains("scamshield-highlight")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(callback);
  }

  function highlight(textNode, pattern) {
    const text = textNode.textContent;
    const match = pattern.exec(text);
    if (!match) return;

    const before = document.createTextNode(text.slice(0, match.index));
    const highlighted = document.createElement("mark");
    highlighted.className = "scamshield-highlight";
    highlighted.textContent = match[0];
    highlighted.style.cssText =
      "background: rgba(239,68,68,0.25); color: inherit; border-radius: 3px; padding: 0 2px; border-bottom: 1.5px solid #ef4444; cursor: help;";
    highlighted.title = "⚠️ ScamShield AI: Possible scam pattern detected";

    const after = document.createTextNode(text.slice(match.index + match[0].length));
    const parent = textNode.parentNode;
    if (parent) {
      parent.insertBefore(before, textNode);
      parent.insertBefore(highlighted, textNode);
      parent.insertBefore(after, textNode);
      parent.removeChild(textNode);
    }
  }

  // Run highlighting after page loads
  setTimeout(() => {
    try {
      SUSPICIOUS_PATTERNS.forEach((pattern) => {
        walkTextNodes(document.body, (node) => {
          if (pattern.test(node.textContent)) {
            highlight(node, pattern);
          }
        });
      });
    } catch (e) {
      // Silent fail — content script should never break pages
    }
  }, 1500);
})();
