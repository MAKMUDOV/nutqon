"use client";
import { useEffect, useState } from "react";
import type { PublicUser } from "./types";

/** Brauzerdan API chaqiruvi: xato bo'lsa serverning o'zbekcha xabarini tashlaydi. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method || "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
      credentials: "same-origin"
    });
  } catch {
    throw new Error("Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    if (res.status === 504 || res.status === 502) throw new Error("Server javobi juda kechikdi. Bir daqiqadan keyin qayta urinib ko'ring.");
    if (res.status === 413) throw new Error("Yuborilgan ma'lumot juda katta (rasm hajmini kichraytiring).");
    throw new Error(`Xato (${res.status}). Qayta urinib ko'ring.`);
  }
  return data as T;
}

export type Usage = { day: string; checks: { used: number; limit: number; left: number }; ocr: { used: number; limit: number; left: number } } | null;

export function useMe() {
  const [state, setState] = useState<{ loading: boolean; user: PublicUser | null; usage: Usage; allowRegistration: boolean }>({ loading: true, user: null, usage: null, allowRegistration: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<{ user: PublicUser | null; usage: Usage; allowRegistration: boolean }>("/api/me")
      .then((d) => alive && setState({ loading: false, user: d.user, usage: d.usage ?? null, allowRegistration: d.allowRegistration }))
      .catch(() => alive && setState((s) => ({ ...s, loading: false })));
    return () => { alive = false; };
  }, [tick]);
  /** Limitni qayta yuklash (masalan, rasm o'qilgandan keyin) */
  const refresh = () => setTick((t) => t + 1);
  return { ...state, refresh };
}

export const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
export const dt = (iso: string) => new Date(iso).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
