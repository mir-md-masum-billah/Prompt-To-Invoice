"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import KpiCard from '@/components/KpiCard';
import { ArrowRight, Eye, FileText, Plus, Building2 } from "lucide-react";
import { PageHeader, Card, Spinner, EmptyState, btnPrimary, btnSecondary } from "@/components/ui";
import StatusBadge from '@/components/StatusBadge';

import { API_BASE as API_BASE_URL } from "@/lib/config";
import { currencyFmt, capitalize, formatDate } from "@/lib/format";

/* normalize client object */
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

const Dashboard = () => {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

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

  const [storedInvoices, setStoredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await obtainToken();
      const headers = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/invoices`, { method: "GET", headers });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        setError("Unauthorized. Please sign in.");
        setStoredInvoices([]);
        return;
      }

      if (!res.ok) {
        throw new Error(json?.message || `Failed (${res.status})`);
      }

      const raw = json?.data || [];

      const mapped = (Array.isArray(raw) ? raw : []).map((inv) => {
        const amountVal = Number(inv?.total ?? inv?.amount ?? 0);
        const currency = (inv?.currency || "USD").toUpperCase();

        return {
          ...inv,
          id: inv?.invoiceNumber || inv?._id || String(inv?._id || ""),
          client: normalizeClient(inv?.client),
          amount: amountVal,
          currency,
          status:
            typeof inv?.status === "string"
              ? capitalize(inv.status)
              : inv?.status || "Draft",
        };
      });

      setStoredInvoices(mapped);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      setError(err?.message || "Failed to load invoices");
      setStoredInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [obtainToken]);

  const fetchBusinessProfile = useCallback(async () => {
    try {
      const token = await obtainToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/businessProfile/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) return;

      const json = await res.json().catch(() => null);
      if (json?.data) setBusinessProfile(json.data);
    } catch (err) {
      console.warn("Failed to fetch business profile:", err);
    }
  }, [obtainToken]);

  useEffect(() => {
    fetchInvoices();
    fetchBusinessProfile();

    function onStorage(e) {
      if (e.key === "invoices_v1") fetchInvoices();
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchInvoices, fetchBusinessProfile, isSignedIn]);

  const kpis = useMemo(() => {
    const totalInvoices = storedInvoices.length;
    const paidInvoices = storedInvoices.filter(inv => inv.status === "Paid");
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalUnpaid = storedInvoices
      .filter(inv => inv.status !== "Paid")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidCount = paidInvoices.length;
    const paidPercentage = totalInvoices > 0 ? (paidCount / totalInvoices) * 100 : 0;

    return { totalInvoices, totalPaid, totalUnpaid, paidCount, paidPercentage };
  }, [storedInvoices]);

  const recent = useMemo(() => [...storedInvoices].slice(0, 5), [storedInvoices]);

  function getClientName(inv) {
    return inv?.client?.name || "Unknown";
  }

  function getClientInitial(inv) {
    const name = getClientName(inv);
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  function openInvoice(inv) {
    if (!inv?.id) return;
    router.push(`/app/invoices/${inv.id}`);
  }

  const avg = kpis.totalInvoices > 0 ? (kpis.totalPaid + kpis.totalUnpaid) / kpis.totalInvoices : 0;
  const greeting = businessProfile?.businessName ? `Overview for ${businessProfile.businessName}` : "Overview";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={greeting}
        title="Dashboard"
        subtitle="Billing activity and cash collection at a glance."
        actions={<button onClick={() => router.push("/app/create-invoice")} className={btnPrimary}><Plus size={16} /> New invoice</button>}
      />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span>{error}</span>
          <div className="flex gap-2">
            <button onClick={fetchInvoices} className={btnSecondary}>Retry</button>
            {String(error).toLowerCase().includes("unauthorized") && <button onClick={() => router.push("/login")} className={btnPrimary}>Sign in</button>}
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total invoices" value={kpis.totalInvoices} hint="All time" iconType="document" />
        <KpiCard title="Collected" value={currencyFmt(kpis.totalPaid, "USD")} hint={`${kpis.paidCount} paid invoice${kpis.paidCount === 1 ? "" : "s"}`} iconType="revenue" />
        <KpiCard title="Outstanding" value={currencyFmt(kpis.totalUnpaid, "USD")} hint="Awaiting payment" iconType="clock" tone="amber" />
        <KpiCard title="Average invoice" value={currencyFmt(avg, "USD")} hint={`${kpis.paidPercentage.toFixed(0)}% paid rate`} iconType="growth" tone="ink" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold">Recent invoices</h2>
              <p className="text-sm text-ink-500">Your five latest invoices</p>
            </div>
            <button onClick={() => router.push("/app/invoices")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">View all <ArrowRight size={15} /></button>
          </div>

          {loading ? (
            <div className="grid place-items-center py-20"><Spinner /></div>
          ) : recent.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet" text="Describe your first job and let AI draft the invoice." action={<button onClick={() => router.push("/app/create-invoice")} className={btnPrimary}>Create your first invoice</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-6 py-3 font-semibold">Client</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Due</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {recent.map((inv) => (
                    <tr key={inv.id} onClick={() => openInvoice(inv)} className="cursor-pointer transition hover:bg-ink-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100">{getClientInitial(inv)}</span>
                          <div className="min-w-0"><p className="truncate font-medium">{getClientName(inv)}</p><p className="num text-xs text-ink-500">{inv.id}</p></div>
                        </div>
                      </td>
                      <td className="num px-6 py-4 font-medium">{currencyFmt(inv.amount, inv.currency)}</td>
                      <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                      <td className="px-6 py-4 text-ink-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={(e) => { e.stopPropagation(); openInvoice(inv); }} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold hover:border-ink-900"><Eye size={14} /> View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="bg-ink-950 p-6 text-paper">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Collection</p>
            <p className="num mt-3 text-4xl font-semibold">{kpis.paidPercentage.toFixed(0)}%</p>
            <p className="mt-1 text-sm text-ink-300">of invoices are paid</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(kpis.paidPercentage)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-signal transition-all duration-700" style={{ width: `${kpis.paidPercentage}%` }} />
            </div>
          </Card>
          <Card className="p-3">
            <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Quick actions</p>
            {[["Create invoice", "/app/create-invoice", Plus], ["All invoices", "/app/invoices", FileText], ["Business profile", "/app/business", Building2]].map(([t, to, I]) => (
              <button key={to} onClick={() => router.push(to)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-ink-800 transition hover:bg-ink-50">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><I size={17} /></span>{t}
                <ArrowRight size={15} className="ml-auto text-ink-400" />
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
