import type { Settings } from "./scoring";
import type { Role, Submission, TeacherReview, User } from "./types";

/** Ma'lumotlar bazasi interfeysi: ishlab chiqarishda Prisma, sinovlarda xotira. */
export interface Repo {
  createUser(u: { name: string; login: string; passwordHash: string; role: Role }): Promise<User>;
  findUserByLogin(login: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  listUsers(role?: Role): Promise<User[]>;
  setPassword(id: string, passwordHash: string): Promise<boolean>;
  createSubmission(s: Submission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | null>;
  listSubmissions(q: { userId?: string; limit?: number }): Promise<Submission[]>;
  setReview(id: string, review: TeacherReview | null): Promise<Submission | null>;
  getSettings(): Promise<Settings | null>;
  saveSettings(s: Settings): Promise<void>;
}

export class MemoryRepo implements Repo {
  users: User[] = [];
  subs: Submission[] = [];
  settings: Settings | null = null;
  private seq = 0;
  private clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }
  async createUser(u: { name: string; login: string; passwordHash: string; role: Role }) {
    if (this.users.some((x) => x.login === u.login)) throw new Error("UNIQUE");
    const user: User = { ...u, id: "u" + ++this.seq, createdAt: new Date().toISOString() };
    this.users.push(user);
    return this.clone(user);
  }
  async findUserByLogin(login: string) { const u = this.users.find((x) => x.login === login); return u ? this.clone(u) : null; }
  async findUserById(id: string) { const u = this.users.find((x) => x.id === id); return u ? this.clone(u) : null; }
  async listUsers(role?: Role) { return this.clone(this.users.filter((u) => !role || u.role === role)); }
  async setPassword(id: string, passwordHash: string) { const u = this.users.find((x) => x.id === id); if (!u) return false; u.passwordHash = passwordHash; return true; }
  async createSubmission(s: Submission) { this.subs.push(this.clone(s)); return this.clone(s); }
  async getSubmission(id: string) { const s = this.subs.find((x) => x.id === id); return s ? this.clone(s) : null; }
  async listSubmissions(q: { userId?: string; limit?: number }) {
    return this.clone(this.subs.filter((s) => !q.userId || s.userId === q.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, q.limit ?? 500));
  }
  async setReview(id: string, review: TeacherReview | null) {
    const s = this.subs.find((x) => x.id === id);
    if (!s) return null;
    s.teacherReview = review ? this.clone(review) : null;
    return this.clone(s);
  }
  async getSettings() { return this.settings ? this.clone(this.settings) : null; }
  async saveSettings(s: Settings) { this.settings = this.clone(s); }
}
