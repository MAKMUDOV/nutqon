import { PrismaClient } from "@prisma/client";
import type { Repo } from "./repo";
import type { Settings } from "./scoring";
import type { Role, Submission, TeacherReview, User } from "./types";

const g = globalThis as unknown as { __nqPrisma?: PrismaClient };
export const prisma = g.__nqPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.__nqPrisma = prisma;

type UserRow = { id: string; name: string; login: string; passwordHash: string; role: string; createdAt: Date };
type SubRow = {
  id: string; userId: string; studentName: string; mode: string; createdAt: Date;
  total: number; max: number; percent: number; model: string; partsJson: string; teacherReviewJson: string | null;
};

const toUser = (r: UserRow): User => ({ ...r, role: r.role as Role, createdAt: r.createdAt.toISOString() });
const toSub = (r: SubRow): Submission => ({
  id: r.id, userId: r.userId, studentName: r.studentName, mode: r.mode as Submission["mode"], createdAt: r.createdAt.toISOString(),
  total: r.total, max: r.max, percent: r.percent, model: r.model,
  parts: JSON.parse(r.partsJson),
  teacherReview: r.teacherReviewJson ? (JSON.parse(r.teacherReviewJson) as TeacherReview) : null
});

export class PrismaRepo implements Repo {
  async createUser(u: { name: string; login: string; passwordHash: string; role: Role }) {
    return toUser(await prisma.user.create({ data: u }));
  }
  async findUserByLogin(login: string) {
    const r = await prisma.user.findUnique({ where: { login } });
    return r ? toUser(r) : null;
  }
  async findUserById(id: string) {
    const r = await prisma.user.findUnique({ where: { id } });
    return r ? toUser(r) : null;
  }
  async listUsers(role?: Role) {
    return (await prisma.user.findMany({ where: role ? { role } : {}, orderBy: { createdAt: "desc" } })).map(toUser);
  }
  async setPassword(id: string, passwordHash: string) {
    try { await prisma.user.update({ where: { id }, data: { passwordHash } }); return true; } catch { return false; }
  }
  async createSubmission(s: Submission) {
    const r = await prisma.submission.create({
      data: {
        id: s.id, userId: s.userId, studentName: s.studentName, mode: s.mode, createdAt: new Date(s.createdAt),
        total: s.total, max: s.max, percent: s.percent, model: s.model,
        letterTotal: s.parts.letter?.total ?? null, essayTotal: s.parts.essay?.total ?? null,
        partsJson: JSON.stringify(s.parts), teacherReviewJson: null, teacherTotal: null
      }
    });
    return toSub(r);
  }
  async getSubmission(id: string) {
    const r = await prisma.submission.findUnique({ where: { id } });
    return r ? toSub(r) : null;
  }
  async listSubmissions(q: { userId?: string; limit?: number }) {
    const rows = await prisma.submission.findMany({ where: q.userId ? { userId: q.userId } : {}, orderBy: { createdAt: "desc" }, take: q.limit ?? 500 });
    return rows.map(toSub);
  }
  async setReview(id: string, review: TeacherReview | null) {
    try {
      const r = await prisma.submission.update({
        where: { id },
        data: { teacherReviewJson: review ? JSON.stringify(review) : null, teacherTotal: review ? review.total : null, reviewedAt: review ? new Date(review.at) : null }
      });
      return toSub(r);
    } catch {
      return null;
    }
  }
  async getSettings(): Promise<Settings | null> {
    const r = await prisma.setting.findUnique({ where: { id: 1 } });
    return r ? (JSON.parse(r.json) as Settings) : null;
  }
  async saveSettings(s: Settings) {
    const json = JSON.stringify(s);
    await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1, json }, update: { json } });
  }
}
