"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Pencil, Printer, FileX2 } from "lucide-react";
import { Spinner, btnPrimary, btnSecondary } from "@/components/ui";
import { getNavState, setNavState } from "@/lib/navState";

import { API_BASE } from "@/lib/config";
const PROFILE_ENDPOINT = `${API_BASE}/api/businessProfile/me`;
const INVOICE_ENDPOINT = (id) => `${API_BASE}/api/invoices/${id}`;

function resolveImageUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  // data URI -> return directly
  if (s.startsWith("data:")) {
    return s;
  }

  if (/localhost|127\.0\.0\.1/.test(s)) {
    try {
      const parsed = new URL(s);
      const path =
        parsed.pathname + (parsed.search || "") + (parsed.hash || "");
      const resolved = `${API_BASE.replace(/\/+$/, "")}${path}`;
      return resolved;
    } catch (e) {
      // fallback: strip host prefix
      const path = s.replace(/^https?:\/\/[^/]+/, "");
      const resolved = `${API_BASE.replace(/\/+$/, "")}${path}`;
      return resolved;
    }
  }

  // absolute http(s) -> return as-is
  if (/^https?:\/\//i.test(s)) {
    return s;
  }

  // relative path like "/uploads/..." or "uploads/..."
  const resolved = `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
  return resolved;
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
  } catch {}
}
function getStoredInvoices() {
  return readJSON("invoices_v1", []) || [];
}

const defaultProfile = {
  businessName: "",
  email: "",
  address: "",
  phone: "",
  gst: "",
  stampDataUrl: null,
  signatureDataUrl: null,
  logoDataUrl: null,
  defaultTaxPercent: 0,
  signatureName: "",
  signatureTitle: "",
};

function currencyFmt(amount = 0, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

function formatDate(dateInput) {
  if (!dateInput) return "—";
  const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function normalizeClient(raw) {
  if (!raw) return { name: "", email: "", address: "", phone: "" };
  if (typeof raw === "string")
    return { name: raw, email: "", address: "", phone: "" };
  if (typeof raw === "object") {
    return {
      name: raw.name ?? raw.company ?? raw.client ?? "",
      email: raw.email ?? raw.emailAddress ?? "",
      address: raw.address ?? raw.addr ?? raw.clientAddress ?? "",
      phone: raw.phone ?? raw.contact ?? raw.mobile ?? "",
    };
  }
  return { name: "", email: "", address: "", phone: "" };
}

/* ----------------- icons ----------------- */
const PrintIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
  </svg>
);
const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const ArrowLeftIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

/* ----------------- component ----------------- */
export default function InvoicePreview() {
  const { id } = useParams();
  const router = useRouter();

  const { getToken } = useAuth();

  // Next's router has no equivalent of react-router's `navigate(to, { state })`;
  // a freshly-created/edited invoice handed off from another page is bridged via
  // sessionStorage, keyed by the id in the URL (read once, then falls back to a
  // server fetch on subsequent visits).
  const invoiceFromState = id ? getNavState(id) : null;
  const [invoice, setInvoice] = useState(() =>
    invoiceFromState ? invoiceFromState : null
  );
  const [loadingInvoice, setLoadingInvoice] = useState(
    !invoiceFromState && Boolean(id)
  );
  const [invoiceError, setInvoiceError] = useState(null);

  const [profile, setProfile] = useState(
    () => readJSON("business_profile", defaultProfile) || defaultProfile
  );
  const [profileLoading, setProfileLoading] = useState(false);

  const prevTitleRef = useRef(
    typeof document !== "undefined" ? document.title : ""
  );

  const obtainToken = useCallback(async () => {
    if (typeof getToken !== "function") return null;
    try {
      let token = await getToken({ template: "default" }).catch(() => null);
      if (!token)
        token = await getToken({ forceRefresh: true }).catch(() => null);
      return token;
    } catch {
      return null;
    }
  }, [getToken]);


  useEffect(() => {
    let mounted = true;
    async function fetchInvoice() {
      if (!id || invoiceFromState) return;
      setLoadingInvoice(true);
      setInvoiceError(null);
      try {
        const token = await obtainToken();
        const headers = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(INVOICE_ENDPOINT(id), {
          method: "GET",
          headers,
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const data = json?.data ?? json ?? null;
          if (mounted && data) {
            const normalized = {
              ...data,
              id: data._id ?? data.id ?? id,
              items: Array.isArray(data.items)
                ? data.items
                : data.items
                ? [...data.items]
                : [],
              invoiceNumber: data.invoiceNumber ?? data.invoiceNumber ?? "",
              currency: data.currency || "USD",
            };
            setInvoice(normalized);
            return;
          }
        } else {
          console.warn("Failed to fetch invoice from server:", res.status);
        }
      } catch (err) {
        console.warn("Error fetching invoice:", err);
      } finally {
        if (!mounted) return;
        const all = getStoredInvoices();
        const found = all.find(
          (x) => x && (x.id === id || x._id === id || x.invoiceNumber === id)
        );
        if (found) setInvoice(found);
        else setInvoiceError("Invoice not found");
        setLoadingInvoice(false);
      }
    }
    fetchInvoice();
    return () => {
      mounted = false;
    };
  }, [id, invoiceFromState, obtainToken]);


  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      setProfileLoading(true);
      try {
        const token = await obtainToken();
        const headers = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(PROFILE_ENDPOINT, { method: "GET", headers });
        if (!res.ok) {
          console.warn("Profile fetch returned non-ok:", res.status);
          setProfileLoading(false);
          return;
        }
        const json = await res.json().catch(() => null);
        const data = json?.data ?? json ?? null;
        if (mounted && data && typeof data === "object") {
          const normalized = {
            businessName:
              data.businessName ?? data.name ?? defaultProfile.businessName,
            email: data.email ?? defaultProfile.email,
            address: data.address ?? defaultProfile.address,
            phone: data.phone ?? defaultProfile.phone,
            gst: data.gst ?? defaultProfile.gst,
            stampDataUrl:
              data.stampUrl ?? data.stampDataUrl ?? defaultProfile.stampDataUrl,
            signatureDataUrl:
              data.signatureUrl ??
              data.signatureDataUrl ??
              defaultProfile.signatureDataUrl,
            logoDataUrl:
              data.logoUrl ?? data.logoDataUrl ?? defaultProfile.logoDataUrl,
            defaultTaxPercent: Number.isFinite(Number(data.defaultTaxPercent))
              ? Number(data.defaultTaxPercent)
              : defaultProfile.defaultTaxPercent,
            signatureName:
              data.signatureOwnerName ??
              data.signatureName ??
              defaultProfile.signatureName,
            signatureTitle:
              data.signatureOwnerTitle ??
              data.signatureTitle ??
              defaultProfile.signatureTitle,
          };
          setProfile(normalized);
          try {
            writeJSON("business_profile", normalized);
          } catch {}
        }
      } catch (err) {
        console.warn("Error fetching profile:", err);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    const stored = readJSON("business_profile", null);
    if (!stored) fetchProfile();
    return () => {
      mounted = false;
    };
  }, [obtainToken]);


  useEffect(() => {
    if (!invoice) return;
    const invoiceNumber =
      invoice.invoiceNumber || invoice.id || `invoice-${Date.now()}`;
    const safe = `Invoice-${String(invoiceNumber).replace(
      /[^\w\-_.() ]/g,
      "_"
    )}`;
    const prev = prevTitleRef.current ?? document.title;
    if (document.title !== safe) document.title = safe;
    return () => {
      try {
        document.title = prev;
      } catch {}
    };
  }, [invoice]);


  const handlePrint = useCallback(() => {
    const invoiceNumber =
      (invoice && (invoice.invoiceNumber || invoice.id)) ||
      `invoice-${Date.now()}`;
    const safe = `Invoice-${String(invoiceNumber).replace(
      /[^\w\-_.() ]/g,
      "_"
    )}`;

    const prevTitle = document.title;
    document.title = safe;
    window.print();

    // Restore title after a delay
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  }, [invoice]);

  if (!invoice && (loadingInvoice || profileLoading)) {
    return <div className="grid place-items-center py-32"><Spinner /></div>;
  }
  if (!invoice) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-card">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"><FileX2 size={24} /></div>
        <h1 className="mt-5 text-xl font-semibold">Invoice not found</h1>
        <p className="mt-2 text-sm text-ink-500">It may have been deleted, or you may not have access to it.</p>
        <button onClick={() => router.push("/app/invoices")} className={`${btnPrimary} mt-6`}><ArrowLeft size={16} /> Back to invoices</button>
      </div>
    );
  }

  const items = (
    invoice.items && Array.isArray(invoice.items) ? invoice.items : []
  ).filter(Boolean);
  const subtotal = items.reduce(
    (s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0),
    0
  );
  const taxPercent = Number(
    invoice.taxPercent ?? profile.defaultTaxPercent ?? 0
  );
  const tax = (subtotal * taxPercent) / 100;
  const total = subtotal + tax;

  const logo = resolveImageUrl(
    invoice.logoDataUrl ?? profile.logoDataUrl ?? null
  );
  const stamp = resolveImageUrl(
    invoice.stampDataUrl ?? profile.stampDataUrl ?? null
  );
  const signature = resolveImageUrl(
    invoice.signatureDataUrl ?? profile.signatureDataUrl ?? null
  );

  const signatureName = invoice.signatureName ?? profile.signatureName ?? "";
  const signatureTitle = invoice.signatureTitle ?? profile.signatureTitle ?? "";

  const client = normalizeClient(invoice.client);
  const invoiceCurrency = invoice.currency || "USD";

  function goToEdit() {
    setNavState(invoice.id, invoice);
    router.push(`/app/invoices/${invoice.id}/edit`);
  }

  const st = String(invoice.status || "draft").toLowerCase();
  const stampCls = { paid: "border-brand-600 text-brand-700", unpaid: "border-amber-500 text-amber-600", overdue: "border-rose-500 text-rose-600", draft: "border-ink-300 text-ink-400" }[st] || "border-ink-300 text-ink-400";
  const fromName = invoice.fromBusinessName || profile.businessName || "Your business";
  const fromEmail = invoice.fromEmail || profile.email;
  const fromPhone = invoice.fromPhone || profile.phone;
  const fromTax = invoice.fromTaxId || invoice.fromGst || profile.taxId || profile.gst;
  const fromAddress = invoice.fromAddress || profile.address;
  const meta = [["Issued", formatDate(invoice.issueDate)], ["Due", invoice.dueDate ? formatDate(invoice.dueDate) : "On receipt"], ["Currency", invoiceCurrency]];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => router.push("/app/invoices")} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"><ArrowLeft size={15} /> All invoices</button>
          <h1 className="font-display-tight text-3xl font-semibold">Invoice preview</h1>
          <p className="mt-1 text-sm text-ink-500">Review <span className="num font-medium text-ink-800">#{invoice.invoiceNumber || invoice.id}</span> before sending.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={goToEdit} className={btnSecondary}><Pencil size={15} /> Edit</button>
          <button onClick={handlePrint} className={btnPrimary}><Printer size={15} /> Print / Save PDF</button>
        </div>
      </div>

      <article id="print-area" className="relative overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lift print:rounded-none print:shadow-none">
        <div className="h-2 bg-gradient-to-r from-brand-700 via-brand-500 to-signal" />
        <div className="p-8 sm:p-12">
          <header className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {logo && <img src={logo} alt="Company logo" className="mb-5 max-h-16 max-w-[200px] object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              <p className="text-lg font-semibold">{fromName}</p>
              <div className="mt-1.5 space-y-0.5 text-sm text-ink-600">
                {fromAddress && <p className="whitespace-pre-line">{fromAddress}</p>}
                {fromEmail && <p>{fromEmail}</p>}
                {fromPhone && <p>{fromPhone}</p>}
                {fromTax && <p className="num">Tax ID: {fromTax}</p>}
              </div>
            </div>
            <div className="sm:text-right">
              <h2 className="font-display-tight text-5xl font-semibold tracking-tight">Invoice</h2>
              <p className="num mt-1.5 text-sm text-ink-500">#{invoice.invoiceNumber || invoice.id}</p>
              <span className={`mt-4 inline-block -rotate-3 rounded-lg border-2 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] ${stampCls}`}>{st}</span>
            </div>
          </header>

          <section className="mt-10 grid gap-6 rounded-2xl bg-ink-50 p-6 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Billed to</p>
              <p className="mt-2 text-base font-semibold">{client.name || "-"}</p>
              <div className="mt-1 space-y-0.5 text-sm text-ink-600">
                {client.address && <p className="whitespace-pre-line">{client.address}</p>}
                {client.email && <p>{client.email}</p>}
                {client.phone && <p>{client.phone}</p>}
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {meta.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-ink-500">{k}</dt><dd className="num font-medium">{v}</dd></div>
              ))}
            </dl>
          </section>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink-900 text-xs uppercase tracking-wider text-ink-500">
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 text-right font-semibold">Qty</th>
                  <th className="pb-3 text-right font-semibold">Rate</th>
                  <th className="pb-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {items.map((it, i) => (
                  <tr key={it.id || i}>
                    <td className="py-4 pr-4 font-medium">{it.description}</td>
                    <td className="num py-4 text-right text-ink-600">{it.qty}</td>
                    <td className="num py-4 text-right text-ink-600">{currencyFmt(it.unitPrice, invoiceCurrency)}</td>
                    <td className="num py-4 text-right font-medium">{currencyFmt(Number(it.qty || 0) * Number(it.unitPrice || 0), invoiceCurrency)}</td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-ink-400">No line items</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-sm text-sm text-ink-600">
              {invoice.notes && (<><p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">Notes</p><p className="mt-2 whitespace-pre-line">{invoice.notes}</p></>)}
            </div>
            <div className="w-full space-y-2 text-sm sm:w-72">
              <div className="flex justify-between text-ink-600"><span>Subtotal</span><span className="num">{currencyFmt(subtotal, invoiceCurrency)}</span></div>
              <div className="flex justify-between text-ink-600"><span>Tax ({taxPercent}%)</span><span className="num">{currencyFmt(tax, invoiceCurrency)}</span></div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink-950 px-5 py-4 text-paper">
                <span className="font-medium">Total due</span>
                <span className="num text-2xl font-semibold text-signal">{currencyFmt(total, invoiceCurrency)}</span>
              </div>
            </div>
          </div>

          {(stamp || signature || signatureName) && (
            <footer className="mt-14 flex items-end justify-between gap-6 border-t border-ink-100 pt-8">
              <div>{stamp && <img src={stamp} alt="Company stamp" className="max-h-24 max-w-[140px] object-contain opacity-90" onError={(e) => { e.currentTarget.style.display = "none"; }} />}</div>
              <div className="text-right">
                {signature && <img src={signature} alt="Signature" className="ml-auto max-h-16 max-w-[180px] object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                {signatureName && <p className="mt-2 border-t border-ink-300 pt-2 text-sm font-semibold">{signatureName}</p>}
                {signatureTitle && <p className="text-xs text-ink-500">{signatureTitle}</p>}
              </div>
            </footer>
          )}
          <p className="mt-10 text-center text-xs text-ink-400">Thank you for your business.</p>
        </div>
      </article>
    </div>
  );
}
