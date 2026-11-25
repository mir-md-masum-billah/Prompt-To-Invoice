import React from "react";

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>}
        <h1 className="font-display-tight mt-1 text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ink-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ className = "", children, ...rest }) {
  return <section className={`rounded-3xl border border-ink-200 bg-white shadow-card ${className}`} {...rest}>{children}</section>;
}

export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-paper shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary = "inline-flex items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-60";
export const btnDanger = "inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60";
export const inputCls = "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100";
export const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500";

export function Spinner({ className = "h-8 w-8" }) {
  return <div role="status" aria-label="Loading" className={`${className} animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600`} />;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {Icon && <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"><Icon size={24} /></div>}
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
