"use client";

import axios from "axios";
import { FormEvent, useState } from "react";
import { login, setAccessToken } from "@/services/api";

interface LoginFormProps {
  onAuthenticated: () => void;
}

export default function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await login(email, password);
      window.sessionStorage.setItem("ssmeas_access_token", token);
      setAccessToken(token);
      onAuthenticated();
    } catch (cause) {
      const message = axios.isAxiosError<{ message?: string }>(cause)
        ? cause.response?.data?.message
        : undefined;
      setError(message ?? "Unable to sign in. Confirm the backend is running and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">Operations Centre</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Sign in to SSMEAS</h1>
        <p className="mt-2 text-sm text-slate-600">Use your monitoring account to view protected dashboard data.</p>
        <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
        <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
