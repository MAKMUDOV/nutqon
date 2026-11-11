"use client";
import Link from "next/link";
import { dt, fmt } from "@/lib/client";
import { TYPES } from "@/lib/scoring";

export type Row = {
  id: string; userId: string; studentName: string; mode: "letter" | "essay" | "full"; createdAt: string;
  total: number; max: number; percent: number; topics: string[]; teacherTotal: number | null;
};

export const finalPct = (r: Row) => (r.max ? ((r.teacherTotal ?? r.total) / r.max) * 100 : 0);

export function WorksTable({ rows, withName }: { rows: Row[]; withName?: boolean }) {
  if (!rows.length) return <p className="text-ink-muted">Hozircha tekshirilgan ishlar yo&apos;q.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Sana</th>{withName && <th>O&apos;quvchi</th>}<th>Tur</th><th>Mavzu</th><th>AI bahosi</th><th>Yakuniy</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-beige">
              <td><Link className="text-green underline" href={`/results/${r.id}`}>{dt(r.createdAt)}</Link></td>
              {withName && <td>{r.studentName}</td>}
              <td>{r.mode === "full" ? "To'liq" : TYPES[r.mode].uz}</td>
              <td className="text-xs">{r.topics.join(" / ").slice(0, 70) || "—"}</td>
              <td>{fmt(r.total)} / {r.max}</td>
              <td>{r.teacherTotal != null ? <span className="chip border-gold bg-gold-soft text-gold-ink">{fmt(r.teacherTotal)} / {r.max}</span> : <span className="text-ink-muted">{fmt(r.total)} / {r.max}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Natijalar dinamikasi (foizda), eng eskisidan eng yangisigacha. */
export function TrendChart({ rows }: { rows: Row[] }) {
  const pts = rows.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-30).map(finalPct);
  if (pts.length < 2) return null;
  const W = 640, H = 200, L = 34, R = 12, T = 12, B = 26;
  const x = (i: number) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-60 w-full" role="img" aria-label={"Natijalar foizda: " + pts.map(fmt).join(", ")}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#ebdfc2" /><text x={L - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#5e6b62">{g}</text></g>
      ))}
      <path d={`${d} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="rgba(201,162,39,.15)" />
      <path d={d} fill="none" stroke="#0F5132" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === pts.length - 1 ? 5 : 3} fill={i === pts.length - 1 ? "#C9A227" : "#0F5132"} />)}
      <text x={x(pts.length - 1)} y={y(last) - 9} textAnchor="end" fontSize="12" fontWeight="700" fill="#0F5132">{fmt(last)}%</text>
      <text x={L} y={H - 6} fontSize="11" fill="#5e6b62">eng eski</text>
      <text x={W - R} y={H - 6} textAnchor="end" fontSize="11" fill="#5e6b62">eng yangi</text>
    </svg>
  );
}
