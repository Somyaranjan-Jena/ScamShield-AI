/** @type {import('next').NextConfig} */

/**
 * ScamShield AI — Next.js Security-Hardened Configuration
 *
 * Enforces strict HTTP security headers on every response:
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options (clickjacking prevention)
 * - X-Content-Type-Options (MIME sniffing prevention)
 * - Referrer-Policy
 * - Permissions-Policy
 * - Strict-Transport-Security (HSTS)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const securityHeaders = [
  {
    // Content Security Policy — strict allowlist
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${BACKEND_URL} ${BACKEND_URL.replace("http", "ws")}`,
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    // Prevent clickjacking — deny all iframing
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME-type sniffing attacks
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Reflected XSS protection (legacy browsers)
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Control what gets sent in the Referer header
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Restrict browser features — disable camera, mic, payment, geolocation
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    // HSTS — force HTTPS for 2 years, include subdomains, allow preload
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Prevent cross-domain content policy file loading
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    // Prevent DNS prefetching to avoid leaking hostnames
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
];

const nextConfig = {
  reactStrictMode: true,

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Disable the X-Powered-By header to hide technology stack
  poweredByHeader: false,
};

module.exports = nextConfig;
