"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

export default function AuthShell({ title, subtitle, children, footer }) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  useEffect(() => { if (isLoaded && isSignedIn) router.replace("/app/dashboard"); }, [isLoaded, isSignedIn, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="font-display-tight text-4xl font-semibold">{title}</h1>
          <p className="mt-2 text-ink-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-ink-600">{footer}</div>
        </div>
        <p className="text-center text-xs text-ink-400">Protected with encrypted sessions and rate-limited sign-in.</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink-950 p-16 text-paper lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-signal/20 blur-3xl" />
        <div className="relative">
          <p className="font-display-tight max-w-md text-4xl font-semibold leading-tight">
            &ldquo;I described a month of consulting and had a client-ready invoice before my coffee cooled.&rdquo;
          </p>
          <p className="mt-5 text-sm text-ink-300">- Independent consultant, Berlin</p>
        </div>
        <ul className="relative space-y-5 text-sm">
          {[[Sparkles, "Natural-language invoice generation"], [Zap, "Totals, tax and currency handled for you"], [ShieldCheck, "Your data stays private to your account"]].map(([I, t]) => (
            <li key={t} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-signal"><I size={18} /></span>{t}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
