// Single source of truth for the API origin. Set NEXT_PUBLIC_API_BASE (https only in production).
// Local dev: put NEXT_PUBLIC_API_BASE=http://localhost:4000 in frontend/.env.local
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// Only allow same-site relative redirects (blocks open-redirect via ?from=//evil.com).
export function safeRedirect(target, fallback = "/app/dashboard") {
  if (typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\") || /[\u0000-\u001f]/.test(target)) return fallback;
  return target;
}
