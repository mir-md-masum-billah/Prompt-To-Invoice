"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, PlusCircle, Building2, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import Logo, { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/app/invoices", label: "Invoices", Icon: FileText },
  { to: "/app/create-invoice", label: "Create invoice", Icon: PlusCircle },
  { to: "/app/business", label: "Business profile", Icon: Building2 },
];

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("sidebar_collapsed") === "true"); } catch {}
  }, []);
  const toggle = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem("sidebar_collapsed", String(n)); } catch {} return n; });

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    const esc = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", esc); };
  }, [mobileOpen]);

  const logout = async () => { try { await signOut(); } catch {} router.push("/"); };
  const name = (user?.name || "").trim() || (user?.email || "").split("@")[0] || "User";
  const initials = name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const active = (to) => pathname === to || pathname.startsWith(`${to}/`);
  const current = NAV.find((n) => active(n.to));

  const NavLinks = ({ compact }) => (
    <nav className="space-y-1" aria-label="App">
      {NAV.map(({ to, label, Icon }) => (
        <Link key={to} href={to} title={compact ? label : undefined} aria-current={active(to) ? "page" : undefined}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${compact ? "justify-center" : ""} ${active(to) ? "bg-brand-700 text-white shadow-card" : "text-ink-300 hover:bg-white/10 hover:text-white"}`}>
          <Icon size={19} className="shrink-0" />
          {!compact && <span>{label}</span>}
        </Link>
      ))}
    </nav>
  );

  const UserBox = ({ compact }) => (
    <div className={`rounded-2xl bg-white/5 p-3 ${compact ? "text-center" : ""}`}>
      <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal text-sm font-bold text-ink-950">{initials || "U"}</span>
        {!compact && <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{name}</p><p className="truncate text-xs text-ink-400">{user?.email}</p></div>}
      </div>
      <button onClick={logout} className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-300 transition hover:bg-rose-500/15 hover:text-rose-300 ${compact ? "justify-center" : ""}`} aria-label="Sign out">
        <LogOut size={16} />{!compact && "Sign out"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col justify-between bg-ink-950 p-4 transition-[width] duration-300 lg:flex ${collapsed ? "w-[84px]" : "w-72"}`}>
        <div>
          <div className={`mb-8 flex items-center px-1 pt-2 ${collapsed ? "justify-center" : "justify-between"}`}>
            {collapsed ? <LogoMark /> : <Logo href="/app/dashboard" dark />}
          </div>
          <NavLinks compact={collapsed} />
        </div>
        <div className="space-y-3">
          <button onClick={toggle} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-ink-400 hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}
          </button>
          <UserBox compact={collapsed} />
        </div>
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <div className="relative flex h-full w-[300px] max-w-[85vw] flex-col justify-between bg-ink-950 p-4 animate-fade-in">
            <div>
              <div className="mb-8 flex items-center justify-between px-1 pt-2">
                <Logo href="/app/dashboard" dark />
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-ink-300 hover:bg-white/10" aria-label="Close"><X size={20} /></button>
              </div>
              <NavLinks />
            </div>
            <UserBox />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink-200/70 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white lg:hidden" aria-label="Open menu"><Menu size={18} /></button>
            <span className="text-sm font-medium text-ink-500">{current?.label || "App"}</span>
          </div>
          <Link href="/app/create-invoice" className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-paper shadow-card transition hover:bg-brand-700">
            <Plus size={16} /> <span className="hidden xs:inline">New invoice</span><span className="xs:hidden">New</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
