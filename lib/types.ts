import type { PartType, Scores, Settings } from "./scoring";

export type Role = "STUDENT" | "TEACHER";

export type User = {
  id: string;
  name: string;
  login: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  /** Shaxsiy kunlik tekshiruv limiti (null — standart limit) */
  dailyLimit?: number | null;
};
export type PublicUser = Omit<User, "passwordHash">;
export type Usage = { checks: number; ocr: number };

export type ErrorType = "grammar" | "spelling" | "style" | "word_choice";
export type Severity = "high" | "medium" | "low";

export type FoundError = {
  fragment: string;
  start: number;
  end: number;
  correction: string;
  type: ErrorType;
  category: string;
  severity: Severity;
  explanation: string;
};

export type CriterionFeedback = {
  score: number;
  max: number;
  reason: string;
  strengths: string[];
  weaknesses: string[];
  tip: string;
};

export type ValidatedAI = {
  rubric: Record<"structure" | "grammar" | "content" | "cohesion", CriterionFeedback>;
  strengths: string[];
  weaknesses: string[];
  errors: FoundError[];
  droppedErrors: number;
  correctedText: string;
  improvedText: string;
  recommendations: string[];
  assessmentNotes: string;
};

export type PartResult = {
  type: PartType;
  topic: string;
  kind: "formal" | "personal" | null;
  text: string;
  wordCount: number;
  target: number;
  minutes: number | null;
  ai: ValidatedAI;
  scores: Scores;
  total: number;
  max: number;
  /** Shu tekshiruvda so'zlar soni uchun qo'llangan chegaralar */
  wordSettings?: Settings;
  /** Shu qismni baholagan model */
  model?: string;
  /** Aynan shu matn avval tekshirilgan — AI tahlili qayta ishlatildi */
  reused?: boolean;
};

export type TeacherReview = {
  parts: Partial<Record<PartType, { scores: Scores; total: number; max: number }>>;
  total: number;
  max: number;
  note: string;
  at: string;
  by: string;
};

export type Mode = "letter" | "essay" | "full";

export type Submission = {
  id: string;
  userId: string;
  studentName: string;
  mode: Mode;
  createdAt: string;
  parts: Partial<Record<PartType, PartResult>>;
  total: number;
  max: number;
  percent: number;
  model: string;
  teacherReview: TeacherReview | null;
};
