import React from "react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <Logo dark />
          <p className="mt-3 max-w-xs text-sm text-ink-400">Describe it. Send it. Get paid.</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-label="Footer">
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
        </nav>
      </div>
      <div className="border-t border-ink-800 py-6 text-center text-xs text-ink-500">&copy; {new Date().getFullYear()} PromptToInvoice. All rights reserved.</div>
    </footer>
  );
}
