// NUTQON — deterministik baholash mantiqi (AI'ga bog'liq emas)

export type PartType = "letter" | "essay";
export type CriterionKey = "structure" | "grammar" | "content" | "words" | "cohesion";
export type Scores = Record<CriterionKey, number>;

export const TYPES: Record<PartType, { key: PartType; ar: string; uz: string; target: number; minutes: number; max: number; per: number }> = {
  letter: { key: "letter", ar: "الرِّسَالَةُ", uz: "Xat", target: 150, minutes: 20, max: 25, per: 5 },
  essay: { key: "essay", ar: "الْإِنْشَاءُ", uz: "Insho", target: 250, minutes: 40, max: 50, per: 10 }
};

export const CRITERIA: { key: CriterionKey; uz: string }[] = [
  { key: "structure", uz: "Struktura va tuzilma" },
  { key: "grammar", uz: "Imlo va grammatika" },
  { key: "content", uz: "Ma'no va mazmun" },
  { key: "words", uz: "So'zlar soni" },
  { key: "cohesion", uz: "Bog'lovchilar" }
];
export const AI_CRITERIA = ["structure", "grammar", "content", "cohesion"] as const;
export type AICriterion = (typeof AI_CRITERIA)[number];

export const GRAND_MAX = 75;

export type Band = { upTo: number; pct: number };
export type Settings = { bands: Band[]; penalizeOver: boolean };
export const DEFAULT_SETTINGS: Settings = {
  bands: [{ upTo: 10, pct: 100 }, { upTo: 20, pct: 60 }, { upTo: 30, pct: 20 }],
  penalizeOver: true
};

const TASHKEEL_RE = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/;
const TASHKEEL_G = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const PUNCT_G = /[،؛؟٪-٭۔«»"'“”‘’()[\]{}<>.,;:!?\-–—…/\\|*_~`@#$%^&+=]/g;
const PROCLITIC = /^[وفبلك]$/; // yolg'iz yozilgan و ف ب ل ك

export const round05 = (x: number) => Math.round(x * 2) / 2;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/** Arabcha so'zlarni sanash: harakat, tatvil va tinish belgilari so'z emas; yopishgan prefikslar so'z ichida qoladi. */
export function countWords(text: string): number {
  if (!text) return 0;
  const s = text.normalize("NFC").replace(TASHKEEL_G, "").replace(PUNCT_G, " ");
  const toks = s.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
  let n = 0;
  for (let i = 0; i < toks.length; i++) {
    if (PROCLITIC.test(toks[i]) && i < toks.length - 1) continue; // "و الرياضة" → bitta so'z
    n++;
  }
  return n;
}

export function arabicRatio(text: string): number {
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (!letters) return 0;
  const ar = (text.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) || []).length;
  return ar / letters;
}

export function normSettings(s: unknown): Settings {
  const src = s as Partial<Settings> | null | undefined;
  if (!src || !Array.isArray(src.bands)) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  const bands = src.bands
    .map((b) => ({ upTo: Number(b?.upTo), pct: Number(b?.pct) }))
    .filter((b) => isFinite(b.upTo) && isFinite(b.pct) && b.upTo >= 0 && b.upTo <= 100 && b.pct >= 0 && b.pct <= 100)
    .sort((a, b) => a.upTo - b.upTo)
    .slice(0, 6);
  return { bands: bands.length ? bands : DEFAULT_SETTINGS.bands, penalizeOver: src.penalizeOver !== false };
}

export function wordScore(count: number, target: number, max: number, settings?: Settings | null): number {
  const st = normSettings(settings);
  if (count <= 0) return 0;
  if (count >= target && !st.penalizeOver) return max;
  const dev = (Math.abs(count - target) / target) * 100;
  for (const b of st.bands) if (dev <= b.upTo + 1e-9) return round05((max * b.pct) / 100);
  return 0;
}

export function wordMessage(count: number, target: number): string {
  if (count < target) return `Yana ${target - count} ta so'z kerak.`;
  if (count === target) return "So'zlar soni maqsadga teng.";
  return `Maqsaddan ${count - target} ta so'z ortiq.`;
}

function stripMap(s: string) {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (TASHKEEL_RE.test(c)) continue;
    if (/\s/.test(c)) {
      if (out.endsWith(" ")) continue;
      out += " ";
      map.push(i);
      continue;
    }
    out += c;
    map.push(i);
  }
  return { out, map };
}

const overlaps = (a: number, b: number, ranges: [number, number][]) => ranges.some((r) => a < r[1] && b > r[0]);

/** Xato fragmentini asl matndan topadi (avval aynan, keyin harakatlarni e'tiborsiz qoldirib). */
export function locate(text: string, frag: string, taken: [number, number][]): [number, number] | null {
  if (!frag) return null;
  let from = 0;
  for (;;) {
    const i = text.indexOf(frag, from);
    if (i < 0) break;
    if (!overlaps(i, i + frag.length, taken)) return [i, i + frag.length];
    from = i + 1;
  }
  const T = stripMap(text);
  const F = stripMap(frag.trim()).out;
  if (!F) return null;
  from = 0;
  for (;;) {
    const j = T.out.indexOf(F, from);
    if (j < 0) return null;
    const a = T.map[j];
    let b = T.map[j + F.length - 1] + 1;
    while (b < text.length && TASHKEEL_RE.test(text[b])) b++;
    if (!overlaps(a, b, taken)) return [a, b];
    from = j + 1;
  }
}

export function sumScores(scores: Partial<Scores>, type: PartType): number {
  const per = TYPES[type].per;
  let t = 0;
  for (const c of CRITERIA) t += round05(clamp(Number(scores[c.key]) || 0, 0, per));
  return round05(t);
}

export function overall(parts: Partial<Record<PartType, { total: number; max: number }>>) {
  let total = 0, max = 0;
  for (const k of ["letter", "essay"] as PartType[]) {
    const p = parts[k];
    if (p) { total += p.total; max += p.max; }
  }
  total = round05(total);
  return { total, max, percent: pct(total, max), percentOf75: pct(total, GRAND_MAX) };
}
