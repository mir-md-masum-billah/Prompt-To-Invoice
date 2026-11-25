"use client";

import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export const inputCls = "w-full rounded-xl border border-ink-200 bg-white px-4 py-3.5 text-[15px] text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100";

export function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">{label}</label>
      {children}
    </div>
  );
}

export function PasswordInput({ id, name, value, onChange, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} required maxLength={128} autoComplete={autoComplete}
        placeholder={placeholder} value={value} onChange={onChange} className={`${inputCls} pr-12`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-500 hover:text-ink-900">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle size={17} className="mt-0.5 shrink-0" /> {message}
    </div>
  );
}

export const submitCls = "w-full rounded-xl bg-ink-950 py-3.5 text-[15px] font-semibold text-paper shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";
