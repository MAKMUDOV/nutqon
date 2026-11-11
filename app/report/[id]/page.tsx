"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, dt, fmt } from "@/lib/client";
import { CRITERIA, TYPES, pct, wordMessage, type PartType } from "@/lib/scoring";
import { effTotal, partEff } from "@/lib/stats";
import type { Submission } from "@/lib/types";

/** Chop etiladigan hisobot. "PDF sifatida saqlash" brauzerning chop etish oynasi orqali — arabcha RTL matn buzilmaydi. */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<Submission | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<{ submission: Submission }>(`/api/submissions/${id}`).then((d) => setS(d.submission), (e) => setErr(e.message)); }, [id]);
  if (err) return <div className="notice-err">{err}</div>;
  if (!s) return <div className="card text-center text-ink-muted">Yuklanmoqda…</div>;
  const keys = (["letter", "essay"] as PartType[]).filter((k) => s.parts[k]);
  return (
    <article className="card grid gap-4 bg-white">
      <div className="no-print flex flex-wrap items-center gap-3">
        <button type="button" className="btn-gold" onClick={() => window.print()}>PDF sifatida saqlash / chop etish</button>
        <span className="text-sm text-ink-muted">Chop etish oynasida &quot;Save as PDF&quot; (PDF sifatida saqlash) ni tanlang.</span>
      </div>
      <header className="grid gap-1">
        <h1 className="text-2xl text-green">NUTQON — CEFR Writing hisoboti</h1>
        <p className="text-sm text-ink-muted">{s.studentName} · {dt(s.createdAt)} · Taxminiy AI baholash, rasmiy CEFR natijasi emas.</p>
        {keys.length === 2 && <p className="font-semibold">Jami: {fmt(effTotal(s))} / 75 ball ({fmt(pct(effTotal(s), 75))}%)</p>}
        {s.teacherReview?.note && <p className="text-sm"><b>O&apos;qituvchi izohi:</b> {s.teacherReview.note}</p>}
      </header>
      {keys.map((k) => {
        const p = s.parts[k]!;
        const tp = s.teacherReview?.parts[k];
        return (
          <section key={k} className="grid gap-3">
            <h2 className="text-xl">{TYPES[k].uz} ({TYPES[k].ar}): {fmt(partEff(s, k))} / {p.max} ball</h2>
            {tp && <p className="text-sm">O&apos;qituvchi bahosi. AI bahosi: {fmt(p.total)} / {p.max}</p>}
            <p className="text-sm">Mavzu: {p.topic || "kiritilmagan"} · So&apos;zlar: {p.wordCount} / {p.target}</p>
            <table className="tbl break-avoid">
              <tbody>
                {CRITERIA.map((c) => (
                  <tr key={c.key}><td>{c.uz}</td><td className="whitespace-nowrap">{fmt(tp ? tp.scores[c.key] : p.scores[c.key])} / {TYPES[k].per}</td>
                    <td className="text-xs">{c.key === "words" ? wordMessage(p.wordCount, p.target) : p.ai.rubric[c.key].reason}</td></tr>
                ))}
              </tbody>
            </table>
            <h3 className="text-base">Asl matn</h3>
            <div className="ar-text text-lg">{p.text}</div>
            <h3 className="text-base">Xatolar ({p.ai.errors.length})</h3>
            <table className="tbl">
              <tbody>
                {p.ai.errors.map((e, i) => (
                  <tr key={i} className="break-avoid">
                    <td dir="rtl" className="font-ar text-lg text-red-700 line-through">{e.fragment}</td>
                    <td dir="rtl" className="font-ar text-lg font-semibold text-green">{e.correction}</td>
                    <td className="text-xs">{e.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="text-base">Tuzatilgan matn</h3>
            <div className="ar-text text-lg">{p.ai.correctedText}</div>
            <h3 className="text-base">Tavsiyalar</h3>
            <ol className="list-decimal ps-5 text-sm">{p.ai.recommendations.map((x, i) => <li key={i}>{x}</li>)}</ol>
          </section>
        );
      })}
    </article>
  );
}
