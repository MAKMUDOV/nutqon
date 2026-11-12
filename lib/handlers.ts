import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  CRITERIA, TYPES, arabicRatio, clamp, countWords, normSettings, overall, round05, sumScores, tashkentDay, wordScore,
  type PartType, type Scores, type Settings
} from "./scoring";
import { buildUserMessage } from "./prompt";
import { validateAI, AIFormatError } from "./validate";
import { AIRequestError, type AIClient } from "./claude";
import { SESSION_COOKIE, clearCookie, createSessionToken, getCookie, hashPassword, readSessionToken, sessionCookie, verifyPassword } from "./auth";
import { RateLimiter } from "./rateLimit";
import type { OcrClient, OcrImage } from "./ocr";
import { modelOf } from "./fallback";
import { buildStats } from "./stats";
import type { Repo } from "./repo";
import type { PartResult, PublicUser, Submission, TeacherReview, User } from "./types";

export type Deps = {
  repo: Repo;
  ai: AIClient;
  model: string;
  secret: string;
  secureCookies: boolean;
  allowRegistration: boolean;
  checkLimiter: RateLimiter;
  ocr?: OcrClient;
  ocrLimiter?: RateLimiter;
  loginLimiter: RateLimiter;
  /** .env dagi TEACHER_LOGIN / TEACHER_PASSWORD: shu login bilan birinchi kirishda o'qituvchi hisobi avtomatik yaratiladi. */
  bootstrapTeacher?: { login: string; password: string; name: string } | null;
  now?: () => Date;
};

// ---------- yordamchilar ----------
export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);
const pub = (u: User): PublicUser => ({ id: u.id, name: u.name, login: u.login, role: u.role, createdAt: u.createdAt });

async function readJson(req: Request): Promise<unknown> {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new HttpError(415, "So'rov JSON formatida bo'lishi kerak.");
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 200_000) throw new HttpError(413, "So'rov hajmi juda katta.");
  try { return await req.json(); } catch { throw new HttpError(400, "So'rov JSON'i noto'g'ri."); }
}
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function currentUser(req: Request, d: Deps): Promise<User | null> {
  const s = readSessionToken(getCookie(req, SESSION_COOKIE), d.secret);
  if (!s) return null;
  return d.repo.findUserById(s.uid);
}
async function requireUser(req: Request, d: Deps, role?: "TEACHER"): Promise<User> {
  const u = await currentUser(req, d);
  if (!u) throw new HttpError(401, "Avval tizimga kiring.");
  if (role && u.role !== role) throw new HttpError(403, "Bu amal faqat o'qituvchi uchun.");
  return u;
}

function wrap(fn: (req: Request, d: Deps, params: Record<string, string>) => Promise<Response>) {
  return async (req: Request, d: Deps, params: Record<string, string> = {}) => {
    try { return await fn(req, d, params); }
    catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error("[nutqon]", e);
      return fail(500, "Serverda kutilmagan xato yuz berdi.");
    }
  };
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const loginRe = /^[a-zA-Z0-9_.-]{3,40}$/;
const credsSchema = z.object({
  name: z.string().trim().min(2, "Ism kamida 2 harf bo'lsin").max(80),
  login: z.string().trim().toLowerCase().regex(loginRe, "Login 3–40 ta lotin harfi, raqam yoki _ . - bo'lsin"),
  password: z.string().min(8, "Parol kamida 8 belgi bo'lsin").max(200)
});

// ---------- auth ----------
export const register = wrap(async (req, d) => {
  if (!d.allowRegistration) return fail(403, "Ro'yxatdan o'tish yopiq. O'qituvchingizdan hisob so'rang.");
  const p = credsSchema.safeParse(await readJson(req));
  if (!p.success) return fail(400, p.error.issues[0].message);
  if (await d.repo.findUserByLogin(p.data.login)) return fail(409, "Bu login band.");
  // Platformada hali o'qituvchi bo'lmasa, birinchi ro'yxatdan o'tgan hisob o'qituvchi bo'ladi.
  const noTeacher = !d.bootstrapTeacher && (await d.repo.listUsers("TEACHER")).length === 0;
  const u = await d.repo.createUser({ name: p.data.name, login: p.data.login, passwordHash: hashPassword(p.data.password), role: noTeacher ? "TEACHER" : "STUDENT" });
  return json({ user: pub(u) }, 201, { "set-cookie": sessionCookie(createSessionToken(u.id, u.role, d.secret), d.secureCookies) });
});

