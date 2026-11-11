import { AIRequestError } from "./claude";

export type OcrImage = { mime: "image/jpeg" | "image/png" | "image/webp"; data: string }; // data — base64
export type OcrClient = (images: OcrImage[]) => Promise<string>;

/** Qo'lyozmani o'qish ko'rsatmasi: o'quvchi xatolari TUZATILMAYDI, aks holda tekshiruv ma'nosiz bo'ladi. */
export const OCR_PROMPT = `These photos are pages of a student's handwritten Arabic text (a letter or an essay), in order.
Transcribe the Arabic text EXACTLY as the student wrote it.
- Do NOT correct anything: keep every spelling, grammar, hamza and agreement mistake exactly as written.
- Do not add harakat that are not written; keep the ones that are.
- If a word is crossed out, leave it out. If a word is unreadable, write [؟].
- Join lines that belong to the same paragraph with a space; start a new paragraph (one empty line) only where the student started one. Keep the title as the first line if there is one.
- Ignore page numbers, teacher marks, scores and notes written in other colours or scripts.
Output ONLY the transcribed Arabic text, with no comments before or after it.`;

type Opts = { apiKey: string | undefined; model: string; fetchImpl?: typeof fetch; timeoutMs?: number };

async function post(doFetch: typeof fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await doFetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    throw new AIRequestError("AI xizmatiga ulanib bo'lmadi yoki javob juda kechikdi. Qayta urinib ko'ring.", 504, String(e));
  } finally {
    clearTimeout(timer);
  }
}

function clean(text: string): string {
  const t = text.replace(/^```[a-z]*\n?|```$/gim, "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!t) throw new AIRequestError("Rasmdan matn o'qib bo'lmadi. Rasm aniqroq (yorug'roq, yaqinroq) bo'lishi kerak.", 422);
  return t;
}

export function createGeminiOcr(o: Opts): OcrClient {
  const doFetch = o.fetchImpl || fetch;
  return async (images) => {
    if (!o.apiKey) throw new AIRequestError("Server sozlanmagan: GEMINI_API_KEY kiritilmagan.", 500);
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [...images.map((im) => ({ inlineData: { mimeType: im.mime, data: im.data } })), { text: OCR_PROMPT }] }],
      generationConfig: { maxOutputTokens: 8000 }
    });
    const res = await post(doFetch, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:generateContent`,
      { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": o.apiKey }, body }, o.timeoutMs ?? 120_000);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[nutqon] Gemini OCR HTTP ${res.status}: ${t.slice(0, 800)}`);
      if (res.status === 429) throw new AIRequestError("Gemini'ning bepul limiti tugadi. Birozdan keyin qayta urinib ko'ring.", 429);
      if (res.status >= 500) throw new AIRequestError("Gemini xizmati vaqtincha ishlamayapti. Qayta urinib ko'ring.", 503);
      throw new AIRequestError(`Rasmni o'qishda xato (HTTP ${res.status}).`, 502, t.slice(0, 300));
    }
    const data = (await res.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]; promptFeedback?: { blockReason?: string } } | null;
    if (data?.promptFeedback?.blockReason) throw new AIRequestError("Rasm qabul qilinmadi. Boshqa rasm yuboring.", 422);
    const text = (data?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
    return clean(text);
  };
}

export function createClaudeOcr(o: Opts): OcrClient {
  const doFetch = o.fetchImpl || fetch;
  return async (images) => {
    if (!o.apiKey) throw new AIRequestError("Server sozlanmagan: ANTHROPIC_API_KEY kiritilmagan.", 500);
    const body = JSON.stringify({
      model: o.model,
      max_tokens: 8000,
      messages: [{ role: "user", content: [...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mime, data: im.data } })), { type: "text", text: OCR_PROMPT }] }]
    });
    const res = await post(doFetch, "https://api.anthropic.com/v1/messages",
      { method: "POST", headers: { "content-type": "application/json", "x-api-key": o.apiKey, "anthropic-version": "2023-06-01" }, body }, o.timeoutMs ?? 120_000);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[nutqon] Claude OCR HTTP ${res.status}: ${t.slice(0, 800)}`);
      if (/credit balance/i.test(t)) throw new AIRequestError("Claude API hisobida kredit yetarli emas.", 402);
      if (res.status === 429 || res.status >= 500) throw new AIRequestError("AI xizmati band. Birozdan keyin qayta urinib ko'ring.", 503);
      throw new AIRequestError(`Rasmni o'qishda xato (HTTP ${res.status}).`, 502, t.slice(0, 300));
    }
    const data = (await res.json().catch(() => null)) as { content?: { type: string; text?: string }[] } | null;
    return clean((data?.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join(""));
  };
}
