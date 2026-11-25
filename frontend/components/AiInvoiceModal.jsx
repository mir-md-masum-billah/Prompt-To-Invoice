"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { notify } from "@/lib/notify";

const EXAMPLES = [
  "10 hours of consulting for Acme Corp at $120/hour, due in 30 days",
  "Logo design for GreenVibe, 2 options, $450 total, 20% VAT, pay within 14 days",
  "Monthly website maintenance for Bright Studio, EUR 300, due on receipt",
];

export default function AiInvoiceModal({ open, onClose, onGenerate, initialText = "" }) {
  const [text, setText] = useState(initialText || "");
  const [loading, setLoading] = useState(false);
  const areaRef = useRef(null);

  useEffect(() => {
    setText(initialText || "");
    setLoading(false);
  }, [open, initialText]);

  useEffect(() => {
    if (!open) return;
    areaRef.current?.focus();
    const esc = (e) => e.key === "Escape" && !loading && onClose?.();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open, loading, onClose]);

  if (!open) return null;

  async function handleGenerateClick() {
    const row = (text || "").trim();
    if (!row) return notify.warning("Add a description", "Describe the work you want to invoice first.");
    try {
      setLoading(true);
      const result = await (onGenerate && onGenerate(row));
      if (result && result.notice) notify.info("Need more detail", String(result.notice));
    } catch (err) {
      notify.error("Could not generate the invoice", (err && err.message) || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="ai-title">
      <button type="button" className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => !loading && onClose?.()} aria-label="Close dialog" />
      <div className="relative w-full max-w-2xl rounded-3xl border border-ink-200 bg-white p-7 shadow-3xl animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink-950 text-signal"><Sparkles size={20} /></span>
            <div>
              <h2 id="ai-title" className="font-display-tight text-2xl font-semibold">Create invoice with AI</h2>
              <p className="mt-1 text-sm text-ink-500">Describe the work in plain language. We&apos;ll draft the line items, tax and terms for you to review.</p>
            </div>
          </div>
          <button type="button" onClick={() => !loading && onClose?.()} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mt-6">
          <label htmlFor="ai-prompt" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">Your description</label>
          <textarea id="ai-prompt" ref={areaRef} value={text} maxLength={2000} rows={6} onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 10 hours of consulting for Acme Corp at $120/hour, due in 30 days"
            className="w-full resize-y rounded-2xl border border-ink-200 bg-white px-4 py-3.5 text-[15px] outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100" />
          <div className="mt-1 text-right text-xs text-ink-400 num">{text.length}/2000</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="max-w-full truncate rounded-full border border-ink-200 bg-ink-50 px-3.5 py-1.5 text-xs text-ink-700 transition hover:border-brand-600 hover:bg-brand-50">{ex}</button>
          ))}
        </div>


        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => onClose?.()} disabled={loading} className={btnSecondary}>Cancel</button>
          <button type="button" onClick={handleGenerateClick} disabled={loading} className={btnPrimary} aria-busy={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate invoice</>}
          </button>
        </div>
      </div>
    </div>
  );
}
