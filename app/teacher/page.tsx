"use client";
import { useCallback, useEffect, useState } from "react";
import { api, dt, fmt, useMe } from "@/lib/client";
import { TrendChart, WorksTable, type Row } from "@/components/Lists";
import { DEFAULT_SETTINGS, bandsText, type Settings } from "@/lib/scoring";

type Stats = {
  count: number; avgPercent: number | null; letterAvg: number | null; essayAvg: number | null;
  criteria: { key: string; uz: string; avgPercent: number }[];
  topErrors: { category: string; count: number }[];
  students: { id: string; name: string; login: string; count: number; avgPercent: number | null; dailyLimit: number | null; effectiveLimit: number; today: { checks: number; ocr: number }; last: { id: string; total: number; max: number; createdAt: string } | null }[];
};

const TABS = [["students", "O'quvchilar"], ["works", "Barcha ishlar"], ["stats", "Statistika"], ["settings", "Sozlamalar"]] as const;
type Tab = (typeof TABS)[number][0];

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="card grid gap-1"><span className="text-sm text-ink-muted">{label}</span><span className="font-display text-3xl tabular-nums text-green">{value}</span></div>;
}

function Bars({ items, color }: { items: { label: string; value: number; text: string }[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="grid gap-2">
      {items.map((i) => (
        <div key={i.label} className="grid grid-cols-[minmax(120px,190px)_1fr_auto] items-center gap-2.5 text-sm">
          <span>{i.label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-beige"><i className={`block h-full ${color}`} style={{ width: `${(i.value / max) * 100}%` }} /></div>
          <b className="tabular-nums">{i.text}</b>
        </div>
      ))}
    </div>
  );
}

function StatsView({ s }: { s: Stats }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Tekshirilgan ishlar" value={String(s.count)} />
        <Tile label="O'rtacha natija" value={s.avgPercent != null ? fmt(s.avgPercent) + "%" : "—"} />
        <Tile label="Xat o'rtachasi" value={s.letterAvg != null ? `${fmt(s.letterAvg)} / 25` : "—"} />
        <Tile label="Insho o'rtachasi" value={s.essayAvg != null ? `${fmt(s.essayAvg)} / 50` : "—"} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card grid gap-3"><h3 className="text-lg">Mezonlar bo&apos;yicha o&apos;rtacha (%)</h3>
          <Bars color="bg-green" items={s.criteria.map((c) => ({ label: c.uz, value: c.avgPercent, text: fmt(c.avgPercent) + "%" }))} />
        </div>
        <div className="card grid gap-3"><h3 className="text-lg">Eng ko&apos;p uchraydigan xatolar</h3>
          {s.topErrors.length ? <Bars color="bg-red-700" items={s.topErrors.map((e) => ({ label: e.category, value: e.count, text: String(e.count) }))} /> : <p className="text-ink-muted">Xatolar qayd etilmagan.</p>}
        </div>
      </div>
    </>
  );
}

function NewStudent({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", login: "", password: "" });
  const [msg, setMsg] = useState("");
  return (
    <form className="card grid gap-3" onSubmit={async (e) => {
      e.preventDefault(); setMsg("");
      try { await api("/api/teacher/students", { method: "POST", body: f }); setMsg(`Hisob yaratildi: ${f.login}`); setF({ name: "", login: "", password: "" }); onDone(); }
      catch (x) { setMsg((x as Error).message); }
    }}>
      <h3 className="text-lg">Yangi o&apos;quvchi hisobi</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="label" htmlFor="ns-name">Ism<input id="ns-name" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="label" htmlFor="ns-login">Login<input id="ns-login" className="input" required value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} /></label>
        <label className="label" htmlFor="ns-pw">Parol (8+)<input id="ns-pw" className="input" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      </div>
      <div className="flex items-center gap-3"><button className="btn btn-sm">Yaratish</button><span className="text-sm text-ink-muted" role="status">{msg}</span></div>
    </form>
  );
}

function SettingsView() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<{ settings: Settings }>("/api/settings").then((d) => setS(d.settings), (e) => setMsg(e.message)); }, []);
  if (!s) return <div className="card text-ink-muted">{msg || "Yuklanmoqda…"}</div>;
  type Row = { upTo: number | ""; pct: number | "" };
  const rows: Row[] = [...s.bands, ...Array(5).fill({ upTo: "", pct: "" })].slice(0, 5);
  const setBand = (i: number, key: "upTo" | "pct", v: string) => {
    const b = rows.map((x) => ({ ...x }));
    b[i][key] = v === "" ? "" : Number(v);
    setS({ ...s, bands: b as unknown as Settings["bands"] });
  };
  const bands = rows.filter((r) => r.upTo !== "" && r.pct !== "").map((r) => ({ upTo: Number(r.upTo), pct: Number(r.pct) }));
  return (
    <div className="card grid max-w-2xl gap-4">
      <h3 className="text-lg">So&apos;zlar soni bo&apos;yicha baholash chegaralari</h3>
      <p className="text-sm text-ink-muted">Bu ichki qoida, rasmiy CEFR qoidasi emas. Har qatorda: maqsaddan farq shu foizgacha bo&apos;lsa, mezon maksimal ballining qancha foizi beriladi. Oxirgi chegaradan oshsa — 0. Keraksiz qatorni bo&apos;sh qoldiring. Ballar 0,5 aniqlikda yaxlitlanadi.</p>
      {rows.map((b, i) => (
        <div key={i} className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-sm" htmlFor={`bu${i}`}>Farq (%) gacha<input id={`bu${i}`} type="number" min={0} max={100} className="input w-24 text-center" value={b.upTo} onChange={(e) => setBand(i, "upTo", e.target.value)} /></label>
          <label className="grid gap-1 text-sm" htmlFor={`bp${i}`}>Maks. ballning %<input id={`bp${i}`} type="number" min={0} max={100} step={5} className="input w-24 text-center" value={b.pct} onChange={(e) => setBand(i, "pct", e.target.value)} /></label>
        </div>
      ))}
      <p className="text-sm"><b>Natija: </b>{bands.length ? bandsText({ bands, penalizeOver: s.penalizeOver }) : "kamida bitta qator to'ldiring"}</p>
      <h3 className="mt-2 text-lg">Kunlik limitlar (har bir o&apos;quvchiga)</h3>
      <p className="text-sm text-ink-muted">AI xarajati va bepul limitni tejash uchun. Siz (o&apos;qituvchi) cheklanmaysiz. Alohida o&apos;quvchiga boshqa limitni o&apos;quvchi sahifasida qo&apos;yasiz. Aynan bir xil matnni qayta ko&apos;rish limitga kirmaydi.</p>
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-sm" htmlFor="dlc">Tekshiruvlar / kun<input id="dlc" type="number" min={0} max={1000} className="input w-28 text-center" value={s.dailyChecks ?? 3} onChange={(e) => setS({ ...s, dailyChecks: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-sm" htmlFor="dlo">Rasmdan o&apos;qish / kun<input id="dlo" type="number" min={0} max={1000} className="input w-28 text-center" value={s.dailyOcr ?? 8} onChange={(e) => setS({ ...s, dailyOcr: Number(e.target.value) })} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm" htmlFor="pover"><input id="pover" type="checkbox" checked={s.penalizeOver} onChange={(e) => setS({ ...s, penalizeOver: e.target.checked })} />Maqsaddan ortiq so&apos;z uchun ham ball kamaytirilsin</label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={async () => { setMsg("Saqlanmoqda…"); try { const r = await api<{ settings: Settings }>("/api/settings", { method: "PUT", body: { ...s, bands } }); setS(r.settings); setMsg("Saqlandi. Yangi tekshiruvlarga qo'llanadi."); } catch (x) { setMsg((x as Error).message); } }}>Saqlash</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setS(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)))}>Standartga qaytarish</button>
        <span className="text-sm text-ink-muted" role="status">{msg}</span>
      </div>
    </div>
  );
}

