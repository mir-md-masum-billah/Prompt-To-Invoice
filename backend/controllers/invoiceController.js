import mongoose from "mongoose";
import Invoice from "../models/invoiceModel.js";
import path from "path";

import { env } from "../config/env.js";
import { str, escapeRegex } from "../utils/sanitize.js";

const API_BASE = env.publicApiUrl;
const STATUSES = ["draft", "unpaid", "paid", "overdue"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "SEK", "NOK", "DKK", "PLN", "JPY", "INR", "BDT"];
const cleanStatus = (v, d = "draft") => (STATUSES.includes(String(v).toLowerCase()) ? String(v).toLowerCase() : d);
const cleanCurrency = (v, d = "USD") => (CURRENCIES.includes(String(v).toUpperCase()) ? String(v).toUpperCase() : d);
const cleanTax = (v) => Math.min(100, Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0));
const cleanDate = (v, d = "") => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : d);
// Assets: only our own upload URLs or small inline PNG/JPEG/WEBP data URLs (no javascript:/svg).
const cleanAsset = (v) =>
  typeof v === "string" &&
  (v.startsWith(`${API_BASE}/uploads/`) || (v.length < 700_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)))
    ? v : null;

function computeTotals(items = [], taxPercent = 0) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : [];
  const subtotal = safe.reduce(
    (sum, item) =>
      sum + Number(item.qty || 0) * Number(item.unitPrice || 0),
    0
  );
  const tax = (subtotal * Number(taxPercent || 0)) / 100;
  const total = subtotal + tax;
  const r = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  return { subtotal: r(subtotal), tax: r(tax), total: r(subtotal + tax) };
}

function parseItemField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;

  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }

  return [];
}

function isObjectIdString(val) {
  return typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);
}

function uploadedFilesToUrls(req) {
  const urls = {};
  if (!req.files) return urls;

  const mapping = {
    logoName: "logoDataUrl",
    stampName: "stampDataUrl",
    signatureNameMeta: "signatureDataUrl",
    logo: "logoDataUrl",
    stamp: "stampDataUrl",
    signature: "signatureDataUrl",
  };

  Object.keys(mapping).forEach((field) => {
    const arr = req.files[field];
    if (Array.isArray(arr) && arr[0]) {
      const filename =
        arr[0].filename || (arr[0].path && path.basename(arr[0].path));
      if (filename) {
        urls[mapping[field]] = `${API_BASE}/uploads/${filename}`;
      }
    }
  });

  return urls;
}

function sanitizeItems(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems.slice(0, 100) : [];

  return items
    .map((item, index) => ({
      id: String(index + 1),
      description:
        str(item?.description, 500),
      qty: Number(item?.qty ?? 1),
      unitPrice: Number(item?.unitPrice ?? 0),
    }))
    .filter((item) => item.description.length > 0)
    .map((item) => ({
      ...item,
      qty: Number.isFinite(item.qty) && item.qty > 0 && item.qty < 1e7 ? item.qty : 1,
      unitPrice:
        Number.isFinite(item.unitPrice) && item.unitPrice >= 0 && item.unitPrice < 1e9
          ? item.unitPrice
          : 0,
    }));
}

function normalizeClient(clientValue) {
  if (typeof clientValue === "string" && clientValue.trim()) {
    return {
      name: str(clientValue, 120),
      email: "",
      address: "",
      phone: "",
    };
  }

  if (clientValue && typeof clientValue === "object") {
    return {
      name: str(clientValue.name, 120),
      email: str(clientValue.email, 120),
      address: str(clientValue.address, 300),
      phone: str(clientValue.phone, 40),
    };
  }

  return {
    name: "",
    email: "",
    address: "",
    phone: "",
  };
}

async function generateUniqueInvoiceNumber(attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const ts = Date.now().toString();
    const suffix = Math.floor(Math.random() * 900000)
      .toString()
      .padStart(6, "0");
    const candidate = `INV-${ts.slice(-6)}-${suffix}`;

    const exists = await Invoice.exists({ invoiceNumber: candidate });
    if (!exists) return candidate;

    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  return new mongoose.Types.ObjectId().toString();
}

