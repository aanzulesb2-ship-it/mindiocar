import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!openaiKey) {
      return Response.json({ error: "Falta configurar OPENAI_API_KEY en .env.local para transcripción de audio" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: openaiKey });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No se envió archivo de audio" }, { status: 400 });
    }

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return Response.json({ text: transcription.text, provider: "openai" });
  } catch (error) {
    console.error("Error en /api/voice/transcribe:", error);
    return Response.json({ error: error?.message || "Error en transcripción" }, { status: 500 });
  }
}