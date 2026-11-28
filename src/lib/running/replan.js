// Calendar mapping and plan updates. Pure functions: they decide what changes, the service layer
// writes it. Dates are local 'YYYY-MM-DD' strings throughout.

import { raceTimeFromVdot } from './vdot.js'
import { QUALITY_TYPES, RUN_TYPES } from './guardrails.js'

// ─── Dates ───
export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function fmtDate(dt) {
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
}
export function addDays(s, n) {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}
export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000)
}
/** Monday-first weekday index: 0 = Monday, 6 = Sunday. */
export function weekdayIndex(s) {
  return (parseDate(s).getDay() + 6) % 7
}

/**
 * Plan calendar anchored to the goal date: the race is always on day 6 of the last plan week.
 * Returns { weeks, start } where start is the first day of plan week 1 (on or before today).
 */
export function planCalendar(goalDate, today) {
  const until = Math.max(0, daysBetween(today, goalDate))
  const weeks = Math.floor(until / 7) + 1
  return { weeks, start: addDays(goalDate, -6 - 7 * (weeks - 1)) }
}

/** Plan-week day index (0..6) for the user's preferred weekday (0 = Monday). */
export function planDayForWeekday(weekday, start) {
  return (weekday - weekdayIndex(start) + 7) % 7
}

// ─── Paces ───
/** Race pace (s/km) for the goal distance at current fitness, as a narrow range. */
export function racePace(vdot, distanceM) {
  const p = raceTimeFromVdot(vdot, distanceM) / (distanceM / 1000)
  return { fast: p * 0.99, slow: p * 1.01 }
}

/** The pace a session is built around. Easy runs show E pace; quality sessions their work pace. */
export function targetPaceFor(session, paces, vdot, goalDistanceM) {
  const label = session.work?.pace
  // A time trial is run at the race pace for its test distance at current fitness.
  if (session.type === 'time-trial') return racePace(vdot, session.structure?.testM || 3000)
  if (session.type === 'race' || label === 'race') return racePace(vdot, goalDistanceM)
  if (session.type === 'strides' || session.type === 'easy' || session.type === 'long') return paces.easy
  if (label && paces[label]) return paces[label]
  return null
}

/** Rows for iron_run_plan_sessions from a built plan. Sessions before `fromDate` are skipped. */
export function planToRows(plan, { start, fromDate, vdot, goalDistanceM }) {
  const rows = []
  plan.weeks.forEach((week, w) => {
    for (const s of week.sessions) {
      const date = addDays(start, w * 7 + s.day)
      if (date < fromDate) continue
      rows.push({
        date,
        type: s.type,
        distance_m: s.distanceM ?? null,
        purpose: s.purpose || null,
        target_pace: RUN_TYPES.has(s.type) ? targetPaceFor(s, plan.paces, vdot, goalDistanceM) : null,
        structure: Object.assign({}, s.structure || {}, s.work ? { work: s.work } : {}, s.runWalk ? { runWalk: true } : {}, s.targetTimeS ? { targetTimeS: s.targetTimeS } : {}, { week: w + 1, phase: week.phase, recovery: !!week.recovery }),
        status: 'planned',
      })
    }
  })
  return rows
}

/** Re-target every remaining session's pace after a fitness change. Returns [{ id, patch }]. */
export function repaceSessions(sessions, paces, vdot, goalDistanceM) {
  return sessions
    .filter((s) => s.status === 'planned' && RUN_TYPES.has(s.type))
    .map((s) => ({ id: s.id, patch: { target_pace: targetPaceFor({ type: s.type, work: s.structure?.work, structure: s.structure }, paces, vdot, goalDistanceM) } }))
}

// ─── Adapting after a run ───
const round100 = (m) => Math.max(0, Math.round(m / 100) * 100)

/**
 * Turn the engine's actions into concrete session updates.
 * upcoming: planned sessions after the run date, sorted by date.
 * Returns [{ id, patch, note }].
 */
