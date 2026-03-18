import { getGroqKey, getGroqKeyError, normalizeMessages, askGroq } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const safeMessages = normalizeMessages(messages);

    const groqKey = getGroqKey();
    console.log("/api/asistente: hasGROQ", !!groqKey);

    if (!groqKey) {
      return Response.json({ error: getGroqKeyError() }, { status: 500 });
    }

    const result = await askGroq({ apiKey: groqKey, messages: safeMessages });
    if (!result.ok) {
      return Response.json({ error: result.error, code: null }, { status: result.status || 500 });
    }

    return Response.json({ content: result.content, provider: "groq" });
  } catch (e) {
    return Response.json({ error: e?.message || "Error desconocido", code: null }, { status: 500 });
  }
}
