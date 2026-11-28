# Running Coach: Product and Technical Spec

**Status:** not built. This is the plan.
**Priority:** high. **Bar:** this has to be genuinely good coaching, grounded in exercise science, not a chatbot that makes up workouts.

---

## 1. What It Does

The user gives the coach a goal, for example **"I want to run a 5K in 20 minutes."** The coach:

1. **Assesses where they are now:**
   - A recent race or time trial, current weekly running, how many days they can run, and injury history.
   - If there's no recent result, a simple assessment run.
2. **Checks if the goal is realistic** for the time available.
   - It says so honestly.
   - If the goal is a big jump, it proposes a stepping-stone goal.
3. **Builds a periodized plan** tailored to them:
   - Weekly structure, with every session's type, distance or duration, and **exact target paces**.
   - Each session has a plain-language purpose.
4. **Adapts after every run.** The user logs distance, time, and how it felt (effort 1 to 10, plus any pain). The coach updates fitness estimates, paces and the upcoming weeks.
5. **Explains itself.** It says why each change was made, and can answer questions like "why am I running so slow on easy days?"

It should feel like having a knowledgeable coach in your pocket: specific, honest, encouraging and conservative about injury.

---

## 2. Core Design Principle: The Math Is Code, the Model Is the Coach

**Do not let the language model invent paces, distances or progressions freely.** Language models are fluent but can be confidently wrong with numbers. Split responsibilities:

| Layer | Responsible for | Implementation |
|---|---|---|
| **Physiology engine** (deterministic code) | Fitness estimate (VDOT), race predictions, training paces, volume limits, taper rules, safety guardrails, adaptation rules | Pure TypeScript/JS functions in `lib/running/`, fully unit tested |
| **Plan builder** (code plus model) | Choosing session types, weekly structure and periodization within the engine's limits | The model proposes a plan as **structured JSON**; code validates it against the guardrails and rejects or repairs anything out of bounds |
| **Coach voice** (model) | Explaining the plan, answering questions, motivation, interpreting the user's notes ("legs felt heavy, slept badly") | Claude via the existing `/api/coach` pattern, with the engine's numbers passed in as facts |

**Model:** the existing coach already uses `claude-sonnet-5-5` (fallback `claude-haiku-5-5`) through the Anthropic API. Use the same.

- Plan generation uses **tool use with a strict JSON schema** so output is machine-checkable.
- The model calls engine functions as tools (`get_training_paces`, `predict_race_time`, `check_week_volume`) instead of doing the math itself.
- Web search (already wired into the coach) can back up answers with current research, with citations shown.

---

## 3. The Science It Must Be Built On

Every rule below should be implemented in code and cited in comments. Treat these as the starting rulebook, and **have a certified running coach review the final rulebook before launch**.

### 3.1 Fitness estimate and training paces: Daniels' VDOT

Jack Daniels and Jimmy Gilbert's VDOT system (from *Oxygen Power*, 1979, and *Daniels' Running Formula*) converts a race result into an effective VO2max score, then derives training paces from it.

**Oxygen cost of running at speed v** (v in meters per minute, result in mL/kg/min):

```
VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
```

**Fraction of VO2max sustainable for a race lasting t minutes:**

```
pct = 0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)
```

**VDOT:**

```
VDOT = VO2 / pct
```

**Reference values for checking the code:**
- A 20:00 5K scores about 49.8.
- A 25:00 5K scores about 38.3.

So the "20-minute 5K" goal means reaching a VDOT of about 50.

**Training paces from VDOT**, found by solving the VO2 equation for v at a % of VDOT:

| Pace | Target | Purpose |
|---|---|---|
| **E (Easy)** | 59 to 74% of VDOT | Aerobic base, recovery, most of the volume |
| **M (Marathon)** | Equivalent marathon race pace | Used sparingly for 5K goals |
| **T (Threshold)** | About 88% of VDOT, roughly 1-hour race pace | Tempo runs and cruise intervals; raises sustainable pace |
| **I (Interval)** | 97 to 100% of VDOT | Raises aerobic power |
| **R (Repetition)** | Equivalent mile race pace | Speed and economy |

**Volume caps from Daniels:**
- R work: no more than about 5% of weekly mileage.
- I work: no more than about 8% of weekly mileage, excluding warmup, cooldown and recovery jogs.

