import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Vercel's disk is read-only except /tmp (files there are temporary).
const dir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "uploads");
try {
  fs.mkdirSync(dir, { recursive: true });
} catch (err) {
  console.warn("Could not create uploads folder:", err.code);
}

const MIME_EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

// Verifies magic bytes after write so a spoofed Content-Type cannot smuggle other files.
const MAGIC = [
  { ext: ".png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ".jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: ".webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomBytes(16).toString("hex")}${MIME_EXT[file.mimetype] || ".bin"}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 3, fields: 30 },
  fileFilter: (_req, file, cb) =>
    MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only PNG, JPG or WEBP images up to 2MB are allowed")),
});

export function verifyUploadedImages(req, res, next) {
  const files = Object.values(req.files || {}).flat();
  for (const f of files) {
    const fd = fs.openSync(f.path, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    const ok = MAGIC.some((m) => path.extname(f.filename) === m.ext && m.bytes.every((b, i) => buf[i] === b));
    if (!ok) {
      files.forEach((x) => fs.existsSync(x.path) && fs.unlinkSync(x.path));
      return res.status(400).json({ success: false, message: "Invalid image file" });
    }
  }
  next();
}