export const login = wrap(async (req, d) => {
  const body = z.object({ login: z.string().trim().toLowerCase().max(40), password: z.string().max(200) }).safeParse(await readJson(req));
  if (!body.success) return fail(400, "Login va parolni kiriting.");
  if (!d.loginLimiter.take("login:" + body.data.login)) return fail(429, "Juda ko'p urinish. Bir daqiqadan keyin qayta urinib ko'ring.");
  let u = await d.repo.findUserByLogin(body.data.login);
  const bt = d.bootstrapTeacher;
  if (!u && bt && bt.password.length >= 8 && body.data.login === bt.login.trim().toLowerCase() && safeEqual(body.data.password, bt.password)) {
    u = await d.repo.createUser({ name: bt.name || "O'qituvchi", login: body.data.login, passwordHash: hashPassword(bt.password), role: "TEACHER" });
  }
  if (!u || !verifyPassword(body.data.password, u.passwordHash)) return fail(401, "Login yoki parol noto'g'ri.");
  return json({ user: pub(u) }, 200, { "set-cookie": sessionCookie(createSessionToken(u.id, u.role, d.secret), d.secureCookies) });
});

export const logout = wrap(async (_req, d) => json({ ok: true }, 200, { "set-cookie": clearCookie(d.secureCookies) }));

export const me = wrap(async (req, d) => {
  const u = await currentUser(req, d);
  const usage = u ? await usageInfo(u, d) : null;
  return json({ user: u ? pub(u) : null, usage, allowRegistration: d.allowRegistration });
});

// ---------- kunlik limitlar ----------
export type UsageInfo = { day: string; checks: { used: number; limit: number; left: number }; ocr: { used: number; limit: number; left: number } } | null;

/** O'quvchining bugungi limiti va qolgan soni. O'qituvchi uchun null (cheklanmagan). */
export async function usageInfo(u: User, d: Deps, settings?: Settings): Promise<UsageInfo> {
  if (u.role === "TEACHER") return null;
  const st = settings || normSettings(await d.repo.getSettings());
  const day = tashkentDay(d.now ? d.now().getTime() : Date.now());
  const used = await d.repo.getUsage(u.id, day);
  const checkLimit = u.dailyLimit ?? st.dailyChecks ?? 3;
  const ocrLimit = st.dailyOcr ?? 8;
  return {
    day,
    checks: { used: used.checks, limit: checkLimit, left: Math.max(0, checkLimit - used.checks) },
    ocr: { used: used.ocr, limit: ocrLimit, left: Math.max(0, ocrLimit - used.ocr) }
  };
}

// ---------- tekshirish ----------
const partInput = z.object({
  topic: z.string().max(300).optional().default(""),
  kind: z.enum(["formal", "personal"]).optional().default("formal"),
  text: z.string().max(20000),
  minutes: z.number().int().min(0).max(600).nullable().optional()
});
const checkSchema = z.object({
  mode: z.enum(["letter", "essay", "full"]),
  studentName: z.string().trim().max(80).optional(),
  letter: partInput.optional(),
  essay: partInput.optional()
});

export function validateText(type: PartType, text: string): string | null {
  const t = text.trim();
  const label = TYPES[type].uz;
  if (!t) return `${label}: matn kiritilmagan.`;
  if (arabicRatio(t) < 0.6) return `${label}: matn arab tilida yozilishi kerak.`;
  const wc = countWords(t);
  if (wc < 10) return `${label}: matn juda qisqa (${wc} so'z). Kamida 10 ta so'z yozing.`;
  if (wc > 1000) return `${label}: matn juda uzun (${wc} so'z). Ko'pi bilan 1000 so'z.`;
  return null;
}

