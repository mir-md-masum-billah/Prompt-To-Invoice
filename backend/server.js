import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { globalLimiter } from "./middleware/rateLimiters.js";
import { sanitizeBody } from "./utils/sanitize.js";
import authRouter from "./routes/authRouter.js";
import invoiceRouter from "./routes/invoiceRouter.js";
import businessProfileRouter from "./routes/businessProfileRouter.js";
import aiInvoiceRouter from "./routes/aiInvoiceRouter.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.isProd ? 1 : false);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // logos are loaded by the web app origin
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: env.isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  }),
);
app.use(
  cors({
    origin: (origin, cb) => (!origin || env.clientOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked"))),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  }),
);
// Simple checks that work even if the database is down
app.get("/", (_req, res) => res.send("API WORKING"));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: false }));
app.use(sanitizeBody);

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    index: false, dotfiles: "deny", maxAge: "7d",
    setHeaders: (res) => { res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Content-Disposition", "inline"); },
  }),
);

// make sure the DB is connected before any API route runs
app.use("/api", async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    next(Object.assign(new Error("Database unavailable"), { status: 503 }));
  }
});

app.use("/api/auth", authRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/businessProfile", businessProfileRouter);
app.use("/api/ai", aiInvoiceRouter);

app.use((_req, res) => res.status(404).json({ success: false, message: "Not found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 ? "Server error" : err.message });
});

export default app; // Vercel runs this export

if (!process.env.VERCEL) {
  await connectDB();
  app.listen(env.port, () => console.log(`API listening on :${env.port}`));
}
