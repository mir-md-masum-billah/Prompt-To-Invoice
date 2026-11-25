"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const plans = [
  { name: "Starter", price: "Free", note: "Freelancers & solo founders", features: ["Up to 5 invoices / month", "1 business profile", "USD & EUR"], cta: "Start free" },
  { name: "Professional", price: "$15", per: "/mo", note: "Growing small businesses", features: ["Unlimited invoices", "AI generation", "Branded templates", "Dashboard analytics"], cta: "Go Professional", popular: true },
  { name: "Business", price: "$39", per: "/mo", note: "Agencies & multi-client teams", features: ["Multiple business profiles", "Team seats", "Priority support", "Advanced reporting"], cta: "Go Business" },
  { name: "Enterprise", price: "Custom", note: "High-volume organisations", features: ["API access", "Custom integrations", "SLA", "Dedicated onboarding"], cta: "Contact sales" },
];

export default function Pricing() {
  const { isSignedIn } = useAuth();
  const href = isSignedIn ? "/app/dashboard" : "/signup";
  return (
    <section id="pricing" className="border-t border-ink-200 bg-ink-50/60 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Pricing</p>
          <h2 className="font-display-tight mt-3 text-4xl font-semibold sm:text-5xl">Simple pricing that scales with you.</h2>
          <p className="mt-4 text-ink-600">Start free. Upgrade when your business grows.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-3xl p-8 transition ${p.popular ? "bg-ink-950 text-paper shadow-3xl xl:-translate-y-3" : "border border-ink-200 bg-white shadow-card"}`}>
              {p.popular && <span className="absolute -top-3 left-8 rounded-full bg-signal px-3 py-1 text-xs font-bold text-ink-950">Most popular</span>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.popular ? "text-ink-300" : "text-ink-500"}`}>{p.note}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display-tight text-5xl font-semibold">{p.price}</span>
                {p.per && <span className={p.popular ? "text-ink-300" : "text-ink-500"}>{p.per}</span>}
              </div>
              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5"><Check size={17} className={`mt-0.5 shrink-0 ${p.popular ? "text-signal" : "text-brand-600"}`} />{f}</li>
                ))}
              </ul>
              <Link href={href} className={`mt-8 rounded-full py-3.5 text-center text-sm font-semibold transition ${p.popular ? "bg-signal text-ink-950 hover:bg-white" : "bg-ink-950 text-paper hover:bg-brand-700"}`}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
