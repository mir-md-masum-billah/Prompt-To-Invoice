import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";
import { upload, verifyUploadedImages } from "../middleware/upload.js";
import { createBusinessProfile, getMyBusinessProfile, updateBusinessProfile } from "../controllers/businessProfileController.js";

const router = express.Router();
router.use(requireAuth);

const fields = upload.fields([
  { name: "logo", maxCount: 1 }, { name: "stamp", maxCount: 1 }, { name: "signature", maxCount: 1 },
  { name: "logoName", maxCount: 1 }, { name: "stampName", maxCount: 1 }, { name: "signatureNameMeta", maxCount: 1 },
]);

router.post("/", uploadLimiter, fields, verifyUploadedImages, createBusinessProfile);
router.put("/:id", uploadLimiter, fields, verifyUploadedImages, updateBusinessProfile);
router.get("/me", getMyBusinessProfile);

export default router;
