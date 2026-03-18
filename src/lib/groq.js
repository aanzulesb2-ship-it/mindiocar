export function getGroqKey() {
  return (process.env.GROQ_API_KEY || "").trim();
}

export function getGroqKeyError() {
  return "Falta una clave de GROQ. Usa GROQ_API_KEY en .env.local y reinicia Next.js.";
}

export function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user",
      content: String(m?.content || ""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

export async function askGroq({ apiKey, messages }) {
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 120,
      }),
    });

    const raw = await res.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return { ok: false, status: 502, error: `Respuesta no JSON de GROQ: ${raw.slice(0, 120)}` };
    }

    if (!res.ok) {
      const message = data?.error?.message || `Error GROQ (${res.status})`;
      return { ok: false, status: res.status, error: message };
    }

    const content = String(data?.choices?.[0]?.message?.content || "").trim() || "Sin respuesta.";
    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: error?.message || "Fallo de red al consultar GROQ.",
    };
  }
}