// CREATE
export async function createInvoice(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const body = req.body || {};

    const parsedItems = Array.isArray(body.items)
      ? body.items
      : parseItemField(body.items);

    const items = sanitizeItems(parsedItems);

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "At least one invoice item with a description is required.",
      });
    }

    const taxPercent = cleanTax(body.taxPercent ?? body.tax ?? body.defaultTaxPercent ?? 0);

    const totals = computeTotals(items, taxPercent);
    const fileUrls = uploadedFilesToUrls(req);

    const invoiceNumberProvided =
      typeof body.invoiceNumber === "string" && body.invoiceNumber.trim()
        ? str(body.invoiceNumber, 40)
        : null;

    if (invoiceNumberProvided) {
      const duplicate = await Invoice.exists({
        owner: userId,
        invoiceNumber: invoiceNumberProvided,
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Invoice number already exists",
        });
      }
    }

    const invoiceNumber =
      invoiceNumberProvided || (await generateUniqueInvoiceNumber());

    const doc = new Invoice({
      _id: new mongoose.Types.ObjectId(),
      owner: userId,
      invoiceNumber,
      issueDate: cleanDate(body.issueDate, new Date().toISOString().slice(0, 10)),
      dueDate: cleanDate(body.dueDate),
      fromBusinessName: str(body.fromBusinessName, 120),
      fromEmail: str(body.fromEmail, 120),
      fromAddress: str(body.fromAddress, 300),
      fromPhone: str(body.fromPhone, 40),
      fromTaxId: str(body.fromTaxId || body.fromGst, 40),
      client: normalizeClient(body.client),
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: cleanCurrency(body.currency),
      status: cleanStatus(body.status),
      taxPercent,
      logoDataUrl:
        fileUrls.logoDataUrl || cleanAsset(body.logoDataUrl || body.logo),
      stampDataUrl:
        fileUrls.stampDataUrl || cleanAsset(body.stampDataUrl || body.stamp),
      signatureDataUrl:
        fileUrls.signatureDataUrl || cleanAsset(body.signatureDataUrl || body.signature),
      signatureName: str(body.signatureName, 100),
      signatureTitle: str(body.signatureTitle, 100),
      notes: str(body.notes || body.aiSource, 2000),
    });

    let saved = null;
    let attempts = 0;

    while (attempts < 6) {
      try {
        saved = await doc.save();
        break;
      } catch (err) {
        if (
          err &&
          err.code === 11000 &&
          err.keyPattern &&
          err.keyPattern.invoiceNumber
        ) {
          attempts++;
          doc.invoiceNumber = await generateUniqueInvoiceNumber();
          continue;
        }
        throw err;
      }
    }

    if (!saved) {
      return res.status(500).json({
        success: false,
        message: "Failed to create invoice",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Invoice created",
      data: saved,
    });
  } catch (err) {
    console.error("createInvoice error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// GET ALL
export async function getInvoices(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const q = { owner: userId };

    if (typeof req.query.status === "string" && STATUSES.includes(req.query.status)) q.status = req.query.status;
    if (typeof req.query.invoiceNumber === "string") q.invoiceNumber = str(req.query.invoiceNumber, 40);

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = escapeRegex(str(req.query.search, 80));
      q.$or = [
        { fromEmail: { $regex: search, $options: "i" } },
        { "client.email": { $regex: search, $options: "i" } },
        { "client.name": { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await Invoice.find(q).sort({ createdAt: -1 }).limit(1000).lean();

    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (err) {
    console.error("GETINVOICE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

// GET BY ID
export async function getInvoiceById(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { id } = req.params;

    const inv = await Invoice.findOne(
      isObjectIdString(id) ? { _id: id, owner: userId } : { invoiceNumber: str(id, 40), owner: userId }
    );

    if (!inv) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (inv.owner && String(inv.owner) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    return res.status(200).json({
      success: true,
      data: inv,
    });
  } catch (err) {
    console.error("GETINVOICEBYID ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}

// UPDATE
export async function updateInvoice(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { id } = req.params;
    const body = req.body || {};

    const query = isObjectIdString(id)
      ? { _id: id, owner: userId }
      : { invoiceNumber: str(id, 40), owner: userId };

    const existing = await Invoice.findOne(query);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (
      body.invoiceNumber &&
      String(body.invoiceNumber).trim() !== existing.invoiceNumber
    ) {
      const conflict = await Invoice.findOne({
        owner: userId,
        invoiceNumber: str(body.invoiceNumber, 40),
      });

      if (conflict && String(conflict._id) !== String(existing._id)) {
        return res.status(409).json({
          success: false,
          message: "Invoice number already exists",
        });
      }
    }

    const parsedItems =
      body.items !== undefined
        ? Array.isArray(body.items)
          ? body.items
          : parseItemField(body.items)
        : existing.items;

    const items = sanitizeItems(parsedItems);

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "At least one invoice item with a description is required.",
      });
    }

    const taxPercent = cleanTax(body.taxPercent ?? body.tax ?? body.defaultTaxPercent ?? existing.taxPercent ?? 0);

    const totals = computeTotals(items, taxPercent);
    const fileUrls = uploadedFilesToUrls(req);

    const update = {
      invoiceNumber: body.invoiceNumber ? str(body.invoiceNumber, 40) : existing.invoiceNumber,
      issueDate: cleanDate(body.issueDate, existing.issueDate),
      dueDate: body.dueDate !== undefined ? cleanDate(body.dueDate) : existing.dueDate,
      fromBusinessName: body.fromBusinessName !== undefined ? str(body.fromBusinessName, 120) : existing.fromBusinessName,
      fromEmail: body.fromEmail !== undefined ? str(body.fromEmail, 120) : existing.fromEmail,
      fromAddress: body.fromAddress !== undefined ? str(body.fromAddress, 300) : existing.fromAddress,
      fromPhone: body.fromPhone !== undefined ? str(body.fromPhone, 40) : existing.fromPhone,
      fromTaxId: str(body.fromTaxId ?? body.fromGst ?? existing.fromTaxId ?? "", 40),
      client:
        body.client !== undefined
          ? normalizeClient(body.client)
          : existing.client,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      currency: cleanCurrency(body.currency, existing.currency),
      status: cleanStatus(body.status, existing.status),
      taxPercent,
      logoDataUrl:
        fileUrls.logoDataUrl ?? cleanAsset(body.logoDataUrl ?? body.logo) ?? existing.logoDataUrl,
      stampDataUrl:
        fileUrls.stampDataUrl ?? cleanAsset(body.stampDataUrl ?? body.stamp) ?? existing.stampDataUrl,
      signatureDataUrl:
        fileUrls.signatureDataUrl ?? cleanAsset(body.signatureDataUrl ?? body.signature) ?? existing.signatureDataUrl,
      signatureName: body.signatureName !== undefined ? str(body.signatureName, 100) : existing.signatureName,
      signatureTitle: body.signatureTitle !== undefined ? str(body.signatureTitle, 100) : existing.signatureTitle,
      notes: str(body.notes ?? body.aiSource ?? existing.notes, 2000),
    };

    const updated = await Invoice.findByIdAndUpdate(
      existing._id,
      { $set: update },
      { returnDocument: "after", runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Invoice updated",
      data: updated,
    });
  } catch (err) {
    console.error("updateInvoice error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// DELETE
export async function deleteInvoice(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { id } = req.params;

    const query = isObjectIdString(id)
      ? { _id: id, owner: userId }
      : { invoiceNumber: str(id, 40), owner: userId };

    const found = await Invoice.findOne(query);

    if (!found) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    await Invoice.deleteOne({ _id: found._id });

    return res.status(200).json({
      success: true,
      message: "Invoice deleted",
    });
  } catch (err) {
    console.error("DELETEINVOICE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
}