export const check = wrap(async (req, d) => {
  const user = await requireUser(req, d);
  const p = checkSchema.safeParse(await readJson(req));
  if (!p.success) return fail(400, "So'rov ma'lumotlari noto'g'ri.");
  const body = p.data;
  const types: PartType[] = body.mode === "full" ? ["letter", "essay"] : [body.mode];
  for (const k of types) {
    const part = body[k];
    if (!part) return fail(400, `${TYPES[k].uz} matni yuborilmadi.`);
    const err = validateText(k, part.text);
    if (err) return fail(400, err);
  }
  const settings = normSettings(await d.repo.getSettings());
  // Izchillik: shu o'quvchi oxirgi 30 kunda aynan shu matnni (shu mavzu bilan) tekshirgan bo'lsa, AI qayta chaqirilmaydi.
  const recent = await d.repo.listSubmissions({ userId: user.id, limit: 50 });
  const since = Date.now() - 30 * 86400_000;
  const findCached = (k: PartType): PartResult | undefined => {
    const inp = body[k]!;
    for (const s of recent) {
      const p = s.parts[k];
      if (p && Date.parse(s.createdAt) > since && p.text === inp.text.trim() && p.topic === inp.topic.trim() && (k !== "letter" || p.kind === inp.kind)) return p;
    }
    return undefined;
  };
  // Kunlik limit: faqat AI chaqiriladigan (yangi) tekshiruvlar hisoblanadi.
  const needsAI = types.some((k) => !findCached(k));
  const usage = await usageInfo(user, d, settings);
  if (needsAI && usage && usage.checks.left <= 0) {
    return fail(429, `Bugungi tekshiruvlar limiti tugadi (${usage.checks.used}/${usage.checks.limit}). Ertaga yana tekshirishingiz mumkin yoki o'qituvchingizga murojaat qiling.`);
  }
  if (needsAI && !d.checkLimiter.take("check:" + user.id)) {
    return fail(429, `Juda tez-tez tekshiryapsiz. ${Math.ceil(d.checkLimiter.retryAfterSec("check:" + user.id) / 60)} daqiqadan keyin qayta urinib ko'ring.`);
  }
  let results: PartResult[];
  try {
    results = await Promise.all(types.map((k) => {
      const c = findCached(k);
      return c ? Promise.resolve(rescore(k, c, body[k]!, settings)) : assessPart(k, body[k]!, settings, d);
    }));
  } catch (e) {
    if (e instanceof AIRequestError) return fail(e.status, e.userMessage);
    if (e instanceof AIFormatError) return fail(502, "AI javobi noto'g'ri formatda keldi, shuning uchun natija ko'rsatilmadi. Qayta urinib ko'ring.");
    throw e;
  }
  const parts: Submission["parts"] = {};
  for (const r of results) parts[r.type] = r;
  const o = overall(parts);
  const now = (d.now ? d.now() : new Date()).toISOString();
  const sub: Submission = {
    id: "w_" + randomBytes(9).toString("base64url"),
    userId: user.id,
    studentName: (body.studentName || user.name).slice(0, 80),
    mode: body.mode,
    createdAt: now,
    parts,
    total: o.total, max: o.max, percent: o.percent,
    model: [...new Set(results.map((r) => r.model || d.model))].join(", "),
    teacherReview: null
  };
  await d.repo.createSubmission(sub);
  if (needsAI && usage) await d.repo.addUsage(user.id, usage.day, "checks");
  return json({ submission: sub }, 201);
});

/** Avvalgi AI tahlilini qayta ishlatadi; so'zlar soni bali joriy sozlama bilan qayta hisoblanadi. */
function rescore(k: PartType, prev: PartResult, input: z.infer<typeof partInput>, settings: Settings): PartResult {
  const T = TYPES[k];
  const scores: Scores = { ...prev.scores, words: wordScore(prev.wordCount, T.target, T.per, settings) };
  return { ...prev, minutes: input.minutes ?? null, scores, total: sumScores(scores, k), wordSettings: settings, reused: true };
}

async function assessPart(k: PartType, input: z.infer<typeof partInput>, settings: Settings, d: Deps): Promise<PartResult> {
  const text = input.text.trim();
  const wc = countWords(text);
  const raw = await d.ai(k, buildUserMessage(k, { topic: input.topic, letterKind: input.kind, wordCount: wc, text }));
  const ai = validateAI(raw, text, k);
  const usedModel = modelOf(raw, d.model);
  const T = TYPES[k];
  const scores: Scores = {
    structure: ai.rubric.structure.score,
    grammar: ai.rubric.grammar.score,
    content: ai.rubric.content.score,
    words: wordScore(wc, T.target, T.per, settings),
    cohesion: ai.rubric.cohesion.score
  };
  return {
    type: k, topic: input.topic.trim(), kind: k === "letter" ? input.kind : null,
    text, wordCount: wc, target: T.target, minutes: input.minutes ?? null,
    ai, scores, total: sumScores(scores, k), max: T.max, wordSettings: settings, model: usedModel
  };
}

