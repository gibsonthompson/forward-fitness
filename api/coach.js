// Vercel serverless function: POST /api/coach
// Streams the coach reply as plain text. Signed-in users only.
// Needs ANTHROPIC_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in Vercel env.

const MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"];

const SYSTEM = `You are Coach, the personal strength coach inside the Forward Fitness app.

You can see this lifter's real training log (below, under TRAINING DATA). Use it. When they ask how they are doing, what to change, or what to do next, ground your answer in their actual numbers: name the exercises, weights, reps, dates, and trends you see. Do not invent data that is not there. If the log is thin, say so and give solid general guidance.

What you help with: technique and form cues, programming and splits, progressive overload, plateaus, exercise selection and swaps, volume and frequency, deloads, recovery, sleep, and nutrition for performance.

Style:
- Talk like a sharp coach texting a client: direct, specific, encouraging, no fluff.
- Keep it short. Lead with the answer. Use short bullets for steps or plans.
- Use **bold** sparingly for the key number or action.
- When you suggest weights, base them on their recent sets (for example a small jump from their best recent set).

Firm limits:
- You are not a doctor. For pain, injury, or medical conditions, tell them to see a qualified professional. General mobility and warm-up info is fine.
- Never give dosing, cycles, or sourcing for steroids or other illicit performance drugs.
- Never encourage extreme restriction, purging, or unsafe weight cuts.
- Stay on training, recovery, and nutrition. Briefly decline anything off topic and steer back.`;

async function verifyUser(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return false;
  try {
    const r = await fetch(url + "/auth/v1/user", { headers: { Authorization: "Bearer " + token, apikey: anon } });
    return r.ok;
  } catch (e) {
    return false;
  }
}

function callAnthropic(key, model, system, messages) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 1200, system, messages, stream: true }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: "The coach is not configured yet." }); return; }
  if (!(await verifyUser(req))) { res.status(401).json({ error: "Please sign in again to use the coach." }); return; }

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); } catch (e) { body = {}; }

  const messages = (Array.isArray(body.messages) ? body.messages.slice(-16) : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) { res.status(400).json({ error: "No message" }); return; }

  const context = typeof body.context === "string" ? body.context.slice(0, 12000) : "";
  const today = typeof body.today === "string" ? body.today.slice(0, 40) : "";
  const system = SYSTEM + (today ? "\n\nToday is " + today + "." : "") + (context ? "\n\nTRAINING DATA:\n" + context : "\n\nTRAINING DATA: none logged yet.");

  let upstream = null;
  let lastErr = "";
  for (const model of MODELS) {
    try {
      upstream = await callAnthropic(key, model, system, messages);
      if (upstream.ok) break;
      lastErr = (await upstream.text()).slice(0, 300);
      upstream = null;
    } catch (e) {
      lastErr = String((e && e.message) || e).slice(0, 300);
      upstream = null;
    }
  }
  if (!upstream) { res.status(502).json({ error: "The coach is unavailable right now.", detail: lastErr }); return; }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const evt = JSON.parse(json);
          if (evt.type === "content_block_delta" && evt.delta && evt.delta.type === "text_delta") res.write(evt.delta.text);
        } catch (e) { /* ignore partial lines */ }
      }
    }
  } catch (e) {
    res.write("\n\n(The reply was cut off. Try again.)");
  }
  res.end();
}
