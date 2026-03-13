// Simple OpenAI API wrapper
export async function getOpenAIResponse(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Falta la clave de OpenAI');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    })
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.code;
    if (code === 'insufficient_quota' || res.status === 429) {
      throw new Error(
        'Tu clave de OpenAI es valida, pero no hay cuota activa en el proyecto (Billing/Usage).'
      );
    }
    throw new Error(data?.error?.message || 'Error OpenAI');
  }
  return data.choices?.[0]?.message?.content || 'Sin respuesta.';
}

