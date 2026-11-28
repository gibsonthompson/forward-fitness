// Plan guardrails. Every plan, whether proposed by the model or built in code, must pass
// validatePlan before it is shown to a user. Errors block a plan, warnings are surfaced.
//
// Plan shape (the contract the model's JSON output must follow):
//   plan.weeks[i] = { phase, recovery?: boolean, sessions: Session[] }
//   Session = {
//     day: 0..6 (0 = first day of the plan week),
//     type: one of SESSION_TYPES,
//     distanceM?: total running distance including warmup, cooldown and recovery jogs,
//     work?: { distanceM, pace: 'threshold' | 'interval' | 'repetition' | 'marathon' | 'race' }
//   }
//
// Sources for each rule are cited inline.

import { paceMid } from './vdot.js'
import { taperFactors } from './taper.js'

export const SESSION_TYPES = [
  'easy', 'long', 'threshold', 'interval', 'repetition', 'race-pace',
  'strides', 'rest', 'strength', 'race', 'time-trial',
]

/** Sessions that count as quality (high intensity) days. */
export const QUALITY_TYPES = new Set(['threshold', 'interval', 'repetition', 'race-pace', 'race', 'time-trial'])
/** Sessions that need an easy day on either side. The long run is hard on the legs even at E pace. */
export const HARD_TYPES = new Set([...QUALITY_TYPES, 'long'])
export const RUN_TYPES = new Set(SESSION_TYPES.filter((t) => t !== 'rest' && t !== 'strength'))

export const LIMITS = {
  // Week-over-week distance. The 10% rule is folklore, but novices who increased weekly distance
  // by more than 30% seemed more vulnerable to distance-related injuries (Nielsen et al. 2014,
  // https://vbn.aau.dk/da/publications/excessive-progression-in-weekly-running-distance-and-risk-of-runn),
  // and over half of injured runners had a single-week jump above 30% in the 4 weeks before injury
  // (https://pmc.ncbi.nlm.nih.gov/articles/PMC7222667). We stay well below that.
  weeklyIncrease: { beginner: 0.1, intermediate: 0.15, experienced: 0.15 },
  // Small absolute step allowed at very low volume, where 10% is not a workable change.
  minStepM: 2000,
  // Hard cap that applies even to the small absolute step.
  hardCapIncrease: 0.25,
  // A recovery week every 3rd (beginner) or 4th week, cutting volume by about 20 to 30%.
  maxBuildStreak: { beginner: 2, intermediate: 3, experienced: 3 },
  recoveryCut: 0.2,
  // Long run no more than about 30% of weekly volume.
  longRunShare: 0.3,
  // At most 2 quality sessions a week, 1 for beginners
  // (Stöggl and Sperlich 2015, https://pmc.ncbi.nlm.nih.gov/articles/PMC4621419/).
  maxQuality: { beginner: 1, intermediate: 2, experienced: 2 },
  // About 75 to 85% of running time at E pace (same source; polarized and pyramidal both used,
  // https://pubmed.ncbi.nlm.nih.gov/31484159/, https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428).
  minEasyShare: 0.75,
  // Daniels' caps on quality work as a share of weekly distance, with his absolute ceilings
  // (https://www.panix.com/~elflord/running/VdotApplet.html). Threshold work is capped at 10%
  // per session in Daniels' Running Formula.
  repetitionShare: 0.05, repetitionMaxM: 8000,
  intervalShare: 0.08, intervalMaxM: 10000,
  thresholdSessionShare: 0.1,
  // Novices with BMI over 30 had more injuries when running 3 km or more in their first week
  // (https://pmc.ncbi.nlm.nih.gov/articles/PMC4060311).
  highBmiFirstWeekM: 3000,
}

/**
 * Most distance allowed next week given a reference week. Percentage increase normally,
 * a small absolute step at low volume, and never more than the hard cap.
 * From zero (a brand new runner) the first week is capped at twice the minimum step.
 */
export function maxNextWeekM(refM, level = 'intermediate') {
  if (!(refM > 0)) return LIMITS.minStepM * 2
  const byPct = refM * (1 + LIMITS.weeklyIncrease[level])
  return Math.min(Math.max(byPct, refM + LIMITS.minStepM), refM * (1 + LIMITS.hardCapIncrease))
}

/**
 * Training distance for a week. The race itself is excluded: taper and progression rules are
 * about training volume, and a marathon would otherwise swamp its own race week.
 */
