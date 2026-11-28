// Compact plan format for the AI plan generator.
//
// The model chooses structure only: session type, day and distances. It never writes paces,
// reps math or warmups. expandCompact turns its choices into full sessions with code, and the
// result must still pass validatePlan and checkPlanShape before anyone sees it.
//
// Compact week:    { phase, recovery, sessions: CompactSession[] }
// CompactSession:  { day, type, km, work_km, rep_m }
//   km       total distance for the day, including warmup and cooldown (0 for strength)
//   work_km  distance at quality pace (reps, test or strides); null for easy and long runs
//   rep_m    rep length in meters for interval-style work; null otherwise

import { PURPOSE, RUN_WALK_BELOW_M } from './builder.js'
import { RUN_TYPES, SESSION_TYPES, weekDistanceM } from './guardrails.js'

const round100 = (m) => Math.max(0, Math.round(m / 100) * 100)

const WORK_PACE = { threshold: 'threshold', interval: 'interval', repetition: 'repetition', 'race-pace': 'race' }
const RECOVERY_S = { threshold: 60, interval: 180, repetition: 150, 'race-pace': 90 }

/** Compact form of a built plan, for showing the model a baseline. */
export function toCompact(plan) {
  return plan.weeks.map((w) => ({
    phase: w.phase,
    recovery: !!w.recovery,
    sessions: w.sessions.map((s) => ({
      day: s.day,
      type: s.type,
      km: s.distanceM ? Math.round(s.distanceM / 100) / 10 : 0,
      work_km: s.type === 'time-trial' ? (s.structure?.testM || 0) / 1000 : s.work ? Math.round(s.work.distanceM / 100) / 10 : null,
      rep_m: s.structure?.repM && s.type !== 'time-trial' ? s.structure.repM : null,
    })),
  }))
}

/**
 * Expand compact weeks into full plan weeks.
 * ctx = { goalDistanceM, level, raceTimeS }
 * Returns { weeks, problems } where problems lists anything that could not be expanded.
 */
export function expandCompact(compactWeeks, ctx) {
  const problems = []
  const weeks = compactWeeks.map((cw, i) => {
    const n = i + 1
    const runVol = cw.sessions.reduce((t, s) => t + (RUN_TYPES.has(s.type) && s.type !== 'race' ? Number(s.km) || 0 : 0), 0) * 1000
    const runWalk = ctx.level === 'beginner' && runVol < RUN_WALK_BELOW_M
    const sessions = cw.sessions.map((c) => {
      const type = c.type
      if (!SESSION_TYPES.includes(type)) { problems.push(`Week ${n}: unknown type ${type}.`); return null }
      if (type === 'strength' || type === 'rest') return { day: c.day, type, purpose: PURPOSE[type] || 'Rest.' }
      if (type === 'race') {
        return { day: c.day, type, distanceM: ctx.goalDistanceM, purpose: PURPOSE.race, ...(ctx.raceTimeS ? { targetTimeS: Math.round(ctx.raceTimeS) } : {}) }
      }
      const distanceM = round100((Number(c.km) || 0) * 1000)
      const s = { day: c.day, type, distanceM, purpose: PURPOSE[type] }
      if (type === 'time-trial') {
        const testM = round100((Number(c.work_km) || 0) * 1000)
        if (!(testM >= 1000) || testM > distanceM) { problems.push(`Week ${n}: a time trial needs a test of at least 1 km inside the session.`); return s }
        const easyM = distanceM - testM
        s.structure = { testM, warmupM: round100(easyM * 0.6), cooldownM: round100(easyM * 0.4) }
        return s
      }
      if (type === 'strides') {
        const stridesM = round100((Number(c.work_km) || 0.6) * 1000)
        s.work = { distanceM: Math.min(stridesM, 800), pace: 'repetition' }
        s.structure = { reps: Math.max(1, Math.round(s.work.distanceM / 100)), repM: 100, pace: 'repetition', recoveryS: 60 }
        return s
      }
      if (WORK_PACE[type]) {
        const repM = Number(c.rep_m) || 0
        const workM = (Number(c.work_km) || 0) * 1000
        if (!(repM >= 100) || !(workM >= repM)) { problems.push(`Week ${n}: a ${type} session needs work_km and rep_m.`); return s }
        const reps = Math.floor(workM / repM)
        const total = reps * repM
        if (total > distanceM) { problems.push(`Week ${n}: a ${type} session has more work than total distance.`); return s }
        const easyM = distanceM - total
        s.work = { distanceM: total, pace: WORK_PACE[type] }
        s.structure = { reps, repM, pace: WORK_PACE[type], recoveryS: RECOVERY_S[type], warmupM: round100(easyM / 2), cooldownM: round100(easyM / 2) }
        return s
      }
      if (runWalk && (type === 'easy' || type === 'long')) {
        s.runWalk = true
        s.purpose = 'Alternate easy running with brisk walking, for example 1 minute of each. Walking breaks are part of the plan, not a failure.'
      }
      return s
    }).filter(Boolean)
    const week = { phase: cw.phase, recovery: !!cw.recovery, sessions: sessions.sort((a, b) => a.day - b.day) }
    week.volumeM = weekDistanceM(week)
    return week
  })
  return { weeks, problems }
}

/**
 * Structural checks the guardrails don't cover: the right number of weeks, the race on the last
 * day of the last week at the goal distance, one race only, and phases that end in a taper.
 */
export function checkPlanShape(plan, { weeks }) {
  const errors = []
  if (plan.weeks.length !== weeks) errors.push(`The plan must have exactly ${weeks} weeks; it has ${plan.weeks.length}.`)
  const races = plan.weeks.flatMap((w, i) => w.sessions.filter((s) => s.type === 'race').map((s) => ({ i, s })))
  if (races.length !== 1) errors.push(`The plan must have exactly one race; it has ${races.length}.`)
  else if (races[0].i !== plan.weeks.length - 1 || races[0].s.day !== 6) errors.push('The race must be on day 6 of the last week.')
  if (plan.weeks.length && plan.weeks.at(-1).phase !== 'taper') errors.push('The last week must be in the taper phase.')
  for (const [i, w] of plan.weeks.entries()) {
    if (!['base', 'build', 'sharpen', 'taper'].includes(w.phase)) errors.push(`Week ${i + 1} has an unknown phase "${w.phase}".`)
    if (w.sessions.filter((s) => s.type === 'strength').length > 2) errors.push(`Week ${i + 1} has more than 2 strength sessions.`)
  }
  return errors
}
