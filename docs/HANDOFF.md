# Handoff: Where Work Stands

Last updated: 2026-11-28 (after commit `e0deabf`).

Read this after `CLAUDE.md` and `docs/running-coach.md`. It records what has been built, how it fits together, the rules that must not break, what is waiting on Gibson, and what to do next. Update it at the end of every working session.

---

## 1. Quick Status

| Area | State |
|---|---|
| Running coach engine (`src/lib/running/`) | **Done.** Pure functions, cited, unit tested |
| Running database tables | **Done.** Six `iron_run*` tables, RLS on, isolation verified |
| Run tab UI (`src/screens/RunTab.jsx`) | **Done.** Setup, plan, logging, adaptation, history |
| AI plan personalization (`api/run-plan.js`) | **Done**, tested with a mocked model only (no local API key) |
| Strength days on the Train tab | **Done** |
| Coach proposes run moves (Plan Change card) | **Done**, tested with a mocked model only |
| Signup without email confirmation | **Done.** Supabase edge function `ff-signup` |
| Website redesign (Goal 1) | **Paused.** Waiting on Gibson's photo picks and copy direction |
| App journey audit (Goal 2) | **Not started** |
| Split the rest of `App.jsx` | Partly done (ui helpers moved out). `App.jsx` is still ~3,240 lines |
| Lifting progression engine | **Not started** (top item in `CLAUDE.md` section 4) |

Tests: `npm test` runs Vitest, 161 tests, all passing at `e0deabf`.

---

## 2. Waiting On Gibson

Do not act on these without his explicit answer.

1. **Stuck June account.** One real Forward Fitness user created 2026-06-10 was never email-confirmed (signup used to require it), so they can't sign in. Confirming it is harmless (the address is a synthetic `@callbirdai.com`), but changing a real user's auth record was blocked without an explicit request. Ask: confirm it?
2. **Test account `fftestrun710176`.** Lives in production with sample runs and plan changes. Its password was in the session scratchpad (`run/cred.json`), which is temporary and may be gone. Ask: delete it, or keep it for website product screenshots?
3. **Website photo picks and copy direction.** See section 7.

---

## 3. Architecture of the Running Coach

Principle from the spec: **the math is code, the model is the coach.** The model never writes paces.

### Engine: `src/lib/running/` (all re-exported from `index.js`)

| File | What it does |
|---|---|
| `vdot.js` | Daniels VDOT: `vdotFromRace`, `raceTimeFromVdot`, `trainingPaces(vdot)` (E 59 to 74%, M, T 88%, I 97 to 100%, R mile pace) as `{fast, slow}` sec/km. Reference: 20:00 5K = 49.8, 25:00 5K = 38.3 |
| `predict.js` | `riegel` (valid 3.5 to 230 min), `predictRace(vdot, distanceM, {weeklyKm})` returns `{low, mid, high}`, marathon volume penalty |
| `guardrails.js` | `LIMITS` and `validatePlan(plan, ctx)` returning `{ok, errors, warnings}`. Weekly increase 10% beginner / 15% others, hard cap 25%, recovery week cut 20%, long run at most 30%, quality sessions 1 beginner / 2 others, at least 75% easy, R at most 5% (cap 8 km), I at most 8% (cap 10 km), high-BMI first week under 3 km (only if starting under 3 km) |
| `taper.js` | Taper length and volume factors per race distance |
| `phases.js` | `periodize(totalWeeks, distanceM)`: base, build, sharpen, taper |
| `feasibility.js` | `assessGoal`: achieved, realistic, stretch or unrealistic, plus predicted range and a stepping-stone goal |
| `adapt.js` | `evaluateRun` (pain, race/time-trial recompute, much harder, easy too fast, VDOT signals), `decideVdotUpdate` (2+ signals in 42 days, step capped at 1.5), `assessMissed` |
| `load.js` | Session RPE load and weekly loads (trends only, never ACWR) |
| `builder.js` | Deterministic `buildPlan(opts)`: day patterns, run-walk for beginners under 8 km/week, time trials from week 4 then every 6+ weeks, 2 strength days a week (2+ days apart, never on a test day) |
| `replan.js` | Calendar (race is day 6 of the last plan week), `planToRows`, re-pacing, `planAdjustments`, `builderOptions` (shared by app and API), `checkMoves` (move validation) |
| `compact.js` | Compact plan format the AI edits (`toCompact`, `expandCompact`, `checkPlanShape`) |
| `format.js` | Clock, pace and distance formatting, km/mi |

