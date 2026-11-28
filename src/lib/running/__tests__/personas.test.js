// Persona tests: every plan the builder generates must pass every guardrail.
import { describe, it, expect } from 'vitest'
import { buildPlan, peakTargetM } from '../builder.js'
import { validatePlan, QUALITY_TYPES, weekDistanceM } from '../guardrails.js'
import { vdotFromRace } from '../vdot.js'

const PERSONAS = [
  { name: 'brand new runner', vdot: 30, goalDistanceM: 5000, weeks: 12, level: 'beginner', startWeeklyM: 0, days: 3 },
  { name: 'new runner, BMI over 30', vdot: 28, goalDistanceM: 5000, weeks: 16, level: 'beginner', startWeeklyM: 0, days: 3, bmi: 33 },
  { name: 'returning runner', vdot: 38, goalDistanceM: 10000, weeks: 14, level: 'intermediate', startWeeklyM: 12000, days: 4 },
  { name: 'sub-20 chaser', vdot: vdotFromRace(5000, 21 * 60 + 30), goalDistanceM: 5000, weeks: 16, level: 'intermediate', startWeeklyM: 25000, days: 5 },
  { name: 'injury-prone, 3 days', vdot: 42, goalDistanceM: 10000, weeks: 12, level: 'intermediate', startWeeklyM: 15000, days: 3 },
  { name: 'half marathon, plenty of time', vdot: 44, goalDistanceM: 21097.5, weeks: 20, level: 'intermediate', startWeeklyM: 30000, days: 4 },
  { name: 'experienced marathoner', vdot: 55, goalDistanceM: 42195, weeks: 18, level: 'experienced', startWeeklyM: 60000, days: 6 },
  { name: 'beginner marathon', vdot: 36, goalDistanceM: 42195, weeks: 24, level: 'beginner', startWeeklyM: 20000, days: 4 },
  { name: 'short runway', vdot: 45, goalDistanceM: 5000, weeks: 4, level: 'intermediate', startWeeklyM: 30000, days: 4 },
  { name: 'Saturday long run', vdot: 45, goalDistanceM: 10000, weeks: 12, level: 'intermediate', startWeeklyM: 25000, days: 4, longRunDay: 5 },
  { name: 'runs every day', vdot: 50, goalDistanceM: 10000, weeks: 12, level: 'experienced', startWeeklyM: 50000, days: 7 },
  { name: 'two days a week', vdot: 35, goalDistanceM: 5000, weeks: 10, level: 'beginner', startWeeklyM: 8000, days: 2 },
]

describe.each(PERSONAS)('$name', (p) => {
  const plan = buildPlan(p)
  const ctx = { level: p.level, paces: plan.paces, startWeeklyM: p.startWeeklyM, goalDistanceM: p.goalDistanceM, availableDays: p.days, bmi: p.bmi }
  const result = validatePlan(plan, ctx)

  it('passes every guardrail', () => {
    expect(result.errors).toEqual([])
  })

  it('has no strength-before-key-run warnings', () => {
    expect(result.warnings.filter((w) => w.code === 'strength-before-key')).toEqual([])
  })

  it('has the right length and ends with the race on the last day', () => {
    expect(plan.weeks).toHaveLength(p.weeks)
    const last = plan.weeks.at(-1)
    const race = last.sessions.find((s) => s.type === 'race')
    expect(race).toBeTruthy()
    expect(race.day).toBe(6)
    expect(race.distanceM).toBe(p.goalDistanceM)
  })

  it('actually builds volume before the taper', () => {
    const vols = plan.weeks.filter((w) => w.phase !== 'taper').map(weekDistanceM)
    const peak = Math.max(...vols)
    // Plans with room to grow must grow meaningfully, not stall at week 1.
    // With room to grow, a plan must reach most of its target (or grow 50%), not stall at week 1.
    if (p.weeks >= 8) expect(peak).toBeGreaterThanOrEqual(Math.min(peakTargetM(p), vols[0] * 1.5) * 0.9)
    expect(peak).toBeGreaterThanOrEqual(vols[0])
  })

  it('never makes the race more than double the longest training run, for 5K and 10K', () => {
    if (p.goalDistanceM > 10000 || p.weeks < 8) return
    const longest = Math.max(...plan.weeks.flatMap((w) => w.sessions.filter((s) => s.type !== 'race' && s.distanceM).map((s) => s.distanceM)))
    expect(p.goalDistanceM / longest).toBeLessThanOrEqual(2)
  })

  it('gives every run a purpose', () => {
    for (const w of plan.weeks) for (const s of w.sessions) expect(typeof s.purpose).toBe('string')
  })

  it('describes the structure of every quality session', () => {
    for (const w of plan.weeks) {
      for (const s of w.sessions) {
        if (s.type === 'time-trial') expect(s.structure.testM).toBeGreaterThan(0)
        else if (QUALITY_TYPES.has(s.type) && s.type !== 'race') {
          expect(s.structure.reps).toBeGreaterThan(0)
          expect(s.work.distanceM).toBe(s.structure.reps * s.structure.repM)
        }
      }
    }
  })
})

describe('time trials', () => {
  it('re-tests fitness from week 4, every ~6 weeks, never near the race', () => {
    const plan = buildPlan({ vdot: 40, goalDistanceM: 10000, weeks: 20, level: 'intermediate', startWeeklyM: 25000, days: 4 })
    const weeks = plan.weeks.map((w, i) => (w.sessions.some((s) => s.type === 'time-trial') ? i : -1)).filter((i) => i >= 0)
    expect(weeks[0]).toBe(3)
    for (let k = 1; k < weeks.length; k++) expect(weeks[k] - weeks[k - 1]).toBeGreaterThanOrEqual(6)
    const taper = plan.weeks.findIndex((w) => w.phase === 'taper')
    expect(Math.max(...weeks)).toBeLessThanOrEqual(taper - 3)
    for (const i of weeks) {
      const tt = plan.weeks[i].sessions.find((s) => s.type === 'time-trial')
      expect(tt.structure.testM + tt.structure.warmupM + tt.structure.cooldownM).toBeLessThanOrEqual(tt.distanceM + 100)
      expect(plan.weeks[i].sessions.some((s) => s.type === 'strength' && s.day === tt.day)).toBe(false)
    }
  })

  it('gives brand-new runners a short first test', () => {
    for (const weeks of [12, 13, 16]) {
      const plan = buildPlan({ vdot: 22, goalDistanceM: 5000, weeks, level: 'beginner', startWeeklyM: 0, days: 3 })
      const first = plan.weeks.findIndex((w) => w.sessions.some((s) => s.type === 'time-trial'))
      expect(first).toBe(3) // week 4
      const tt = plan.weeks[first].sessions.find((s) => s.type === 'time-trial')
      expect(tt.structure.testM).toBeLessThanOrEqual(1600)
    }
  })
})
