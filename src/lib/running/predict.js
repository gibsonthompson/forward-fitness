// Race prediction.
// Riegel: T2 = T1 * (D2 / D1)^1.06, intended for efforts of roughly 3.5 to 230 minutes.
// https://en.wikipedia.org/wiki/Peter_Riegel
// Calibration in recreational runners: well calibrated up to the half marathon, but marathon
// predictions are too fast by at least 10 minutes for about half of runners.
// https://pmc.ncbi.nlm.nih.gov/articles/PMC5000509
// So marathon predictions use VDOT equivalence plus a volume-based correction, never plain
// Riegel, and every prediction is returned as a range.

import { raceTimeFromVdot, MARATHON_M } from './vdot.js'

export const HALF_M = 21097.5

/** Riegel prediction. `valid` is false outside the 3.5 to 230 minute window it was built on. */
export function riegel(t1S, d1M, d2M, exponent = 1.06) {
  const t2 = t1S * Math.pow(d2M / d1M, exponent)
  const inWindow = (t) => t >= 3.5 * 60 && t <= 230 * 60
  return { timeS: t2, valid: inWindow(t1S) && inWindow(t2) }
}

/**
 * Extra time added to a VDOT-equivalent marathon based on weekly volume. Low-mileage runners
 * fade late in a marathon, which pure equivalence ignores. This is a conservative heuristic
 * and must be reviewed by the certified coach before launch.
 */
export function marathonVolumePenalty(weeklyKm) {
  if (weeklyKm == null) return 0.06
  if (weeklyKm < 30) return 0.1
  if (weeklyKm < 45) return 0.07
  if (weeklyKm < 65) return 0.04
  if (weeklyKm < 90) return 0.02
  return 0.01
}

/** Spread of the prediction range around its midpoint, widening with race length. */
function spreadFor(distanceM) {
  if (distanceM <= 10000) return 0.025
  if (distanceM <= HALF_M + 1) return 0.035
  return 0.05
}

/**
 * Predicted race time range at a given VDOT. Returns { low, mid, high } in seconds,
 * where low is the faster time.
 */
export function predictRace(vdot, distanceM, { weeklyKm } = {}) {
  let mid = raceTimeFromVdot(vdot, distanceM)
  if (distanceM > HALF_M + 1) {
    // Scale the penalty from zero at the half marathon to the full amount at the marathon.
    const share = Math.min(1, (distanceM - HALF_M) / (MARATHON_M - HALF_M))
    mid *= 1 + marathonVolumePenalty(weeklyKm) * share
  }
  const s = spreadFor(distanceM)
  // Ranges skew slow: missing a prediction on the slow side is far more common than beating it.
  return { low: mid * (1 - s * 0.6), mid, high: mid * (1 + s) }
}