export function weekDistanceM(week) {
  return week.sessions.reduce((sum, s) => sum + (RUN_TYPES.has(s.type) && s.type !== 'race' ? s.distanceM || 0 : 0), 0)
}

/** Work distance at a given pace label across a week. */
function workAt(week, pace) {
  return week.sessions.reduce((sum, s) => sum + (s.work && s.work.pace === pace ? s.work.distanceM || 0 : 0), 0)
}

/** Estimated seconds of running at easy pace vs quality pace for a week. */
export function intensitySplit(week, paces) {
  const easyPace = paceMid(paces.easy)
  let easyS = 0
  let qualityS = 0
  for (const s of week.sessions) {
    if (!RUN_TYPES.has(s.type) || !s.distanceM) continue
    const workM = s.work ? Math.min(s.work.distanceM || 0, s.distanceM) : 0
    const workPace = s.work ? paceMid(paces[s.work.pace === 'race' ? 'interval' : s.work.pace] || paces.threshold) : 0
    qualityS += (workM / 1000) * workPace
    easyS += ((s.distanceM - workM) / 1000) * easyPace
  }
  const total = easyS + qualityS
  return { easyS, qualityS, easyShare: total ? easyS / total : 1 }
}

/**
 * Validate a plan against every guardrail.
 * ctx = { level, paces, startWeeklyM, goalDistanceM, availableDays?, bmi? }
 * Returns { ok, errors: Issue[], warnings: Issue[] } where Issue = { code, week, message }.
 */
