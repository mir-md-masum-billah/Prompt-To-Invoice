"use client";

import React from "react";
import { Check, Clock, AlertTriangle, PencilLine } from "lucide-react";

const MAP = {
  paid: { cls: "bg-brand-50 text-brand-700 ring-brand-200", dot: "bg-brand-500", Icon: Check },
  unpaid: { cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500", Icon: Clock },
  overdue: { cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500", Icon: AlertTriangle },
  draft: { cls: "bg-ink-100 text-ink-600 ring-ink-200", dot: "bg-ink-400", Icon: PencilLine },
};

export default function StatusBadge({ status = "Draft", size = "default", showIcon = true }) {
  const key = String(status || "draft").toLowerCase();
  const s = MAP[key] || MAP.draft;
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold capitalize ring-1 ${pad} ${s.cls}`}>
      {showIcon ? <s.Icon size={12} strokeWidth={3} /> : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {key}
    </span>
  );
}
