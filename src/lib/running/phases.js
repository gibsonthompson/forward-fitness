// Periodization, planned backward from the goal date.
// Base (3 to 6+ weeks) builds easy volume, Build (4 to 6) adds threshold then intervals,
// Sharpen (2 to 4) is race specific, Taper (1 to 2) cuts volume and keeps intensity.
import { taperWeeks } from './taper.js'

export const IDEAL = { base: 6, build: 5, sharpen: 3 }

/**
 * Split the weeks available into phases.
 * Returns { phases: [{ name, weeks }], compressed, totalWeeks }.
 * With more time than ideal, the base phase grows. With less, phases shrink in proportion and
 * `compressed` is true so the coach can lower expectations.
 */
export function periodize(totalWeeks, distanceM) {
  const weeks = Math.max(1, Math.floor(totalWeeks))
  const taper = Math.min(taperWeeks(distanceM), weeks)
  const training = weeks - taper
  const idealSum = IDEAL.base + IDEAL.build + IDEAL.sharpen
  let base, build, sharpen
  if (training >= idealSum) {
    build = IDEAL.build
    sharpen = IDEAL.sharpen
    base = training - build - sharpen
  } else if (training <= 2) {
    base = training
    build = 0
    sharpen = 0
  } else {
    sharpen = Math.max(1, Math.round(training * (IDEAL.sharpen / idealSum)))
    build = Math.max(1, Math.round(training * (IDEAL.build / idealSum)))
    base = training - build - sharpen
    if (base < 1) { build -= 1 - base; base = 1 }
  }
  const phases = [
    { name: 'base', weeks: base },
    { name: 'build', weeks: build },
    { name: 'sharpen', weeks: sharpen },
    { name: 'taper', weeks: taper },
  ].filter((p) => p.weeks > 0)
  return { phases, compressed: training < idealSum, totalWeeks: weeks }
}

/** Phase name for every week index, in order. */
export function phaseByWeek(totalWeeks, distanceM) {
  return periodize(totalWeeks, distanceM).phases.flatMap((p) => Array(p.weeks).fill(p.name))
}
