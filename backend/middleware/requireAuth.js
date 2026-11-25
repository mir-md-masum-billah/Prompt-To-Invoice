import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });

    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "prompttoinvoice",
      audience: "prompttoinvoice-web",
    });
    req.userId = String(payload.sub);
    req.userEmail = payload.email;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}
