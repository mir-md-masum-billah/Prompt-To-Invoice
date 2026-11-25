"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { safeRedirect } from "@/lib/config";
import AuthShell from "@/components/AuthShell";
import { Field, PasswordInput, FormError, inputCls, submitCls } from "@/components/AuthFields";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const redirectTo = safeRedirect(params.get("from"));
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(""); setBusy(true);
    const r = await login({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (r.ok) router.replace(redirectTo); else setError(r.error || "Sign in failed");
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your invoices."
      footer={<>New here? <Link href="/signup" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}>
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
        <Field label="Email" id="email">
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@company.com" value={form.email} onChange={onChange} className={inputCls} />
        </Field>
        <Field label="Password" id="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Your password" value={form.password} onChange={onChange} />
        </Field>
        <button type="submit" disabled={busy} className={submitCls}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