export function planAdjustments(actions, upcoming, { runDate, weekVolumeM }) {
  const types = new Set(actions.map((a) => a.type))
  const out = []
  const touched = new Set()
  const add = (s, patch, note) => {
    if (touched.has(s.id)) return
    touched.add(s.id)
    out.push({ id: s.id, patch, note })
  }

  if (types.has('stop-progression')) {
    // Rest the next 3 days, then easy running only for the rest of the coming week and a half.
    for (const s of upcoming) {
      const d = daysBetween(runDate, s.date)
      if (!RUN_TYPES.has(s.type) || s.type === 'race') continue
      if (d <= 3) add(s, { status: 'skipped' }, 'Rest day while the pain settles')
      else if (d <= 10 && QUALITY_TYPES.has(s.type)) add(s, toEasy(s, 0.8), 'Swapped to an easy run while you recover')
    }
  }

  if (types.has('swap-next-quality')) {
    const next = upcoming.find((s) => QUALITY_TYPES.has(s.type) && s.type !== 'race')
    if (next) add(next, toEasy(next, 1), 'Swapped to an easy run so you can recover')
  }

  if (types.has('stop-progression') || types.has('hold-progression')) {
    // Hold: the coming week can't be bigger than this one.
    const nextWeek = upcoming.filter((s) => {
      const d = daysBetween(runDate, s.date)
      return d >= 1 && d <= 7 && RUN_TYPES.has(s.type) && s.type !== 'race' && !touched.has(s.id)
    })
    const planned = nextWeek.reduce((t, s) => t + (s.distance_m || 0), 0)
    if (weekVolumeM > 0 && planned > weekVolumeM) {
      const f = weekVolumeM / planned
      for (const s of nextWeek) add(s, { distance_m: round100(s.distance_m * f) }, 'Held at this week\'s volume')
    }
  }
  return out
}

function toEasy(s, factor) {
  return {
    type: 'easy',
    distance_m: round100((s.distance_m || 0) * factor),
    structure: { week: s.structure?.week, phase: s.structure?.phase, swappedFrom: s.type },
    purpose: 'An easy run in place of a hard session, so you can recover. Keep it truly easy.',
    status: 'planned',
  }
}

/**
 * Starting weekly volume for a rebuilt plan: what the runner has actually been doing recently,
 * scaled down after time away.
 */
export function rebuildStartVolume(runs, today, volumeFactor = 1, fallbackM = 0) {
  const sum = (from, to) => runs.filter((r) => r.date > from && r.date <= to).reduce((t, r) => t + Number(r.distance_m || 0), 0)
  const last = sum(addDays(today, -7), today)
  const prev = sum(addDays(today, -14), addDays(today, -7))
  const base = Math.max(last, prev) || fallbackM
  return Math.round(base * volumeFactor)
}

/** Days since the last logged run, or null when there are none. */
export function daysSinceLastRun(runs, today) {
  if (!runs.length) return null
  const last = runs.reduce((m, r) => (r.date > m ? r.date : m), runs[0].date)
  return daysBetween(last, today)
}

/** The level the builder plans with. A recent injury gets the most conservative progression. */
export function planningLevel(setup) {
  return setup && setup.injury === 'recent' ? 'beginner' : (setup && setup.level) || 'intermediate'
}

/**
 * Builder options for a goal, shared by the app and the AI plan endpoint so both build the
 * identical baseline. goal = { distance_m, goal_date, setup }.
 */
export function builderOptions(goal, { vdot, startWeeklyM, today }) {
  const setup = goal.setup || {}
  const cal = planCalendar(goal.goal_date, today)
  return {
    cal,
    opts: {
      vdot,
      goalDistanceM: Number(goal.distance_m),
      weeks: cal.weeks,
      level: planningLevel(setup),
      startWeeklyM,
      days: setup.days,
      longRunDay: planDayForWeekday(setup.longWeekday ?? 6, cal.start),
      strength: setup.strength !== false,
    },
  }
}
