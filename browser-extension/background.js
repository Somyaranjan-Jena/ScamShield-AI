// ScamShield AI — Background Service Worker (MV3)
// Handles right-click context menu for "Check with ScamShield AI"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scamshield-check",
    title: "🛡️ Check with ScamShield AI",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scamshield-check" && info.selectionText) {
    // Open popup with selected text
    chrome.storage.local.set({ last_text: info.selectionText }, () => {
      chrome.action.openPopup().catch(() => {
        // Fallback: open popup as new tab if openPopup fails
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      });
    });
  }
});
