"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { TrendChart, WorksTable, type Row } from "@/components/Lists";

export default function Page() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<{ submissions: Row[] }>("/api/submissions").then((d) => setRows(d.submissions), (e) => setErr(e.message)); }, []);
  return (
    <>
      <h1 className="text-3xl text-green">Mening natijalarim</h1>
      {err && <div className="notice-err">{err}</div>}
      {!rows && !err && <div className="card text-center text-ink-muted">Yuklanmoqda…</div>}
      {rows && rows.length >= 2 && <div className="card"><h3 className="mb-2 text-lg">Natijalar dinamikasi (%)</h3><TrendChart rows={rows} /></div>}
      {rows && <div className="card"><WorksTable rows={rows} /></div>}
    </>
  );
}
