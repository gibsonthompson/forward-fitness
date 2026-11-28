// Vercel serverless function: POST /api/run-plan
// The AI coach personalizes a running plan. Following docs/running-coach.md ("the math is code,
// the model is the coach"):
// - Code builds a baseline plan that already passes every guardrail.
// - The model adjusts session types, days and distances for this runner, in a compact format.
//   It never writes paces; code expands its choices into reps, warmups and paces.
// - Every proposal is checked by the same guardrails. Rejected proposals go back to the model
//   with the exact errors. If it can't produce a valid plan in time, the baseline stands.
//
// Body: { goal: { distance_m, target_time_s, goal_date, setup }, vdot, startWeeklyM, today }
// Returns: { source: "ai", note, weeks, paces } or { source: "baseline", reason }
// Signed-in users only. Needs ANTHROPIC_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
import Anthropic from "@anthropic-ai/sdk";
import {
  buildPlan, builderOptions, validatePlan, toCompact, expandCompact, checkPlanShape,
  trainingPaces, predictRace, formatPace, formatClock, raceTimeFromVdot, LIMITS, SESSION_TYPES,
} from "../src/lib/running/index.js";

const MODEL = "claude-sonnet-5-5";
const DEADLINE_MS = 50_000; // stay inside the function's 60 second limit
const MAX_SUBMITS = 3;

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

const SESSION_SCHEMA = {
  type: "object",
  properties: {
    day: { type: "integer", enum: [0, 1, 2, 3, 4, 5, 6] },
    type: { type: "string", enum: SESSION_TYPES },
    km: { type: "number" },
    work_km: { type: ["number", "null"] },
    rep_m: { type: ["integer", "null"] },
  },
  required: ["day", "type", "km", "work_km", "rep_m"],
  additionalProperties: false,
};

const TOOLS = [
  {
    name: "get_training_paces",
    description: "Daniels training paces (per km) for a VDOT fitness score. Use this instead of calculating paces yourself.",
    strict: true,
    input_schema: { type: "object", properties: { vdot: { type: "number" } }, required: ["vdot"], additionalProperties: false },
  },
  {
    name: "predict_race_time",
    description: "Predicted race time range for a distance at a VDOT fitness score.",
    strict: true,
    input_schema: { type: "object", properties: { vdot: { type: "number" }, distance_m: { type: "number" } }, required: ["vdot", "distance_m"], additionalProperties: false },
  },
  {
    name: "submit_plan",
    description: "Submit the finished plan. It is checked against every safety guardrail; if anything fails you get the exact errors back and should fix them and submit again.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        coach_note: { type: "string", description: "One or two plain sentences telling the runner what you personalized and why. No em dashes." },
        weeks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              phase: { type: "string", enum: ["base", "build", "sharpen", "taper"] },
              recovery: { type: "boolean" },
              sessions: { type: "array", items: SESSION_SCHEMA },
            },
            required: ["phase", "recovery", "sessions"],
            additionalProperties: false,
          },
        },
      },
      required: ["coach_note", "weeks"],
      additionalProperties: false,
    },
  },
];

function systemPrompt() {
  const L = LIMITS;
  return `You are the running coach inside the Forward Fitness app. You personalize a training plan that the app's physiology engine has already built and checked.

## How plans work
- The plan is anchored to race day: the race is always on day 6 of the last week. Days are 0 to 6 within each plan week.
- Session types: easy, long, strides (an easy run with short fast strides), threshold, interval, repetition, race-pace, time-trial, race, strength, rest.
- For each session you choose: km (total for the day, including warm-up and cool-down; 0 for strength), work_km (distance at quality pace for threshold, interval, repetition, race-pace and strides, or the all-out test distance for a time-trial; null otherwise), and rep_m (rep length in meters for threshold, interval, repetition and race-pace; null otherwise).
- You never set paces. The app sets every pace from the runner's fitness.

## Rules every plan must pass (they are enforced in code)
- Weekly distance may rise at most ${Math.round(L.weeklyIncrease.intermediate * 100)}% (${Math.round(L.weeklyIncrease.beginner * 100)}% for beginners) over the higher of the previous two weeks, with a small step allowed at very low volume, never more than ${Math.round(L.hardCapIncrease * 100)}%.
- A recovery week (volume cut at least ${Math.round(L.recoveryCut * 100)}%) at least every ${L.maxBuildStreak.intermediate + 1} weeks (every ${L.maxBuildStreak.beginner + 1} for beginners). Mark it recovery: true.
- Long run at most ${Math.round(L.longRunShare * 100)}% of the week.
- At most ${L.maxQuality.intermediate} quality sessions a week (${L.maxQuality.beginner} for beginners). Never two hard days in a row, including across weeks; the long run counts as hard.
- Repetition work at most 5% of the week, interval work at most 8% (for a 5K goal, race-pace work counts as interval work), threshold work at most 10% of the week per session.
- At least ${Math.round(L.minEasyShare * 100)}% of running time easy.
- Never more run days than the runner has, never two runs on one day.
- Strength at most twice a week, never the day before a hard run or on a time-trial day.
- Keep the same number of weeks and the same phases. The last week is the taper with the race.

## What to do
Start from the baseline. Change only what makes the plan fit this runner better, for example: a long run that starts near their longest recent run, more gradual progression for an older runner or one returning from injury, quality sessions that suit their experience, or time trials kept where they are useful. If the baseline already fits, return it with minimal changes and say so.
Use get_training_paces or predict_race_time if you need numbers. Finish by calling submit_plan. If it returns errors, fix exactly those and submit again.`;
}