export function validatePlan(plan, ctx) {
  const level = ctx.level || 'intermediate'
  const errors = []
  const warnings = []
  const err = (code, week, message) => errors.push({ code, week, message })
  const warn = (code, week, message) => warnings.push({ code, week, message })
  const weeks = plan.weeks || []
  if (!weeks.length) err('empty', null, 'The plan has no weeks.')

  const volumes = weeks.map(weekDistanceM)
  const taperWeeks = weeks.filter((w) => w.phase === 'taper').length
  let buildStreak = 0
  let prevHardAbsDay = -99

  weeks.forEach((week, i) => {
    const n = i + 1
    const vol = volumes[i]
    const isTaper = week.phase === 'taper'

    // Session sanity
    const days = new Set()
    for (const s of week.sessions) {
      if (!SESSION_TYPES.includes(s.type)) err('bad-type', n, `Unknown session type "${s.type}".`)
      if (!(s.day >= 0 && s.day <= 6)) err('bad-day', n, `Session day ${s.day} is outside the week.`)
      if (RUN_TYPES.has(s.type)) {
        if (!(s.distanceM > 0)) err('bad-distance', n, `A ${s.type} run has no distance.`)
        if (days.has(s.day)) err('double-run', n, `Two runs are scheduled on day ${s.day + 1}.`)
        days.add(s.day)
      }
      if (s.work && s.distanceM && s.work.distanceM > s.distanceM) err('bad-work', n, 'Work distance is longer than the whole session.')
    }
    if (ctx.availableDays && days.size > ctx.availableDays) err('too-many-days', n, `Week ${n} has ${days.size} run days but only ${ctx.availableDays} are available.`)

    // Volume progression: compare with the higher of the last two weeks, so returning to
    // normal volume after a recovery week is allowed.
    const ref = i === 0 ? ctx.startWeeklyM : Math.max(volumes[i - 1], i > 1 ? volumes[i - 2] : ctx.startWeeklyM ?? 0)
    if (ref != null && ref >= 0) {
      const ceiling = maxNextWeekM(ref, level)
      if (vol > ceiling + 1) err('volume-jump', n, `Week ${n} jumps to ${(vol / 1000).toFixed(1)} km from ${(ref / 1000).toFixed(1)} km. The most allowed is ${(ceiling / 1000).toFixed(1)} km.`)
    }
    // Applies to novices starting out, not to someone already running that much.
    if (i === 0 && level === 'beginner' && ctx.bmi > 30 && (ctx.startWeeklyM || 0) < LIMITS.highBmiFirstWeekM && vol >= LIMITS.highBmiFirstWeekM) {
      err('first-week-bmi', n, 'For a new runner at this body weight, the first week should total under 3 km.')
    }

    // Recovery weeks
    const prevPeak = Math.max(i > 0 ? volumes[i - 1] : ctx.startWeeklyM || 0, i > 1 ? volumes[i - 2] : 0)
    const isCut = i > 0 && vol <= prevPeak * (1 - LIMITS.recoveryCut) + 1
    if (week.recovery && i > 0 && !isCut) err('recovery-not-cut', n, `Week ${n} is marked as a recovery week but volume is not cut by at least 20%.`)
    if (isTaper || isCut) buildStreak = 0
    else buildStreak += 1
    if (buildStreak > LIMITS.maxBuildStreak[level]) {
      err('no-recovery', n, `Week ${n} is build week ${buildStreak} in a row. Add a recovery week every ${LIMITS.maxBuildStreak[level] + 1} weeks.`)
      buildStreak = 0 // report once per streak
    }

    // Long run share. Race weeks are excluded: the race itself is the long effort.
    const hasRace = week.sessions.some((s) => s.type === 'race')
    for (const s of week.sessions) {
      if (s.type === 'long' && !hasRace && vol > 0 && s.distanceM > vol * LIMITS.longRunShare + 1) {
        err('long-run-share', n, `The long run in week ${n} is ${Math.round((s.distanceM / vol) * 100)}% of the week. Keep it at or under 30%.`)
      }
    }

    // Quality count and spacing
    const quality = week.sessions.filter((s) => QUALITY_TYPES.has(s.type))
    if (quality.length > LIMITS.maxQuality[level]) err('too-much-quality', n, `Week ${n} has ${quality.length} quality sessions. The most for this level is ${LIMITS.maxQuality[level]}.`)
    const hardDays = week.sessions.filter((s) => HARD_TYPES.has(s.type)).map((s) => i * 7 + s.day).sort((a, b) => a - b)
    for (const d of hardDays) {
      if (d - prevHardAbsDay === 1) err('back-to-back', n, `Week ${n} has hard days back to back. Put an easy day or rest between them.`)
      prevHardAbsDay = d
    }

    // Strength the day before a key run blunts it
    const keyDays = new Set(week.sessions.filter((s) => HARD_TYPES.has(s.type)).map((s) => s.day))
    for (const s of week.sessions) {
      if (s.type === 'strength' && keyDays.has(s.day + 1)) warn('strength-before-key', n, `Strength in week ${n} is the day before a key run. Move it to the same day as a hard run or after it.`)
    }

    // Daniels' quality volume caps
    if (vol > 0) {
      const raceIsInterval = (ctx.goalDistanceM || 5000) <= 5000
      const rM = workAt(week, 'repetition')
      const iM = workAt(week, 'interval') + (raceIsInterval ? workAt(week, 'race') : 0)
      const rCap = Math.min(vol * LIMITS.repetitionShare, LIMITS.repetitionMaxM)
      const iCap = Math.min(vol * LIMITS.intervalShare, LIMITS.intervalMaxM)
      if (rM > rCap + 1) err('r-cap', n, `Week ${n} has ${(rM / 1000).toFixed(1)} km at R pace. The cap is ${(rCap / 1000).toFixed(1)} km (5% of the week).`)
      if (iM > iCap + 1) err('i-cap', n, `Week ${n} has ${(iM / 1000).toFixed(1)} km at I pace. The cap is ${(iCap / 1000).toFixed(1)} km (8% of the week).`)
      for (const s of week.sessions) {
        if (s.work && s.work.pace === 'threshold' && s.work.distanceM > vol * LIMITS.thresholdSessionShare + 1) {
          err('t-cap', n, `A threshold session in week ${n} has more T work than 10% of the week.`)
        }
      }
    }

    // Mostly easy
    if (ctx.paces && vol > 0 && !hasRace) {
      const { easyShare } = intensitySplit(week, ctx.paces)
      if (easyShare < LIMITS.minEasyShare) err('easy-share', n, `Only ${Math.round(easyShare * 100)}% of week ${n} is easy running. Keep at least 75% easy.`)
    }

    // Taper keeps some intensity (Bosquet et al. 2007, https://pubmed.ncbi.nlm.nih.gov/17762369/)
    if (isTaper && !quality.length) warn('taper-no-quality', n, `Taper week ${n} has no quality session. Keep some intensity while volume drops.`)
  })

  // Taper volume (Bosquet et al. 2007: volume down 41 to 60%)
  if (taperWeeks && ctx.goalDistanceM) {
    const peak = Math.max(...volumes.slice(0, volumes.length - taperWeeks), ctx.startWeeklyM || 0)
    const target = taperFactors(ctx.goalDistanceM)
    const last = volumes[volumes.length - 1]
    if (peak > 0 && last > peak * (target[target.length - 1] + 0.15)) {
      err('taper-too-high', weeks.length, 'Race week volume is not reduced enough. Cut it by about 40 to 60% from your peak.')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