Tests: `src/lib/running/__tests__/` (vdot, guardrails, coaching, personas, a 3,000-plan sweep, replan, compact) plus `tests/run-plan.test.js` and `tests/coach.test.js`.

### Services: `src/services/running.js`

`loadRunning`, `createGoalAndPlan`, `rebuildRemaining`, `adjustAfterGap`, `logRun` (applies engine actions and writes `iron_plan_changes` reasons), `deleteRun`, `endGoal`, `vdotFromAssessment` (brand-new runner starts at VDOT 22 and is told "we'll measure, not guess"), `runningCoachContext`, `personalizePlan`, `RUNNER_STRENGTH`, `todayRunnerStrength`, `markRunnerStrengthDone`, `checkProposal`, `applyProposal`.

### UI

- `src/screens/RunTab.jsx`: Run tab (between Train and Progress). Loading, error and empty states; setup steps goal, fitness, schedule, safety (PAR-Q with cardiac clearance gate), review; goal hero, today, week, paces, trends, recent runs, "Why Your Plan Changed"; sheets for session detail, log run, result, full plan.
- `src/screens/ProposalCard.jsx`: Plan Change card in Coach chat. Engine checks the move before Apply appears and again when applied.
- `src/ui/theme.js`, `src/ui/confirm.jsx`, `src/ui/components.jsx`: shared styles, confirm dialog, `Segmented`, `Dropdown`, `LineChart`, `BarChart` (moved out of `App.jsx`).

### AI endpoints

- `api/run-plan.js`: called in the background after setup. Uses `@anthropic-ai/sdk`, `claude-sonnet-5-5`, beta streaming with `server-side-fallback-2026-07-01`. Strict tools `get_training_paces`, `predict_race_time`, `submit_plan`. Every submission goes through `expandCompact`, `validatePlan` and `checkPlanShape`; errors are fed back, up to 3 submissions, 50 s deadline (Vercel `maxDuration` 60). Applies only to an untouched version 1 plan, then sets version 2 and `phases.source = "ai"`.
- `api/coach.js`: existing lifting coach, now also running-aware. When the client sends `runningPlan: true`, it adds the strict `propose_plan_change` tool and streams a `{t:"proposal", v:{summary, moves}}` NDJSON event. Still uses raw `fetch` (kept the existing style). `tool_choice` stays auto because forced tool choice isn't allowed on Sonnet 5.5.

### Database (Supabase project `szdrpdjyordvqtkuuazh`, shared with other apps)

Migrations in `supabase/migrations/`:
- `20261128_iron_running_coach_tables.sql`: `iron_run_goals` (one active per user), `iron_run_plans` (one active per goal), `iron_run_plan_sessions`, `iron_runs`, `iron_fitness_estimates`, `iron_plan_changes`. RLS `own_rows` on all, `user_id` text = `auth.uid()::text`.
- `20261128_iron_signup_attempts.sql`: rate-limit table, RLS on with no policies (service role only).

### Signup

- `supabase/functions/ff-signup/index.ts` (deployed, version 2, verify_jwt on). Creates the user with `email_confirm: true`, so no confirmation email. 8 signups per hour per salted IP hash. Tags `app: "forward-fitness"` in **both** `user_metadata` and `app_metadata` so the shared `on_auth_user_created` trigger does not create rows in the other app's `profiles` table.
- Callers: `src/services/signup.js` (app `AuthScreen`) and `site/onboarding.js`. Both then call `signInWithPassword`. A 409 means "That username is taken".

---

## 4. Rules That Must Not Break

- **Never turn off "Confirm email"** in Supabase Auth. Another app in the shared project depends on it. Signup goes through `ff-signup` instead.
- **Never touch the other app's tables or the shared trigger.** Only `iron_*` tables are ours.
- Keep `USERNAME_DOMAIN = callbirdai.com` identical in `src/App.jsx`, `site/onboarding.js` and `ff-signup`.
- Never change the `iron_workouts.exercises` shape without a migration path.
- Keep the build-ID stamp in `vite.config.js` and the no-cache headers in `vercel.json`.
- Secrets live only in Vercel env vars. `.env.local` (gitignored) holds only the public URL and anon key.
- Port 3000 on Gibson's Mac belongs to another app. Run the dev server on **3107** (`npx vite --port 3107`) and leave 3000 alone.
- Never put a test file inside `api/`; Vercel would deploy it as a function. Tests go in `tests/`.
- All the standing UI and copy rules in `CLAUDE.md` section 5 (Title Case, no em dashes, no native `<select>`, typed number inputs, balanced grids, loading/empty/error states, no "tackle" or "guru", no fabricated testimonials or counts).

