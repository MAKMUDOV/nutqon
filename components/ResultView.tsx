"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, dt, fmt, useMe } from "@/lib/client";
import { CRITERIA, TYPES, pct, round05, sumScores, wordMessage, type PartType, type Scores } from "@/lib/scoring";
import { effTotal, partEff } from "@/lib/stats";
import type { FoundError, PartResult, Submission } from "@/lib/types";

const TYPE_UZ: Record<FoundError["type"], string> = { grammar: "Grammatik xato", spelling: "Imloviy xato", style: "Uslubiy takomillashtirish", word_choice: "So'z tanlovi" };
const SEV_UZ = { high: "jiddiy", medium: "o'rtacha", low: "yengil" } as const;
const BORDER: Record<FoundError["type"], string> = { grammar: "border-s-red-700", spelling: "border-s-red-700", style: "border-s-amber-600", word_choice: "border-s-blue-700" };

export function ScoreRing({ p }: { p: number }) {
  const r = 54, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, p)) / 100);
  return (
    <svg viewBox="0 0 132 132" className="h-[132px] w-[132px]" role="img" aria-label={`${fmt(p)} foiz`}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="#F3E9D2" strokeWidth="12" />
      <circle cx="66" cy="66" r={r} fill="none" stroke="#C9A227" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 66 66)" />
      <text x="66" y="72" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0F5132">{fmt(p)}%</text>
    </svg>
  );
}

export function ErrorCard({ e }: { e: FoundError }) {
  return (
    <div className={`grid gap-1.5 rounded-xl border border-beige-line border-s-[5px] bg-white p-3 ${BORDER[e.type]}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-sm"><b>{TYPE_UZ[e.type]}</b><span className="chip">{e.category}</span><span className="chip">Daraja: {SEV_UZ[e.severity]}</span></div>
      <div><span className="text-sm text-ink-muted">Xato: </span><span dir="rtl" className="font-ar text-xl text-red-700 line-through decoration-1">{e.fragment}</span></div>
      <div><span className="text-sm text-ink-muted">To&apos;g&apos;ri: </span><span dir="rtl" className="font-ar text-xl font-semibold text-green">{e.correction}</span></div>
      {e.explanation && <div className="text-sm"><b>Izoh: </b>{e.explanation}</div>}
    </div>
  );
}

export function HighlightedText({ p, onPick }: { p: PartResult; onPick?: (e: FoundError) => void }) {
  const out: React.ReactNode[] = [];
  let pos = 0;
  p.ai.errors.forEach((e, i) => {
    if (e.start > pos) out.push(p.text.slice(pos, e.start));
    out.push(
      <mark key={i} className={`mark-${e.type} text-inherit`} tabIndex={0} role="button" aria-label={TYPE_UZ[e.type]}
        onClick={() => onPick?.(e)} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onPick?.(e); } }}>
        {p.text.slice(e.start, e.end)}
      </mark>
    );
    pos = e.end;
  });
  if (pos < p.text.length) out.push(p.text.slice(pos));
  return <div className="ar-text" lang="ar">{out}</div>;
}

function Compare({ p }: { p: PartResult }) {
  const [mode, setMode] = useState<"corrected" | "improved">("corrected");
  const other = mode === "corrected" ? p.ai.correctedText : p.ai.improvedText;
  const [copied, setCopied] = useState("");
  return (
    <div className="card grid gap-3">
      <h3 className="text-lg">Tuzatilgan matn</h3>
      <div className="flex flex-wrap gap-1.5">
        {(["corrected", "improved"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full border-2 px-3.5 py-1 text-sm ${mode === m ? "border-green bg-green text-white" : "border-beige-line bg-white"}`}>
            {m === "corrected" ? "Faqat xatolar tuzatilgan" : "Ravonroq namunaviy variant"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><h4 className="mb-1.5 text-sm text-ink-muted">Asl matn</h4><div className="ar-text" lang="ar">{p.text}</div></div>
        <div>
          <h4 className="mb-1.5 text-sm text-ink-muted">{mode === "corrected" ? "Tuzatilgan variant" : "Namunaviy variant"}</h4>
          <div className="ar-text" lang="ar">{other || "—"}</div>
          <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => navigator.clipboard.writeText(other).then(() => setCopied("Nusxa olindi"), () => setCopied("Nusxa olinmadi"))}>{copied || "Nusxa olish"}</button>
        </div>
      </div>
      <p className="text-sm text-ink-muted">Namunaviy variant o&apos;quvchining fikrlarini saqlagan holda tilni boyitadi; yangi fikr qo&apos;shilmaydi.</p>
    </div>
  );
}

