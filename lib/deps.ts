import { createClaudeClient } from "./claude";
import { RateLimiter } from "./rateLimit";
import { PrismaRepo } from "./repo.prisma";
import type { Deps } from "./handlers";

const g = globalThis as unknown as { __nqDeps?: Deps };

/** Ishlab chiqarish bog'liqliklari (bitta nusxa). Barcha sozlamalar .env faylidan olinadi. */
export function getDeps(): Deps {
  if (g.__nqDeps) return g.__nqDeps;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET .env faylida kamida 32 belgili bo'lishi kerak");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  g.__nqDeps = {
    repo: new PrismaRepo(),
    ai: createClaudeClient({ apiKey: process.env.ANTHROPIC_API_KEY, model }),
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
