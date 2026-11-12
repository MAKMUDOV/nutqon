import { z } from "zod";
import { AI_CRITERIA, TYPES, applyCorrections, clamp, hasStrayLatin, locate, onlyDiacriticsDiffer, round05, type PartType } from "./scoring";
import { CATEGORIES } from "./prompt";
import type { FoundError, ValidatedAI } from "./types";

export class AIFormatError extends Error {}

const str = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
const strList = (n: number) =>
  z.array(z.unknown()).optional().default([])
    .transform((a) => a.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 600)).filter(Boolean).slice(0, n));

const criterion = z.object({
  score: z.coerce.number().refine((n) => Number.isFinite(n), "score son emas"),
  reason: str(800).refine((s) => s.length > 0, "asos (reason) bo'sh"),
  strengths: strList(5),
  weaknesses: strList(5),
  tip: z.string().optional().default("").transform((s) => s.trim().slice(0, 500))
});

const rawSchema = z.object({
  rubricScores: z.object({ structure: criterion, grammar: criterion, content: criterion, cohesion: criterion }),
  strengths: strList(6),
  weaknesses: strList(6),
  errors: z.array(z.unknown()).optional().default([]),
  correctedText: str(20000).refine((s) => s.length > 0, "tuzatilgan matn bo'sh"),
  improvedText: z.string().optional().default("").transform((s) => s.trim().slice(0, 20000)),
  recommendations: strList(5),
  assessmentNotes: z.string().optional().default("").transform((s) => s.trim().slice(0, 1200))
});

const errorSchema = z.object({
  fragment: str(200),
  correction: str(300),
  type: z.enum(["grammar", "spelling", "style", "word_choice"]).catch("grammar"),
  category: z.string().catch("Boshqa").transform((c) => ((CATEGORIES as readonly string[]).includes(c) ? c : "Boshqa")),
  severity: z.enum(["high", "medium", "low"]).catch("medium"),
  explanation: z.string().optional().default("").transform((s) => s.trim().slice(0, 600))
});

/** AI javobini sxema bo'yicha tekshiradi. Xato bo'lsa AIFormatError tashlaydi — soxta natija chiqmaydi. */
export function validateAI(raw: unknown, text: string, type: PartType): ValidatedAI {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AIFormatError(`AI javobi sxemaga mos emas: ${first.path.join(".")} — ${first.message}`);
  }
  const d = parsed.data;
  const per = TYPES[type].per;
  const rubric = {} as ValidatedAI["rubric"];
  for (const k of AI_CRITERIA) {
    const c = d.rubricScores[k];
    rubric[k] = { score: round05(clamp(c.score, 0, per)), max: per, reason: c.reason, strengths: c.strengths, weaknesses: c.weaknesses, tip: c.tip };
  }
  const taken: [number, number][] = [];
  const errors: FoundError[] = [];
  let dropped = 0;
  for (const e of d.errors.slice(0, 40)) {
    const pe = errorSchema.safeParse(e);
    if (!pe.success || !pe.data.fragment || !pe.data.correction) { dropped++; continue; }
    // Faqat harakat/tanvin qo'shilgan "tuzatish" xato emas (harakatsiz yozuv to'g'ri); bir xil matn ham.
    if (onlyDiacriticsDiffer(pe.data.fragment, pe.data.correction)) { dropped++; continue; }
    // Tuzatishda arab matni orasiga lotin harflari kirib qolsa — AI nuqsoni, ishonchsiz.
    if (hasStrayLatin(pe.data.correction, pe.data.fragment)) { dropped++; continue; }
    const pos = locate(text, pe.data.fragment, taken);
    if (!pos) { dropped++; continue; } // matnda yo'q xato — o'ylab topilgan, olib tashlanadi
    taken.push(pos);
    errors.push({ ...pe.data, fragment: text.slice(pos[0], pos[1]), start: pos[0], end: pos[1] });
  }
  errors.sort((a, b) => a.start - b.start);
  return {
    rubric,
    strengths: d.strengths,
    weaknesses: d.weaknesses,
    errors,
    droppedErrors: dropped,
    // "Faqat xatolar tuzatilgan" matn asl matndan dasturda yasaladi: belgilangan xatolarga to'liq mos, ortiqcha o'zgarishsiz.
    correctedText: applyCorrections(text, errors),
    improvedText: hasStrayLatin(d.improvedText, text) ? "" : d.improvedText,
    recommendations: d.recommendations,
    assessmentNotes: d.assessmentNotes
  };
}