function StudentLimit({ id, current, effective, todayUsed, onSaved }: { id: string; current: number | null; effective: number; todayUsed: number; onSaved: () => void }) {
  const [v, setV] = useState(current === null ? "" : String(current));
  const [msg, setMsg] = useState("");
  const save = async (value: number | null) => {
    setMsg("Saqlanmoqda…");
    try { await api(`/api/teacher/students/${id}/limit`, { method: "POST", body: { dailyLimit: value } }); setMsg(value === null ? "Standart limit qo'llanadi." : `Shaxsiy limit: kuniga ${value} ta.`); onSaved(); }
    catch (x) { setMsg((x as Error).message); }
  };
  return (
    <form className="card grid gap-3" onSubmit={(e) => { e.preventDefault(); save(v.trim() === "" ? null : Number(v)); }}>
      <h3 className="text-lg">Kunlik tekshiruv limiti</h3>
      <p className="text-sm text-ink-muted">Bugun: {todayUsed}/{effective}. {current === null ? "Hozir standart limit qo'llanmoqda." : `Shaxsiy limit: ${current}.`} Bo&apos;sh qoldirsangiz — standart limit (Sozlamalar).</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="label" htmlFor="sl">Tekshiruvlar / kun<input id="sl" type="number" min={0} max={1000} className="input w-28 text-center" value={v} placeholder="standart" onChange={(e) => setV(e.target.value)} /></label>
        <button className="btn btn-sm">Saqlash</button>
        {current !== null && <button type="button" className="btn-ghost btn-sm" onClick={() => { setV(""); save(null); }}>Standartga qaytarish</button>}
      </div>
      {msg && <p className="text-sm text-ink-muted" role="status">{msg}</p>}
    </form>
  );
}

