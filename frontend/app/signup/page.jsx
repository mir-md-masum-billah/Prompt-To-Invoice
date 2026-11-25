"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/AuthShell";
import { notify } from "@/lib/notify";
import { Field, PasswordInput, inputCls, submitCls } from "@/components/AuthFields";

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const rules = useMemo(() => [
    ["10+ characters", form.password.length >= 10],
    ["Upper & lower case", /[a-z]/.test(form.password) && /[A-Z]/.test(form.password)],
    ["A number", /\d/.test(form.password)],
  ], [form.password]);
  const strong = rules.every(([, ok]) => ok);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!strong) return notify.warning("Choose a stronger password", "Use 10+ characters with upper and lower case letters and a number.");
    if (form.password !== form.confirm) return notify.warning("Passwords do not match");
    setBusy(true);
    const r = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    setBusy(false);
    if (r.ok) router.replace("/app/dashboard"); else notify.error("Registration failed", r.error || "Please try again.");
  };

  return (
    <AuthShell title="Create your account" subtitle="Start generating invoices in seconds - free."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></>}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Full name" id="name">
          <input id="name" name="name" type="text" required maxLength={80} autoComplete="name" placeholder="Jane Cooper" value={form.name} onChange={onChange} className={inputCls} />
        </Field>
        <Field label="Work email" id="email">
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@company.com" value={form.email} onChange={onChange} className={inputCls} />
        </Field>
        <Field label="Password" id="password">
          <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Create a strong password" value={form.password} onChange={onChange} />
          <ul className="mt-3 flex flex-wrap gap-2">
            {rules.map(([t, ok]) => (
              <li key={t} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${ok ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-ink-50 text-ink-500 ring-ink-200"}`}>
                <Check size={12} className={ok ? "opacity-100" : "opacity-30"} /> {t}
              </li>
            ))}
          </ul>
        </Field>
        <Field label="Confirm password" id="confirm">
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" placeholder="Repeat password" value={form.confirm} onChange={onChange} />
        </Field>
        <button type="submit" disabled={busy} className={submitCls}>{busy ? "Creating account..." : "Create account"}</button>
      </form>
    </AuthShell>
  );
}
