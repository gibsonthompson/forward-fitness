import { describe, it, expect } from 'vitest'
import { vdotFromRace, raceTimeFromVdot, trainingPaces, vo2AtVelocity, velocityAtVo2, paceMid } from '../vdot.js'
import { riegel, predictRace, HALF_M } from '../predict.js'
import { MARATHON_M } from '../vdot.js'

describe('VDOT', () => {
  it('matches the spec reference values', () => {
    expect(vdotFromRace(5000, 20 * 60)).toBeCloseTo(49.8, 1)
    expect(vdotFromRace(5000, 25 * 60)).toBeCloseTo(38.3, 1)
  })

  it('round-trips race time and VDOT', () => {
    for (const [d, t] of [[5000, 1200], [10000, 2700], [HALF_M, 5400], [MARATHON_M, 12600]]) {
      const v = vdotFromRace(d, t)
      expect(raceTimeFromVdot(v, d)).toBeCloseTo(t, 0)
    }
  })

  it('inverts the oxygen cost equation', () => {
    expect(velocityAtVo2(vo2AtVelocity(250))).toBeCloseTo(250, 6)
  })

  it('rejects bad input', () => {
    expect(() => vdotFromRace(0, 100)).toThrow()
    expect(() => vdotFromRace(5000, -1)).toThrow()
  })

  it('produces Daniels-consistent training paces at VDOT 50', () => {
    const p = trainingPaces(50)
    // Daniels' tables at VDOT 50: T about 4:15/km, I about 3:55/km, M about 4:31/km.
    expect(paceMid(p.threshold)).toBeGreaterThan(250)
    expect(paceMid(p.threshold)).toBeLessThan(260)
    expect(paceMid(p.interval)).toBeGreaterThan(228)
    expect(paceMid(p.interval)).toBeLessThan(238)
    expect(paceMid(p.marathon)).toBeGreaterThan(266)
    expect(paceMid(p.marathon)).toBeLessThan(276)
  })

  it('orders paces from fastest to slowest', () => {
    const p = trainingPaces(42)
    expect(p.repetition.fast).toBeLessThan(p.interval.fast)
    expect(p.interval.fast).toBeLessThan(p.threshold.fast)
    expect(p.threshold.fast).toBeLessThan(p.marathon.fast)
    expect(p.marathon.fast).toBeLessThan(p.easy.fast)
    for (const r of Object.values(p)) expect(r.fast).toBeLessThan(r.slow)
  })
})

describe('Prediction', () => {
  it('applies Riegel and flags its validity window', () => {
    const r = riegel(1200, 5000, 10000)
    expect(r.timeS).toBeCloseTo(1200 * Math.pow(2, 1.06), 6)
    expect(r.valid).toBe(true)
    expect(riegel(120, 800, 1600).valid).toBe(false) // under 3.5 minutes
    expect(riegel(3 * 3600, MARATHON_M, 100000).valid).toBe(false) // over 230 minutes
  })

  it('returns a range that contains the midpoint', () => {
    const r = predictRace(45, 10000)
    expect(r.low).toBeLessThan(r.mid)
    expect(r.mid).toBeLessThan(r.high)
  })

  it('slows marathon predictions for low volume, never plain equivalence', () => {
    const pure = raceTimeFromVdot(45, MARATHON_M)
    const low = predictRace(45, MARATHON_M, { weeklyKm: 25 })
    const high = predictRace(45, MARATHON_M, { weeklyKm: 100 })
    expect(low.mid).toBeGreaterThan(high.mid)
    expect(high.mid).toBeGreaterThan(pure)
    // Up to the half marathon there is no volume correction.
    expect(predictRace(45, 10000, { weeklyKm: 10 }).mid).toBeCloseTo(raceTimeFromVdot(45, 10000), 6)
  })
})
