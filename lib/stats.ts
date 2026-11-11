import { CRITERIA, TYPES, pct, type PartType } from "./scoring";
import type { Submission, User } from "./types";

export const effTotal = (s: Submission) => (s.teacherReview ? s.teacherReview.total : s.total);
export const partEff = (s: Submission, k: PartType) => s.teacherReview?.parts[k]?.total ?? s.parts[k]?.total ?? 0;
export const effScores = (s: Submission, k: PartType) => s.teacherReview?.parts[k]?.scores ?? s.parts[k]!.scores;

const mean = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);

/** O'qituvchi paneli statistikasi (o'qituvchi tuzatgan baho bo'lsa, o'sha olinadi). */
export function buildStats(subs: Submission[], users: User[]) {
  const parts = subs.flatMap((s) => (["letter", "essay"] as PartType[]).filter((k) => s.parts[k]).map((k) => ({ s, k })));
  const criteria = CRITERIA.map((c) => ({
    key: c.key, uz: c.uz,
    avgPercent: mean(parts.map(({ s, k }) => pct(effScores(s, k)[c.key], TYPES[k].per))) ?? 0
  }));
  const catCount = new Map<string, number>();
  const typeCount = new Map<string, number>();
  for (const { s, k } of parts) for (const e of s.parts[k]!.ai.errors) {
    catCount.set(e.category, (catCount.get(e.category) || 0) + 1);
    typeCount.set(e.type, (typeCount.get(e.type) || 0) + 1);
  }
  const students = users.filter((u) => u.role === "STUDENT").map((u) => {
    const mine = subs.filter((s) => s.userId === u.id);
    return {
      id: u.id, name: u.name, login: u.login, count: mine.length,
      avgPercent: mean(mine.map((s) => pct(effTotal(s), s.max))),
      last: mine[0] ? { id: mine[0].id, total: effTotal(mine[0]), max: mine[0].max, createdAt: mine[0].createdAt } : null
    };
  });
  return {
    count: subs.length,
    avgPercent: mean(subs.map((s) => pct(effTotal(s), s.max))),
    letterAvg: mean(subs.filter((s) => s.parts.letter).map((s) => partEff(s, "letter"))),
    essayAvg: mean(subs.filter((s) => s.parts.essay).map((s) => partEff(s, "essay"))),
    criteria,
    topErrors: [...catCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([category, count]) => ({ category, count })),
    errorTypes: Object.fromEntries(typeCount),
    students
  };
}
