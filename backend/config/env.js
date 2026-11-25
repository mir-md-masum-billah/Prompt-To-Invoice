import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    console.error(`FATAL: missing required environment variable ${name}`);
    process.exit(1);
  }
  return v;
}

const JWT_SECRET = required("JWT_SECRET");
if (JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}

export const env = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  mongoUri: required("MONGODB_URI"),
  jwtSecret: JWT_SECRET,
  geminiKey: process.env.GEMINI_API_KEY || "",
  publicApiUrl: (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, ""),
  clientOrigins: [
    ...(process.env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
      .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean),
    // deployed frontend (Cloudflare Workers) is always allowed
    "https://prompt-to-invoice.mirmohammadmasumbillah.workers.dev",
  ],
};
