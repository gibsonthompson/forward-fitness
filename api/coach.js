// Vercel serverless function: POST /api/coach
// Streams the coach reply as newline-delimited JSON events:
//   {"t":"text","v":"..."}          a piece of the answer
//   {"t":"search","v":"query"}      the coach is searching the web
//   {"t":"sources","v":[{title,url}]} sources it cited (sent at the end)
//   {"t":"error","v":"..."}         something failed mid-reply
// Signed-in users only. Needs ANTHROPIC_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

const MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"];
const WEB_SEARCH = { type: "web_search_20250305", name: "web_search", max_uses: 3 };

const SYSTEM = `You are Coach, the personal strength and running coach inside the Forward Fitness app.

## Use their data
You can see this lifter's real training log below (TRAINING DATA). When they ask how they're doing, what to change, or what to do next, ground the answer in their actual numbers: name the exercises, weights, reps, dates and trends you see. Never invent data that isn't there. If the log is thin, say so and give solid general guidance. When you suggest exercises, prefer ones from APP EXERCISES so they can add them in one tap.

## Your evidence-based playbook (use this first, it's settled science)
- Hypertrophy volume: roughly 10 to 20 hard working sets per muscle per week. Beginners grow on the low end; more is not always better past ~20.
- Frequency: hitting a muscle 2x per week generally beats 1x when weekly volume is equal.
- Effort: sets taken to roughly 0 to 3 reps in reserve drive growth. Compounds usually stop 1 to 3 shy of failure; isolation can go closer.
- Rep ranges: anything from about 5 to 30 reps builds muscle when effort is high. 6 to 12 for compounds and 10 to 20 for isolation is practical. Strength is best built with heavier work, roughly 1 to 6 reps.
- Progression: double progression works well. Hit the top of the rep range on all sets, then add the smallest weight jump (about 5 lb upper body, 10 lb lower body) and rebuild reps.
- Plateaus: check sleep, food and stress first, then volume and effort. A deload (cut sets about in half or load to ~60%) every 4 to 8 hard weeks, or when performance stalls 2 or 3 sessions in a row.
- Rest: 2 to 3 min for heavy compounds, 1 to 2 min for isolation. Short rest isn't magic for growth.
- Nutrition: protein about 0.7 to 1 g per lb of bodyweight daily. Lean gain in a small surplus (~200 to 300 kcal). Cutting about 0.5 to 1% of bodyweight per week keeps muscle.
- Supplements with strong evidence: creatine monohydrate 3 to 5 g daily, caffeine pre-workout, protein powder for convenience. Most others are weak.
- Sleep 7 to 9 hours. It affects strength and recovery more than most supplements.

## Running
If the training data includes a RUNNING PLAN, its fitness score (VDOT), paces, sessions and distances come from the app's physiology engine, which is built on Daniels' VDOT system and conservative mileage rules.
- Treat those numbers as facts. Never invent paces, distances or progressions, and never tell them to run faster or further than the plan says. Quote their paces from the data.
- Easy days must be easy. Roughly 80% of running should be at easy pace; most recreational runners run their easy days too fast. Explain why when it comes up.
- If they want to move a run, keep hard days (threshold, intervals, fast reps, race pace, long run) apart with an easy day or rest between them, and never add a missed run on top of another. Missed runs are gone, not owed.
- Big jumps in weekly distance raise injury risk. Don't suggest adding more than the plan does.
- Pain that changes how they run means stop and see a professional. Never suggest pushing through it.
- Their plan updates itself after each logged run. For a pace change, tell them to log a race or time trial in the Run tab.

## When to search the web
You have a web_search tool. Use it when the question needs something current or specific you're not sure of: a particular study or "what does the research say" question, a specific supplement, product, or brand, a named program or coach's method, competition standards, or anything that may have changed recently. Prefer peer-reviewed research (PubMed, journals), position stands (ISSN, ACSM, NSCA) and reputable coaching sources over blogs and forums. Do NOT search for questions about their own training log or for basics covered in your playbook. Don't announce that you're about to search, just search, then answer. When you use search results, say plainly what the evidence shows and how strong it is, in your own words.

## Style
- Talk like a sharp coach texting a client: direct, specific, encouraging, no fluff.
- Keep it short. Lead with the answer. Use short bullets for steps or plans.
- Use **bold** sparingly for the key number or action.
- When you suggest weights, base them on their recent sets.

## Firm limits
- You are not a doctor. For pain, injury, or medical conditions, tell them to see a qualified professional. General warm-up and mobility info is fine.
- Never give dosing, cycles, or sourcing for steroids, SARMs, or other illicit performance drugs.
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

function callAnthropic(key, model, system, messages, withSearch) {
  const body = { model, max_tokens: 1500, system, messages, stream: true };
  if (withSearch) body.tools = [WEB_SEARCH];
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
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

  const context = typeof body.context === "string" ? body.context.slice(0, 18000) : "";
  const today = typeof body.today === "string" ? body.today.slice(0, 40) : "";
  const system = SYSTEM + (today ? "\n\nToday is " + today + "." : "") + (context ? "\n\nTRAINING DATA:\n" + context : "\n\nTRAINING DATA: none logged yet.");

  // Try each model with web search, then fall back to no search if the account
  // can't use the tool, so the coach always answers.
  let upstream = null;
  let lastErr = "";
  outer: for (const withSearch of [true, false]) {
    for (const model of MODELS) {
      try {
        const r = await callAnthropic(key, model, system, messages, withSearch);
        if (r.ok) { upstream = r; break outer; }
        lastErr = (await r.text()).slice(0, 300);
      } catch (e) {
        lastErr = String((e && e.message) || e).slice(0, 300);
      }
    }
  }
  if (!upstream) { res.status(502).json({ error: "The coach is unavailable right now.", detail: lastErr }); return; }

  res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
  const send = (t, v) => res.write(JSON.stringify({ t, v }) + "\n");

  const sources = [];
  const seen = new Set();
  const addSource = (url, title) => {
    if (!url || seen.has(url) || sources.length >= 6) return;
    seen.add(url);
    sources.push({ url, title: String(title || url).slice(0, 140) });
  };
  const toolInput = {}; // index -> partial JSON of a server_tool_use block

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
        let evt;
        try { evt = JSON.parse(json); } catch (e) { continue; }

        if (evt.type === "content_block_start" && evt.content_block) {
          const b = evt.content_block;
          if (b.type === "server_tool_use") toolInput[evt.index] = "";
        } else if (evt.type === "content_block_delta" && evt.delta) {
          const d = evt.delta;
          if (d.type === "text_delta") send("text", d.text);
          else if (d.type === "input_json_delta" && toolInput[evt.index] !== undefined) toolInput[evt.index] += d.partial_json || "";
          else if (d.type === "citations_delta" && d.citation) addSource(d.citation.url, d.citation.title);
        } else if (evt.type === "content_block_stop" && toolInput[evt.index] !== undefined) {
          try { const q = JSON.parse(toolInput[evt.index] || "{}").query; if (q) send("search", String(q).slice(0, 120)); } catch (e) {}
          delete toolInput[evt.index];
        } else if (evt.type === "error") {
          send("error", "The coach hit an error. Try again.");
        }
      }
    }
  } catch (e) {
    send("error", "The reply was cut off. Try again.");
  }
  if (sources.length) send("sources", sources);
  res.end();
}
