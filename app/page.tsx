"use client";
import Link from "next/link";
import { useMe } from "@/lib/client";
import { CRITERIA } from "@/lib/scoring";

const MODES = [
  { href: "/check/letter", ar: "الرِّسَالَةُ", title: "Xatni tekshirish", facts: ["150 so'z", "20 daqiqa", "25 ball"], desc: "Rasmiy yoki shaxsiy xat. 5 mezon × 5 ball." },
  { href: "/check/essay", ar: "الْإِنْشَاءُ", title: "Inshoni tekshirish", facts: ["250 so'z", "40 daqiqa", "50 ball"], desc: "Mavzu asosida insho. 5 mezon × 10 ball." },
  { href: "/check/full", ar: "الكتابة", title: "To'liq Writing", facts: ["Xat + insho", "60 daqiqa", "75 ball"], desc: "Ikkala ish alohida baholanadi va jamlanadi." }
];

export default function Home() {
  const { user, loading } = useMe();
  return (
    <>
      <section className="grid gap-2">
        <h1 className="text-3xl text-green sm:text-4xl">NUTQON — CEFR Writing Checker</h1>
        <p className="max-w-[62ch] text-ink-muted">
          Arab tilida yozilgan xat va inshoni CEFR yozma qismi mezonlari bo&apos;yicha tekshiradi: 5 mezon bo&apos;yicha ball, xatolar va ularning o&apos;zbekcha izohi, tuzatilgan matn hamda tavsiyalar.
        </p>
      </section>
      {!loading && !user && (
        <div className="notice flex flex-wrap items-center gap-3">
          <span>Tekshirish uchun tizimga kiring.</span>
          <Link className="btn btn-sm" href="/login">Kirish</Link>
          <Link className="btn-ghost btn-sm" href="/register">Ro&apos;yxatdan o&apos;tish</Link>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {MODES.map((m) => (
          <Link key={m.href} href={user ? m.href : "/login"} className="grid gap-2.5 rounded-2xl border-2 border-beige-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold">
            <div className="text-right font-ar text-3xl text-green" dir="rtl">{m.ar}</div>
            <h3 className="text-xl">{m.title}</h3>
            <div className="flex flex-wrap gap-1.5">{m.facts.map((f) => <span key={f} className="chip">{f}</span>)}</div>
            <div className="text-sm text-ink-muted">{m.desc}</div>
          </Link>
        ))}
      </div>
      <div className="card">
        <h3 className="mb-2 text-lg">Baholash tizimi</h3>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Mezon</th><th>Xat</th><th>Insho</th></tr></thead>
            <tbody>
              {CRITERIA.map((c) => <tr key={c.key}><td>{c.uz}</td><td>0–5</td><td>0–10</td></tr>)}
              <tr><td><b>Jami</b></td><td><b>25</b></td><td><b>50</b></td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-ink-muted">Jami maksimal: 25 + 50 = 75 ball. Umumiy foiz = yig&apos;ilgan ball / 75 × 100. Umumiy ball serverda mezonlar yig&apos;indisi sifatida hisoblanadi.</p>
      </div>
    </>
  );
}