function athleteBrief(goal, vdot, startWeeklyM, opts) {
  const s = goal.setup || {};
  const paces = trainingPaces(vdot);
  const pred = predictRace(vdot, Number(goal.distance_m));
  const lines = [
    `Goal: ${Number(goal.distance_m) / 1000} km race in ${formatClock(Number(goal.target_time_s))} on ${goal.goal_date}, ${opts.weeks} plan weeks.`,
    `Current fitness (VDOT): ${vdot.toFixed(1)}. Predicted today: ${formatClock(pred.low)} to ${formatClock(pred.high)}.`,
    `Easy pace ${formatPace(paces.easy.fast)} to ${formatPace(paces.easy.slow)}; threshold ${formatPace(paces.threshold.fast)}.`,
    `Current weekly distance: ${(startWeeklyM / 1000).toFixed(1)} km. Longest recent run: ${s.longestM ? (s.longestM / 1000).toFixed(1) + " km" : "unknown"}.`,
    `Run days per week: ${opts.days}. Long run on plan day ${opts.longRunDay}.`,
    `Experience: ${s.level || "unknown"}. Planned with ${opts.level} progression limits.`,
    `Injury history: ${s.injury === "recent" ? "coming back from an injury" : "no recent injuries"}. Age: ${s.age || "not given"}.`,
    s.assessment && s.assessment.kind === "new" ? "Brand new to running: the first weeks are run-walk, and the week 4 time trial sets real paces." : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(200).json({ source: "baseline", reason: "not-configured" }); return; }
  if (!(await verifyUser(req))) { res.status(401).json({ error: "Please sign in again." }); return; }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const vdot = Number(body.vdot);
  if (!body.goal || !body.goal.goal_date || !(Number(body.goal.distance_m) > 0) || !(vdot > 10 && vdot < 90) || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.today))) {
    res.status(400).json({ error: "Invalid request." });
    return;
  }
  try {
    const out = await personalizePlan({ goal: body.goal, vdot, startWeeklyM: Math.max(0, Number(body.startWeeklyM) || 0), today: body.today }, new Anthropic());
    res.status(200).json(out);
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("run-plan API error", e.status, e.message);
    else console.error("run-plan", e && e.message);
    res.status(200).json({ source: "baseline", reason: "error" });
  }
}

/**
 * The agentic loop, separated from the HTTP handler so it can be tested with a scripted client.
 * Returns { source: "ai", note, weeks, paces } or { source: "baseline", reason }.
 */
export async function personalizePlan({ goal, vdot, startWeeklyM, today }, client, deadlineMs = DEADLINE_MS) {
  const started = Date.now();
  const { opts } = builderOptions(goal, { vdot, startWeeklyM, today });
  const baseline = buildPlan(opts);
  const ctx = { level: opts.level, paces: baseline.paces, startWeeklyM, goalDistanceM: opts.goalDistanceM, availableDays: opts.days };
  const raceTimeS = raceTimeFromVdot(vdot, opts.goalDistanceM);
  const messages = [{
    role: "user",
    content: athleteBrief(goal, vdot, startWeeklyM, opts) + "\n\nBaseline plan (compact):\n" + JSON.stringify(toCompact(baseline)),
  }];

  let submits = 0;
  while (Date.now() - started < deadlineMs) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: systemPrompt(),
      tools: TOOLS,
      messages,
    }, { timeout: Math.max(5_000, deadlineMs - (Date.now() - started)) });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") break;
    const uses = msg.content.filter((b) => b.type === "tool_use");
    if (!uses.length) break; // ended without submitting
    messages.push({ role: "assistant", content: msg.content });

    const results = [];
    let accepted = null;
    for (const tu of uses) {
      const input = tu.input || {};
      if (tu.name === "get_training_paces") {
        const p = trainingPaces(Number(input.vdot) || vdot);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(Object.fromEntries(Object.entries(p).map(([k, r]) => [k, formatPace(r.fast) + " to " + formatPace(r.slow)]))) });
      } else if (tu.name === "predict_race_time") {
        const r = predictRace(Number(input.vdot) || vdot, Number(input.distance_m) || opts.goalDistanceM);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: formatClock(r.low) + " to " + formatClock(r.high) });
      } else if (tu.name === "submit_plan") {
        submits += 1;
        const errors = [];
        let expanded = null;
        if (!Array.isArray(input.weeks)) errors.push("weeks must be an array.");
        else {
          const out = expandCompact(input.weeks, { goalDistanceM: opts.goalDistanceM, level: opts.level, raceTimeS });
          expanded = { weeks: out.weeks, paces: baseline.paces };
          errors.push(...out.problems, ...checkPlanShape(expanded, { weeks: opts.weeks }), ...validatePlan(expanded, ctx).errors.map((e) => e.message));
        }
        if (!errors.length) {
          accepted = { weeks: expanded.weeks, note: String(input.coach_note || "").replace(/\u2014/g, ", ").slice(0, 400) };
          results.push({ type: "tool_result", tool_use_id: tu.id, content: "Accepted." });
        } else {
          results.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: "Rejected. Fix these and submit again:\n- " + errors.slice(0, 20).join("\n- ") });
        }
      } else {
        results.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: "Unknown tool." });
      }
    }
    if (accepted) return { source: "ai", note: accepted.note, weeks: accepted.weeks, paces: baseline.paces };
    if (submits >= MAX_SUBMITS) break;
    messages.push({ role: "user", content: results });
  }
  return { source: "baseline", reason: submits ? "invalid" : "timeout" };
}
