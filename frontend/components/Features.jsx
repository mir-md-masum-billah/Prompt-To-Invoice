import React from "react";
import { MessageSquareText, FileCheck2, LayoutDashboard, Building2, Coins, ShieldCheck } from "lucide-react";

const steps = [
  { n: "01", t: "Describe", d: "Write what you did, for whom and the rate - exactly how you'd say it out loud." },
  { n: "02", t: "Review", d: "AI builds line items, tax, currency and due date. Edit anything before it goes out." },
  { n: "03", t: "Send & track", d: "Download a polished PDF, mark paid, and watch your dashboard update." },
];

const features = [
  { i: MessageSquareText, t: "Natural-language generation", d: "No rigid forms. Conversational AI is the primary way to create an invoice.", span: "lg:col-span-2" },
  { i: Coins, t: "Multi-currency", d: "Native USD and EUR with accurate totals and tax handling." },
  { i: Building2, t: "Business profiles", d: "Save logo, stamp, signature and tax ID once. Reuse everywhere." },
  { i: FileCheck2, t: "Full invoice lifecycle", d: "Create, edit, track status - draft, unpaid, paid, overdue - and keep everything organised.", span: "lg:col-span-2" },
  { i: LayoutDashboard, t: "Business visibility", d: "KPIs at a glance: billed, collected and outstanding." },
  { i: ShieldCheck, t: "Secure by default", d: "Hashed credentials, strict access control and private records per account." },
];

export default function Features() {
  return (
    <>
      <section id="how" className="border-y border-ink-200 bg-ink-950 py-24 text-paper">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">How it works</p>
          <h2 className="font-display-tight mt-3 max-w-2xl text-4xl font-semibold sm:text-5xl">From a sentence to a send-ready invoice.</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-ink-800 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="bg-ink-950 p-8 transition hover:bg-ink-900">
                <div className="num text-sm text-brand-400">{s.n}</div>
                <h3 className="font-display-tight mt-6 text-2xl font-semibold">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-ink-300">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Features</p>
          <h2 className="font-display-tight mt-3 max-w-2xl text-4xl font-semibold sm:text-5xl">Everything billing needs. Nothing it doesn&apos;t.</h2>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {features.map(({ i: Icon, t, d, span = "" }) => (
              <article key={t} className={`group rounded-3xl border border-ink-200 bg-white p-8 shadow-card transition hover:-translate-y-1 hover:shadow-lift ${span}`}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-700 group-hover:text-white"><Icon size={22} /></div>
                <h3 className="mt-6 text-xl font-semibold">{t}</h3>
                <p className="mt-2 leading-relaxed text-ink-600">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
