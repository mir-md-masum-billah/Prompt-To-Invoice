"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Globe2, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function InvoiceMock() {
  const rows = [
    ["Brand strategy workshop", "10 h", "$120.00", "$1,200.00"],
    ["Landing page design", "1", "$2,400.00", "$2,400.00"],
    ["Revisions (2 rounds)", "4 h", "$120.00", "$480.00"],
  ];
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-100 via-signal/30 to-transparent blur-2xl" />
      {/* prompt */}
      <div className="relative z-10 ml-auto -mb-6 w-[88%] rounded-2xl border border-ink-200 bg-white p-4 shadow-lift animate-slide-up">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-brand-700">
          <Sparkles size={13} /> Your prompt
        </div>
        <p className="text-[15px] leading-relaxed text-ink-800">
          &ldquo;10 hours of brand strategy for Acme Corp at $120/hr, a landing page for $2,400, plus 4 hours of revisions. Net 30, 8% tax.&rdquo;
        </p>
      </div>
      {/* invoice */}
      <div className="relative rounded-3xl border border-ink-200 bg-white p-7 pt-12 shadow-3xl animate-slide-up [animation-delay:120ms]">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display-tight text-2xl font-semibold">Invoice</div>
            <div className="num mt-1 text-xs text-ink-500">INV-2026-0142</div>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">Draft ready</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-ink-500">
          <div><div className="font-semibold text-ink-800">Billed to</div>Acme Corp</div>
          <div className="text-right"><div className="font-semibold text-ink-800">Due</div>30 days &middot; USD</div>
        </div>
        <div className="mt-5 divide-y divide-ink-100 border-y border-ink-100 text-sm">
          {rows.map((r) => (
            <div key={r[0]} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3">
              <div><div className="font-medium text-ink-900">{r[0]}</div><div className="num text-xs text-ink-500">{r[1]} &times; {r[2]}</div></div>
              <div />
              <div className="num font-medium">{r[3]}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="num">$4,080.00</span></div>
          <div className="flex justify-between text-ink-500"><span>Tax (8%)</span><span className="num">$326.40</span></div>
          <div className="flex items-center justify-between rounded-xl bg-ink-950 px-4 py-3 text-paper">
            <span className="text-sm font-medium">Total due</span>
            <span className="num text-xl font-semibold text-signal">$4,406.40</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const { isSignedIn } = useAuth();
  return (
    <section className="relative overflow-hidden pb-24 pt-36 lg:pb-32 lg:pt-44">
      <div className="grain absolute inset-0 -z-20 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-brand-200/50 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 shadow-card animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> AI invoicing for US &amp; European businesses
          </div>
          <h1 className="font-display-tight mt-6 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-[4.6rem] animate-slide-up">
            Describe the work.<br />
            <span className="relative whitespace-nowrap text-brand-700">Get paid faster.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden="true"><path d="M2 8c60-6 140-8 296-2" stroke="#D9F24A" strokeWidth="5" strokeLinecap="round" /></svg>
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-600 animate-slide-up [animation-delay:80ms]">
            Type what you did in plain language. PromptToInvoice drafts a complete, accurate invoice &mdash; line items, tax, currency and terms &mdash; ready to review and send in seconds.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3 animate-slide-up [animation-delay:160ms]">
            <Link href={isSignedIn ? "/app/create-invoice" : "/signup"} className="group inline-flex items-center gap-2 rounded-full bg-ink-950 px-7 py-4 text-[15px] font-semibold text-paper shadow-lift transition hover:bg-brand-700">
              {isSignedIn ? "Create an invoice" : "Start free - no card needed"}
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="rounded-full border border-ink-300 bg-white/60 px-7 py-4 text-[15px] font-semibold text-ink-800 transition hover:border-ink-900">See how it works</a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-600">
            <li className="flex items-center gap-2"><Zap size={16} className="text-brand-600" /> Prompt to invoice in seconds</li>
            <li className="flex items-center gap-2"><Globe2 size={16} className="text-brand-600" /> USD, EUR &amp; more</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-600" /> Private by design</li>
          </ul>
        </div>
        <InvoiceMock />
      </div>
    </section>
  );
}
