import { AIRequestError, type AIClient } from "./claude";

export const MODEL_TAG = "__nqModel";

/** Javobga qaysi model baholaganini yashirin belgi sifatida qo'shadi (JSON'ga tushmaydi). */
export function tagModel<T>(value: T, model: string): T {
  if (value && typeof value === "object") Object.defineProperty(value, MODEL_TAG, { value: model, enumerable: false });
  return value;
}
export function modelOf(value: unknown, fallback: string): string {
  const m = value && typeof value === "object" ? (value as Record<string, unknown>)[MODEL_TAG] : undefined;
  return typeof m === "string" ? m : fallback;
}

/**
 * Asosiy model limit (429) yoki server xatosi (5xx) bersa, zaxira model bilan qayta urinadi.
 * Bepul Gemini'da har bir modelning kunlik limiti alohida, shuning uchun bu tekshiruvlarni to'xtab qolishdan saqlaydi.
 */
export function withFallback(primary: AIClient, primaryModel: string, backup: AIClient | null, backupModel: string): AIClient {
  return async (type, msg) => {
    try {
      return tagModel(await primary(type, msg), primaryModel);
    } catch (e) {
      const retriable = e instanceof AIRequestError && (e.status === 429 || e.status === 503 || e.status === 504);
      if (!backup || !retriable) throw e;
      console.error(`[nutqon] ${primaryModel} ishlamadi (${(e as AIRequestError).status}), ${backupModel} bilan qayta urinilmoqda`);
      return tagModel(await backup(type, msg), backupModel);
    }
  };
}
