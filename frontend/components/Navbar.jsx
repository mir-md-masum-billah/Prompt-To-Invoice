"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  const { isSignedIn, isLoaded, user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false);
    const esc = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);

  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled ? "glass border-b border-ink-200/70" : "bg-transparent"}`}>
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8" aria-label="Primary">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900">{l.label}</a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isLoaded && !isSignedIn && (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-ink-700 hover:text-ink-950">Sign in</Link>
              <Link href="/signup" className="rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-paper shadow-card transition hover:bg-brand-700">Start free</Link>
            </>
          )}
          {isLoaded && isSignedIn && (
            <div className="relative" ref={ref}>
              <button onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}
                className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium shadow-card">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{initial}</span>
                <span className="max-w-[140px] truncate">{user?.name}</span>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift">
                  <button role="menuitem" onClick={() => router.push("/app/dashboard")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-ink-50"><LayoutDashboard size={16} /> Dashboard</button>
                  <button role="menuitem" onClick={() => { logout(); setMenu(false); router.replace("/"); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {open && (
        <div className="glass border-t border-ink-200 px-5 pb-6 pt-3 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-100">{l.label}</a>
          ))}
          <div className="mt-3 grid gap-2">
            {isSignedIn ? (
              <>
                <Link href="/app/dashboard" className="rounded-full bg-ink-950 py-3 text-center text-sm font-semibold text-paper">Open dashboard</Link>
                <button onClick={() => { logout(); setOpen(false); router.replace("/"); }} className="rounded-full border border-ink-200 py-3 text-sm font-semibold">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-ink-200 py-3 text-center text-sm font-semibold">Sign in</Link>
                <Link href="/signup" className="rounded-full bg-ink-950 py-3 text-center text-sm font-semibold text-paper">Start free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
