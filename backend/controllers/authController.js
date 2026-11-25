import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import User from "../models/userModel.js";
import { env } from "../config/env.js";
import { str } from "../utils/sanitize.js";

const TOKEN_TTL = "12h";
const BCRYPT_COST = 12;
// Constant-time defence against user enumeration via response timing.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, env.jwtSecret, {
    expiresIn: TOKEN_TTL, algorithm: "HS256", issuer: "prompttoinvoice", audience: "prompttoinvoice-web",
  });
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
export async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!email || !validator.isEmail(String(email))) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    if (!STRONG.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be 10-128 characters with upper-case, lower-case and a number",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;
    try {
      user = await User.create({ name: str(name, 80), email: normalizedEmail, passwordHash });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({ success: false, message: "Unable to create account with these details" });
      }
      throw e;
    }

    return res.status(201).json({
      success: true,
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string" || !email || !password || password.length > 128) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/auth/me  (requires auth)
export async function me(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