**Updating the estimate:**
- Only update VDOT from **qualifying efforts**: races, time trials, or a threshold or interval session that clearly beats the expected pace at a reported effort that matches.
- Never update VDOT from easy runs.
- Re-test every 4 to 8 weeks with a time trial.

**Alternative or complementary model: critical speed (CS).**
- CS is the highest speed at which a physiological steady state can be reached.
- Running time to exhaustion follows a hyperbolic relationship with speed, which gives CS and D′ (the distance that can be covered above CS).
- CS can be estimated from habitual training data, which makes it a strong candidate for refining fitness estimates from GPS runs later.

### 3.2 Race prediction: Riegel, with caveats

Riegel's formula is `T2 = T1 × (D2 / D1)^1.06`.

- It is intended for efforts lasting roughly 3.5 to 230 minutes.
- It is well-calibrated up to the half marathon but predicts marathon times that are too fast, by at least 10 minutes for about half of runners.
- So for marathon goals, use VDOT equivalence plus a volume-based correction, never plain Riegel.
- Always show predictions as a range, not a single number.

### 3.3 Intensity distribution: mostly easy

- **Elite practice:** elite endurance athletes do roughly 80% of their training at low intensity, with about 20% high intensity.
- **Quality sessions:** two high-intensity sessions per week are enough to drive adaptation.
- **Polarized vs other models:** a 2024 meta-analysis found polarized training modestly better for VO2peak, but no clear advantage on other performance measures. Polarized and pyramidal distributions are both used by elite athletes.

**What the engine does with this:**
- Target about 75 to 85% of weekly running time at E pace.
- Use at most 2 quality sessions per week (1 for beginners).
- Never schedule hard days back to back.
- Explain to users why easy days must be easy. This is the most common mistake recreational runners make.

### 3.4 Volume progression and injury risk

- **The 10% rule is folklore.** In a 1-year study of 874 novice runners, those who increased weekly distance by more than 30% over 2 weeks seemed more vulnerable to distance-related injuries than those under 10%. Across all injuries, though, the difference was not statistically significant.
- **Single weeks matter.** In another cohort, over half of injured runners had increased weekly distance by more than 30% between consecutive weeks at least once in the 4 weeks before the injury.
- **Very heavy beginners:** novices with BMI over 30 had more injuries when they ran 3 km or more in their first week.

**Engine rules (conservative):**
- Week-over-week distance increase is normally ≤ 10 to 15%, with a hard cap well below 30%.
- Every 3rd or 4th week is a recovery week with volume reduced by about 20 to 30%.
- Beginners start with run-walk if needed and a very low first week.
- Long run ≤ about 30% of weekly volume.

**Do not use the acute:chronic workload ratio (ACWR) as an injury predictor.** It has been heavily criticized on methodological grounds, and some researchers call for dismissing it. Track load for trends and explanations only.

### 3.5 Measuring load: session RPE

- **Method:** session-RPE (Foster et al. 2001) multiplies effort (modified CR-10 scale, 0 to 10) by session duration in minutes.
- **Evidence:** a review of 36 validation studies found it valid and reliable across sports, ages and levels.
- **Use in the app:** after each run, ask for effort 0 to 10 plus optional notes. This gives the coach an internal-load signal even without heart rate data.
- **Later:** add heart rate from Apple Watch / HealthKit as a second signal.

### 3.6 Tapering before the goal race

- **Bosquet et al. 2007** (27 studies): the best-performing taper lasted about 2 weeks, with volume reduced exponentially by 41 to 60%.
- **Keep the quality:** intensity and frequency are maintained during the taper.
- **5K races:** use a shorter taper of about 7 to 10 days.
- **Longer races:** use a fuller taper.

### 3.7 Strength training (a natural fit with the lifting side of the app)

- **Running economy:** heavy-load strength training, plyometrics and combined methods can improve running economy in middle- and long-distance runners.
- **Heavy vs plyometric:** another meta-analysis found heavy resistance training, especially near-maximal loads, may beat plyometrics for running economy and time-trial performance.
- **Duration:** benefits were better with programs of 10 weeks or more.

**This is a real product advantage.** Forward Fitness already tracks lifting, so the running plan should schedule 2 strength sessions a week (heavy lower body plus some plyometrics) and pull them straight into the lifting tracker, timed so they don't wreck key runs.

---

