// Deterministic plan builder. Produces a complete plan that passes every guardrail.
// It is the baseline the model's proposal is compared against, the fallback when the model's
// plan can't be repaired, and what the persona tests exercise.
//
// Plan weeks are anchored to the goal date: the race is always on day 6 of the last week.

import { trainingPaces, raceTimeFromVdot } from './vdot.js'
import { LIMITS, maxNextWeekM, QUALITY_TYPES, HARD_TYPES, weekDistanceM } from './guardrails.js'
import { phaseByWeek } from './phases.js'
import { taperFactors } from './taper.js'

/** Peak weekly volume (meters) to build toward, by goal distance and level. Coach review item. */
export const PEAK_TARGET_KM = {
  5000: { beginner: 20, intermediate: 35, experienced: 50 },
  10000: { beginner: 25, intermediate: 40, experienced: 60 },
  21097.5: { beginner: 30, intermediate: 50, experienced: 70 },
  42195: { beginner: 40, intermediate: 60, experienced: 85 },
}
/** Below this weekly volume, beginners run-walk. */
export const RUN_WALK_BELOW_M = 8000
/** Longest long run (meters) by goal distance. */
const LONG_CAP_M = { 5000: 14000, 10000: 18000, 21097.5: 22000, 42195: 32000 }

/**
 * Weekly volume the plan builds toward. Fewer run days lower the target. A runner already above
 * it holds their volume, up to 1.5x the target.
 */
export function peakTargetM({ goalDistanceM, level = 'intermediate', days = 4, startWeeklyM = 0 }) {
  const b = bucket(goalDistanceM)
  const t = PEAK_TARGET_KM[b][level] * 1000
  // No run but the long run is longer than the long run, so the week can hold about
  // days x the longest long run. Aim a little under that.
  const capacity = days >= 4 ? days * LONG_CAP_M[b] * 0.9 : Infinity
  return Math.min(capacity, Math.max(t * Math.min(1, days / 4), Math.min(startWeeklyM, t * 1.5)))
}

function bucket(distanceM) {
  return distanceM <= 5000 ? 5000 : distanceM <= 10000 ? 10000 : distanceM <= 21100 ? 21097.5 : 42195
}

/** Run days for N days a week, as offsets back from the long-run day, spread for recovery. */
const DAY_PATTERNS = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 2, 4, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6],
}

const circ = (a, b) => { const d = Math.abs(a - b) % 7; return Math.min(d, 7 - d) }

export const PURPOSE = {
  easy: 'Builds your aerobic base and helps you recover. Keep it truly easy: you should be able to talk in full sentences.',
  long: 'Your longest run of the week. It builds endurance and teaches your body to run on tired legs. Easy pace the whole way.',
  strides: 'An easy run with a few short, fast, relaxed strides at the end. They sharpen your form without adding fatigue.',
  threshold: 'Comfortably hard running at threshold pace. It raises the speed you can hold for a long time.',
  interval: 'Hard efforts at interval pace with jog recovery. They raise your aerobic ceiling.',
  repetition: 'Short, fast reps with full recovery. They make you faster and more economical, not more tired.',
  'race-pace': 'Running at your goal race pace so it feels familiar on race day.',
  race: 'Race day. Start controlled, settle into goal pace, and finish strong.',
  strength: 'Heavy lower body plus a little jumping. Strength work makes every stride cheaper.',
  'time-trial': 'A short all-out test after an easy warm-up. Your result resets every pace in your plan so they match the runner you are now.',
}

/**
 * Split a work budget into reps. Uses the longest rep length from `lengths` that still gives at
 * least `minReps` reps, so a session is never a single lonely rep. Never exceeds the budget.
 */
function repsFor(workM, lengths, minReps = 3) {
  const len = lengths.find((l) => Math.floor(workM / l) >= minReps)
  if (!len) return { count: 0, len: 0, total: 0 } // too small for a real session
  const count = Math.floor(workM / len)
  return { count, len, total: count * len }
}

