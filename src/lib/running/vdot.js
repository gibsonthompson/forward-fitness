// Daniels and Gilbert VDOT model.
// Source: Daniels J, Gilbert J. Oxygen Power: Performance Tables for Distance Runners (1979),
// and Daniels' Running Formula. Equations as documented at
// https://getfitcraft.com/tools/vdot-calculator and https://the5krunner.com/tools/running-calculators/vdot-calculator/
//
// Units used throughout this module:
//   distance: meters, time: seconds, velocity: meters per minute, pace: seconds per km.

/** Oxygen cost (mL/kg/min) of running at velocity v (m/min). */
export function vo2AtVelocity(v) {
  return -4.6 + 0.182258 * v + 0.000104 * v * v
}

/** Velocity (m/min) whose oxygen cost is vo2 (mL/kg/min). Inverse of vo2AtVelocity. */
export function velocityAtVo2(vo2) {
  const a = 0.000104
  const b = 0.182258
  const c = -4.6 - vo2
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
}

/** Fraction of VO2max sustainable for a race lasting t minutes. */
export function fractionOfMaxAtDuration(tMin) {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin)
}

/**
 * VDOT from a race or time trial result.
 * Reference values: 5K in 20:00 is about 49.8, 5K in 25:00 is about 38.3.
 */
export function vdotFromRace(distanceM, timeS) {
  if (!(distanceM > 0) || !(timeS > 0)) throw new RangeError('distance and time must be positive')
  const tMin = timeS / 60
  const v = distanceM / tMin
  return vo2AtVelocity(v) / fractionOfMaxAtDuration(tMin)
}

/**
 * Equivalent race time (seconds) for a distance at a given VDOT.
 * vdotFromRace is strictly decreasing in time for a fixed distance, so bisection is safe.
 */
export function raceTimeFromVdot(vdot, distanceM) {
  if (!(vdot > 0) || !(distanceM > 0)) throw new RangeError('vdot and distance must be positive')
  let lo = distanceM / 600 // 10 m/s: faster than any human
  let hi = distanceM / 1.5 // 1.5 m/s: a slow walk
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (vdotFromRace(distanceM, mid) > vdot) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Pace (s/km) at a given fraction of VDOT. */
export function paceAtFraction(vdot, fraction) {
  return 60000 / velocityAtVo2(vdot * fraction)
}

export const MILE_M = 1609.344
export const MARATHON_M = 42195

/**
 * Daniels training paces for a VDOT, in seconds per km.
 *   E (Easy) 59 to 74% of VDOT: aerobic base, most of the volume.
 *   M (Marathon): equivalent marathon race pace.
 *   T (Threshold) about 88% of VDOT, roughly 1-hour race pace.
 *   I (Interval) 97 to 100% of VDOT.
 *   R (Repetition): equivalent mile race pace.
 * Ranges are { fast, slow } where fast is the lower number of seconds per km.
 */
export function trainingPaces(vdot) {
  const marathon = raceTimeFromVdot(vdot, MARATHON_M) / (MARATHON_M / 1000)
  const mile = raceTimeFromVdot(vdot, MILE_M) / (MILE_M / 1000)
  const threshold = paceAtFraction(vdot, 0.88)
  return {
    easy: { fast: paceAtFraction(vdot, 0.74), slow: paceAtFraction(vdot, 0.59) },
    marathon: { fast: marathon * 0.99, slow: marathon * 1.01 },
    threshold: { fast: threshold * 0.985, slow: threshold * 1.015 },
    interval: { fast: paceAtFraction(vdot, 1.0), slow: paceAtFraction(vdot, 0.97) },
    repetition: { fast: mile * 0.98, slow: mile * 1.01 },
  }
}

/** Midpoint of a pace range. */
export function paceMid(range) {
  return (range.fast + range.slow) / 2
}
