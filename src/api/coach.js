// Vercel Serverless Function for the Coach chat.
// PLACE THIS FILE AT: /api/coach.js  (a folder named "api" at your repo root)
// Vercel auto-deploys it as POST /api/coach. No config needed.
//
// Set the key in Vercel: Settings > Environment Variables > add
//   ANTHROPIC_API_KEY = your_key
// then redeploy (or just push). Your existing VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY env vars are reused below to lock this endpoint
// to signed-in users so nobody can hit it anonymously and burn your key.

const SYSTEM_PROMPT = `You are Coach, a knowledgeable, encouraging strength and fitness assistant built into the Forward Fitness app.

WHAT YOU HELP WITH:
- Training: exercise technique, form cues, programming, progressive overload, hypertrophy, strength, splits, volume, frequency, deloads.
- Nutrition for performance and physique: protein, calories, meal timing, general supplement guidance grounded in evidence.
- Recovery: sleep, rest, mobility, managing fatigue.
- Motivation and habit-building around training.

STYLE:
- Be concise, practical, and direct. Plain language. Prefer specific, actionable answers over essays.
- Tailor advice if the user shares their stats, experience level, or goals; otherwise give solid general best-practice guidance.
- When you use information from web search, summarize it in your own words.

GUARDRAILS (these are firm):
- Stay on fitness, nutrition, training, and recovery. If a question is clearly unrelated (coding, politics, relationships, general trivia, etc.), briefly decline and steer back to training. Do not answer off-topic requests.
- You are not a doctor. Do not diagnose or treat medical conditions or injuries. For pain, injuries, medical symptoms, or any health condition, recommend the user consult a qualified healthcare professional. General prehab and mobility info is fine; medical treatment is not.
- Never provide dosing, cycles, or sourcing for anabolic steroids or other illicit performance-enhancing drugs. You may discuss why they are risky in general terms only.
- Never encourage disordered eating, extreme caloric restriction, purging, or unsafe rapid weight cutting. Promote sustainable, healthy approaches. If a user shows signs of an eating disorder, gently encourage speaking with a professional.
- Keep all advice safe and age-appropriate.`;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  // Auth gate: only signed-in users (verifies the Supabase access token sent by the app).
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
    const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!token || !supaUrl || !anon) { res.status(401).json({ error: "Unauthorized" }); return; }
    const who = await fetch(supaUrl + "/auth/v1/user", { headers: { Authorization: "Bearer " + token, apikey: anon } });
    if (!who.ok) { res.status(401).json({ error: "Unauthorized" }); return; }
  } catch (e) { res.status(401).json({ error: "Unauthorized" }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Server not configured" }); return; }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (messages.length === 0) { res.status(400).json({ error: "No messages" }); return; }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
        // Server-side web search. Delete this tools line to remove the per-search
        // cost, or if your account/region does not have web search enabled.
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      }),
    });
    if (!r.ok) { console.error("Anthropic error", r.status, await r.text()); res.status(502).json({ error: "Upstream error" }); return; }
    const data = await r.json();
    const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    res.status(200).json({ reply: reply || "Sorry, I couldn't come up with an answer. Try rephrasing?" });
  } catch (e) {
    console.error("coach error", e);
    res.status(500).json({ error: "Internal error" });
  }
}