## 4. The Plan Structure

Periodize backward from the goal date.

| Phase | Typical length | Focus |
|---|---|---|
| **Base** | 3 to 6+ weeks | Build easy volume and consistency, strides, strength work |
| **Build** | 4 to 6 weeks | Threshold work (T), then add intervals (I) |
| **Sharpen** | 2 to 4 weeks | Race-specific work at goal pace, R and I sessions |
| **Taper** | 1 to 2 weeks | Volume down 40 to 60%, keep some intensity |
| **Race and recover** | 1 week+ | Race, then easy running |

**Plan length:**
- If the user has less time than the plan ideally needs, compress the phases and lower the expectation.
- If they have more time, extend the base phase.

**Feasibility check (before generating the plan):**
- Compute the current VDOT and the goal VDOT.
- If the gap is larger than what's plausible in the available weeks:
  - Say so honestly.
  - Show the predicted time range at the goal date.
  - Offer either a longer timeline or an intermediate goal.
- Calibrate the plausible-gain heuristic with the coach reviewer. Make it conservative and present it as an estimate, not a promise.

**Example: current 5K 24:00 (VDOT about 40), goal 20:00 (VDOT about 50).**
- This is a large improvement.
- The coach should explain it's realistic over a longer horizon (many months of consistent training), not a 6-week plan.
- It should propose a stepping stone (for example 22:00 first).

---

## 5. Adapting After Every Run

**After each run, the user logs:**
- Distance and time. Later this is auto-filled from GPS or the Apple Watch.
- Session effort 0 to 10.
- Optional notes.
- A **pain check:** none, mild, or pain that changed how they ran.

**Engine rules:**

| Signal | Response |
|---|---|
| Quality session hit at or faster than target with effort as expected | Count toward a VDOT upgrade. After 2 or more consistent signals, or a time trial, raise VDOT and update all paces |
| Easy runs done too fast | Don't upgrade fitness. Coach the user to slow down, and explain why |
| Session much harder than expected (effort far above typical for that session type) | Hold progression. Look at sleep, stress and notes. Swap the next quality day for easy if it repeats |
| Missed sessions | Don't cram them in. Reflow the week and keep the volume cap |
| Several missed weeks | Step back a phase and recalculate |
| Pain that changed their running | Stop progression, recommend rest or cross-training, and recommend seeing a medical professional if it persists. Never "push through" |
| Time trial or race result | Recompute VDOT directly and re-plan the remaining weeks |

**How changes are shown:** every change is written to a plan history with a plain-language reason ("Your threshold runs have been consistently faster than target at an effort of 6, so I've updated your paces"). The user can see exactly why the plan changed.

---

## 6. Inputs to Collect at Setup

- **The goal:** distance, target time and goal date.
- **Current fitness:**
  - A recent race or time trial result.
  - If none, prompt a guided assessment: a 3K or 5K time trial, or a 12-minute test, after a proper warmup.
- **Current running:** weekly distance and the longest recent run.
- **Schedule:** days per week available, preferred long-run day, and which days they lift.
- **About them:** experience level, age, injury history.
- **Units:** km or miles.
- **Safety screen:**
  - A short pre-exercise readiness questionnaire (PAR-Q style).
  - Anyone answering yes to cardiac, chest pain or dizziness questions is told to get medical clearance first.

---

## 7. Data Model (new Supabase tables, all with RLS on, `user_id` text)

| Table | Purpose |
|---|---|
| `iron_runs` | Each run:<ul><li>`date`, `distance_m`, `duration_s`, `moving_s`, `rpe`, `pain` (none, mild or affected), `notes`</li><li>`source` (manual, gps or healthkit), `route` (encoded polyline, nullable), `splits` jsonb</li><li>`plan_session_id` (nullable)</li></ul> |
| `iron_run_goals` | `distance_m`, `target_time_s`, `goal_date`, `status`, `created_at` |
| `iron_run_plans` | One active plan per goal: `phases` jsonb, `current_vdot`, `paces` jsonb, `version`, `created_at` |
| `iron_run_plan_sessions` | Scheduled sessions: `date`, `type` (easy, long, threshold, interval, repetition, race-pace, strides, rest, strength), `structure` jsonb (warmup, reps, recovery, cooldown), `target_pace` ranges, `distance` or `duration`, `purpose`, `status` |
| `iron_fitness_estimates` | VDOT and CS history with source (race, time trial, inferred) and date, so progress can be charted |
| `iron_plan_changes` | Audit log of every adaptation, with its reason text |

