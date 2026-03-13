import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Falta configurar OPENAI_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return Response.json(
        { error: "No se recibieron mensajes." },
        { status: 400 }
      );
    }

    const input = messages
      .filter((m) => m && typeof m.content !== "undefined")
      .map((m) => ({
        role:
          m.role === "system"
            ? "system"
            : m.role === "assistant"
            ? "assistant"
            : "user",
        content: [
          {
            type: "input_text",
            text: String(m.content ?? ""),
          },
        ],
      }));

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input,
    });

    return Response.json({
      content: response.output_text || "No hubo respuesta del asistente.",
    });
  } catch (error) {
    console.error("Error en /api/asistente:", error);

    return Response.json(
      {
        error: error?.message || "Error interno del servidor en el asistente.",
      },
      { status: 500 }
    );
  }
}