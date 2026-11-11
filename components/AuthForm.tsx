"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: mode === "login" ? { login, password } : { name, login, password } });
      location.href = "/";
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card mx-auto grid w-full max-w-md gap-4">
      <h1 className="text-2xl text-green">{mode === "login" ? "Tizimga kirish" : "Ro'yxatdan o'tish"}</h1>
      {mode === "register" && (
        <label className="label" htmlFor="name">Ism va familiya<input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" /></label>
      )}
      <label className="label" htmlFor="login">Login<input id="login" className="input" value={login} onChange={(e) => setLogin(e.target.value)} required autoComplete="username" /></label>
      <label className="label" htmlFor="password">Parol<input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      {err && <div className="notice-err" role="alert">{err}</div>}
      <button className="btn" disabled={busy}>{busy ? "Kuting…" : mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}</button>
      <p className="text-sm text-ink-muted">
        {mode === "login" ? <>Hisobingiz yo&apos;qmi? <Link className="text-green underline" href="/register">Ro&apos;yxatdan o&apos;ting</Link></> : <>Hisobingiz bormi? <Link className="text-green underline" href="/login">Kiring</Link></>}
      </p>
    </form>
  );
}
