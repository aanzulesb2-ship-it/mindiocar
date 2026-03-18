import { getGroqKey, getGroqKeyError } from '@/lib/getOpenAIKey';

// Simple GROQ API wrapper (versión texto)
export async function getGroqResponse(prompt) {
  const apiKey = getGroqKey();
  if (!apiKey) throw new Error(getGroqKeyError());

  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const res = await fetch(`https://api.groq.com/v1/models/${model}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: prompt,
      temperature: 0.4,
      max_output_tokens: 300,
    }),
  });

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Respuesta no JSON de GROQ: ${raw.slice(0, 120)}`);
  }

  if (!res.ok) {
    const message = data?.error?.message || `Error GROQ (${res.status})`;
    throw new Error(message);
  }

  const content =
    (Array.isArray(data?.output) &&
      data.output[0]?.content
        ?.map((item) => (item?.type === 'output_text' ? item.text : ''))
        .join(''))
      ?.trim() || 'Sin respuesta.';

  return content;
}