function qualitySession(type, workBudgetM, goalDistanceM) {
  // Rep lengths, longest first. Recovery follows Daniels: short jog for T, about equal time for I,
  // full recovery for R.
  const racePaceReps = goalDistanceM <= 5000 ? [1000, 800, 600, 400] : goalDistanceM <= 10000 ? [2000, 1600, 1000, 800] : goalDistanceM <= 21100 ? [3000, 2000, 1600, 1000] : [5000, 3000, 2000, 1600]
  const spec = {
    threshold: { pace: 'threshold', reps: [1600, 1200, 1000, 800], recoveryS: 60, min: 2 },
    interval: { pace: 'interval', reps: [1000, 800, 600, 400], recoveryS: 180, min: 3 },
    repetition: { pace: 'repetition', reps: [400, 300, 200], recoveryS: 150, min: 4 },
    'race-pace': { pace: 'race', reps: racePaceReps, recoveryS: 90, min: 2 },
  }[type]
  const r = repsFor(workBudgetM, spec.reps, spec.min)
  return { type, work: { distanceM: r.total, pace: spec.pace }, structure: { reps: r.count, repM: r.len, pace: spec.pace, recoveryS: spec.recoveryS } }
}

/**
 * Quality session types for a phase. Beginners get one, others two.
 * For a 5K, race pace is close to I pace and shares its 8% cap, so sharpen weeks pair one of them
 * with threshold or repetition work instead of splitting the cap into two tiny sessions.
 */
function qualityFor(phase, level, weekInPhase, recovery, goalDistanceM) {
  const one = level === 'beginner'
  if (phase === 'sharpen' && goalDistanceM <= 5000 && !one && !recovery) {
    return weekInPhase % 2 ? ['race-pace', 'repetition'] : ['interval', 'threshold']
  }
  if (phase === 'base') return []
  if (recovery) return one ? [] : ['threshold']
  if (phase === 'build') return one ? ['threshold'] : weekInPhase < 2 ? ['threshold', 'repetition'] : ['threshold', 'interval']
  if (phase === 'sharpen') return one ? [weekInPhase % 2 ? 'race-pace' : 'interval'] : ['interval', 'race-pace']
  if (phase === 'taper') return one ? [] : ['race-pace']
  return []
}

/**
 * Build a plan.
 * opts = {
 *   vdot, goalDistanceM, weeks, level, startWeeklyM,
 *   days: run days per week (1 to 7), longRunDay: plan-week day 0..6 (default 6),
 *   strength: include 2 strength sessions a week (default true), bmi?
 * }
 * Returns { weeks: [{ phase, recovery, volumeM, sessions }], paces }.
 */
