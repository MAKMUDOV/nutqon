"use client";
import { useState } from "react";
import { api, dt, useMe } from "@/lib/client";

export default function AccountPage() {
  const { user, loading } = useMe();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (loading) return <div className="card text-center text-ink-muted">Yuklanmoqda…</div>;
  if (!user) return <div className="notice-err">Avval tizimga kiring.</div>;
  return (
    <>
      <h1 className="text-3xl text-green">Hisobim</h1>
      <div className="card grid gap-1 text-sm">
        <div><b>Ism:</b> {user.name}</div>
        <div><b>Login:</b> {user.login}</div>
        <div><b>Rol:</b> {user.role === "TEACHER" ? "O'qituvchi" : "O'quvchi"}</div>
        <div className="text-ink-muted">Ro&apos;yxatdan o&apos;tgan: {dt(user.createdAt)}</div>
      </div>
      <form className="card grid max-w-md gap-3" onSubmit={async (e) => {
        e.preventDefault(); setMsg(null);
        if (f.next !== f.again) { setMsg({ ok: false, text: "Yangi parollar bir xil emas." }); return; }
        try { await api("/api/account/password", { method: "POST", body: { current: f.current, next: f.next } }); setMsg({ ok: true, text: "Parol o'zgartirildi." }); setF({ current: "", next: "", again: "" }); }
        catch (x) { setMsg({ ok: false, text: (x as Error).message }); }
      }}>
        <h2 className="text-xl">Parolni o&apos;zgartirish</h2>
        <label className="label" htmlFor="cur">Joriy parol<input id="cur" type="password" className="input" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" /></label>
        <label className="label" htmlFor="nw">Yangi parol (8+)<input id="nw" type="password" className="input" required minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" /></label>
        <label className="label" htmlFor="nw2">Yangi parol (qayta)<input id="nw2" type="password" className="input" required minLength={8} value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} autoComplete="new-password" /></label>
        {msg && <div className={msg.ok ? "notice-ok" : "notice-err"} role="status">{msg.text}</div>}
        <button className="btn">Saqlash</button>
        <p className="text-xs text-ink-muted">Parolni unutgan bo&apos;lsangiz, o&apos;qituvchingizga murojaat qiling — u yangi parol qo&apos;yib beradi.</p>
      </form>
    </>
  );
}
