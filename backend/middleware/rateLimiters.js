import rateLimit from "express-rate-limit";

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false,
    message: { success: false, message },
  });

export const globalLimiter = make(15 * 60 * 1000, 600, "Too many requests. Please slow down.");
export const authLimiter = make(15 * 60 * 1000, 10, "Too many attempts. Try again in 15 minutes.");
export const aiLimiter = make(60 * 60 * 1000, 30, "AI generation limit reached. Try again later.");
export const uploadLimiter = make(60 * 60 * 1000, 40, "Upload limit reached. Try again later.");
