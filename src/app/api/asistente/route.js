export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Falta OPENAI_API_KEY en .env.local" }, { status: 500 });
    }

    const safeMessages = (Array.isArray(messages) ? messages : [])
      .map((m) => ({
        role: m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user",
        content: String(m?.content || ""),
      }))
      .filter((m) => m.content.trim().length > 0);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
        messages: safeMessages,
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return Response.json({ error: `Respuesta no JSON de OpenAI: ${raw.slice(0, 120)}` }, { status: 502 });
    }

    if (!res.ok) {
      const code = data?.error?.code || null;
      const message = data?.error?.message || `Error OpenAI (${res.status})`;
      return Response.json({ error: message, code }, { status: res.status });
    }

    const content = String(data?.choices?.[0]?.message?.content || "").trim() || "Sin respuesta.";
    return Response.json({ content });
  } catch (e) {
    return Response.json({ error: e?.message || "Error desconocido", code: null }, { status: 500 });
  }
}
