import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#0F6F4E" />
      <path d="M12 9h12l6 6v16a1 1 0 0 1-1 1H12a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z" fill="#FBFAF7" />
      <path d="M24 9v6h6" fill="#D9F24A" />
      <path d="M15 21h10M15 25h10M15 29h5" stroke="#0F6F4E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ href = "/", dark = false }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="PromptToInvoice home">
      <LogoMark />
      <span className={`font-display-tight text-[1.35rem] font-semibold ${dark ? "text-paper" : "text-ink-900"}`}>
        Prompt<span className="text-brand-600">To</span>Invoice
      </span>
    </Link>
  );
}