function PartSection({ s, k, showTitle, onPick }: { s: Submission; k: PartType; showTitle: boolean; onPick: (e: FoundError) => void }) {
  const p = s.parts[k]!;
  const T = TYPES[k];
  const tp = s.teacherReview?.parts[k];
  return (
    <section className="grid gap-5">
      {showTitle && <div className="flex items-baseline justify-between"><h2 className="text-2xl">{T.uz}</h2><span className="font-ar text-2xl text-green">{T.ar}</span></div>}
      <div className="card grid gap-4">
        <h3 className="text-lg">Mezonlar bo&apos;yicha baholar</h3>
        {CRITERIA.map((c, i) => {
          const ai = p.scores[c.key];
          const shown = tp ? tp.scores[c.key] : ai;
          const fb = c.key === "words" ? null : p.ai.rubric[c.key];
          return (
            <div key={c.key} className={`grid gap-2 ${i ? "border-t border-beige-line pt-4" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <b>{c.uz}</b>
                <span className="font-bold tabular-nums text-green">{fmt(shown)} / {T.per}{tp && shown !== ai ? `  (AI: ${fmt(ai)})` : ""}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-beige"><i className="block h-full bg-gold" style={{ width: `${pct(shown, T.per)}%` }} /></div>
              {fb ? (
                <>
                  <p className="text-sm">{fb.reason}</p>
                  {(fb.strengths.length > 0 || fb.weaknesses.length > 0) && (
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div><b>Kuchli tomonlari</b>{fb.strengths.length ? <ul className="list-disc ps-5">{fb.strengths.map((x, j) => <li key={j}>{x}</li>)}</ul> : <div className="text-ink-muted">—</div>}</div>
                      <div><b>Kamchiliklar</b>{fb.weaknesses.length ? <ul className="list-disc ps-5">{fb.weaknesses.map((x, j) => <li key={j}>{x}</li>)}</ul> : <div className="text-ink-muted">—</div>}</div>
                    </div>
                  )}
                  {fb.tip && <p className="text-sm"><b>Ballni oshirish uchun: </b>{fb.tip}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm">Dastur hisobladi: {p.wordCount} so&apos;z, maqsad {p.target}. Farq: {fmt((Math.abs(p.wordCount - p.target) / p.target) * 100)}%. {wordMessage(p.wordCount, p.target)}</p>
                  <p className="text-sm text-ink-muted">Ichki qoida: ±10% gacha — to&apos;liq ball, 10–20% — 60%, 20–30% — 20%, 30% dan ortiq — 0 (o&apos;qituvchi sozlashi mumkin).</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="card grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg">Xatolar ({p.ai.errors.length})</h3>
          <div className="flex flex-wrap gap-3 text-xs">
            <span><i className="me-1 inline-block h-3 w-3 rounded-sm border-b-2 border-red-700 bg-red-100 align-[-1px]" />Grammatika / imlo</span>
            <span><i className="me-1 inline-block h-3 w-3 rounded-sm border-b-2 border-amber-600 bg-amber-100 align-[-1px]" />Uslub</span>
            <span><i className="me-1 inline-block h-3 w-3 rounded-sm border-b-2 border-blue-700 bg-blue-100 align-[-1px]" />So&apos;z tanlovi</span>
          </div>
        </div>
        <p className="text-sm text-ink-muted">{p.ai.errors.length ? "Belgilangan joy ustiga bosing — izoh ochiladi." : "Matnda xato topilmadi."}</p>
        <HighlightedText p={p} onPick={onPick} />
        {p.ai.errors.length > 0 && (
          <details><summary className="cursor-pointer font-semibold">Barcha xatolar ro&apos;yxati</summary><div className="mt-3 grid gap-2.5">{p.ai.errors.map((e, i) => <ErrorCard key={i} e={e} />)}</div></details>
        )}
        {p.ai.droppedErrors > 0 && <p className="text-sm text-ink-muted">AI ko&apos;rsatgan {p.ai.droppedErrors} ta xato matnda topilmagani uchun chiqarib tashlandi.</p>}
      </div>

      <Compare p={p} />

      <div className="card grid gap-3">
        <h3 className="text-lg">Tavsiyalar</h3>
        <ol className="list-decimal ps-5">{p.ai.recommendations.map((x, i) => <li key={i}>{x}</li>)}</ol>
        {(p.ai.strengths.length > 0 || p.ai.weaknesses.length > 0) && (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div><b>Umumiy kuchli tomonlar</b><ul className="list-disc ps-5">{p.ai.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div><b>Umumiy kamchiliklar</b><ul className="list-disc ps-5">{p.ai.weaknesses.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          </div>
        )}
        {p.ai.assessmentNotes && <div className="notice"><b>Baholash haqida izoh: </b>{p.ai.assessmentNotes}</div>}
      </div>
    </section>
  );
}

function ReviewPanel({ s, onSaved }: { s: Submission; onSaved: (s: Submission) => void }) {
  const keys = (["letter", "essay"] as PartType[]).filter((k) => s.parts[k]);
  const [vals, setVals] = useState<Record<string, Scores>>(() => Object.fromEntries(keys.map((k) => [k, { ...s.parts[k]!.scores, ...(s.teacherReview?.parts[k]?.scores || {}) }])));
  const [note, setNote] = useState(s.teacherReview?.note || "");
  const [status, setStatus] = useState("");
  const total = round05(keys.reduce((a, k) => a + sumScores(vals[k], k), 0));
  const save = async (clear: boolean) => {
    setStatus("Saqlanmoqda…");
    try {
      const r = await api<{ submission: Submission }>(`/api/submissions/${s.id}/review`, { method: "PATCH", body: clear ? { clear: true } : { note, parts: Object.fromEntries(keys.map((k) => [k, { scores: vals[k] }])) } });
      onSaved(r.submission);
      setStatus("Saqlandi.");
    } catch (x) { setStatus((x as Error).message); }
  };
  return (
    <div className="card no-print grid gap-3 border-gold">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg">O&apos;qituvchi bahosi</h3><span className="chip border-gold bg-gold-soft text-gold-ink">Faqat o&apos;qituvchi ko&apos;radi</span></div>
      <p className="text-sm text-ink-muted">AI bahosi o&apos;zgarmaydi va alohida saqlanadi. O&apos;qituvchi bahosi o&apos;quvchiga yakuniy baho sifatida ko&apos;rsatiladi.</p>
      {keys.map((k) => (
        <div key={k} className="grid gap-2">
          <b>{TYPES[k].uz} (AI: {fmt(s.parts[k]!.total)} / {TYPES[k].max})</b>
          <div className="flex flex-wrap gap-3">
            {CRITERIA.map((c) => (
              <label key={c.key} className="grid gap-1 text-sm" htmlFor={`rv-${k}-${c.key}`}>{c.uz} (0–{TYPES[k].per})
                <input id={`rv-${k}-${c.key}`} type="number" min={0} max={TYPES[k].per} step={0.5} className="input w-24 text-center" value={vals[k][c.key]}
                  onChange={(e) => { const n = Number(e.target.value); setVals({ ...vals, [k]: { ...vals[k], [c.key]: Math.max(0, Math.min(TYPES[k].per, isFinite(n) ? n : 0)) } }); }} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <b>Yakuniy baho: {fmt(total)} / {s.max}</b>
      <label className="label" htmlFor="tnote">Izoh<textarea id="tnote" className="input" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O'quvchiga izoh (ixtiyoriy)" /></label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={() => save(false)}>Bahoni saqlash</button>
        {s.teacherReview && <button type="button" className="btn-ghost btn-sm" onClick={() => save(true)}>AI bahosiga qaytarish</button>}
        <span className="text-sm text-ink-muted" role="status">{status}</span>
      </div>
    </div>
  );
}

export default function ResultView({ id }: { id: string }) {
  const { user } = useMe();
  const [s, setS] = useState<Submission | null>(null);
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState<FoundError | null>(null);
  useEffect(() => {
    api<{ submission: Submission }>(`/api/submissions/${id}`).then((d) => setS(d.submission), (e) => setErr(e.message));
  }, [id]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setPicked(null); };
    addEventListener("keydown", h); return () => removeEventListener("keydown", h);
  }, []);
  if (err) return <div className="notice-err">{err}</div>;
  if (!s) return <div className="card text-center text-ink-muted">Natija yuklanmoqda…</div>;
  const keys = (["letter", "essay"] as PartType[]).filter((k) => s.parts[k]);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-3xl text-green">Tekshiruv natijasi</h1><p className="text-sm text-ink-muted">{s.studentName} · {dt(s.createdAt)}</p></div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href={`/report/${s.id}`} className="btn-gold btn-sm">PDF hisobot</Link>
          <Link href={`/check/${s.mode}`} className="btn btn-sm">Yangi tekshiruv</Link>
        </div>
      </div>
      <div className="notice">Bu taxminiy AI baholash. Rasmiy CEFR natijasi emas; yakuniy bahoni o&apos;qituvchi tasdiqlaydi.</div>
      <div className="card grid gap-5">
        {keys.map((k) => {
          const p = s.parts[k]!;
          const eff = partEff(s, k);
          return (
            <div key={k} className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
              <ScoreRing p={pct(eff, p.max)} />
              <div className="grid gap-1">
                <div className="font-display text-3xl tabular-nums text-green sm:text-4xl">{TYPES[k].uz} natijasi: {fmt(eff)} / {p.max} ball</div>
                <div className="text-sm">{s.teacherReview?.parts[k] ? <><span className="chip border-gold bg-gold-soft text-gold-ink">O&apos;qituvchi bahosi</span> <span className="text-ink-muted">AI bahosi: {fmt(p.total)} / {p.max}</span></> : <span className="chip">AI bahosi</span>}</div>
                <div className="text-sm text-ink-muted">{p.wordCount} / {p.target} so&apos;z · {wordMessage(p.wordCount, p.target)}{p.minutes ? ` · ${p.minutes} daqiqa` : ""}</div>
                <div className="text-sm">{p.topic ? <>Mavzu: {p.topic}</> : <span className="text-ink-muted">Mavzu kiritilmagan.</span>}</div>
              </div>
            </div>
          );
        })}
        {keys.length === 2 && <div className="notice-ok"><b>Jami: {fmt(effTotal(s))} / 75 ball ({fmt(pct(effTotal(s), 75))}%)</b></div>}
        {s.teacherReview?.note && <div className="notice"><b>O&apos;qituvchi izohi: </b>{s.teacherReview.note}</div>}
      </div>
      {user?.role === "TEACHER" && <ReviewPanel s={s} onSaved={setS} />}
      {keys.map((k) => <PartSection key={k} s={s} k={k} showTitle={keys.length > 1} onPick={setPicked} />)}
      {picked && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/35 p-3 md:items-center" onClick={(e) => { if (e.target === e.currentTarget) setPicked(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Xato tafsiloti" className="grid max-h-[80vh] w-full max-w-lg gap-3 overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <ErrorCard e={picked} />
            <button type="button" className="btn btn-sm" autoFocus onClick={() => setPicked(null)}>Yopish</button>
          </div>
        </div>
      )}
    </>
  );
}