export function buildPlan(opts) {
  const { vdot, goalDistanceM, level = 'intermediate', startWeeklyM = 0, strength = true } = opts
  const days = Math.min(7, Math.max(1, Math.round(opts.days || 4)))
  const L = opts.longRunDay ?? 6
  const paces = trainingPaces(vdot)
  const b = bucket(goalDistanceM)
  const phases = phaseByWeek(opts.weeks, goalDistanceM)
  const targetM = peakTargetM({ goalDistanceM, level, days, startWeeklyM })
  // Available days are a maximum, not a quota. Low weekly volume uses fewer, real runs.
  const daysFor = (vol) => {
    const perRun = level === 'beginner' && vol < RUN_WALK_BELOW_M ? 800 : 2500
    const n = Math.min(days, Math.max(Math.min(days, 2), Math.floor(vol / perRun)))
    return DAY_PATTERNS[n].map((o) => (L - o + 7) % 7).sort((a, c) => a - c)
  }
  const raceTime = raceTimeFromVdot(vdot, goalDistanceM)

  const volumes = []
  const out = []
  let streak = 0
  const taperF = taperFactors(goalDistanceM)
  const taperStart = phases.indexOf('taper')
  const phaseWeek = {}
  let lastTT = null

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    phaseWeek[phase] = (phaseWeek[phase] ?? -1) + 1
    const ref = i === 0 ? startWeeklyM : Math.max(volumes[i - 1], i > 1 ? volumes[i - 2] : startWeeklyM)
    let recovery = false
    let vol
    if (phase === 'taper') {
      // Taper from the volume the plan recently reached, never above the progression ceiling.
      const peak = volumes.length ? Math.max(...volumes.slice(-4)) : startWeeklyM
      vol = Math.min(peak * taperF[i - taperStart], maxNextWeekM(ref, level) - 400)
    } else if (streak >= LIMITS.maxBuildStreak[level] && i > 0) {
      recovery = true
      vol = ref * 0.75
    } else {
      // Stay a little under the ceiling: each run is rounded to 100 m, which can add up to 350 m.
      const ceiling = maxNextWeekM(ref, level)
      vol = Math.min(Math.max(targetM, ref), ceiling * 0.98, ceiling - 400)
      if (i === 0 && level === 'beginner' && opts.bmi > 30 && startWeeklyM < LIMITS.highBmiFirstWeekM) vol = Math.min(vol, LIMITS.highBmiFirstWeekM * 0.85)
    }
    streak = recovery || phase === 'taper' ? 0 : streak + 1

    const isRaceWeek = i === phases.length - 1
    const runDays = daysFor(vol)
    const prev = out[out.length - 1]
    const avoidDay0 = !!prev && prev.sessions.some((x) => x.day === 6 && HARD_TYPES.has(x.type))
    const week = isRaceWeek ? raceWeek(vol, daysFor(Math.max(vol, goalDistanceM)), level, goalDistanceM, raceTime, paces) : normalWeek({ vol, runDays, L, level, phase, weekInPhase: phaseWeek[phase], recovery, goalDistanceM, longCapM: LONG_CAP_M[b], avoidDay0 })
    // Re-test fitness every ~6 weeks from week 4, during base and build only and never within
    // 3 weeks of the taper (Daniels: re-test every 4 to 8 weeks).
    // Recovery weeks are allowed: fresh legs give the truest result.
    const ttAllowed = !isRaceWeek && (phase === 'base' || phase === 'build') && i >= 3 && (taperStart < 0 || i <= taperStart - 3)
    if (opts.timeTrials !== false && ttAllowed && (lastTT == null || i - lastTT >= 6)) {
      if (addTimeTrial(week.sessions, { L, avoidDay0, goalDistanceM, vol })) lastTT = i
    }
    if (strength) addStrength(week.sessions)
    const actual = weekDistanceM(week)
    volumes.push(actual)
    out.push({ phase, recovery, volumeM: actual, sessions: week.sessions.sort((a, c) => a.day - c.day) })
  }
  return { weeks: out, paces }
}

function round100(m) { return Math.max(0, Math.round(m / 100) * 100) }

function normalWeek(args) {
  // Quality budgets come from weekly volume. If caps leave the week shorter than planned, rebuild
  // with budgets based on the real total so every cap holds against the week as it ends up.
  let week = buildNormalWeek(args, args.vol)
  for (let k = 0; k < 3; k++) {
    const actual = weekDistanceM(week)
    if (actual >= args.vol - 300) break
    week = buildNormalWeek(args, actual * 0.97)
  }
  return week
}

