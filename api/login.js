// Vercel function: officer login check. The email and password live only in the
// server settings (OFFICER_EMAIL, OFFICER_PASSWORD), never in the website code.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request) {
  const { OFFICER_EMAIL, OFFICER_PASSWORD } = process.env;
  if (!OFFICER_EMAIL || !OFFICER_PASSWORD) return json({ error: 'Login is not set up on the server.' }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  const ok = String(body?.email || '').trim().toLowerCase() === OFFICER_EMAIL.toLowerCase() && String(body?.password || '') === OFFICER_PASSWORD;
  return ok ? json({ ok: true }) : json({ error: 'Wrong email or password.' }, 401);
}