---

## 5. Known Gaps and Follow-Ups

Ranked roughly by value.

1. **Live AI check.** The plan personalizer and coach proposals have only run against mocks. After the next deploy, create a goal on a real account and confirm "personalized" appears in "Why Your Plan Changed", and ask the coach to move a run.
2. **AI personalization is lost on rebuild.** When adaptation rebuilds the remaining weeks with the deterministic builder, the AI's structure is replaced. Option: re-run personalization after a rebuild, or keep AI choices as builder hints.
3. **Leaked-password protection is off** in Supabase Auth (security advisor). Project-wide setting, so check with Gibson since other apps share it.
4. **`CLAUDE.md` is out of date on `iron_measurements`.** It says RLS is off; it is actually on. Fix the doc line, and review every `iron_*` policy as the security item asks.
5. **`iron_meals`** is unused; decide whether to drop it.
6. `api/coach.js` still uses raw `fetch`; consider moving it to the SDK like `run-plan.js`.
7. ESLint isn't in the repo yet (it was only run from a temporary tools folder). Add it properly.
8. Dev-only: 409s on `iron_public_profiles` from React StrictMode double effects. Harmless, pre-existing.

---

## 6. What To Do Next

The order Gibson set: running is the main focus right now. Once he answers section 2:

1. Run the live AI check (gap 1).
2. **Goal 2, the app journey audit:** walk sign-up to first workout to first run at 390 px, screenshot each step, list friction ranked by impact, and propose fixes before making big changes.
3. Finish the website (section 7) once photos and copy direction are picked.
4. Lifting progression engine (double progression, exercise-aware increments, stalls), in `src/lib/` with tests.
5. Keep splitting `App.jsx` (`data/`, `lib/`, `services/`, `screens/`), preserving behavior exactly.

---

## 7. Website Redesign (Paused)

Done so far: desktop and mobile audit screenshots of `site/index.html` and `site/onboarding.html`, and a contact sheet of candidate photos. All of these were in the session scratchpad, which is temporary, so regenerate them if they are gone.

Candidate Pexels photo IDs (re-download from pexels.com, then convert to WebP plus a JPG fallback, with `srcset` and lazy loading; never hotlink):
11513151, 116077, 14591521, 14623670, 14623740, 1552106, 16980804, 17979547, 19203052, 2284163, 29881498, 3039888, 3764533, 3764537, 3837743, 3837757, 3837781, 3837788, 4491808, 4853273, 4853297, 4944313, 5310782, 5327467, 5327530, 6389516, 7674489 to 7674494.

Open questions for Gibson:
- Which photos.
- Copy direction: option A, rewrite the site around current features (lifting progression **and** the new running coach), or option B, keep the current structure and tighten it.
- Whether to keep the "No ads" claim, since in-app ads are planned (`CLAUDE.md` section 6).

The site also needs real app screenshots in device frames (the Run tab is a strong candidate now) and a check at 390, 768 and 1440 px with no console errors. Keep `onboarding.html` account creation working.

---

## 8. How To Verify Work

- `npm test` for the engine, API loops and coach proposal stream.
- `npx vite --port 3107`, then open http://localhost:3107/train/ at phone size. Playwright isn't a repo dependency; install it in a scratch folder if needed.
- Production checks: `https://forwardfitness.app/api/run-plan` and `https://forwardfitness.app/api/coach` should return 401 without auth.
- Database: use the Supabase MCP tools on project `szdrpdjyordvqtkuuazh`. Check what exists before migrating, and report what ran.

---

## 9. Commit History for This Work

| Commit | What |
|---|---|
| `e632a19` | Project context and running coach spec |
| `3753dbf` | Running coach engine with tests |
| `72cfadc` | Running coach tables with RLS |
| `6c0f878` | Engine: time trials, calendar mapping, plan updates |
| `896e9cb` | Run tab: goals, plans, logging, coaching |
| `e77c663` | Signup without email confirmation, via an edge function |
| `e56e96c` | AI coach personalizes running plans, checked by the guardrails |
| `4f26cf3` | Running plan strength days on the Train tab |
| `e0deabf` | Coach can propose moving runs, checked by the engine |