function buildNormalWeek({ vol, runDays, L, level, phase, weekInPhase, recovery, goalDistanceM, longCapM, avoidDay0 }, budgetVol) {
  const sessions = []
  // New runners build up with run-walk intervals until they can run comfortably for longer.
  const runWalk = level === 'beginner' && vol < RUN_WALK_BELOW_M
  // Run-walk sessions can be short. Anything shorter than this is dropped as not worth the trip.
  const minRunM = runWalk ? 400 : 800
  const others = runDays.filter((d) => d !== L)
  // A distinct long run needs at least 4 run days. With fewer, a run capped at 30% of the week
  // can't be the longest run, so all runs are easy runs of similar length instead.
  const hasLong = runDays.length >= 4
  const longM = hasLong ? Math.min(vol * 0.28, longCapM) : 0

  // Choose quality days: at least 2 days from the long run and from each other (circular, so the
  // pattern also holds across week boundaries).
  // Always leave at least one plain easy day besides the long run.
  const wanted = qualityFor(phase, level, weekInPhase, recovery, goalDistanceM).slice(0, Math.max(0, others.length - 1))
  const hard = hasLong ? [L] : []
  const qDays = []
  const candidates = [...others].sort((a, c) => circ(c, L) - circ(a, L))
  for (let k = 0; k < wanted.length; k++) {
    const d = candidates.find((x) => !qDays.includes(x) && !(avoidDay0 && x === 0) && hard.every((h) => circ(h, x) >= 2) && qDays.every((q) => circ(q, x) >= 2))
    if (d == null) break
    qDays.push(d)
    hard.push(d)
  }
  const qTypes = wanted.slice(0, qDays.length)

  // Work budgets, kept just inside Daniels' caps. For a 5K goal, race pace counts as I pace.
  const raceIsI = goalDistanceM <= 5000
  const bv = budgetVol
  const iBudget = Math.min(bv * LIMITS.intervalShare, LIMITS.intervalMaxM) * 0.95
  const qsAll = qTypes.map((t, k) => {
    let budget
    if (t === 'threshold') budget = Math.min(bv * LIMITS.thresholdSessionShare * 0.95, 10000)
    else if (t === 'repetition') budget = Math.min(bv * LIMITS.repetitionShare, LIMITS.repetitionMaxM) * 0.95
    else if (t === 'interval') budget = qTypes.includes('race-pace') && raceIsI ? iBudget * 0.6 : iBudget
    else budget = raceIsI ? (qTypes.includes('interval') ? iBudget * 0.4 : iBudget) : Math.min(bv * 0.1, 12000)
    return { ...qualitySession(t, budget, goalDistanceM), day: qDays[k] }
  })
  // A quality day too small for real reps becomes an easy run instead.
  const qs = qsAll.filter((q) => q.work.distanceM > 0)
  for (const q of qsAll) if (!q.work.distanceM) qDays.splice(qDays.indexOf(q.day), 1)
  const work = qs.reduce((s, q) => s + q.work.distanceM, 0)

  // Spread the remaining easy distance across the non-long days. Quality days get warmup and
  // cooldown from that share, up to a cap, and the rest goes to easy days. Nothing but the long run
  // is ever longer than the long run; volume that doesn't fit is left out of the week.
  const nonLong = hasLong ? others : runDays
  const share = Math.max(0, (vol - longM - work) / Math.max(1, nonLong.length))
  const sessionCap = hasLong ? longM : Infinity
  const wuCap = level === 'beginner' ? 3500 : 5000
  let overflow = 0
  const wus = qs.map((q) => {
    const wu = Math.max(0, Math.min(share, wuCap, sessionCap - q.work.distanceM))
    overflow += share - wu
    return wu
  })
  const easyDays = nonLong.filter((d) => !qDays.includes(d))
  const easyEach = easyDays.length ? Math.min(share + overflow / easyDays.length, sessionCap) : 0
  overflow -= easyDays.length * (easyEach - share)
  // Anything still left over can lengthen quality-day warmups, up to the long run.
  qs.forEach((q, k) => {
    if (overflow <= 0) return
    const room = Math.max(0, sessionCap - q.work.distanceM - wus[k])
    const add = Math.min(room, overflow / (qs.length - k))
    wus[k] += add
    overflow -= add
  })
  qs.forEach((q, k) => {
    q.distanceM = round100(wus[k] + q.work.distanceM)
    q.structure.warmupM = round100(wus[k] / 2)
    q.structure.cooldownM = round100(wus[k] / 2)
    sessions.push(q)
  })
  easyDays.forEach((d, k) => {
    const strides = phase !== 'taper' && !recovery && k === 0 && easyDays.length > 1 && level !== 'beginner'
    const distanceM = round100(easyEach)
    if (distanceM < minRunM) return
    const s = { day: d, type: strides ? 'strides' : 'easy', distanceM }
    if (strides) {
      const stridesM = Math.min(600, round100(budgetVol * LIMITS.repetitionShare * 0.4))
      if (stridesM >= 200 && !qTypes.includes('repetition')) {
        s.work = { distanceM: stridesM, pace: 'repetition' }
        s.structure = { reps: stridesM / 100, repM: 100, pace: 'repetition', recoveryS: 60 }
      } else s.type = 'easy'
    }
    sessions.push(s)
  })
  if (hasLong && longM >= minRunM) {
    // Easy caps and rounding can leave the week shorter than planned, so re-check the long run
    // against what the week actually totals.
    const rest = sessions.reduce((t, s) => t + s.distanceM, 0)
    const fit = Math.floor((LIMITS.longRunShare * rest) / (1 - LIMITS.longRunShare) / 100) * 100
    const longFinal = Math.min(round100(longM), fit)
    if (longFinal >= minRunM) sessions.push({ day: L, type: 'long', distanceM: longFinal })
  }
  for (const s of sessions) {
    s.purpose = PURPOSE[s.type]
    if (runWalk && (s.type === 'easy' || s.type === 'long')) {
      s.runWalk = true
      s.purpose = 'Alternate easy running with brisk walking, for example 1 minute of each. Walking breaks are part of the plan, not a failure.'
    }
  }
  return { sessions }
}

