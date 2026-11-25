"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import AiInvoiceModal from "@/components/AiInvoiceModal";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, FileText, Plus, RotateCcw, Search, Trash2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader, Card, Spinner, EmptyState, btnPrimary, btnSecondary, inputCls, labelCls } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { setNavState } from "@/lib/navState";

import { API_BASE } from "@/lib/config";

/* ---------- helpers ---------- */
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
                // rewrite localhost -> API_BASE
                const path =
                    parsed.pathname + (parsed.search || "") + (parsed.hash || "");
                return `${API_BASE.replace(/\/+$/, "")}${path}`;
            }
            return parsed.href;
        } catch (e) {
            // fall through to relative handling
        }
    }

    // relative paths like "/uploads/..." or "uploads/..." -> prefix with API_BASE
    return `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
}

function normalizeInvoiceFromServer(inv = {}) {
    const id = inv.invoiceNumber || inv.id || inv._id || String(inv._id || "");
    const amount =
        inv.total ??
        inv.amount ??
        (inv.subtotal !== undefined ? inv.subtotal + (inv.tax ?? 0) : 0);
    const status = inv.status ?? inv.statusLabel ?? "Draft";

    // Resolve any image/url fields so frontend doesn't try to load localhost from deployed client
    const logo = resolveImageUrl(
        inv.logoDataUrl ?? inv.logoUrl ?? inv.logo ?? null
    );
    const stamp = resolveImageUrl(
        inv.stampDataUrl ?? inv.stampUrl ?? inv.stamp ?? null
    );
    const signature = resolveImageUrl(
        inv.signatureDataUrl ?? inv.signatureUrl ?? inv.signature ?? null
    );

    return {
        ...inv,
        id,
        amount,
        status,
        // normalized image fields (safe for deployed frontend)
        logo,
        stamp,
        signature,
    };
}

function normalizeClient(raw) {
    if (!raw) return { name: "", email: "", address: "", phone: "" };
    if (typeof raw === "string")
        return { name: raw, email: "", address: "", phone: "" };
    if (typeof raw === "object") {
        return {
            name: raw.name ?? raw.company ?? raw.client ?? "",
            email: raw.email ?? raw.emailAddress ?? "",
            address: raw.address ?? "",
            phone: raw.phone ?? raw.contact ?? "",
        };
    }
    return { name: "", email: "", address: "", phone: "" };
}

function formatCurrency(amount = 0, currency = "USD") {
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

/* ---------- date formatting helper: MM/DD/YYYY (e.g. 12/07/2025) ---------- */
function formatDate(dateInput) {
    if (!dateInput) return "—";
    const d = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
    if (Number.isNaN(d.getTime())) return "—";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}

/* icons (same as you had) */
const SearchIcon = ({ className = "w-4 h-4" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
    </svg>
);
const SortIcon = ({ className = "w-4 h-4", direction = "asc" }) => (
    <svg
        className={`${className} ${direction === "desc" ? "rotate-180" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
);
const FilterIcon = ({ className = "w-4 h-4" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
);
const PlusIcon = ({ className = "w-4 h-4" }) => (
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
const EyeIcon = ({ className = "w-4 h-4" }) => (
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
const ResetIcon = ({ className = "w-4 h-4" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);

/* Pagination */
function Pagination({ page, totalPages, total, perPage, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) pages.push(i);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const nav = "grid h-9 w-9 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-ink-900 disabled:opacity-40 disabled:hover:border-ink-200";
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-6 py-4 sm:flex-row">
      <p className="text-sm text-ink-500">Showing <span className="num font-medium text-ink-800">{from}-{to}</span> of <span className="num font-medium text-ink-800">{total}</span></p>
      <div className="flex items-center gap-1.5">
        <button type="button" className={nav} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        {pages.map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined}
            className={`num h-9 min-w-9 rounded-full px-3 text-sm font-medium transition ${p === page ? "bg-ink-950 text-paper" : "text-ink-600 hover:bg-ink-100"}`}>{p}</button>
        ))}
        <button type="button" className={nav} disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/* ---------- Component ---------- */
export default function InvoicesPage() {
    const router = useRouter();
    const { getToken, isSignedIn } = useAuth();

    // helper to obtain token (with a forceRefresh retry)
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

    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // filters
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [perPage, setPerPage] = useState(6);

    // sorting/pagination
    const [sortBy, setSortBy] = useState({ key: "issueDate", dir: "desc" });
    const [page, setPage] = useState(1);

    // AI modal
    const [aiOpen, setAiOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [notice, setNotice] = useState(null);

    // fetch invoices from backend (auth-aware)
    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await obtainToken();
            const headers = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/invoices`, {
                method: "GET",
                headers,
            });
            if (res.status === 401) {
                setError("Unauthorized. Please sign in.");
                setAllInvoices([]);
                setLoading(false);
                return;
            }
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || `Failed to fetch (${res.status})`);
            }
            const json = await res.json().catch(() => null);
            const raw = Array.isArray(json?.data) ? json.data : json || [];
            const mapped = raw.map(normalizeInvoiceFromServer);
            setAllInvoices(mapped);
        } catch (err) {
            console.error("fetchInvoices error:", err);
            setError(err?.message || "Failed to load invoices");
            // keep existing list if any
        } finally {
            setLoading(false);
        }
    }, [obtainToken]);

    useEffect(() => {
        // load invoices on mount and whenever auth state changes
        fetchInvoices();
    }, [fetchInvoices, isSignedIn]);

    // client-side filtering/sorting (same logic)
    const filtered = useMemo(() => {
        let arr = Array.isArray(allInvoices) ? allInvoices.slice() : [];

        if (search.trim()) {
            const q = search.toLowerCase();
            arr = arr.filter((i) => {
                const client = normalizeClient(i.client);
                return (
                    (client.name && client.name.toLowerCase().includes(q)) ||
                    (i.id && i.id.toLowerCase().includes(q)) ||
                    String(i.email || "")
                        .toLowerCase()
                        .includes(q) ||
                    String(i.company || "")
                        .toLowerCase()
                        .includes(q)
                );
            });
        }

        if (status !== "all")
            arr = arr.filter(
                (i) =>
                    (i.status || "").toString().toLowerCase() ===
                    status.toString().toLowerCase()
            );

        if (from || to) {
            arr = arr.filter((i) => {
                const d = new Date(i.issueDate || i.date || i.createdAt).setHours(
                    0,
                    0,
                    0,
                    0
                );
                if (from) {
                    const f = new Date(from).setHours(0, 0, 0, 0);
                    if (d < f) return false;
                }
                if (to) {
                    const t = new Date(to).setHours(23, 59, 59, 999);
                    if (d > t) return false;
                }
                return true;
            });
        }

        arr.sort((a, b) => {
            const ak = a[sortBy.key];
            const bk = b[sortBy.key];

            if (typeof ak === "number" && typeof bk === "number")
                return sortBy.dir === "asc" ? ak - bk : bk - ak;

            const ad = Date.parse(ak || a.issueDate || a.dueDate || "");
            const bd = Date.parse(bk || b.issueDate || b.dueDate || "");
            if (!isNaN(ad) && !isNaN(bd))
                return sortBy.dir === "asc" ? ad - bd : bd - ad;

            const as = (ak || "").toString().toLowerCase();
            const bs = (bk || "").toString().toLowerCase();
            if (as < bs) return sortBy.dir === "asc" ? -1 : 1;
            if (as > bs) return sortBy.dir === "asc" ? 1 : -1;
            return 0;
        });

        return arr;
    }, [allInvoices, search, status, from, to, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const startIndex = (page - 1) * perPage;
    const pageData = filtered.slice(startIndex, startIndex + perPage);

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages]);

    function handleSort(key) {
        setSortBy((s) =>
            s.key === key
                ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" }
        );
    }

    function openInvoice(inv) {
        const found = allInvoices.find((x) => x && x.id === inv.id) || inv;
        setNavState(inv.id, found);
        router.push(`/app/invoices/${inv.id}/preview`);
    }

    // delete invoice (backend)
    async function handleDeleteInvoice(inv) {
        if (!inv?.id) return;
        if (!confirm(`Delete invoice ${inv.id}? This cannot be undone.`)) return;
        try {
            const token = await obtainToken();
            if (!token) {
                setNotice({ type: "error", text: "Please sign in to delete invoices." });
                router.push("/login");
                return;
            }
            const res = await fetch(
                `${API_BASE}/api/invoices/${encodeURIComponent(inv.id)}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (res.status === 401) {
                setNotice({ type: "error", text: "Session expired. Please sign in again." });
                router.push("/login");
                return;
            }
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || `Delete failed (${res.status})`);
            }
            await fetchInvoices();
            setNotice({ type: "ok", text: `Invoice ${inv.id} deleted.` });
        } catch (err) {
            console.error("deleteInvoice error:", err);
            setNotice({ type: "error", text: "Failed to delete the invoice." });
        }
    }

    // AI flow: call AI -> create invoice on backend (requires auth).
    // NOTE: If the AI provider returns quota/429 (or any non-ok), this function throws
    // an Error with a readable message — the modal will display it.
    async function handleGenerateFromAI(rawText) {
        setAiLoading(true);
        try {
            // Prefer server-side AI if available
            if (API_BASE) {
                const token = await obtainToken();
                const aiRes = await fetch(`${API_BASE}/api/ai/generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ prompt: rawText }),
                });

                const bodyText = await aiRes.text().catch(() => null);

                // try parse JSON if possible
                let bodyJson = null;
                try {
                    bodyJson = bodyText ? JSON.parse(bodyText) : null;
                } catch (e) {
                    bodyJson = null;
                }

                // if server returned an error status: surface clear message (esp. 429/quota)
                if (!aiRes.ok) {
                    const serverMessage =
                        (bodyJson && (bodyJson.message || bodyJson.detail)) ||
                        bodyText ||
                        `AI generate failed (${aiRes.status})`;

                    // not an invoice request ("hi", too little detail) -> soft notice, not an error
                    if (aiRes.status === 422 || bodyJson?.errorType === "NOT_ENOUGH_DETAILS") {
                        return { notice: serverMessage };
                    }

                    if (
                        aiRes.status === 429 ||
                        /quota|exhausted|resource_exhausted/i.test(serverMessage)
                    ) {
                        // explicit quota message
                        throw new Error("AI usage limit reached. Please try again later.");
                    }

                    // Other server errors
                    throw new Error(serverMessage);
                }

                // OK - parse AI invoice
                const aiJson =
                    bodyJson ||
                    (await (async () => {
                        try {
                            return JSON.parse(bodyText || "");
                        } catch {
                            return null;
                        }
                    })());

                const aiInvoice = aiJson?.data || aiJson;
                if (!aiInvoice) {
                    throw new Error("AI returned no invoice data (unexpected response).");
                }

                // Now send to create invoice endpoint (backend) if we have token (requires auth)
                const tokenForCreate = await obtainToken();
                if (tokenForCreate) {
                    const createRes = await fetch(`${API_BASE}/api/invoices`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${tokenForCreate}`,
                        },
                        body: JSON.stringify(aiInvoice),
                    });

                    if (!createRes.ok) {
                        const errText = await createRes.text().catch(() => null);
                        let errJson = null;
                        try {
                            errJson = errText ? JSON.parse(errText) : null;
                        } catch { }
                        const errMsg =
                            (errJson && (errJson.message || errJson.detail)) ||
                            errText ||
                            `Create failed (${createRes.status})`;
                        console.error(errMsg);
                        // surface the real reason in the modal instead of failing silently
                        throw new Error(errMsg);
                    }

                    const createJson = await createRes.json().catch(() => null);
                    const saved = normalizeInvoiceFromServer(
                        createJson?.data || createJson
                    );
                    await fetchInvoices();
                    setAiOpen(false);
                    setNavState(saved.id, saved);
                    router.push(`/app/invoices/${saved.id}/edit`);
                    return;
                } else {
                    // no token: creation requires sign-in
                    throw new Error(
                        "Creating invoice requires sign-in. Please sign in to save the AI-generated invoice."
                    );
                }
            }

            // If API_BASE not configured, fallback to UI-only creation (unchanged)
            const newId = `INV-${Math.floor(Math.random() * 900000) + 1000}`;
            const firstLine =
                (rawText || "")
                    .split(/\r?\n/)
                    .map((l) => l.trim())
                    .find(Boolean) || "";
            const clientPlaceholder = firstLine.length
                ? firstLine.length > 60
                    ? firstLine.slice(0, 57) + "..."
                    : firstLine
                : "";

            const newInvoice = {
                id: newId,
                invoiceNumber: newId,
                issueDate: new Date().toISOString().slice(0, 10),
                dueDate: "",
                client: clientPlaceholder || "",
                items: [],
                currency: "USD",
                status: "Draft",
                notes: "",
                taxPercent: 18,
                aiSource: rawText,
            };

            setAllInvoices((prev) => [newInvoice, ...(prev || [])]);
            setAiOpen(false);
            setNavState(newId, newInvoice);
            router.push(`/app/invoices/${newId}/edit`);
        } finally {
            setAiLoading(false);
        }
    }

    // Helper: client initial
    const getClientInitial = (client) => {
        const c = normalizeClient(client);
        return c.name ? c.name.charAt(0).toUpperCase() : "C";
    };

    const SortBtn = ({ k, children, right }) => (
        <th scope="col" className={`px-6 py-3 font-semibold ${right ? "text-right" : ""}`} aria-sort={sortBy.key === k ? (sortBy.dir === "asc" ? "ascending" : "descending") : "none"}>
            <button type="button" onClick={() => handleSort(k)} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-ink-900">
                {children}
                {sortBy.key === k ? (sortBy.dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} className="opacity-40" />}
            </button>
        </th>
    );
    const count = (st) => allInvoices.filter((i) => String(i.status || "").toLowerCase() === st).length;
    const hasFilters = search || status !== "all" || from || to;
    const resetFilters = () => { setSearch(""); setStatus("all"); setFrom(""); setTo(""); setPage(1); };

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Billing"
                title="Invoices"
                subtitle="Search, filter and manage every invoice in one place."
                actions={<>
                    <button type="button" onClick={() => setAiOpen(true)} className={btnSecondary}>
                        <Sparkles size={16} className="text-brand-600" /> Create with AI
                    </button>
                    <button type="button" onClick={() => router.push("/app/create-invoice")} className={btnPrimary}>
                        <Plus size={16} /> New invoice
                    </button>
                </>}
            />

            <AiInvoiceModal open={aiOpen} onClose={() => setAiOpen(false)} onGenerate={handleGenerateFromAI} loading={aiLoading} />

            {notice && (
                <div role="status" className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-sm ${notice.type === "ok" ? "border-brand-200 bg-brand-50 text-brand-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                    <span className="flex items-center gap-2">{notice.type === "ok" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />} {notice.text}</span>
                    <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold underline">Dismiss</button>
                </div>
            )}
            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                    <span>{error}</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => fetchInvoices()} className={btnSecondary}>Retry</button>
                        {String(error).toLowerCase().includes("unauthorized") && <button type="button" onClick={() => router.push("/login")} className={btnPrimary}>Sign in</button>}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[["Total", allInvoices.length, "text-ink-900"], ["Paid", count("paid"), "text-brand-700"], ["Unpaid", count("unpaid") + count("overdue"), "text-amber-600"], ["Drafts", count("draft"), "text-ink-500"]].map(([l, v, c]) => (
                    <div key={l} className="rounded-2xl border border-ink-200 bg-white px-5 py-4 shadow-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p>
                        <p className={`num mt-1 text-3xl font-semibold ${c}`}>{v}</p>
                    </div>
                ))}
            </div>

            <Card className="p-5">
                <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_1.2fr]">
                    <div>
                        <label htmlFor="inv-search" className={labelCls}>Search</label>
                        <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                            <input id="inv-search" type="search" maxLength={80} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Client, invoice number or email" className={`${inputCls} pl-10`} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="inv-status" className={labelCls}>Status</label>
                        <select id="inv-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
                            <option value="all">All statuses</option>
                            <option value="draft">Draft</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                    <div>
                        <span className={labelCls}>Issue date</span>
                        <div className="flex items-center gap-2">
                            <input aria-label="From date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} />
                            <span className="text-xs text-ink-400">to</span>
                            <input aria-label="To date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} />
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                    <div className="flex items-center gap-2 text-sm text-ink-600">
                        <label htmlFor="per-page">Rows</label>
                        <select id="per-page" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm">
                            {[6, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    {hasFilters && <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><RotateCcw size={14} /> Clear filters</button>}
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
                    <h2 className="text-lg font-semibold">All invoices</h2>
                    <p className="text-sm text-ink-500"><span className="num font-medium text-ink-800">{filtered.length}</span> result{filtered.length === 1 ? "" : "s"}</p>
                </div>

                {loading && allInvoices.length === 0 ? (
                    <div className="grid place-items-center py-20"><Spinner /></div>
                ) : pageData.length === 0 ? (
                    <EmptyState icon={hasFilters ? Search : FileText} title={hasFilters ? "No invoices match your filters" : "No invoices yet"}
                        text={hasFilters ? "Try a different search or clear the filters." : "Create your first invoice manually or describe it to AI."}
                        action={hasFilters ? <button type="button" onClick={resetFilters} className={btnSecondary}>Clear filters</button> : <button type="button" onClick={() => router.push("/app/create-invoice")} className={btnPrimary}>Create invoice</button>} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead>
                                <tr className="text-xs text-ink-500">
                                    <SortBtn k="id">Client</SortBtn>
                                    <SortBtn k="amount">Amount</SortBtn>
                                    <SortBtn k="status">Status</SortBtn>
                                    <SortBtn k="dueDate">Due</SortBtn>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {pageData.map((inv) => {
                                    const client = normalizeClient(inv.client);
                                    return (
                                        <tr key={inv.id} className="transition hover:bg-ink-50/70">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100">{getClientInitial(inv.client)}</span>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{client.name || inv.company || inv.id}</p>
                                                        <p className="num text-xs text-ink-500">{inv.id}</p>
                                                        {(client.email || inv.email) && <p className="truncate text-xs text-ink-400">{client.email || inv.email}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="num px-6 py-4 font-medium">{formatCurrency(inv.amount || 0, inv.currency)}</td>
                                            <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                                            <td className="px-6 py-4 text-ink-600">{inv.dueDate ? formatDate(inv.dueDate) : "-"}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" onClick={() => openInvoice(inv)} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-semibold transition hover:border-ink-900"><Eye size={14} /> View</button>
                                                    <button type="button" onClick={() => handleDeleteInvoice(inv)} title="Delete invoice" aria-label={`Delete invoice ${inv.id}`} className="grid h-8 w-8 place-items-center rounded-full text-rose-600 transition hover:bg-rose-50"><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={perPage} onChange={setPage} />
            </Card>
        </div>
    );
}
