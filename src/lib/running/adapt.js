// Adaptation after every run. Pure rules: given what was planned and what happened, decide what
// changes and why. Every decision carries a plain-language reason for the plan history.
//
// Conservative by default. If in doubt, the plan gets easier, not harder.

import { vdotFromRace, vo2AtVelocity } from './vdot.js'

/** Typical session RPE range (CR-10) for each session type, used to spot sessions that went badly. */
export const EXPECTED_RPE = {
  easy: [2, 4], long: [3, 5], strides: [2, 4],
  threshold: [5, 7], 'race-pace': [6, 8], interval: [7, 9], repetition: [6, 8],
  race: [8, 10], 'time-trial': [8, 10],
}

/** Share of VDOT each quality pace sits at, used to turn a hit session into an implied VDOT. */
const PACE_FRACTION = { threshold: 0.88, interval: 0.985 }

/** VDOT implied by holding `paceSPerKm` at a pace that sits at `fraction` of VDOT. */
export function impliedVdot(paceSPerKm, fraction) {
  return vo2AtVelocity(60000 / paceSPerKm) / fraction
}

/** Easy runs faster than this much past the fast end of E pace count as too fast. */
const EASY_TOLERANCE = 0.03

/**
 * Evaluate one logged run.
 * input = {
 *   session: planned session or null (type, work?.pace),
 *   run: { distanceM, durationS, rpe, pain: 'none'|'mild'|'affected', workPaceSPerKm?, isRace? },
 *   vdot, paces,
 *   recentHardFlags: number of 'much-harder' sessions in the last 14 days, before this one,
 * }
 * Returns { actions: Action[], signal: { impliedVdot } | null }
 * Action = { type, reason }, types:
 *   'stop-progression' | 'hold-progression' | 'recompute-vdot' (with newVdot) | 'vdot-signal'
 *   | 'easy-too-fast' | 'swap-next-quality' | 'much-harder' | 'none'
 */
export function evaluateRun({ session, run, vdot, paces, recentHardFlags = 0 }) {
  const actions = []
  const type = run.isRace ? 'race' : session?.type || 'easy'
  const pace = run.distanceM > 0 ? run.durationS / (run.distanceM / 1000) : null

  // Pain that changed how they ran beats every other signal.
  if (run.pain === 'affected') {
    actions.push({
      type: 'stop-progression',
      reason: 'You said pain changed how you ran, so I have paused any increases. Rest or cross-train for a few days, and see a medical professional if it doesn\'t settle. Never push through pain that changes your stride.',
    })
    return { actions, signal: null }
  }
  if (run.pain === 'mild') {
    actions.push({ type: 'hold-progression', reason: 'You noted mild pain, so I am holding your plan where it is this week instead of increasing it. Tell me if it gets worse.' })
  }

  // A race or time trial gives a direct fitness reading.
  // The VDOT equations hold for efforts of about 3.5 minutes and longer.
  if ((type === 'race' || type === 'time-trial') && run.distanceM >= 1000 && run.durationS >= 210) {
    const newVdot = vdotFromRace(run.distanceM, run.durationS)
    actions.push({
      type: 'recompute-vdot',
      newVdot,
      reason: newVdot >= vdot
        ? `Your result puts your fitness at ${newVdot.toFixed(1)}, so I have updated every pace and re-planned the weeks ahead.`
        : `Your result came in a bit slower than your current paces assume, so I have eased them to match. One race isn't a verdict, and a re-test in a few weeks will tell us more.`,
    })
    return { actions, signal: null }
  }

  const [, rpeMax] = EXPECTED_RPE[type] || EXPECTED_RPE.easy
  const muchHarder = run.rpe != null && run.rpe >= Math.min(10, rpeMax + 2)

  if (muchHarder) {
    actions.push({ type: 'much-harder', reason: `That felt much harder than a ${type} session should. I am holding your progression, and sleep, stress and your notes are worth a look.` })
    if (!actions.some((a) => a.type === 'hold-progression')) actions.push({ type: 'hold-progression', reason: 'Holding progression after a session that felt much harder than planned.' })
    if (recentHardFlags >= 1) {
      actions.push({ type: 'swap-next-quality', reason: 'This is the second hard-feeling session in two weeks, so I have swapped your next quality day for an easy run. Fitness comes from recovering, not from grinding.' })
    }
    return { actions, signal: null }
  }

  // Easy days must be easy. Fast easy runs never upgrade fitness.
  if ((type === 'easy' || type === 'long' || type === 'strides') && pace && pace < paces.easy.fast * (1 - EASY_TOLERANCE)) {
    actions.push({
      type: 'easy-too-fast',
      reason: 'That easy run was faster than your easy pace. Easy days build your aerobic base and let you recover for the hard days, so slowing down here is what makes the hard days work.',
    })
    return { actions, signal: null }
  }

  // A quality session hit at or faster than target at a matching effort counts toward an upgrade.
  const label = session?.work?.pace
  if (label && PACE_FRACTION[label] && run.workPaceSPerKm && run.rpe != null && run.rpe <= rpeMax && !actions.length) {
    if (run.workPaceSPerKm <= paces[label].fast) {
      const signal = { impliedVdot: impliedVdot(run.workPaceSPerKm, PACE_FRACTION[label]) }
      actions.push({ type: 'vdot-signal', reason: `You held ${label} pace or faster at an effort of ${run.rpe}. One more session like that and I will raise your paces.` })
      return { actions, signal }
    }
  }

  if (!actions.length) actions.push({ type: 'none', reason: 'Right on plan.' })
  return { actions, signal: null }
}