// ---------- natijalar ----------
export const listSubmissions = wrap(async (req, d) => {
  const user = await requireUser(req, d);
  const url = new URL(req.url);
  const userId = user.role === "TEACHER" ? url.searchParams.get("userId") || undefined : user.id;
  const subs = await d.repo.listSubmissions({ userId, limit: 500 });
  // ro'yxat uchun yengil ko'rinish
  return json({
    submissions: subs.map((s) => ({
      id: s.id, userId: s.userId, studentName: s.studentName, mode: s.mode, createdAt: s.createdAt,
      total: s.total, max: s.max, percent: s.percent,
      topics: (["letter", "essay"] as PartType[]).map((k) => s.parts[k]?.topic).filter(Boolean),
      teacherTotal: s.teacherReview ? s.teacherReview.total : null
    }))
  });
});

async function loadOwned(req: Request, d: Deps, id: string): Promise<{ user: User; sub: Submission }> {
  const user = await requireUser(req, d);
  const sub = await d.repo.getSubmission(id);
  if (!sub || (user.role !== "TEACHER" && sub.userId !== user.id)) throw new HttpError(404, "Natija topilmadi.");
  return { user, sub };
}

export const getSubmission = wrap(async (req, d, params) => {
  const { sub } = await loadOwned(req, d, params.id);
  return json({ submission: sub });
});

const reviewSchema = z.object({
  clear: z.boolean().optional(),
  note: z.string().max(1000).optional().default(""),
  parts: z.record(z.enum(["letter", "essay"]), z.object({ scores: z.record(z.string(), z.number()) })).optional()
});

export const review = wrap(async (req, d, params) => {
  const teacher = await requireUser(req, d, "TEACHER");
  const sub = await d.repo.getSubmission(params.id);
  if (!sub) return fail(404, "Natija topilmadi.");
  const p = reviewSchema.safeParse(await readJson(req));
  if (!p.success) return fail(400, "Baho ma'lumotlari noto'g'ri.");
  if (p.data.clear) return json({ submission: await d.repo.setReview(sub.id, null) });
  const parts: TeacherReview["parts"] = {};
  let total = 0;
  for (const k of ["letter", "essay"] as PartType[]) {
    if (!sub.parts[k]) continue;
    const given = p.data.parts?.[k]?.scores || {};
    const scores = {} as Scores;
    for (const c of CRITERIA) {
      const v = given[c.key];
      scores[c.key] = round05(clamp(typeof v === "number" && isFinite(v) ? v : sub.parts[k]!.scores[c.key], 0, TYPES[k].per));
    }
    const t = sumScores(scores, k);
    parts[k] = { scores, total: t, max: TYPES[k].max };
    total += t;
  }
  const rv: TeacherReview = { parts, total: round05(total), max: sub.max, note: p.data.note.trim(), at: new Date().toISOString(), by: teacher.id };
  return json({ submission: await d.repo.setReview(sub.id, rv) });
});

// ---------- o'qituvchi ----------
export const teacherStats = wrap(async (req, d) => {
  await requireUser(req, d, "TEACHER");
  const [subs, users, settings] = await Promise.all([d.repo.listSubmissions({ limit: 5000 }), d.repo.listUsers(), d.repo.getSettings()]);
  const today = await d.repo.usageForDay(tashkentDay(d.now ? d.now().getTime() : Date.now()));
  return json({ stats: buildStats(subs, users, today, normSettings(settings)) });
});

export const createStudent = wrap(async (req, d) => {
  await requireUser(req, d, "TEACHER");
  const p = credsSchema.safeParse(await readJson(req));
  if (!p.success) return fail(400, p.error.issues[0].message);
  if (await d.repo.findUserByLogin(p.data.login)) return fail(409, "Bu login band.");
  const u = await d.repo.createUser({ name: p.data.name, login: p.data.login, passwordHash: hashPassword(p.data.password), role: "STUDENT" });
  return json({ user: pub(u) }, 201);
});

export const getSettings = wrap(async (req, d) => {
  await requireUser(req, d);
  return json({ settings: normSettings(await d.repo.getSettings()) });
});

export const putSettings = wrap(async (req, d) => {
  await requireUser(req, d, "TEACHER");
  const body = await readJson(req);
  const s = normSettings(body);
  await d.repo.saveSettings(s);
  return json({ settings: s });
});