function raceWeek(vol, runDays, level, goalDistanceM, raceTime, paces) {
  const sessions = [{ day: 6, type: 'race', distanceM: goalDistanceM, purpose: PURPOSE.race, targetTimeS: Math.round(raceTime) }]
  // Taper volume is training volume before the race; the race itself is on top.
  let left = vol
  // One short tune-up at race pace, at least 2 days from the race and away from day 0 so it
  // never follows last week's long run.
  const pool = runDays.filter((d) => d !== 6 && d !== 5)
  if (level !== 'beginner') {
    const d = [2, 3, 1, 4].find((x) => pool.includes(x))
    if (d != null && vol * LIMITS.intervalShare * 0.9 >= 800) {
      const q = qualitySession('race-pace', Math.min(goalDistanceM * 0.4, 4000, vol * LIMITS.intervalShare * 0.9), goalDistanceM)
      if (q.work.distanceM > 0) {
        const wu = Math.min(3000, left * 0.5)
        sessions.push({ ...q, day: d, distanceM: round100(wu + q.work.distanceM), structure: { ...q.structure, warmupM: round100(wu / 2), cooldownM: round100(wu / 2) }, purpose: 'A short sharpener at race pace. Enough to feel fast, not enough to tire you.' })
        left -= wu + q.work.distanceM
      }
    }
  }
  const easy = pool.filter((d) => !sessions.some((s) => s.day === d))
  // A short shakeout the day before the race when that day is a run day.
  if (runDays.includes(5)) easy.push(5)
  const each = easy.length ? Math.min(left / easy.length, Math.max(6000, goalDistanceM * 0.2)) : 0
  for (const d of easy) {
    const distanceM = round100(d === 5 ? Math.min(each, 3000) : each)
    if (distanceM >= 1000) sessions.push({ day: d, type: 'easy', distanceM, purpose: d === 5 ? 'A short, easy shakeout to stay loose before tomorrow.' : PURPOSE.easy })
  }
  // The race takes the place of a run day. Drop the earliest plain easy runs until the week
  // fits the days the runner has.
  while (sessions.length > runDays.length) {
    let i = sessions.findIndex((s) => s.type === 'easy' && s.day !== 5)
    if (i < 0) i = sessions.findIndex((s) => s.type === 'easy' || s.type === 'race-pace')
    if (i < 0) break
    sessions.splice(i, 1)
  }
  // Keep the tune-up inside the caps measured against the week as built. For a 5K, race pace
  // counts as I pace (8%); otherwise hold it to the threshold share (10%).
  const tune = sessions.find((s) => s.type === 'race-pace')
  if (tune) {
    const share = goalDistanceM <= 5000 ? LIMITS.intervalShare : LIMITS.thresholdSessionShare
    for (let k = 0; k < 3; k++) {
      const vol = sessions.reduce((t, s) => t + (s.type === 'race' ? 0 : s.distanceM), 0)
      const cap = vol * share * 0.95
      if (tune.work.distanceM <= cap) break
      const easyPart = tune.distanceM - tune.work.distanceM
      const q = qualitySession('race-pace', cap, goalDistanceM)
      if (q.work.distanceM < 400 || q.work.distanceM > cap) {
        // Too little room for a tune-up: keep it as an easy run, or drop it if that is too short.
        if (round100(easyPart) >= 1000) {
          Object.assign(tune, { type: 'easy', distanceM: round100(easyPart), purpose: PURPOSE.easy })
          delete tune.work
          delete tune.structure
        } else sessions.splice(sessions.indexOf(tune), 1)
        break
      }
      Object.assign(tune, { work: q.work, distanceM: round100(easyPart + q.work.distanceM), structure: { ...tune.structure, ...q.structure } })
    }
  }
  return { sessions }
}

