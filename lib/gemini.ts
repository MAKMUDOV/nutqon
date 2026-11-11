import { SYSTEM_PROMPT, assessmentTool } from "./prompt";
import { AIRequestError, type AIClient } from "./claude";

type Opts = {
  apiKey: string | undefined;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
};

/** Javob matnidan bitta JSON obyektni ajratib oladi (```json ...``` o'rami bo'lsa ham). */
export function extractJson(text: string): unknown {
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* davom etamiz */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* davom etamiz */ } }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* pastda xato */ } }
  throw new AIRequestError("AI javobi noto'g'ri formatda keldi. Qayta urinib ko'ring.", 502, "JSON topilmadi");
}

/** Google Gemini API mijozi — faqat serverda. Javob JSON ko'rinishida so'raladi va keyin zod bilan tekshiriladi. */
export function createGeminiClient(o: Opts): AIClient {
  const doFetch = o.fetchImpl || fetch;
  return async (type, userMessage) => {
    if (!o.apiKey) throw new AIRequestError("Server sozlanmagan: GEMINI_API_KEY kiritilmagan.", 500);
    const schema = assessmentTool(type).input_schema;
    const system = SYSTEM_PROMPT.replace(
      "Always answer by calling the submit_assessment tool exactly once.",
      "Answer with ONLY one JSON object (no markdown, no extra text) that matches this JSON Schema exactly:\n" + JSON.stringify(schema)
    );
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 32000, responseMimeType: "application/json" }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:generateContent`;
    let lastErr: AIRequestError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, o.retryDelayMs ?? 2000));
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 150_000);
      let res: Response;
      try {
        res = await doFetch(url, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": o.apiKey }, body, signal: ctl.signal });
      } catch (e) {
        clearTimeout(timer);
        lastErr = new AIRequestError("AI xizmatiga ulanib bo'lmadi yoki javob juda kechikdi. Qayta urinib ko'ring.", 504, String(e));
        continue;
      }
      clearTimeout(timer);
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error(`[nutqon] Gemini API HTTP ${res.status}: ${t.slice(0, 800)}`);
        if (res.status === 429) throw new AIRequestError("Gemini'ning bepul limiti tugadi (daqiqalik yoki kunlik). Birozdan keyin yoki ertaga qayta urinib ko'ring.", 429, t.slice(0, 300));
        if (res.status >= 500) { lastErr = new AIRequestError("Gemini xizmati vaqtincha ishlamayapti. Qayta urinib ko'ring.", 503, `HTTP ${res.status}`); continue; }
        if (/API_KEY_INVALID|API key not valid/i.test(t) || res.status === 401 || res.status === 403) throw new AIRequestError("Gemini API kaliti noto'g'ri yoki ruxsat yo'q. GEMINI_API_KEY ni tekshiring.", 502, t.slice(0, 300));
        if (res.status === 404) throw new AIRequestError(`"${o.model}" Gemini modeli topilmadi. GEMINI_MODEL sozlamasini tekshiring.`, 502, t.slice(0, 300));
        let apiMsg = "";
        try { apiMsg = (JSON.parse(t) as { error?: { message?: string } }).error?.message || ""; } catch { /* matn JSON emas */ }
        throw new AIRequestError(`AI so'rovida xato yuz berdi (HTTP ${res.status})${apiMsg ? ": " + apiMsg.slice(0, 200) : ""}.`, 502, t.slice(0, 300));
      }
      const data = (await res.json().catch(() => null)) as {
        candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
        promptFeedback?: { blockReason?: string };
      } | null;
      if (data?.promptFeedback?.blockReason) throw new AIRequestError("Gemini bu matnni tekshirmadi (xavfsizlik filtri). Matnni o'zgartirib ko'ring.", 502, data.promptFeedback.blockReason);
      const cand = data?.candidates?.[0];
      if (!cand) throw new AIRequestError("AI javobi bo'sh keldi. Qayta urinib ko'ring.", 502);
      if (cand.finishReason === "MAX_TOKENS") throw new AIRequestError("AI javobi to'liq kelmadi (juda uzun). Matnni qisqartirib, qayta urinib ko'ring.", 502);
      if (cand.finishReason && !["STOP", "FINISH_REASON_UNSPECIFIED"].includes(cand.finishReason)) {
        throw new AIRequestError(`AI javobni yakunlamadi (${cand.finishReason}). Qayta urinib ko'ring.`, 502);
      }
      const text = (cand.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
      if (!text.trim()) throw new AIRequestError("AI javobi bo'sh keldi. Qayta urinib ko'ring.", 502);
      return extractJson(text);
    }
    throw lastErr ?? new AIRequestError("AI xizmati javob bermadi.", 502);
  };
}
