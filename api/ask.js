// Vercel function: the officer website asks Gemini about the dashboard numbers.
// The API key stays on the server (GEMINI_API_KEY) and never reaches the browser or the APK.
// tried in order: the next one is used when a model is busy
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
const SYSTEM = `You help a public-health officer read the RabiesPulse AI dashboard for Chennai.
Answer ONLY from the DATA block. If the answer is not in the data, say so.
The ward and month figures are SIMULATED demonstration data: say this once in every answer.
The risk score is a demonstration "Rabies Risk Indicator", not an outbreak prediction. Never say rabies cases are confirmed or predicted.
Live community reports are unverified. Never give medical advice, diagnoses or vaccine doses.
Be short: at most 120 words, plain text, name wards and numbers.`;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'AI is not set up on the server.' }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  const question = String(body?.question || '').trim().slice(0, 300);
  const data = String(body?.data || '').slice(0, 12000);
  if (!question || !data) return json({ error: 'Question and data are required.' }, 400);
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: `DATA:\n${data}\n\nQUESTION: ${question}` }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
  });
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: payload,
        signal: AbortSignal.timeout(12000),
      });
      const out = await res.json();
      const answer = out?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
      if (res.ok && answer) return json({ answer });
    } catch {
      /* try the next model */
    }
  }
  return json({ error: 'The AI service did not answer.' }, 502);
}