// ---------- rasmdan matn o'qish (OCR) ----------
const ocrSchema = z.object({
  images: z.array(z.object({
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
    data: z.string().min(100).max(3_000_000).regex(/^[A-Za-z0-9+/=]+$/, "rasm base64 emas")
  })).min(1).max(4)
});

export const ocr = wrap(async (req, d) => {
  const user = await requireUser(req, d);
  if (!d.ocr) return fail(501, "Rasmdan o'qish bu serverda sozlanmagan.");
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 4_200_000) return fail(413, "Rasmlar hajmi juda katta. Kamroq yoki kichikroq rasm yuboring.");
  let raw: unknown;
  try { raw = await req.json(); } catch { return fail(400, "So'rov JSON'i noto'g'ri."); }
  const p = ocrSchema.safeParse(raw);
  if (!p.success) return fail(400, "1 tadan 4 tagacha JPG, PNG yoki WEBP rasm yuboring.");
  const total = p.data.images.reduce((a, im) => a + im.data.length, 0);
  if (total > 4_000_000) return fail(413, "Rasmlar hajmi juda katta. Kamroq yoki kichikroq rasm yuboring.");
  const usage = await usageInfo(user, d);
  if (usage && usage.ocr.left <= 0) return fail(429, `Bugungi rasmdan o'qish limiti tugadi (${usage.ocr.used}/${usage.ocr.limit}). Matnni qo'lda kiriting yoki ertaga urinib ko'ring.`);
  if (d.ocrLimiter && !d.ocrLimiter.take("ocr:" + user.id)) return fail(429, "Juda tez-tez rasm yuboryapsiz. Birozdan keyin qayta urinib ko'ring.");
  try {
    const text = await d.ocr(p.data.images as OcrImage[]);
    if (usage) await d.repo.addUsage(user.id, usage.day, "ocr");
    return json({ text, wordCount: countWords(text) });
  } catch (e) {
    if (e instanceof AIRequestError) return fail(e.status, e.userMessage);
    throw e;
  }
});

// ---------- parollar ----------
const pw = z.string().min(8, "Parol kamida 8 belgi bo'lsin").max(200);

/** O'qituvchi o'quvchining parolini yangilaydi (o'quvchi parolini unutsa). */
export const resetStudentPassword = wrap(async (req, d, params) => {
  await requireUser(req, d, "TEACHER");
  const p = z.object({ password: pw }).safeParse(await readJson(req));
  if (!p.success) return fail(400, p.error.issues[0].message);
  const target = await d.repo.findUserById(params.id);
  if (!target || target.role !== "STUDENT") return fail(404, "O'quvchi topilmadi.");
  await d.repo.setPassword(target.id, hashPassword(p.data.password));
  return json({ ok: true });
});

/** Foydalanuvchi o'z parolini o'zgartiradi (eski parol talab qilinadi). */
export const changeOwnPassword = wrap(async (req, d) => {
  const user = await requireUser(req, d);
  const p = z.object({ current: z.string().max(200), next: pw }).safeParse(await readJson(req));
  if (!p.success) return fail(400, p.error.issues[0].message);
  if (!d.loginLimiter.take("pw:" + user.id)) return fail(429, "Juda ko'p urinish. Bir daqiqadan keyin qayta urinib ko'ring.");
  if (!verifyPassword(p.data.current, user.passwordHash)) return fail(400, "Joriy parol noto'g'ri.");
  await d.repo.setPassword(user.id, hashPassword(p.data.next));
  return json({ ok: true });
});

/** O'qituvchi o'quvchiga shaxsiy kunlik tekshiruv limitini qo'yadi (null — standart limit). */
export const setStudentLimit = wrap(async (req, d, params) => {
  await requireUser(req, d, "TEACHER");
  const p = z.object({ dailyLimit: z.number().int().min(0).max(1000).nullable() }).safeParse(await readJson(req));
  if (!p.success) return fail(400, "Limit 0 dan 1000 gacha butun son bo'lishi kerak (yoki bo'sh — standart).");
  const target = await d.repo.findUserById(params.id);
  if (!target || target.role !== "STUDENT") return fail(404, "O'quvchi topilmadi.");
  await d.repo.setDailyLimit(target.id, p.data.dailyLimit);
  return json({ ok: true, dailyLimit: p.data.dailyLimit });
});
