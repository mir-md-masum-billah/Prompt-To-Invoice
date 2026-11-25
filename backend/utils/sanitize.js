// Strips MongoDB operator keys ($...) and dotted keys from untrusted input
// to prevent NoSQL operator injection. Returns a new, cleaned value.
export function stripOperators(value, depth = 0) {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) return value.map((v) => stripOperators(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("$") || k.includes(".") || k === "__proto__" || k === "constructor") continue;
      out[k] = stripOperators(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === "object") req.body = stripOperators(req.body);
  next();
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const str = (v, max = 500) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
