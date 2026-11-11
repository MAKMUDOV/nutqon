import { SYSTEM_PROMPT, assessmentTool } from "./prompt";
import type { PartType } from "./scoring";

/** AI so'rovidagi xato — foydalanuvchiga o'zbekcha xabar bilan qaytariladi. */
export class AIRequestError extends Error {
  constructor(public userMessage: string, public status = 502, detail?: string) {
    super(detail || userMessage);
  }
}

export type AIClient = (type: PartType, userMessage: string) => Promise<unknown>;

type Opts = {
  apiKey: string | undefined;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
};

/** Claude Messages API — faqat serverda chaqiriladi. Javob tool_use orqali qat'iy JSON ko'rinishida olinadi. */
export function createClaudeClient(o: Opts): AIClient {
  const doFetch = o.fetchImpl || fetch;
  return async (type, userMessage) => {
    if (!o.apiKey) throw new AIRequestError("Server sozlanmagan: ANTHROPIC_API_KEY kiritilmagan.", 500);
    const tool = assessmentTool(type);
    let sendTemperature = true; // model temperature'ni qabul qilmasa, usiz qayta yuboriladi
    const makeBody = () => JSON.stringify({
      model: o.model,
      max_tokens: 8000,
      ...(sendTemperature ? { temperature: 0 } : {}),
      system: SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: userMessage }]
    });
    let lastErr: AIRequestError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, o.retryDelayMs ?? 2000));
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 150_000);
      let res: Response;
      try {
        res = await doFetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": o.apiKey, "anthropic-version": "2023-06-01" },
          body: makeBody(),
          signal: ctl.signal
        });
      } catch (e) {
        clearTimeout(timer);
        lastErr = new AIRequestError("AI xizmatiga ulanib bo'lmadi yoki javob juda kechikdi. Qayta urinib ko'ring.", 504, String(e));
        continue;
      }
      clearTimeout(timer);
      if (res.status === 401 || res.status === 403) console.error(`[nutqon] Claude API HTTP ${res.status}`);
      if (res.status === 401 || res.status === 403) throw new AIRequestError("AI kaliti noto'g'ri yoki ruxsat yo'q. Administratorga xabar bering.", 502, `HTTP ${res.status}`);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new AIRequestError(res.status === 429 ? "AI xizmati band (limit). Birozdan keyin qayta urinib ko'ring." : "AI xizmati vaqtincha ishlamayapti. Qayta urinib ko'ring.", 503, `HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error(`[nutqon] Claude API HTTP ${res.status}: ${t.slice(0, 800)}`);
        if (/credit balance/i.test(t)) throw new AIRequestError("Claude API hisobida kredit yetarli emas. platform.claude.com → Billing bo'limida kredit sotib oling.", 402, t.slice(0, 300));
        if (/temperature/i.test(t) && sendTemperature) { sendTemperature = false; attempt--; continue; }
        if (/model/i.test(t) && res.status === 404) throw new AIRequestError(`"${o.model}" modeli topilmadi. ANTHROPIC_MODEL sozlamasini tekshiring.`, 502, t.slice(0, 300));
        let apiMsg = "";
        try { apiMsg = (JSON.parse(t) as { error?: { message?: string } }).error?.message || ""; } catch { /* matn JSON emas */ }
        throw new AIRequestError(`AI so'rovida xato yuz berdi (HTTP ${res.status})${apiMsg ? ": " + apiMsg.slice(0, 200) : ""}.`, 502, `HTTP ${res.status} ${t.slice(0, 300)}`);
      }
      const data = (await res.json().catch(() => null)) as { stop_reason?: string; content?: { type: string; name?: string; input?: unknown }[] } | null;
      if (!data || !Array.isArray(data.content)) throw new AIRequestError("AI javobi noto'g'ri formatda keldi.", 502);
      if (data.stop_reason === "max_tokens") throw new AIRequestError("AI javobi to'liq kelmadi (juda uzun). Matnni qisqartirib, qayta urinib ko'ring.", 502);
      const call = data.content.find((c) => c.type === "tool_use" && c.name === tool.name);
      if (!call || typeof call.input !== "object" || call.input === null) throw new AIRequestError("AI javobi noto'g'ri formatda keldi.", 502);
      return call.input;
    }
    throw lastErr ?? new AIRequestError("AI xizmati javob bermadi.", 502);
  };
}
