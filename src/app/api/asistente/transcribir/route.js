import { getGroqKey, getGroqKeyError } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const groqKey = getGroqKey();
    if (!groqKey) {
      return Response.json({ error: getGroqKeyError() }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No se recibio ningun archivo de audio." }, { status: 400 });
    }

    const apiForm = new FormData();
    apiForm.append("file", file, file.name || "consulta.webm");
    apiForm.append("model", process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo");
    apiForm.append("language", "es");
    apiForm.append("response_format", "verbose_json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      body: apiForm,
    });

    const raw = await res.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return Response.json({ error: `Respuesta no JSON de GROQ: ${raw.slice(0, 120)}` }, { status: 502 });
    }

    if (!res.ok) {
      return Response.json({ error: data?.error?.message || `Error GROQ (${res.status})` }, { status: res.status || 500 });
    }

    return Response.json({ text: String(data?.text || "").trim() });
  } catch (error) {
    return Response.json({ error: error?.message || "Error interno al transcribir audio." }, { status: 500 });
  }
}
