"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import { getNavState, setNavState } from "@/lib/navState";
import { notify } from "@/lib/notify";
import { Eye, Save, Plus, Trash2, Upload, Building2, UserRound, ListChecks, ImageIcon, Stamp, PenLine } from "lucide-react";
import { PageHeader, Card, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui";

/* ---------- API BASE ---------- */
import { API_BASE } from "@/lib/config";

/* ---------- storage helpers (unchanged) ---------- */
/* ----------------- frontend-only: normalize image URLs ----------------- */
function resolveImageUrl(url) {
  if (!url) return null;
  const s = String(url).trim();

  // keep data/blobs as-is
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;

  // absolute http(s)
  if (/^https?:\/\//i.test(s)) {
    try {
      const parsed = new URL(s);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        // rewrite localhost -> API_BASE (preserve path/search/hash)
        const path =
          parsed.pathname + (parsed.search || "") + (parsed.hash || "");
        return `${API_BASE.replace(/\/+$/, "")}${path}`;
      }
      return parsed.href;
    } catch {
      // fall through to relative handling
    }
  }

  // relative paths like "/uploads/..." or "uploads/..." -> prefix with API_BASE
  return `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
}

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (error) {
    console.warn("Failed to write localStorage:", error);
  }
}

/* ---------- local invoices helpers (fallback) ---------- */
function getStoredInvoices() {
  return readJSON("invoices_v1", []) || [];
}
function saveStoredInvoices(arr) {
  writeJSON("invoices_v1", arr);
}

/* ---------- util ---------- */
function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn("Failed to generate uuid:", error);
  }
  return Math.random().toString(36).slice(2, 9);
}
function currencyFmt(amount = 0, currency = "USD") {
  try {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    }
    if (currency === "EUR") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
      }).format(amount);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
function computeTotals(items = [], taxPercent = 0) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : [];
  const subtotal = safe.reduce(
    (s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0),
    0
  );
  const tax = (subtotal * Number(taxPercent || 0)) / 100;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

/* ---------- icons ---------- (kept same as before) */
const PreviewIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const SaveIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const UploadIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const AddIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 5v14m-7-7h14" />
  </svg>
);

/* ---------- Component (Create / Edit Invoice) ---------- */
export default function CreateInvoice() {
  const router = useRouter();
  const { id } = useParams(); // if editing, id will be present
  // Next's router has no equivalent of react-router's `navigate(to, { state })`;
  // any invoice object handed off from another page (AI generation, preview->edit,
  // create->preview) is bridged via sessionStorage, keyed by the id in the URL.
  const invoiceFromState = id ? getNavState(id) : null;
  const isEditing = Boolean(id && id !== "new");

  // Auth hooks
  const { getToken, isSignedIn } = useAuth();

  // helper to obtain token with a retry
  const obtainToken = useCallback(async () => {
    if (typeof getToken !== "function") return null;
    try {
      let token = await getToken({ template: "default" }).catch(() => null);
      if (!token) {
        token = await getToken({ forceRefresh: true }).catch(() => null);
      }
      return token;
    } catch {
      return null;
    }
  }, [getToken]);

  // invoice & items state
  function buildDefaultInvoice() {
    // Use a safe client-side local id for previews and local storage.
    const localId = uid();
    return {
      id: localId, // local preview id (server will return _id after save)
      invoiceNumber: "", // will be set on creation by generator
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      fromBusinessName: "",
      fromEmail: "",
      fromAddress: "",
      fromPhone: "",
      fromTaxId: "", // EIN for US, VAT for Europe
      client: { name: "", email: "", address: "", phone: "" },
      items: [
        { id: uid(), description: "Service / Item", qty: 1, unitPrice: 0 },
      ],
      currency: "USD",
      status: "draft",
      stampDataUrl: null,
      signatureDataUrl: null,
      logoDataUrl: null,
      signatureName: "",
      signatureTitle: "",
      // leave taxPercent undefined so business profile default can fill it
      taxPercent: undefined,
      notes: "",
    };
  }

  const [invoice, setInvoice] = useState(() => buildDefaultInvoice());
  const [items, setItems] = useState(invoice.items || []);
  const [loading, setLoading] = useState(false);

  // profile fetched from server

  /* ---------- helpers for invoice editing ---------- */
  function updateInvoiceField(field, value) {
    setInvoice((inv) => (inv ? { ...inv, [field]: value } : inv));
  }
  function updateClient(field, value) {
    setInvoice((inv) =>
      inv ? { ...inv, client: { ...(inv.client || {}), [field]: value } } : inv
    );
  }

  function updateItem(idx, key, value) {
    setItems((arr) => {
      const copy = arr.slice();
      const it = { ...(copy[idx] || {}) };
      if (key === "description") it.description = value;
      else it[key] = Number(value) || 0;
      copy[idx] = it;
      setInvoice((inv) => (inv ? { ...inv, items: copy } : inv));
      return copy;
    });
  }
  function addItem() {
    const it = { id: uid(), description: "", qty: 1, unitPrice: 0 };
    setItems((arr) => {
      const next = [...arr, it];
      setInvoice((inv) => (inv ? { ...inv, items: next } : inv));
      return next;
    });
  }
  function removeItem(idx) {
    setItems((arr) => {
      const next = arr.filter((_, i) => i !== idx);
      setInvoice((inv) => (inv ? { ...inv, items: next } : inv));
      return next;
    });
  }

  /* status & currency handlers */
  function handleStatusChange(newStatus) {
    setInvoice((inv) => (inv ? { ...inv, status: newStatus } : inv));
  }
  function handleCurrencyChange(newCurrency) {
    setInvoice((inv) => (inv ? { ...inv, currency: newCurrency } : inv));
  }

  /* images - keep as data URLs in the invoice object */
  function handleImageUpload(file, kind = "logo") {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      notify.error("Unsupported image", "Use a PNG, JPG or WEBP image under 5 MB.");
      return;
    }
    // Downscale in the browser so the stored data URL stays small (server caps inline images).
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = kind === "logo" ? 520 : 420;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let dataUrl = c.toDataURL(file.type === "image/png" ? "image/png" : "image/webp", 0.85);
      if (dataUrl.length > 600000) dataUrl = c.toDataURL("image/webp", 0.7);
      if (dataUrl.length > 650000) { notify.error("Image is too detailed", "Try a smaller one."); return; }
      setInvoice((inv) => (inv ? { ...inv, [`${kind}DataUrl`]: dataUrl } : inv));
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }
  function removeImage(kind = "logo") {
    setInvoice((inv) =>
      inv
        ? {
          ...inv,
          [`${kind}DataUrl`]: null,
          ...(kind === "logo" ? { logoDataUrl: null } : {}),
        }
        : inv
    );
  }

  /* ---------- helper: check candidate invoiceNumber exists on server/local ---------- */
  const checkInvoiceExists = useCallback(
    async (candidate) => {
      // Check local storage first
      const local = getStoredInvoices();
      if (local.some((x) => x && x.invoiceNumber === candidate)) return true;

      // If we have token, ask server
      try {
        const token = await obtainToken();
        const headers = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_BASE}/api/invoices?invoiceNumber=${encodeURIComponent(
            candidate
          )}`,
          { method: "GET", headers }
        );
        if (!res.ok) {
          // if unauthorized or server error, treat as "not found" to avoid blocking generation;
          // collisions will still be caught on save (server returns 409).
          return false;
        }
        const json = await res.json().catch(() => null);
        const data = json?.data || json || [];
        if (Array.isArray(data) && data.length > 0) return true;
        return false;
      } catch {
        // network / other error -> assume not exists (we rely on server-side check on save)
        return false;
      }
    },
    [obtainToken]
  );

  /* ---------- generator: create a candidate and ensure uniqueness (tries up to N times) ---------- */
  const generateUniqueInvoiceNumber = useCallback(
    async (attempts = 10) => {
      for (let i = 0; i < attempts; i++) {
        const datePart = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");
        const rand = Math.floor(Math.random() * 9000) + 1000; // 4 digit
        const candidate = `INV-${datePart}-${rand}`;
        // quick local check first
        const exists = await checkInvoiceExists(candidate);
        if (!exists) return candidate;
        // else loop to try again
      }
      // fallback: use uid suffix if all attempts collide (very unlikely)
      return `INV-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${uid().slice(0, 4)}`;
    },
    [checkInvoiceExists]
  );

  /* ---------- fetch business profile as soon as page loads (when signed in) ---------- */
  useEffect(() => {
    let mounted = true;

    async function fetchBusinessProfile() {
      if (!isSignedIn) return;
      try {
        const token = await obtainToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/businessProfile/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          // don't throw — just ignore profile if not accessible
          return;
        }
        const json = await res.json().catch(() => null);
        const data = json?.data || json || null;
        if (!data || !mounted) return;

        const serverProfile = {
          businessName: data.businessName ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          taxId: data.taxId ?? data.gst ?? "", // Support legacy GST field
          defaultTaxPercent: data.defaultTaxPercent ?? 0,
          signatureOwnerName: data.signatureOwnerName ?? "",
          signatureOwnerTitle: data.signatureOwnerTitle ?? "",
          logoUrl: data.logoUrl ?? null,
          stampUrl: data.stampUrl ?? null,
          signatureUrl: data.signatureUrl ?? null,
        };


        // Merge into invoice only if those invoice fields are empty/unset
        setInvoice((prev) => {
          if (!prev) return prev;
          const shouldOverwriteBusinessName =
            !prev.fromBusinessName || prev.fromBusinessName.trim() === "";
          const shouldOverwriteEmail =
            !prev.fromEmail || prev.fromEmail.trim() === "";
          const shouldOverwriteAddress =
            !prev.fromAddress || prev.fromAddress.trim() === "";
          const shouldOverwritePhone =
            !prev.fromPhone || prev.fromPhone.trim() === "";
          const shouldOverwriteTaxId =
            !prev.fromTaxId || prev.fromTaxId.trim() === "";

          const merged = {
            ...prev,
            fromBusinessName: shouldOverwriteBusinessName
              ? serverProfile.businessName
              : prev.fromBusinessName,
            fromEmail: shouldOverwriteEmail
              ? serverProfile.email
              : prev.fromEmail,
            fromAddress: shouldOverwriteAddress
              ? serverProfile.address
              : prev.fromAddress,
            fromPhone: shouldOverwritePhone
              ? serverProfile.phone
              : prev.fromPhone,
            fromTaxId: shouldOverwriteTaxId ? serverProfile.taxId : prev.fromTaxId,
            logoDataUrl:
              prev.logoDataUrl ||
              resolveImageUrl(serverProfile.logoUrl) ||
              null,
            stampDataUrl:
              prev.stampDataUrl ||
              resolveImageUrl(serverProfile.stampUrl) ||
              null,
            signatureDataUrl:
              prev.signatureDataUrl ||
              resolveImageUrl(serverProfile.signatureUrl) ||
              null,
            signatureName:
              prev.signatureName || serverProfile.signatureOwnerName || "",
            signatureTitle:
              prev.signatureTitle || serverProfile.signatureOwnerTitle || "",
            taxPercent:
              prev && prev.taxPercent !== undefined && prev.taxPercent !== null
                ? prev.taxPercent
                : serverProfile.defaultTaxPercent,
          };

          return merged;
        });
      } catch (err) {
        console.warn("Failed to fetch business profile:", err);
      }
    }

    fetchBusinessProfile();

    return () => {
      mounted = false;
    };
  }, [isSignedIn, obtainToken]);

  /* ---------- load invoice when editing (server first, fallback local) ---------- */
  useEffect(() => {
    let mounted = true;

    async function prepare() {
      // If AI/Gemini/preview handoff passed an invoice via sessionStorage
      if (invoiceFromState) {
        // merge then normalize any image URLs that may be `http://localhost:...`
        const base = { ...buildDefaultInvoice(), ...invoiceFromState };

        base.logoDataUrl =
          resolveImageUrl(base.logoDataUrl ?? base.logoUrl ?? base.logo) ||
          null;
        base.stampDataUrl =
          resolveImageUrl(base.stampDataUrl ?? base.stampUrl ?? base.stamp) ||
          null;
        base.signatureDataUrl =
          resolveImageUrl(
            base.signatureDataUrl ?? base.signatureUrl ?? base.signature
          ) || null;

        setInvoice(base);

        setItems(
          Array.isArray(invoiceFromState.items)
            ? invoiceFromState.items.slice()
            : invoiceFromState.items
              ? [...invoiceFromState.items]
              : buildDefaultInvoice().items
        );

        return;
      }

      // If editing and no invoiceFromState then fetch from server (or local fallback)
      if (isEditing && !invoiceFromState) {
        setLoading(true);
        try {
          const token = await obtainToken();
          const headers = { Accept: "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`${API_BASE}/api/invoices/${id}`, {
            method: "GET",
            headers,
          });
          if (res.ok) {
            const json = await res.json().catch(() => null);
            const data = json?.data || json || null;
            if (data && mounted) {
              const merged = { ...buildDefaultInvoice(), ...data };
              merged.id = data._id ?? data.id ?? merged.id;
              merged.invoiceNumber = data.invoiceNumber ?? merged.invoiceNumber;

              // normalize server-returned image fields (rewrite localhost/relative -> API_BASE)
              merged.logoDataUrl =
                resolveImageUrl(
                  data.logoDataUrl ?? data.logoUrl ?? data.logo
                ) ||
                merged.logoDataUrl ||
                null;
              merged.stampDataUrl =
                resolveImageUrl(
                  data.stampDataUrl ?? data.stampUrl ?? data.stamp
                ) ||
                merged.stampDataUrl ||
                null;
              merged.signatureDataUrl =
                resolveImageUrl(
                  data.signatureDataUrl ?? data.signatureUrl ?? data.signature
                ) ||
                merged.signatureDataUrl ||
                null;

              setInvoice(merged);
              setItems(
                Array.isArray(data.items) ? data.items.slice() : merged.items
              );
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // ignore and fallback
          console.warn(
            "Server invoice fetch failed, will fallback to local:",
            err
          );
        } finally {
          setLoading(false);
        }

        // fallback to local storage
        const all = getStoredInvoices();
        const found = all.find(
          (x) => x && (x.id === id || x._id === id || x.invoiceNumber === id)
        );
        if (found && mounted) {
          const fixed = { ...buildDefaultInvoice(), ...found };

          fixed.logoDataUrl =
            resolveImageUrl(found.logoDataUrl ?? found.logoUrl ?? found.logo) ||
            fixed.logoDataUrl ||
            null;
          fixed.stampDataUrl =
            resolveImageUrl(
              found.stampDataUrl ?? found.stampUrl ?? found.stamp
            ) ||
            fixed.stampDataUrl ||
            null;
          fixed.signatureDataUrl =
            resolveImageUrl(
              found.signatureDataUrl ?? found.signatureUrl ?? found.signature
            ) ||
            fixed.signatureDataUrl ||
            null;

          setInvoice(fixed);
          setItems(
            Array.isArray(found.items)
              ? found.items.slice()
              : buildDefaultInvoice().items
          );
        }

        return;
      }

      // Creating new (neither editing nor invoiceFromState)
      // Build default invoice then generate unique invoiceNumber and set it
      setInvoice((prev) => ({ ...buildDefaultInvoice(), ...prev }));
      setItems(buildDefaultInvoice().items);

      // generate unique invoice number for new invoices
      if (!isEditing) {
        try {
          const candidate = await generateUniqueInvoiceNumber(10);
          if (mounted) {
            setInvoice((inv) =>
              inv ? { ...inv, invoiceNumber: candidate } : inv
            );
          }
        } catch (err) {
          // ignore, keep empty (server will handle on save)
          console.warn("Invoice number generation failed:", err);
        }
      }
    }

    prepare();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    isEditing,
    obtainToken,
    generateUniqueInvoiceNumber,
  ]);

  /* ---------- Save invoice to backend (POST or PUT) using auth token ---------- */
  async function handleSave() {
    if (!invoice) return;
    setLoading(true);

    try {
      // Build prepared object but OMIT invoiceNumber when empty so server auto-generates.
      const prepared = {
        issueDate: invoice.issueDate || "",
        dueDate: invoice.dueDate || "",
        fromBusinessName: invoice.fromBusinessName || "",
        fromEmail: invoice.fromEmail || "",
        fromAddress: invoice.fromAddress || "",
        fromPhone: invoice.fromPhone || "",
        fromTaxId: invoice.fromTaxId || invoice.fromGst || "", // Support legacy GST field
        client: invoice.client || {},
        items: items || [],
        currency: invoice.currency || "USD",
        status: invoice.status || "draft",
        taxPercent: Number(invoice.taxPercent ?? 0),
        subtotal: computeTotals(items, invoice.taxPercent).subtotal,
        tax: computeTotals(items, invoice.taxPercent).tax,
        total: computeTotals(items, invoice.taxPercent).total,
        logoDataUrl: invoice.logoDataUrl || null,
        stampDataUrl: invoice.stampDataUrl || null,
        signatureDataUrl: invoice.signatureDataUrl || null,
        signatureName: invoice.signatureName || "",
        signatureTitle: invoice.signatureTitle || "",
        notes: invoice.notes || "",
        localId: invoice.id,
      };

      // include invoiceNumber only if provided (we prefill for new invoices)
      if (
        invoice.invoiceNumber &&
        String(invoice.invoiceNumber).trim().length > 0
      ) {
        prepared.invoiceNumber = String(invoice.invoiceNumber).trim();
      }

      const endpoint =
        isEditing && invoice.id
          ? `${API_BASE}/api/invoices/${invoice.id}`
          : `${API_BASE}/api/invoices`;
      const method = isEditing && invoice.id ? "PUT" : "POST";

      // try to obtain auth token; if present include Authorization
      const token = await obtainToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(prepared),
      });

      // handle conflict (409) when user supplied invoiceNumber already exists
      if (res.status === 409) {
        const json = await res.json().catch(() => null);
        const message = json?.message || "Invoice number already exists.";
        // Let the user decide — do not auto-retry; they may want to pick a different number.
        throw new Error(message);
      }

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || `Save failed (${res.status})`;
        throw new Error(msg);
      }

      const saved = json?.data || json || null;
      const savedId = saved?._id ?? saved?.id ?? invoice.id;

      // Use server-provided invoiceNumber (if server generated one)
      const merged = {
        ...prepared,
        id: savedId,
        invoiceNumber:
          saved?.invoiceNumber ??
          prepared.invoiceNumber ??
          invoice.invoiceNumber,
        subtotal: saved?.subtotal ?? prepared.subtotal,
        tax: saved?.tax ?? prepared.tax,
        total: saved?.total ?? prepared.total,
      };

      setInvoice((inv) => ({ ...inv, ...merged }));
      setItems(Array.isArray(saved?.items) ? saved.items : items);

      // update local stored invoices (keep local fallback in sync)
      const all = getStoredInvoices();
      if (isEditing) {
        const idx = all.findIndex(
          (x) =>
            x &&
            (x.id === invoice.id ||
              x._id === invoice.id ||
              x.invoiceNumber === invoice.invoiceNumber)
        );
        if (idx >= 0) all[idx] = merged;
        else all.unshift(merged);
      } else {
        // For newly created, use server's invoiceNumber/id if provided
        all.unshift(merged);
      }
      saveStoredInvoices(all);

      notify.success(`Invoice ${isEditing ? "updated" : "created"} successfully.`);
      router.push("/app/invoices");
    } catch (err) {
      console.error("Failed to save invoice to server:", err);

      // If it was a 409 conflict (duplicate invoice number provided by user), show message and let user fix.
      if (
        String(err?.message || "")
          .toLowerCase()
          .includes("invoice number")
      ) {
        notify.error("Invoice number already in use", err.message || "Choose another invoice number.");
        setLoading(false);
        return;
      }

      // fallback: save locally
      try {
        const all = getStoredInvoices();
        const preparedLocal = {
          ...invoice,
          items,
          subtotal: computeTotals(items, invoice.taxPercent).subtotal,
          tax: computeTotals(items, invoice.taxPercent).tax,
          total: computeTotals(items, invoice.taxPercent).total,
        };
        if (isEditing) {
          const idx = all.findIndex(
            (x) =>
              x &&
              (x.id === invoice.id ||
                x._id === invoice.id ||
                x.invoiceNumber === invoice.invoiceNumber)
          );
          if (idx >= 0) all[idx] = preparedLocal;
          else all.unshift(preparedLocal);
        } else {
          all.unshift(preparedLocal);
        }
        saveStoredInvoices(all);
        notify.warning("Saved locally as a fallback", "The server could not be reached.");
        router.push("/app/invoices");
      } catch (localErr) {
        console.error("Local fallback failed:", localErr);
        notify.error("Save failed", err?.message || "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePreview() {
    const prepared = {
      ...invoice,
      items,
      subtotal: computeTotals(items, invoice.taxPercent).subtotal,
      tax: computeTotals(items, invoice.taxPercent).tax,
      total: computeTotals(items, invoice.taxPercent).total,
    };
    setNavState(invoice.id, prepared);
    router.push(`/app/invoices/${invoice.id}/preview`);
  }

  const totals = computeTotals(items, invoice?.taxPercent ?? 0);

  /* ---------- JSX (kept structure, invoiceNumber input prefills generated value) ---------- */
  const money = (n) => currencyFmt(n, invoice.currency);
  const set = (f) => (e) => updateInvoiceField(f, e.target.value);
  const cl = (f) => (e) => updateClient(f, e.target.value);
  const STATUSES = ["draft", "unpaid", "paid", "overdue"];
  const SECTION_ICON = "grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100";

  const ImageSlot = ({ kind, label, hint, Icon }) => {
    const src = invoice?.[`${kind}DataUrl`];
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon size={16} className="text-brand-700" /> {label}</div>
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-200 bg-white">
            {src ? <img src={src} alt={`${label} preview`} className="max-h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <ImageIcon size={24} className="text-ink-300" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-500">{hint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-ink-900 focus-within:ring-4 focus-within:ring-brand-100">
                <Upload size={13} /> {src ? "Replace" : "Upload"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { handleImageUpload(e.target.files && e.target.files[0], kind); e.target.value = ""; }} />
              </label>
              {src && <button type="button" onClick={() => removeImage(kind)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={13} /> Remove</button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={isEditing ? "Editing" : "New"}
        title={isEditing ? "Edit invoice" : "Create invoice"}
        subtitle={isEditing ? "Update details and line items." : "Fill in the details, add line items and branding."}
        actions={<>
          <button type="button" onClick={handlePreview} className={btnSecondary}><Eye size={16} /> Preview</button>
          <button type="button" onClick={handleSave} disabled={loading} className={btnPrimary}><Save size={16} /> {loading ? "Saving..." : isEditing ? "Update invoice" : "Save invoice"}</button>
        </>}
      />

      <Card className="p-7">
        <div className="grid gap-5 md:grid-cols-3">
          <div><label className={labelCls} htmlFor="ci-num">Invoice number</label><input id="ci-num" maxLength={40} className={`${inputCls} num`} value={invoice?.invoiceNumber || ""} onChange={set("invoiceNumber")} /></div>
          <div><label className={labelCls} htmlFor="ci-issue">Issue date</label><input id="ci-issue" type="date" className={inputCls} value={invoice?.issueDate || ""} onChange={set("issueDate")} /></div>
          <div><label className={labelCls} htmlFor="ci-due">Due date</label><input id="ci-due" type="date" className={inputCls} value={invoice?.dueDate || ""} onChange={set("dueDate")} /></div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <fieldset>
            <legend className={labelCls}>Currency</legend>
            <div className="grid grid-cols-2 gap-3">
              {[["USD", "$", "US Dollar"], ["EUR", "\u20AC", "Euro"]].map(([c, sym, n]) => (
                <button key={c} type="button" onClick={() => handleCurrencyChange(c)} aria-pressed={invoice.currency === c}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${invoice.currency === c ? "border-brand-600 bg-brand-50 ring-4 ring-brand-100" : "border-ink-200 bg-white hover:border-ink-400"}`}>
                  <span className="num grid h-9 w-9 place-items-center rounded-xl bg-ink-950 text-base font-semibold text-signal">{sym}</span>
                  <span><span className="block text-sm font-semibold">{n}</span><span className="num text-xs text-ink-500">{c}</span></span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Status</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map((st) => (
                <button key={st} type="button" onClick={() => handleStatusChange(st)} aria-pressed={invoice.status === st}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition ${invoice.status === st ? "border-ink-950 bg-ink-950 text-paper" : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"}`}>{st}</button>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-7">
            <div className="mb-6 flex items-center gap-3"><span className={SECTION_ICON}><Building2 size={19} /></span><h2 className="text-lg font-semibold">Bill from</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="bf-name">Business name</label><input id="bf-name" maxLength={120} className={inputCls} placeholder="Your business name" value={invoice?.fromBusinessName ?? ""} onChange={set("fromBusinessName")} /></div>
              <div><label className={labelCls} htmlFor="bf-email">Email</label><input id="bf-email" type="email" maxLength={120} className={inputCls} placeholder="billing@business.com" value={invoice?.fromEmail ?? ""} onChange={set("fromEmail")} /></div>
              <div className="sm:col-span-2"><label className={labelCls} htmlFor="bf-addr">Address</label><textarea id="bf-addr" rows={3} maxLength={300} className={inputCls} placeholder="Street, city, postal code, country" value={invoice?.fromAddress ?? ""} onChange={set("fromAddress")} /></div>
              <div><label className={labelCls} htmlFor="bf-phone">Phone</label><input id="bf-phone" maxLength={40} className={inputCls} placeholder="+1 555 123 4567" value={invoice?.fromPhone ?? ""} onChange={set("fromPhone")} /></div>
              <div><label className={labelCls} htmlFor="bf-tax">Tax ID (EIN / VAT)</label><input id="bf-tax" maxLength={40} className={`${inputCls} num`} placeholder="12-3456789 or DE123456789" value={invoice?.fromTaxId ?? invoice?.fromGst ?? ""} onChange={set("fromTaxId")} /></div>
            </div>
          </Card>

          <Card className="p-7">
            <div className="mb-6 flex items-center gap-3"><span className={SECTION_ICON}><UserRound size={19} /></span><h2 className="text-lg font-semibold">Bill to</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="bt-name">Client name</label><input id="bt-name" maxLength={120} className={inputCls} placeholder="Client or company" value={invoice?.client?.name || ""} onChange={cl("name")} /></div>
              <div><label className={labelCls} htmlFor="bt-email">Client email</label><input id="bt-email" type="email" maxLength={120} className={inputCls} placeholder="client@email.com" value={invoice?.client?.email || ""} onChange={cl("email")} /></div>
              <div className="sm:col-span-2"><label className={labelCls} htmlFor="bt-addr">Client address</label><textarea id="bt-addr" rows={3} maxLength={300} className={inputCls} value={invoice?.client?.address || ""} onChange={cl("address")} /></div>
              <div><label className={labelCls} htmlFor="bt-phone">Client phone</label><input id="bt-phone" maxLength={40} className={inputCls} value={invoice?.client?.phone || ""} onChange={cl("phone")} /></div>
            </div>
          </Card>

          <Card className="p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className={SECTION_ICON}><ListChecks size={19} /></span><h2 className="text-lg font-semibold">Items &amp; services</h2></div>
              <span className="num rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">Amounts in {invoice.currency}</span>
            </div>
            <div className="hidden grid-cols-[1fr_90px_130px_130px_40px] gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-500 md:grid">
              <span>Description</span><span>Qty</span><span>Unit price</span><span className="text-right">Total</span><span />
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => {
                const totalLabel = money(Number(it?.qty || 0) * Number(it?.unitPrice || 0));
                return (
                  <div key={it?.id ?? idx} className="grid gap-3 rounded-2xl border border-ink-200 bg-ink-50/50 p-3 md:grid-cols-[1fr_90px_130px_130px_40px] md:items-center md:border-0 md:bg-transparent md:p-0">
                    <input aria-label={`Item ${idx + 1} description`} maxLength={500} className={inputCls} placeholder="Item description" value={it?.description ?? ""} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                    <input aria-label={`Item ${idx + 1} quantity`} inputMode="numeric" pattern="[0-9]*" className={`${inputCls} num`} value={String(it?.qty ?? "")} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                    <input aria-label={`Item ${idx + 1} unit price`} inputMode="decimal" className={`${inputCls} num`} value={String(it?.unitPrice ?? "")} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                    <div className="num text-right text-sm font-semibold" aria-label={`Item ${idx + 1} total`}>{totalLabel}</div>
                    <button type="button" onClick={() => removeItem(idx)} aria-label={`Remove item ${idx + 1}`} className="grid h-10 w-10 place-items-center justify-self-end rounded-full text-rose-600 transition hover:bg-rose-50"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addItem} className="mt-5 inline-flex items-center gap-2 rounded-full border border-dashed border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700"><Plus size={16} /> Add item</button>
            <div className="mt-6">
              <label className={labelCls} htmlFor="ci-notes">Notes</label>
              <textarea id="ci-notes" rows={3} maxLength={2000} className={inputCls} placeholder="Payment terms, bank details, thank-you note..." value={invoice?.notes || ""} onChange={set("notes")} />
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden">
            <div className="p-7">
              <h2 className="mb-5 text-lg font-semibold">Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-ink-600"><span>Subtotal</span><span className="num font-medium text-ink-900">{money(totals.subtotal)}</span></div>
                <div className="flex items-center justify-between gap-4 text-ink-600">
                  <label htmlFor="ci-tax">Tax (%)</label>
                  <input id="ci-tax" type="number" min="0" max="100" step="0.1" className={`${inputCls} num w-24 text-right`} value={invoice.taxPercent ?? 0} onChange={(e) => updateInvoiceField("taxPercent", Math.min(100, Math.max(0, Number(e.target.value || 0))))} />
                </div>
                <div className="flex justify-between text-ink-600"><span>Tax amount</span><span className="num font-medium text-ink-900">{money(totals.tax)}</span></div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-ink-950 px-7 py-5 text-paper">
              <span className="font-medium">Total due</span>
              <span className="num text-2xl font-semibold text-signal">{money(totals.total)}</span>
            </div>
          </Card>

          <Card className="space-y-4 p-7">
            <h2 className="text-lg font-semibold">Branding</h2>
            <ImageSlot kind="logo" label="Company logo" hint="PNG, JPG or WEBP" Icon={ImageIcon} />
            <ImageSlot kind="stamp" label="Stamp" hint="PNG with transparency works best" Icon={Stamp} />
            <ImageSlot kind="signature" label="Signature" hint="PNG with transparency works best" Icon={PenLine} />
            <div className="grid gap-4 pt-2">
              <div><label className={labelCls} htmlFor="sg-name">Signatory name</label><input id="sg-name" maxLength={100} className={inputCls} placeholder="Jane Cooper" value={invoice.signatureName || ""} onChange={set("signatureName")} /></div>
              <div><label className={labelCls} htmlFor="sg-title">Title</label><input id="sg-title" maxLength={100} className={inputCls} placeholder="Director / CEO" value={invoice.signatureTitle || ""} onChange={set("signatureTitle")} /></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
