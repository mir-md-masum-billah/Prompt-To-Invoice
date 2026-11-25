"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { ImageIcon, Save, RotateCcw, Trash2, Upload, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader, Card, inputCls, labelCls, btnPrimary, btnSecondary } from "@/components/ui";

import { API_BASE } from "@/lib/config";

const DEFAULT_META = {
  businessName: "",
  email: "",
  address: "",
  phone: "",
  taxId: "", // EIN for US, VAT for Europe
  logoUrl: null,
  stampUrl: null,
  signatureUrl: null,
  signatureOwnerName: "",
  signatureOwnerTitle: "",
  defaultTaxPercent: 0, // US sales tax varies by state
  notes: "",
  profileId: null,
};

const UploadIcon = ({ className = "w-5 h-5" }) => (
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

function resolveImageUrl(url) {
  if (!url) return null;
  const s = String(url).trim();

  if (s.startsWith("blob:") || s.startsWith("data:")) return s;

  if (/^https?:\/\//i.test(s)) {
    try {
      const parsed = new URL(s);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        const path = parsed.pathname + (parsed.search || "") + (parsed.hash || "");
        return `${API_BASE.replace(/\/+$/, "")}${path}`;
      }
      return parsed.href;
    } catch {
      return null;
    }
  }

  return `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
}

const BusinessProfile = () => {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  const [meta, setMeta] = useState(DEFAULT_META);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const [files, setFiles] = useState({
    logo: null,
    stamp: null,
    signature: null,
  });

  const [previews, setPreviews] = useState({
    logo: null,
    stamp: null,
    signature: null,
  });

  const getAuthToken = useCallback(async () => {
    if (!isLoaded || !isSignedIn || typeof getToken !== "function") return null;

    try {
      let t = await getToken().catch(() => null);
      if (!t) t = await getToken({ forceRefresh: true }).catch(() => null);
      return t || null;
    } catch {
      return null;
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      if (!isLoaded || !isSignedIn) return;

      const token = await getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/businessProfile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const json = await res.json().catch(() => null);
        const data = json?.data;
        if (!data || !mounted) return;

        const serverMeta = {
          businessName: data.businessName ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          taxId: data.taxId ?? data.gst ?? "", // Support legacy GST field
          logoUrl: data.logoUrl ?? null,
          stampUrl: data.stampUrl ?? null,
          signatureUrl: data.signatureUrl ?? null,
          signatureOwnerName: data.signatureOwnerName ?? "",
          signatureOwnerTitle: data.signatureOwnerTitle ?? "",
          defaultTaxPercent: data.defaultTaxPercent ?? 0,
          notes: data.notes ?? "",
          profileId: data._id ?? null,
        };

        setMeta(serverMeta);
        setPreviews({
          logo: resolveImageUrl(serverMeta.logoUrl),
          stamp: resolveImageUrl(serverMeta.stampUrl),
          signature: resolveImageUrl(serverMeta.signatureUrl),
        });
      } catch (err) {
        console.error("fetchProfile error:", err);
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [getAuthToken, isLoaded, isSignedIn]);

  function updateMeta(field, value) {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }

  function handleLocalFilePick(kind, file) {
    if (!file) return;

    const objUrl = URL.createObjectURL(file);

    setFiles((prev) => ({ ...prev, [kind]: file }));
    setPreviews((prev) => ({ ...prev, [kind]: objUrl }));

    updateMeta(
      kind === "logo" ? "logoUrl" : kind === "stamp" ? "stampUrl" : "signatureUrl",
      objUrl
    );
  }

  function removeLocalFile(kind) {
    if (previews[kind]?.startsWith("blob:")) {
      URL.revokeObjectURL(previews[kind]);
    }

    setFiles((prev) => ({ ...prev, [kind]: null }));
    setPreviews((prev) => ({ ...prev, [kind]: null }));

    updateMeta(
      kind === "logo" ? "logoUrl" : kind === "stamp" ? "stampUrl" : "signatureUrl",
      null
    );
  }

  async function handleSave(e) {
    e?.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setNotice({ type: "error", text: "Please sign in to save your profile." });
        return;
      }

      const fd = new FormData();

      Object.entries(meta).forEach(([key, value]) => {
        if (key === "profileId") return;
        if (["logoUrl", "stampUrl", "signatureUrl"].includes(key)) {
          fd.append(key, typeof value === "string" && !value.startsWith("blob:") ? value : "");
        } else if (value !== null && value !== undefined) {
          fd.append(key, value);
        }
      });

      if (files.logo) fd.append("logo", files.logo);
      if (files.stamp) fd.append("stamp", files.stamp);
      if (files.signature) fd.append("signature", files.signature);

      const url = meta.profileId
        ? `${API_BASE}/api/businessProfile/${meta.profileId}`
        : `${API_BASE}/api/businessProfile`;

      const method = meta.profileId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Save failed");
      }

      const json = await res.json().catch(() => null);
      const saved = json?.data;

      if (saved) {
        const updatedMeta = {
          businessName: saved.businessName ?? meta.businessName,
          email: saved.email ?? meta.email,
          address: saved.address ?? meta.address,
          phone: saved.phone ?? meta.phone,
          taxId: saved.taxId ?? saved.gst ?? meta.taxId, // Support legacy GST field
          logoUrl: saved.logoUrl ?? meta.logoUrl,
          stampUrl: saved.stampUrl ?? meta.stampUrl,
          signatureUrl: saved.signatureUrl ?? meta.signatureUrl,
          signatureOwnerName: saved.signatureOwnerName ?? meta.signatureOwnerName,
          signatureOwnerTitle: saved.signatureOwnerTitle ?? meta.signatureOwnerTitle,
          defaultTaxPercent: saved.defaultTaxPercent ?? meta.defaultTaxPercent,
          notes: saved.notes ?? meta.notes,
          profileId: saved._id ?? meta.profileId,
        };

        setMeta(updatedMeta);
        setPreviews({
          logo: resolveImageUrl(updatedMeta.logoUrl),
          stamp: resolveImageUrl(updatedMeta.stampUrl),
          signature: resolveImageUrl(updatedMeta.signatureUrl),
        });
      }

      setNotice({ type: "ok", text: "Business profile saved." });
    } catch (err) {
      console.error("handleSave error:", err);
      setNotice({ type: "error", text: "Could not save the profile. Check your inputs and try again." });
    } finally {
      setSaving(false);
    }
  }

  function handleClearProfile() {
    Object.values(previews).forEach((src) => {
      if (src?.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    });

    setMeta(DEFAULT_META);
    setFiles({ logo: null, stamp: null, signature: null });
    setPreviews({ logo: null, stamp: null, signature: null });
  }

  const assets = [
    { kind: "logo", label: "Logo", hint: "Shown on every invoice header" },
    { kind: "stamp", label: "Stamp", hint: "Optional company stamp" },
    { kind: "signature", label: "Signature", hint: "Authorised signature" },
  ];
  const srcFor = (kind) => previews[kind] || resolveImageUrl(meta[kind + "Url"]);
  const set = (f) => (e) => updateMeta(f, e.target.value);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Settings" title="Business profile" subtitle="Your company details, branding and invoice defaults. Saved once, reused on every invoice." />

      {!isSignedIn && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">You are not signed in. Sign in to load and save your profile.</div>}
      {notice && (
        <div role="status" className={`flex items-center gap-2.5 rounded-2xl border px-5 py-4 text-sm ${notice.type === "ok" ? "border-brand-200 bg-brand-50 text-brand-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.type === "ok" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {notice.text}
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"><Building2 size={19} /></span>
              <h2 className="text-lg font-semibold">Company details</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className={labelCls} htmlFor="bn">Business name</label><input id="bn" required maxLength={120} className={inputCls} value={meta.businessName} onChange={set("businessName")} placeholder="Acme Studio LLC" /></div>
              <div><label className={labelCls} htmlFor="em">Email</label><input id="em" type="email" maxLength={120} className={inputCls} value={meta.email} onChange={set("email")} placeholder="billing@acme.com" /></div>
              <div><label className={labelCls} htmlFor="ph">Phone</label><input id="ph" maxLength={40} className={inputCls} value={meta.phone} onChange={set("phone")} placeholder="+1 555 010 2030" /></div>
              <div className="sm:col-span-2"><label className={labelCls} htmlFor="ad">Address</label><textarea id="ad" rows={3} maxLength={300} className={inputCls} value={meta.address} onChange={set("address")} placeholder="Street, city, postal code, country" /></div>
              <div><label className={labelCls} htmlFor="tx">Tax ID (EIN / VAT)</label><input id="tx" maxLength={40} className={`${inputCls} num`} value={meta.taxId} onChange={set("taxId")} placeholder="US 12-3456789 / DE123456789" /></div>
              <div><label className={labelCls} htmlFor="dt">Default tax %</label><input id="dt" type="number" min="0" max="100" step="0.01" className={`${inputCls} num`} value={meta.defaultTaxPercent} onChange={set("defaultTaxPercent")} /></div>
            </div>
          </Card>

          <Card className="p-7">
            <h2 className="mb-6 text-lg font-semibold">Signatory</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="so">Name</label><input id="so" maxLength={100} className={inputCls} value={meta.signatureOwnerName} onChange={set("signatureOwnerName")} placeholder="Jane Cooper" /></div>
              <div><label className={labelCls} htmlFor="st">Title</label><input id="st" maxLength={100} className={inputCls} value={meta.signatureOwnerTitle} onChange={set("signatureOwnerTitle")} placeholder="Founder & CEO" /></div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-7">
            <h2 className="mb-1 text-lg font-semibold">Branding</h2>
            <p className="mb-6 text-sm text-ink-500">PNG, JPG or WEBP, up to 2 MB each.</p>
            <div className="space-y-4">
              {assets.map(({ kind, label, hint }) => {
                const src = srcFor(kind);
                return (
                  <div key={kind} className="flex items-center gap-4 rounded-2xl border border-dashed border-ink-300 bg-ink-50/60 p-4">
                    <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-200 bg-white">
                      {src ? <img src={src} alt={`${label} preview`} className="max-h-full max-w-full object-contain" /> : <ImageIcon className="text-ink-300" size={26} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-ink-500">{hint}</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-ink-900 focus-within:ring-4 focus-within:ring-brand-100">
                          <Upload size={13} /> {src ? "Replace" : "Upload"}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 2 * 1024 * 1024) { setNotice({ type: "error", text: `${label} is larger than 2 MB.` }); e.target.value = ""; return; } handleLocalFilePick(kind, f); }} />
                        </label>
                        {src && <button type="button" onClick={() => removeLocalFile(kind)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={13} /> Remove</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="flex flex-wrap items-center gap-3 p-5">
            <button type="submit" disabled={saving || !isSignedIn} className={`${btnPrimary} flex-1`}><Save size={16} /> {saving ? "Saving..." : "Save profile"}</button>
            <button type="button" onClick={handleClearProfile} className={btnSecondary}><RotateCcw size={15} /> Reset</button>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default BusinessProfile;
