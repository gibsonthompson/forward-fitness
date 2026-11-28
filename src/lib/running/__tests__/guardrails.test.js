import { describe, it, expect } from 'vitest'
import { validatePlan, maxNextWeekM, intensitySplit } from '../guardrails.js'
import { trainingPaces } from '../vdot.js'

const paces = trainingPaces(45)
const ctx = { level: 'intermediate', paces, startWeeklyM: 20000, goalDistanceM: 5000 }

// A clean 4-day week of `km` kilometers: easy, threshold, easy, long.
function week(km, extra = {}) {
  const m = km * 1000
  return {
    phase: 'build',
    sessions: [
      { day: 1, type: 'easy', distanceM: m * 0.25 },
      { day: 3, type: 'threshold', distanceM: m * 0.25, work: { distanceM: m * 0.08, pace: 'threshold' } },
      { day: 4, type: 'easy', distanceM: m * 0.22 },
      { day: 6, type: 'long', distanceM: m * 0.28 },
    ],
    ...extra,
  }
}
const codes = (r) => r.errors.map((e) => e.code)

describe('validatePlan', () => {
  it('passes a sensible plan', () => {
    const plan = { weeks: [week(22), week(24), week(25), week(19, { recovery: true })] }
    const r = validatePlan(plan, ctx)
    expect(r.errors).toEqual([])
    expect(r.ok).toBe(true)
  })

  it('blocks big week-over-week jumps', () => {
    expect(codes(validatePlan({ weeks: [week(30)] }, ctx))).toContain('volume-jump')
  })

  it('allows a small absolute step at low volume, but never past the hard cap', () => {
    expect(maxNextWeekM(5000, 'beginner')).toBe(6250) // 2 km step capped at +25%
    expect(maxNextWeekM(10000, 'beginner')).toBe(12000) // 2 km step beats 10%
    expect(maxNextWeekM(40000, 'intermediate')).toBe(46000) // 15% beats 2 km
    expect(maxNextWeekM(0)).toBe(4000)
  })

  it('allows returning to normal volume after a recovery week', () => {
    const plan = { weeks: [week(22), week(18, { recovery: true }), week(24)] }
    expect(codes(validatePlan(plan, ctx))).not.toContain('volume-jump')
  })

  it('requires a recovery week every 4th week', () => {
    const plan = { weeks: [week(22), week(23), week(24), week(25)] }
    expect(codes(validatePlan(plan, ctx))).toContain('no-recovery')
  })

  it('requires a recovery week every 3rd week for beginners', () => {
    const plan = { weeks: [week(21), week(22), week(23)] }
    expect(codes(validatePlan(plan, { ...ctx, level: 'beginner' }))).toContain('no-recovery')
  })

  it('rejects a recovery week that does not cut volume', () => {
    const plan = { weeks: [week(22), week(21, { recovery: true })] }
    expect(codes(validatePlan(plan, ctx))).toContain('recovery-not-cut')
  })

  it('caps the long run at 30% of the week', () => {
    const w = week(22)
    w.sessions[3].distanceM = 22000 * 0.4
    expect(codes(validatePlan({ weeks: [w] }, ctx))).toContain('long-run-share')
  })

  it('caps quality sessions by level', () => {
    const w = week(22)
    w.sessions[0] = { day: 1, type: 'interval', distanceM: 5500, work: { distanceM: 1500, pace: 'interval' } }
    expect(codes(validatePlan({ weeks: [w] }, ctx))).not.toContain('too-much-quality')
    expect(codes(validatePlan({ weeks: [w] }, { ...ctx, level: 'beginner' }))).toContain('too-much-quality')
  })

  it('never allows hard days back to back, including across weeks', () => {
    const w = week(22)
    w.sessions[2] = { day: 4, type: 'interval', distanceM: 4840, work: { distanceM: 1500, pace: 'interval' } }
    expect(codes(validatePlan({ weeks: [w] }, ctx))).toContain('back-to-back')

    const a = week(22)
    const b = week(22)
    b.sessions[0] = { day: 0, type: 'threshold', distanceM: 5500, work: { distanceM: 1700, pace: 'threshold' } }
    expect(codes(validatePlan({ weeks: [a, b] }, ctx))).toContain('back-to-back')
  })

  it("enforces Daniels' R, I and T caps", () => {
    const r = week(22)
    r.sessions[0].work = { distanceM: 1500, pace: 'repetition' }
    expect(codes(validatePlan({ weeks: [r] }, ctx))).toContain('r-cap')

    const i = week(22)
    i.sessions[1].work = { distanceM: 2500, pace: 'interval' }
    expect(codes(validatePlan({ weeks: [i] }, ctx))).toContain('i-cap')

    const t = week(22)
    t.sessions[1].work = { distanceM: 3000, pace: 'threshold' }
    expect(codes(validatePlan({ weeks: [t] }, ctx))).toContain('t-cap')
  })

  it('counts 5K race-pace work toward the I cap', () => {
    const w = week(22)
    w.sessions[1].work = { distanceM: 2500, pace: 'race' }
    expect(codes(validatePlan({ weeks: [w] }, ctx))).toContain('i-cap')
    expect(codes(validatePlan({ weeks: [w] }, { ...ctx, goalDistanceM: 21097.5 }))).not.toContain('i-cap')
  })

  it('keeps most running easy', () => {
    const w = week(22)
    expect(intensitySplit(w, paces).easyShare).toBeGreaterThan(0.75)
    w.sessions[0] = { day: 1, type: 'threshold', distanceM: 5500, work: { distanceM: 5500, pace: 'threshold' } }
    w.sessions[2].work = { distanceM: 4840, pace: 'marathon' }
    expect(codes(validatePlan({ weeks: [w] }, ctx))).toContain('easy-share')
  })

  it('caps the first week for a new runner with BMI over 30', () => {
    const w = { phase: 'base', sessions: [{ day: 1, type: 'easy', distanceM: 1500 }, { day: 4, type: 'easy', distanceM: 1500 }] }
    const c = { ...ctx, level: 'beginner', startWeeklyM: 0, bmi: 32 }
    expect(codes(validatePlan({ weeks: [w] }, c))).toContain('first-week-bmi')
    w.sessions[1].distanceM = 1000
    expect(codes(validatePlan({ weeks: [w] }, c))).not.toContain('first-week-bmi')
  })

  it('flags strength the day before a key run', () => {
    const w = week(22)
    w.sessions.push({ day: 2, type: 'strength' })
    expect(validatePlan({ weeks: [w] }, ctx).warnings.map((x) => x.code)).toContain('strength-before-key')
  })

  it('requires a real taper', () => {
    const race = (km) => ({
      phase: 'taper',
      sessions: [
        { day: 2, type: 'race-pace', distanceM: km * 400, work: { distanceM: 1000, pace: 'race' } },
        { day: 4, type: 'easy', distanceM: km * 600 },
        { day: 6, type: 'race', distanceM: 5000 },
      ],
    })
    const base = [week(22), week(24)]
    expect(codes(validatePlan({ weeks: [...base, race(13)] }, ctx))).not.toContain('taper-too-high')
    expect(codes(validatePlan({ weeks: [...base, race(23)] }, ctx))).toContain('taper-too-high')
  })

  it('rejects malformed sessions', () => {
    const w = { phase: 'base', sessions: [{ day: 9, type: 'sprint', distanceM: 0 }, { day: 1, type: 'easy', distanceM: 3000 }, { day: 1, type: 'easy', distanceM: 3000 }] }
    const c = codes(validatePlan({ weeks: [w] }, ctx))
    expect(c).toEqual(expect.arrayContaining(['bad-type', 'bad-day', 'double-run']))
    expect(codes(validatePlan({ weeks: [] }, ctx))).toContain('empty')
  })

  it('respects available days', () => {
    expect(codes(validatePlan({ weeks: [week(22)] }, { ...ctx, availableDays: 3 }))).toContain('too-many-days')
  })
})
