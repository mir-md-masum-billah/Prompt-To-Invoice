"use client";

import React from "react";
import { FileText, Wallet, Hourglass, TrendingUp } from "lucide-react";

const ICONS = { document: FileText, revenue: Wallet, clock: Hourglass, growth: TrendingUp };

export default function KpiCard({ title, value, hint, iconType = "document", tone = "brand" }) {
  const Icon = ICONS[iconType] || FileText;
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    ink: "bg-ink-100 text-ink-700 ring-ink-200",
  };
  return (
    <div className="group rounded-3xl border border-ink-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ink-500">{title}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${tones[tone] || tones.brand}`}><Icon size={19} /></span>
      </div>
      <p className="num mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}
