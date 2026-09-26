// Vercel serverless function: POST /api/coach
// Fixes the "having trouble reaching the coach" error (there was no /api route deployed).
//
// SETUP (one time): in Vercel > your project > Settings > Environment Variables,
// add ANTHROPIC_API_KEY = your key. Redeploy. Never commit the key to the repo.

const SYSTEM = [
  "You are the Forward Fitness coach, a knowledgeable strength and hypertrophy training assistant.",
  "Answer questions about training, programming, progressive overload, nutrition for muscle, and recovery.",
  "Be concise and practical. Prefer short paragraphs and tight bullet points a lifter can act on today.",
  "Base advice on the mainstream evidence (volume, proximity to failure, protein around 1g/lb, progressive overload).",
  "You are not a doctor. For pain, injury, or medical concerns, tell them to see a professional.",
  "Stay on fitness and nutrition. If asked something off-topic, gently steer back.",
].join(" ");

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: "Coach is not configured yet." }); return; }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const raw = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const messages = raw
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
    if (!messages.length) { res.status(400).json({ error: "No messages" }); return; }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest", // swap to a bigger model if you want deeper answers
        max_tokens: 700,
        system: SYSTEM,
        messages,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: "Coach upstream error", detail: detail.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const reply = (data.content || [])
      .filter((blk) => blk.type === "text")
      .map((blk) => blk.text)
      .join("\n")
      .trim() || "Sorry, I couldn't come up with an answer. Try rephrasing?";

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: "Coach failed", detail: String((e && e.message) || e).slice(0, 300) });
  }
}
