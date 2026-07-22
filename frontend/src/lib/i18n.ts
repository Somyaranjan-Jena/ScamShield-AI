// ── ScamShield AI — Internationalization (i18n) ────────────────

export type Lang = "en" | "hi";

type TranslationKey =
  | "citizenShieldTitle"
  | "citizenShieldSubtitle"
  | "tipTitle"
  | "tip"
  | "reportButton"
  | "whatsappButton"
  | "privacyNote"
  | "analyzeButton"
  | "analyzing"
  | "placeholder";

const translations: Record<Lang, Record<TranslationKey, string>> = {
  en: {
    citizenShieldTitle: "Citizen Fraud Shield",
    citizenShieldSubtitle:
      "AI-powered real-time analysis to protect you from digital arrest scams, phishing, and financial fraud.",
    tipTitle: "How to use",
    tip: "Paste any suspicious SMS, email, WhatsApp message, or phone script below. Our AI will instantly analyze it for fraud patterns, urgency tactics, and impersonation markers.",
    reportButton: "Report Cyber Crime",
    whatsappButton: "Share on WhatsApp",
    privacyNote:
      "Your messages are analyzed in real-time and never stored. 100% private.",
    analyzeButton: "Analyze",
    analyzing: "Analyzing...",
    placeholder: "Paste a suspicious message here...",
  },
  hi: {
    citizenShieldTitle: "नागरिक धोखाधड़ी सुरक्षा",
    citizenShieldSubtitle:
      "डिजिटल अरेस्ट स्कैम, फ़िशिंग और वित्तीय धोखाधड़ी से आपकी सुरक्षा के लिए AI-संचालित रियल-टाइम विश्लेषण।",
    tipTitle: "उपयोग कैसे करें",
    tip: "किसी भी संदिग्ध SMS, ईमेल, WhatsApp संदेश या फ़ोन स्क्रिप्ट को नीचे पेस्ट करें। हमारा AI तुरंत धोखाधड़ी पैटर्न, तत्काल रणनीति और प्रतिरूपण मार्कर का विश्लेषण करेगा।",
    reportButton: "साइबर अपराध रिपोर्ट करें",
    whatsappButton: "WhatsApp पर शेयर करें",
    privacyNote:
      "आपके संदेशों का रियल-टाइम में विश्लेषण किया जाता है और कभी संग्रहीत नहीं किया जाता। 100% निजी।",
    analyzeButton: "विश्लेषण करें",
    analyzing: "विश्लेषण हो रहा है...",
    placeholder: "यहाँ संदिग्ध संदेश पेस्ट करें...",
  },
};

export function useTranslation(lang: Lang) {
  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key] || key;
  };

  return { t, lang };
}
