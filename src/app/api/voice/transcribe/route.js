import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json(
        { error: "No se envió archivo de audio" },
        { status: 400 }
      );
    }

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return Response.json({
      text: transcription.text,
    });

  } catch (error) {
    console.error("Error transcribiendo:", error);

    return Response.json(
      { error: error.message || "Error en transcripción" },
      { status: 500 }
    );
  }
}