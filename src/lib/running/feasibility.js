// Goal feasibility. Run before generating a plan so the coach can be honest about a goal.
//
// The plausible-gain rates below are a deliberately conservative heuristic, not a published
// formula. They must be calibrated with the certified coach reviewer before launch, and they
// are always presented to the user as an estimate, never a promise.

import { vdotFromRace, raceTimeFromVdot } from './vdot.js'
import { predictRace } from './predict.js'

/** Plausible VDOT gain per 4 weeks of consistent training, by experience. */
export const GAIN_PER_4_WEEKS = { beginner: 1.5, intermediate: 1.0, experienced: 0.5 }

/** Round a goal time up to a tidy number for the distance, so stepping stones read naturally. */
export function tidyTime(timeS, distanceM) {
  const step = distanceM <= 5000 ? 15 : distanceM <= 10000 ? 30 : distanceM <= 21100 ? 60 : 120
  return Math.ceil(timeS / step) * step
}

/**
 * Assess a goal.
 * input = { currentVdot, goalDistanceM, goalTimeS, weeks, level, weeklyKm? }
 * Returns {
 *   status: 'achieved' | 'realistic' | 'stretch' | 'unrealistic',
 *   currentVdot, goalVdot, gap, plausibleGain, weeksNeeded,
 *   predictedAtGoal: { low, mid, high },   // seconds for the goal distance at the goal date
 *   steppingStone: { timeS, vdot } | null, // offered when the goal is out of reach in time
 * }
 */
export function assessGoal({ currentVdot, goalDistanceM, goalTimeS, weeks, level = 'intermediate', weeklyKm }) {
  const goalVdot = vdotFromRace(goalDistanceM, goalTimeS)
  const gap = goalVdot - currentVdot
  const rate = GAIN_PER_4_WEEKS[level] ?? GAIN_PER_4_WEEKS.intermediate
  // Taper weeks don't add fitness, so leave a week out of the window.
  const trainingWeeks = Math.max(0, weeks - 1)
  const plausibleGain = (rate * trainingWeeks) / 4
  const weeksNeeded = gap <= 0 ? 0 : Math.ceil((gap / rate) * 4) + 1

  let status
  if (gap <= 0) status = 'achieved'
  else if (gap <= plausibleGain * 0.6) status = 'realistic'
  else if (gap <= plausibleGain) status = 'stretch'
  else status = 'unrealistic'

  // Range at the goal date: the optimistic end assumes the full plausible gain (capped at the goal),
  // the conservative end assumes less than half of it.
  const best = currentVdot + Math.min(Math.max(gap, 0), plausibleGain)
  const cautious = currentVdot + Math.min(Math.max(gap, 0), plausibleGain * 0.4)
  const fast = predictRace(best, goalDistanceM, { weeklyKm })
  const slow = predictRace(cautious, goalDistanceM, { weeklyKm })
  const predictedAtGoal = { low: fast.low, mid: (fast.mid + slow.mid) / 2, high: slow.high }

  let steppingStone = null
  if (status === 'unrealistic') {
    const vdot = currentVdot + plausibleGain * 0.8
    const timeS = tidyTime(raceTimeFromVdot(vdot, goalDistanceM), goalDistanceM)
    if (timeS < raceTimeFromVdot(currentVdot, goalDistanceM)) steppingStone = { timeS, vdot: vdotFromRace(goalDistanceM, timeS) }
  }

  return { status, currentVdot, goalVdot, gap, plausibleGain, weeksNeeded, predictedAtGoal, steppingStone }
}
