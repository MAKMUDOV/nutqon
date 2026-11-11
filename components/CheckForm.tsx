"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, useMe } from "@/lib/client";
import { TYPES, countWords, wordMessage, type PartType } from "@/lib/scoring";
import type { Mode, Submission } from "@/lib/types";

type Draft = { topic: string; kind: "formal" | "personal"; text: string; startedAt: number | null };
const empty = (): Draft => ({ topic: "", kind: "formal", text: "", startedAt: null });
const KEY = "nutqon.draft.v1";

function loadDrafts(): Record<PartType, Draft> {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { letter: { ...empty(), ...d.letter }, essay: { ...empty(), ...d.essay } };
  } catch {
    return { letter: empty(), essay: empty() };
  }
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Timer({ startedAt, minutes }: { startedAt: number | null; minutes: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const sec = startedAt ? (now - startedAt) / 1000 : 0;
  const late = sec > minutes * 60;
  return <span className={`font-bold tabular-nums ${late ? "text-red-700" : ""}`} title={late ? "Tavsiya etilgan vaqt tugadi" : undefined}>⏱ {mmss(sec)} / {mmss(minutes * 60)}</span>;
}

function PartEditor({ k, d, onChange }: { k: PartType; d: Draft; onChange: (d: Draft) => void }) {
  const T = TYPES[k];
  const n = countWords(d.text);
  return (
    <section className="card grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3"><span className="font-ar text-2xl text-green">{T.ar}</span><h2 className="text-xl">{T.uz}</h2></div>
        <div className="flex flex-wrap gap-1.5 text-sm">
          <span className="chip">Maqsad: {T.target} so&apos;z</span>
          <span className="chip border-gold bg-gold-soft text-gold-ink"><Timer startedAt={d.startedAt} minutes={T.minutes} /></span>
          <span className="chip bg-green-soft text-green">Maks: {T.max} ball</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label" htmlFor={`topic-${k}`}>Topshiriq mavzusi
          <input id={`topic-${k}`} className="input" value={d.topic} maxLength={300} onChange={(e) => onChange({ ...d, topic: e.target.value })}
            placeholder={k === "letter" ? "Masalan: Do'stingizga ta'til haqida xat yozing" : "Masalan: الرياضة وأثرها في الصحة والمجتمع"} />
        </label>
        {k === "letter" && (
          <label className="label" htmlFor="kind">Xat turi
            <select id="kind" className="input" value={d.kind} onChange={(e) => onChange({ ...d, kind: e.target.value as Draft["kind"] })}>
              <option value="formal">Rasmiy xat — رسالة رسمية</option>
              <option value="personal">Shaxsiy xat — رسالة شخصية</option>
            </select>
          </label>
        )}
      </div>
      {!d.topic && <p className="text-sm text-ink-muted">Mavzu kiritilmasa, matnning mavzuga mosligini ishonchli baholab bo&apos;lmaydi.</p>}
      <label className="label" htmlFor={`ta-${k}`}>Arabcha matn
        <textarea id={`ta-${k}`} dir="rtl" lang="ar" spellCheck={false} className="input min-h-[260px] resize-y text-right font-ar text-[21px] leading-[2]"
          value={d.text} placeholder={k === "letter" ? "اكتب رسالتك هنا…" : "اكتب إنشاءك هنا…"}
          onChange={(e) => onChange({ ...d, text: e.target.value, startedAt: d.startedAt ?? (e.target.value.trim() ? Date.now() : null) })} />
      </label>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
          <b className="text-lg">{n} / {T.target} so&apos;z</b>
          <span className="text-sm text-ink-muted">{n ? wordMessage(n, T.target) : "Matn kiritilmagan."}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-beige">
          <i className={`block h-full rounded-full ${n > T.target * 1.1 ? "bg-gold" : "bg-green"}`} style={{ width: `${Math.min(100, (n / T.target) * 100)}%` }} />
        </div>
      </div>
    </section>
  );
}

export default function CheckForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, loading } = useMe();
  const [drafts, setDrafts] = useState<Record<PartType, Draft> | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const parts: PartType[] = mode === "full" ? ["letter", "essay"] : [mode];

  useEffect(() => { setDrafts(loadDrafts()); }, []);
  useEffect(() => { if (user && !name) setName(user.name); }, [user, name]);
  useEffect(() => {
    if (!drafts) return;
    const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(drafts)); } catch { /* xotira yo'q */ } }, 400);
    return () => clearTimeout(t);
  }, [drafts]);
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

  if (!drafts || loading) return <div className="card text-center text-ink-muted">Yuklanmoqda…</div>;

  const submit = async () => {
    setErr("");
    for (const k of parts) if (!drafts[k].text.trim()) { setErr(`${TYPES[k].uz}: matn kiritilmagan.`); return; }
    setBusy(true);
    ctl.current = new AbortController();
    const body: Record<string, unknown> = { mode, studentName: name.trim() || undefined };
    for (const k of parts) {
      const d = drafts[k];
      body[k] = { topic: d.topic, kind: d.kind, text: d.text, minutes: d.startedAt ? Math.round((Date.now() - d.startedAt) / 60000) : null };
    }
    try {
      const r = await api<{ submission: Submission }>("/api/check", { method: "POST", body, signal: ctl.current.signal });
      router.push(`/results/${r.submission.id}`);
    } catch (x) {
      setErr((x as Error).name === "AbortError" ? "Tekshiruv to'xtatildi." : (x as Error).message);
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="card grid justify-items-center gap-3 py-10 text-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-beige-dark border-t-green" aria-hidden />
        <b>Matn tahlil qilinmoqda…</b>
        <p className="max-w-md text-sm text-ink-muted">Claude grammatika, mazmun va tuzilmani tekshirmoqda. Bu odatda 30 soniyadan 2 daqiqagacha davom etadi.</p>
        <button type="button" className="btn-ghost btn-sm" onClick={() => ctl.current?.abort()}>To&apos;xtatish</button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl text-green">{mode === "full" ? "To'liq Writing — xat va insho" : `${TYPES[mode].uz}ni tekshirish`}</h1>
      </div>
      <div className="card">
        <label className="label" htmlFor="sname">O&apos;quvchining ismi
          <input id="sname" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      {parts.map((k) => <PartEditor key={k} k={k} d={drafts[k]} onChange={(d) => setDrafts({ ...drafts, [k]: d })} />)}
      {err && <div className="notice-err" role="alert">{err}</div>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={submit}>Tekshirish</button>
        <button type="button" className="btn-ghost" onClick={() => { const n = { ...drafts }; for (const k of parts) n[k] = { ...n[k], text: "", startedAt: null }; setDrafts(n); setErr(""); }}>Matnni tozalash</button>
      </div>
    </>
  );
}