/** Two strength sessions a week, on quality days (hard days hard) or on days that don't precede a key run. */
/**
 * Put a time trial in the week, replacing the first quality session (keeping the week's spacing)
 * or an easy day that is clear of every hard day. The test is sized to fit inside the run it
 * replaces, so weekly volume never grows. Returns false when nothing fits.
 */
function addTimeTrial(sessions, { L, avoidDay0, goalDistanceM, vol }) {
  const hardDays = sessions.filter((s) => HARD_TYPES.has(s.type)).map((s) => s.day)
  const quality = sessions.find((s) => QUALITY_TYPES.has(s.type))
  const easy = sessions
    .filter((s) => (s.type === 'easy' || s.type === 'strides') && !(avoidDay0 && s.day === 0) && hardDays.every((h) => circ(h, s.day) >= 2))
    .sort((a, c) => circ(c.day, L) - circ(a.day, L))[0]
  const target = quality || easy
  if (!target) return false
  const ladder = [5000, 3000, 1600, 1000].filter((m) => m <= Math.max(1600, goalDistanceM) && (vol < 6000 ? m <= 1000 : vol < 12000 ? m <= 1600 : vol < 25000 ? m <= 3000 : true))
  // Room for the test: the replaced run plus whatever the week's other easy runs can spare
  // while staying at least 800 m. Weekly volume never grows.
  const donors = sessions.filter((s) => s !== target && (s.type === 'easy' || s.type === 'strides'))
  const spare = donors.reduce((t, s) => t + Math.max(0, s.distanceM - 800), 0)
  const minWarm = (m) => (m >= 3000 ? 1600 : 800)
  const testM = ladder.find((m) => m + minWarm(m) <= target.distanceM + spare)
  if (!testM) return false
  let need = Math.max(0, testM + minWarm(testM) - target.distanceM)
  for (const d of donors) {
    if (need <= 0) break
    const take = Math.min(need, Math.max(0, d.distanceM - 800))
    d.distanceM = round100(d.distanceM - take)
    need -= take
  }
  const total = Math.max(target.distanceM, testM + minWarm(testM))
  const easyM = total - testM
  const i = sessions.indexOf(target)
  sessions[i] = {
    day: target.day,
    type: 'time-trial',
    distanceM: round100(total),
    structure: { testM, warmupM: round100(easyM * 0.6), cooldownM: round100(easyM * 0.4) },
    purpose: PURPOSE['time-trial'],
  }
  return true
}

function addStrength(sessions) {
  const runs = sessions.filter((s) => s.type !== 'strength')
  const key = new Set(runs.filter((s) => QUALITY_TYPES.has(s.type) || s.type === 'long').map((s) => s.day))
  if (runs.some((s) => s.type === 'race')) return // no heavy lifting in race week
  // No heavy lifting on a test day.
  const quality = runs.filter((s) => QUALITY_TYPES.has(s.type) && s.type !== 'time-trial').map((s) => s.day)
  const ok = (d) => !key.has(d + 1) && !key.has(d) && !(d === 6 && key.has(0))
  // Heavy lower-body days need a day between them.
  const picks = []
  for (const d of [...quality, 0, 1, 2, 3, 4, 5, 6]) {
    if (picks.length >= 2) break
    if (picks.includes(d) || picks.some((p) => circ(p, d) < 2)) continue
    if (quality.includes(d) || ok(d)) picks.push(d)
  }
  for (const day of picks.slice(0, 2)) sessions.push({ day, type: 'strength', purpose: PURPOSE.strength })
}
