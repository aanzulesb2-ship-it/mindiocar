export function getGroqKey() {
  return (process.env.GROQ_API_KEY || "").trim();
}

export function getGroqKeyError() {
  return "Falta una clave de GROQ. Usa GROQ_API_KEY en .env.local y reinicia Next.js.";
}
