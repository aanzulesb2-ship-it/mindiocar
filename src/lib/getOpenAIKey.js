export function getOpenAIKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
    ""
  ).trim();
}

export function getOpenAIKeyError() {
  return "Falta una clave de OpenAI. Usa OPENAI_API_KEY, OPENAI_KEY o NEXT_PUBLIC_OPENAI_API_KEY en .env.local y reinicia Next.js.";
}