/** Biggest single VDOT step from training signals. Races and time trials are not capped. */
export const MAX_SIGNAL_STEP = 1.5
/** Signals older than this are ignored. */
export const SIGNAL_WINDOW_DAYS = 42

/**
 * Decide whether training signals justify raising VDOT.
 * Needs 2 or more signals within the window. Uses the lowest implied VDOT among them
 * (the most conservative reading) and caps the step.
 * signals = [{ date: 'YYYY-MM-DD', impliedVdot }]
 * Returns { newVdot, reason } or null.
 */
export function decideVdotUpdate(currentVdot, signals, today) {
  const cutoff = new Date(today + 'T00:00:00')
  cutoff.setDate(cutoff.getDate() - SIGNAL_WINDOW_DAYS)
  const recent = signals.filter((s) => new Date(s.date + 'T00:00:00') >= cutoff && s.impliedVdot > currentVdot)
  if (recent.length < 2) return null
  const floor = Math.min(...recent.map((s) => s.impliedVdot))
  const newVdot = Math.min(floor, currentVdot + MAX_SIGNAL_STEP)
  if (newVdot - currentVdot < 0.3) return null
  return {
    newVdot,
    reason: `Your quality sessions have been consistently faster than target at the effort they should feel like, so I have raised your fitness from ${currentVdot.toFixed(1)} to ${newVdot.toFixed(1)} and updated your paces.`,
  }
}

/**
 * What to do after missed training. Never cram missed sessions in.
 * Volume return factors are a conservative heuristic for coach review.
 * Returns { action: 'reflow' | 'reduce' | 'step-back-phase' | 'reassess', volumeFactor, reason }
 */
export function assessMissed(daysMissed) {
  if (daysMissed < 7) return { action: 'reflow', volumeFactor: 1, reason: 'Missed sessions are gone, not owed. I have reshuffled the rest of the week without adding extra.' }
  if (daysMissed < 14) return { action: 'reduce', volumeFactor: 0.85, reason: 'After a week off, I have eased this week back in a little before building again.' }
  if (daysMissed < 35) return { action: 'step-back-phase', volumeFactor: 0.7, reason: 'After a few weeks away, I have stepped your plan back a phase and recalculated from here. You keep more fitness than it feels like.' }
  return { action: 'reassess', volumeFactor: 0.5, reason: 'It has been over a month, so let\'s start with a short, easy rebuild and a fresh time trial to set your paces.' }
}