function ResetPassword({ id, name }: { id: string; name: string }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form className="card grid gap-3" onSubmit={async (e) => {
      e.preventDefault(); setMsg("Saqlanmoqda…");
      try { await api(`/api/teacher/students/${id}/password`, { method: "POST", body: { password: pw } }); setMsg(`Yangi parol saqlandi. Uni ${name}ga bering.`); setPw(""); }
      catch (x) { setMsg((x as Error).message); }
    }}>
      <h3 className="text-lg">Parolni tiklash</h3>
      <p className="text-sm text-ink-muted">O&apos;quvchi parolini unutgan bo&apos;lsa, yangi parol qo&apos;ying va unga ayting. Eski parol ishlamay qoladi.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="label" htmlFor="rp">Yangi parol (8+)<input id="rp" className="input w-56" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /></label>
        <button className="btn btn-sm">Saqlash</button>
      </div>
      {msg && <p className="text-sm text-ink-muted" role="status">{msg}</p>}
    </form>
  );
}

export default function TeacherPage() {
  const { user, loading } = useMe();
  const [tab, setTab] = useState<Tab>("students");
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [student, setStudent] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    setErr("");
    try {
      const [s, r] = await Promise.all([api<{ stats: Stats }>("/api/teacher/stats"), api<{ submissions: Row[] }>("/api/submissions")]);
      setStats(s.stats); setRows(r.submissions);
    } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { if (user?.role === "TEACHER") load(); }, [user, load]);

  if (loading) return <div className="card text-center text-ink-muted">Yuklanmoqda…</div>;
  if (user?.role !== "TEACHER") return <div className="notice-err">Bu bo&apos;lim faqat o&apos;qituvchi uchun.</div>;

  const st = student && stats ? stats.students.find((x) => x.id === student) : null;
  const stRows = student ? rows.filter((r) => r.userId === student) : [];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl text-green">O&apos;qituvchi paneli</h1>
        <button type="button" className="btn-ghost btn-sm" onClick={load}>Yangilash</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setStudent(null); }} className={`rounded-full border-2 px-3.5 py-1 text-sm ${tab === k ? "border-green bg-green text-white" : "border-beige-line bg-white"}`}>{l}</button>
        ))}
      </div>
      {err && <div className="notice-err">{err}</div>}
      {!stats && !err && <div className="card text-center text-ink-muted">Ma&apos;lumotlar yuklanmoqda…</div>}
      {stats && tab === "students" && !student && (
        <>
          <div className="card overflow-x-auto">
            {stats.students.length ? (
              <table className="tbl">
                <thead><tr><th>O&apos;quvchi</th><th>Login</th><th>Ishlar</th><th>Oxirgi natija</th><th>O&apos;rtacha</th><th>Bugun</th><th>Oxirgi faollik</th></tr></thead>
                <tbody>
                  {stats.students.map((s) => (
                    <tr key={s.id} className="cursor-pointer hover:bg-beige" tabIndex={0} onClick={() => setStudent(s.id)} onKeyDown={(e) => { if (e.key === "Enter") setStudent(s.id); }}>
                      <td><b>{s.name}</b></td><td>{s.login}</td><td>{s.count}</td>
                      <td>{s.last ? `${fmt(s.last.total)} / ${s.last.max}` : "—"}</td>
                      <td>{s.avgPercent != null ? fmt(s.avgPercent) + "%" : "—"}</td>
                      <td className="whitespace-nowrap" title="Bugungi tekshiruvlar / kunlik limit">{s.today.checks}/{s.effectiveLimit}{s.dailyLimit !== null && <span className="text-gold-ink"> ★</span>}</td>
                      <td className="text-xs">{s.last ? dt(s.last.createdAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-ink-muted">Hozircha o&apos;quvchilar yo&apos;q.</p>}
          </div>
          <NewStudent onDone={load} />
        </>
      )}
      {stats && tab === "students" && student && (
        <>
          <button type="button" className="btn-ghost btn-sm justify-self-start" onClick={() => setStudent(null)}>← O&apos;quvchilar ro&apos;yxati</button>
          <h2 className="text-2xl">{st?.name}</h2>
          {stRows.length >= 2 && <div className="card"><h3 className="mb-2 text-lg">Natijalarning vaqt bo&apos;yicha o&apos;zgarishi (%)</h3><TrendChart rows={stRows} /></div>}
          <div className="card"><WorksTable rows={stRows} /></div>
          {student && st && <StudentLimit key={"l" + student} id={student} current={st.dailyLimit} effective={st.effectiveLimit} todayUsed={st.today.checks} onSaved={load} />}
          {student && <ResetPassword key={student} id={student} name={st?.name || "o'quvchi"} />}
        </>
      )}
      {stats && tab === "works" && <div className="card"><WorksTable rows={rows} withName /></div>}
      {stats && tab === "stats" && <StatsView s={stats} />}
      {tab === "settings" && <SettingsView />}
    </>
  );
}
