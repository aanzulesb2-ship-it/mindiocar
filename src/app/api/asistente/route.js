export const runtime = "nodejs";

import { getOpenAIKey, getOpenAIKeyError } from "@/lib/getOpenAIKey";

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user",
      content: String(m?.content || ""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

async function askOpenAI({ apiKey, messages }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
      messages,
      temperature: 0.4,
      max_tokens: 300,
    }),
  });

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, status: 502, error: `Respuesta no JSON de OpenAI: ${raw.slice(0, 120)}` };
  }

  if (!res.ok) {
    const code = data?.error?.code || null;
    const message = data?.error?.message || `Error OpenAI (${res.status})`;
    return { ok: false, status: res.status, error: message, code };
  }

  const content = String(data?.choices?.[0]?.message?.content || "").trim() || "Sin respuesta.";
  return { ok: true, content };
}

async function askGoogle({ apiKey, messages }) {
  const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.0-flash";
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemText
          ? {
              systemInstruction: {
                parts: [{ text: systemText }],
              },
            }
          : {}),
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300,
        },
      }),
    }
  );

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, status: 502, error: `Respuesta no JSON de Google AI: ${raw.slice(0, 120)}` };
  }

  if (!res.ok) {
    const message = data?.error?.message || `Error Google AI (${res.status})`;
    return { ok: false, status: res.status, error: message };
  }

  const content =
    String(data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join(" ") || "").trim() ||
    "Sin respuesta.";
  return { ok: true, content };
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const safeMessages = normalizeMessages(messages);

    const openAIKey = getOpenAIKey();
    if (openAIKey) {
      const result = await askOpenAI({ apiKey: openAIKey, messages: safeMessages });
      if (!result.ok) {
        return Response.json({ error: result.error, code: result.code || null }, { status: result.status || 500 });
      }
      return Response.json({ content: result.content, provider: "openai" });
    }

    const googleKey = String(process.env.GOOGLE_API_KEY || "").trim();
    if (googleKey) {
      const result = await askGoogle({ apiKey: googleKey, messages: safeMessages });
      if (!result.ok) {
        return Response.json({ error: result.error, code: null }, { status: result.status || 500 });
      }
      return Response.json({ content: result.content, provider: "google" });
    }

    return Response.json({ error: getOpenAIKeyError() }, { status: 500 });
  } catch (e) {
    return Response.json({ error: e?.message || "Error desconocido", code: null }, { status: 500 });
  }
}