---

## 8. UI

**Progress or Run tab:**
- Goal card: target, predicted range today, and weeks remaining.
- This week's sessions.
- Fitness (VDOT) trend chart.
- Weekly volume chart.

**Session detail:**
- The structure, broken down: warmup, then the main set, then the cooldown.
- Target paces shown in the user's units.
- Why the session matters, in one or two sentences.

**Log run:**
- Fast entry: distance, time, effort slider, pain check, notes.
- Later this is auto-filled from GPS or the Watch.

**Coach chat:**
- The existing Coach tab gains the running plan as context.
- Users can ask "can I move Thursday's run?" and the coach proposes a valid change through the engine.

**Design:** the same "feel like Apple" bar and standing rules as the rest of the app (see `CLAUDE.md`).

---

## 9. Build Order

1. **Engine, pure functions with tests:**
   - VDOT from a race.
   - Paces from VDOT.
   - Riegel range prediction.
   - Volume caps and progression checks.
   - Taper builder.
   - Adaptation rules.
   - Tests use the reference values (20:00 5K ≈ 49.8, 25:00 5K ≈ 38.3).
2. **Tables and RLS.**
3. **Plan generation:**
   - A model call with tool use and a JSON schema.
   - A validator that enforces every guardrail.
   - A repair or retry loop if validation fails.
4. **Setup flow, plan view, and run logging (manual).**
5. **Adaptation after each run, plus the plan history.**
6. **Coach chat integration.**
7. **Evaluation:**
   - **Persona tests** (code): a test suite of user personas (beginner, returning runner, sub-20 chaser, injury-prone, inconsistent schedule) that checks every generated plan passes the guardrails.
   - **Coach review** (manual): a certified running coach reviews sample plans before launch.
8. **Native phase:** GPS tracking, HealthKit import, then Apple Watch run tracking. These feed the same `iron_runs` table.

---

## 10. Safety and Honesty

- **Not medical advice:**
  - The coach is not a doctor.
  - Any chest pain, fainting, unusual shortness of breath, or injury that changes how the user runs means stop and seek medical care.
- **Honest about goals:** never promise a time. Show ranges and say when a goal is a stretch.
- **Conservative by default.** If in doubt, the plan is easier, not harder. An injured runner makes no progress.
- **Citations are real:** cite real research only, and never invent a study.

---

## References

- Daniels and Gilbert VDOT equations and pace percentages: https://getfitcraft.com/tools/vdot-calculator
- VDOT reference values and re-test guidance: https://the5krunner.com/tools/running-calculators/vdot-calculator/
- Daniels R and I volume caps: https://www.panix.com/~elflord/running/VdotApplet.html
- Stöggl and Sperlich 2015, training intensity distribution: https://pmc.ncbi.nlm.nih.gov/articles/PMC4621419/
- Oliveira et al. 2024, polarized vs other distributions meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428
- Polarized vs pyramidal in elite athletes: https://pubmed.ncbi.nlm.nih.gov/31484159/
- Nielsen et al. 2014, weekly distance progression and injury: https://vbn.aau.dk/da/publications/excessive-progression-in-weekly-running-distance-and-risk-of-runn
- Weekly increases before injury: https://pmc.ncbi.nlm.nih.gov/articles/PMC7222667
- First-week distance and BMI in novices: https://pmc.ncbi.nlm.nih.gov/articles/PMC4060311
- Impellizzeri et al., ACWR criticism: https://iris.univr.it/handle/11562/1139126
- Session-RPE validity review (Haddad et al. 2017): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5673663/
- Bosquet et al. 2007, taper meta-analysis: https://pubmed.ncbi.nlm.nih.gov/17762369/
- Riegel formula: https://en.wikipedia.org/wiki/Peter_Riegel
- Riegel calibration in recreational runners: https://pmc.ncbi.nlm.nih.gov/articles/PMC5000509
- Critical speed from training data: https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951
- Strength training and running economy (Llanos-Lagos et al. 2024): https://link.springer.com/article/10.1007/s40279-023-01978-y
- Heavy resistance vs plyometric training: https://pubmed.ncbi.nlm.nih.gov/36370207/
