import { createHash } from "node:crypto";
import { createClaudeClient } from "./claude";
import { createGeminiClient } from "./gemini";
import { createClaudeOcr, createGeminiOcr } from "./ocr";
import { RateLimiter } from "./rateLimit";
import { PrismaRepo } from "./repo.prisma";
import type { Deps } from "./handlers";

const g = globalThis as unknown as { __nqDeps?: Deps };

/** Ishlab chiqarish bog'liqliklari (bitta nusxa). Barcha sozlamalar .env faylidan olinadi. */
export function getDeps(): Deps {
  if (g.__nqDeps) return g.__nqDeps;
  // SESSION_SECRET berilmasa, maxfiy DATABASE_URL'dan barqaror kalit hosil qilinadi (u faqat serverda bo'ladi).
  const raw = process.env.SESSION_SECRET || (process.env.DATABASE_URL ? "nutqon-session:" + process.env.DATABASE_URL : "");
  if (raw.length < 32) throw new Error("SESSION_SECRET (kamida 32 belgi) yoki DATABASE_URL sozlanmagan");
  const secret = process.env.SESSION_SECRET ? raw : createHash("sha256").update(raw).digest("hex");
  // AI_PROVIDER: "gemini" | "claude". Berilmasa: GEMINI_API_KEY bo'lsa Gemini, aks holda Claude.
  const provider = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "claude")).toLowerCase();
  const model = provider === "gemini"
    ? process.env.GEMINI_MODEL || "gemini-3.8-flash"
    : process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  g.__nqDeps = {
    repo: new PrismaRepo(),
    ai: provider === "gemini"
      ? createGeminiClient({ apiKey: process.env.GEMINI_API_KEY, model })
      : createClaudeClient({ apiKey: process.env.ANTHROPIC_API_KEY, model }),
    ocr: provider === "gemini"
      ? createGeminiOcr({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_OCR_MODEL || model, fallbackModel: process.env.GEMINI_OCR_FALLBACK || "gemini-3.5-flash-lite", timeoutMs: 110_000 })
      : createClaudeOcr({ apiKey: process.env.ANTHROPIC_API_KEY, model }),
    ocrLimiter: new RateLimiter(Number(process.env.OCR_PER_HOUR || 20), 3600_000),
    model,
    secret,
    secureCookies: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    allowRegistration: process.env.ALLOW_REGISTRATION !== "false",
    checkLimiter: new RateLimiter(Number(process.env.CHECKS_PER_HOUR || 10), 3600_000),
    loginLimiter: new RateLimiter(5, 60_000),
    bootstrapTeacher: process.env.TEACHER_LOGIN && process.env.TEACHER_PASSWORD
      ? { login: process.env.TEACHER_LOGIN, password: process.env.TEACHER_PASSWORD, name: process.env.TEACHER_NAME || "O'qituvchi" }
      : null
  };
  return g.__nqDeps;
}
